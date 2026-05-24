import path from 'path';
import fs from 'fs';
import { simpleGit, SimpleGit } from 'simple-git';
import { getTaskById, updateTaskStatus, getTaskSourceToken, getTaskTargetToken } from '../models/task';
import { createSyncLog } from '../models/syncLog';
import { Task, SyncLog, BranchesConfig } from '../types';
import config from '../config';
import { sendFailureNotification, sendSuccessNotification } from './notifier';
import { formatLocal } from '../utils/time';

/**
 * Parse the branches JSON config from a task.
 */
function parseBranchesConfig(task: Task): BranchesConfig {
  try {
    const raw = JSON.parse(task.branches || '{"mode":"all"}');
    const mode = raw.mode || 'all';
    return {
      mode,
      branches: raw.branches || [],
      tags: raw.tags || [],
      syncAllBranches: mode === 'all' || mode === 'all_branches',
      syncAllTags: mode === 'all' || mode === 'all_tags',
    };
  } catch {
    // Fallback: treat legacy single branch field
    return {
      mode: 'custom',
      branches: [task.branch || 'main'],
      tags: [],
      syncAllBranches: false,
      syncAllTags: false,
    };
  }
}

/**
 * Ensure the repository working directory exists for a task.
 */
function ensureRepoDir(taskId: string): string {
  const repoPath = path.join(config.repoDir, taskId);
  if (!fs.existsSync(repoPath)) {
    fs.mkdirSync(repoPath, { recursive: true });
  }
  return repoPath;
}

/**
 * Build authenticated URL for HTTPS-based git operations.
 */
function buildAuthUrl(repoUrl: string, token: string): string {
  try {
    const url = new URL(repoUrl);
    url.username = 'token';
    url.password = token;
    return url.toString();
  } catch {
    // If URL parsing fails, try simple string replacement
    if (repoUrl.startsWith('https://')) {
      return repoUrl.replace('https://', `https://token:${token}@`);
    }
    return repoUrl;
  }
}

import os from 'os';

/**
 * Resolve SSH key path with fallback chain:
 * 1. If absolute path → use directly
 * 2. If relative → try data/ssh_keys/<name>, then ~/.ssh/<name>
 */
function resolveSshKeyPath(keyName: string): string {
  // Absolute path — use as-is
  if (path.isAbsolute(keyName)) {
    return keyName;
  }

  // Try data/ssh_keys/ directory first
  const appKeyPath = path.join(config.sshKeyDir, keyName);
  if (fs.existsSync(appKeyPath)) {
    return appKeyPath;
  }

  // Fallback to ~/.ssh/ directory
  const homeSshPath = path.join(os.homedir(), '.ssh', keyName);
  if (fs.existsSync(homeSshPath)) {
    return homeSshPath;
  }

  // If neither exists, return the app directory path (git will give a clear error)
  return appKeyPath;
}

/**
 * Create a simple-git instance with appropriate configuration.
 * Must enable unsafe.allowUnsafeSshCommand to permit GIT_SSH_COMMAND env var.
 */
function createGitInstance(repoPath: string): SimpleGit {
  return simpleGit({
    baseDir: repoPath,
    binary: 'git',
    maxConcurrentProcesses: 1,
    unsafe: {
      allowUnsafeSshCommand: true,
    },
  });
}

/**
 * Build SSH environment variables for git operations.
 */
function getSshEnv(sshKeyName: string): Record<string, string> {
  const keyPath = resolveSshKeyPath(sshKeyName);
  return {
    GIT_SSH_COMMAND: `ssh -i "${keyPath}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`,
  };
}

/**
 * Resolve the effective source URL with authentication.
 */
function resolveSourceUrl(task: Task): { url: string; env?: Record<string, string> } {
  if (task.sourceAuthType === 'ssh_key') {
    // SSH URL like git@github.com:user/repo.git - no URL modification needed
    const env = task.sourceSshKeyName ? getSshEnv(task.sourceSshKeyName) : undefined;
    return { url: task.sourceRepo, env };
  } else {
    // HTTPS - embed token in URL
    const token = getTaskSourceToken(task.id);
    if (token) {
      return { url: buildAuthUrl(task.sourceRepo, token) };
    }
    return { url: task.sourceRepo };
  }
}

/**
 * Resolve the effective target URL with authentication.
 */
function resolveTargetUrl(task: Task): { url: string; env?: Record<string, string> } {
  if (task.targetAuthType === 'ssh_key') {
    const env = task.targetSshKeyName ? getSshEnv(task.targetSshKeyName) : undefined;
    return { url: task.targetRepo, env };
  } else {
    const token = getTaskTargetToken(task.id);
    if (token) {
      return { url: buildAuthUrl(task.targetRepo, token) };
    }
    return { url: task.targetRepo };
  }
}

/**
 * Merge environment variables from source and target configs.
 * NOTE: If both use SSH with different keys, this is problematic.
 * We keep this for backward compat but prefer using separate envs for fetch vs push.
 */
function mergeEnv(sourceEnv?: Record<string, string>, targetEnv?: Record<string, string>): Record<string, string> | undefined {
  if (!sourceEnv && !targetEnv) return undefined;
  const merged: Record<string, string> = {};
  if (sourceEnv) Object.assign(merged, sourceEnv);
  if (targetEnv) Object.assign(merged, targetEnv);
  return merged;
}

/**
 * Check if a directory is a valid git repository (bare or normal).
 * Must have core structure — not just a HEAD file (could be leftover from failed clone).
 */
function isValidGitRepo(repoPath: string): boolean {
  // Normal repo has .git/ directory with objects and refs
  const gitDir = path.join(repoPath, '.git');
  if (fs.existsSync(gitDir)) {
    return fs.existsSync(path.join(gitDir, 'objects')) && fs.existsSync(path.join(gitDir, 'refs'));
  }
  // Bare repo: must have HEAD + objects/ + refs/ (HEAD alone is not enough)
  if (fs.existsSync(path.join(repoPath, 'HEAD'))) {
    return fs.existsSync(path.join(repoPath, 'objects')) && fs.existsSync(path.join(repoPath, 'refs'));
  }
  return false;
}

/**
 * Build fetch refspecs based on branches config.
 * Always fetches everything from source (we need the refs locally),
 * but the push step will filter what gets sent to target.
 */
function buildFetchRefspecs(branchesConfig: BranchesConfig): string[] {
  const refspecs: string[] = [];

  // Always fetch all branches and tags from source to have them locally
  // (filtering happens at push time)
  refspecs.push('+refs/heads/*:refs/heads/*');
  refspecs.push('+refs/tags/*:refs/tags/*');

  return refspecs;
}

/**
 * Build push refspecs based on branches config.
 */
function buildPushRefspecs(branchesConfig: BranchesConfig): string[] {
  const refspecs: string[] = [];

  if (branchesConfig.syncAllBranches) {
    refspecs.push('+refs/heads/*:refs/heads/*');
  } else if (branchesConfig.branches.length > 0) {
    // Push only specific branches
    for (const branch of branchesConfig.branches) {
      refspecs.push(`+refs/heads/${branch}:refs/heads/${branch}`);
    }
  }

  if (branchesConfig.syncAllTags) {
    refspecs.push('+refs/tags/*:refs/tags/*');
  } else if (branchesConfig.tags.length > 0) {
    // Push only specific tags
    for (const tag of branchesConfig.tags) {
      refspecs.push(`+refs/tags/${tag}:refs/tags/${tag}`);
    }
  }

  return refspecs;
}

/**
 * Parsed push detail for sync log.
 */
interface PushDetail {
  branches: { name: string; commits: number }[];
  tags: { name: string; isNew: boolean }[];
  totalCommits: number;
  mode: string;
}

/**
 * Count commits to push for each branch by comparing local refs with target remote refs.
 * Uses `git rev-list --count <target_ref>..<local_ref>` for each branch.
 * For new branches (target doesn't have it), counts all commits on that branch.
 */
async function buildSyncDetail(
  git: SimpleGit,
  branchesConfig: BranchesConfig,
  env: Record<string, string>
): Promise<PushDetail> {
  const branches: { name: string; commits: number }[] = [];
  const tags: { name: string; isNew: boolean }[] = [];
  let totalCommits = 0;

  try {
    // Get list of local branches in the bare repo
    const localBranchOutput = await git.raw(['for-each-ref', '--format=%(refname:short)', 'refs/heads/']);
    const localBranches = localBranchOutput.trim().split('\n').filter(Boolean);

    // Get list of local tags
    const localTagOutput = await git.raw(['for-each-ref', '--format=%(refname:short)', 'refs/tags/']);
    const localTags = localTagOutput.trim().split('\n').filter(Boolean);

    // Get target remote refs to compare
    let targetRefs: Set<string> = new Set();
    try {
      const targetRefOutput = await git.env(env).raw(['ls-remote', '--refs', 'target']);
      for (const line of targetRefOutput.split('\n')) {
        const parts = line.trim().split('\t');
        if (parts.length >= 2) {
          targetRefs.add(parts[1]);
        }
      }
    } catch {
      // If ls-remote fails (e.g., empty repo), all refs are new
    }

    // Determine which branches to report on
    let branchesToCheck: string[] = [];
    if (branchesConfig.syncAllBranches) {
      branchesToCheck = localBranches;
    } else if (branchesConfig.branches.length > 0) {
      branchesToCheck = branchesConfig.branches.filter(b => localBranches.includes(b));
    }

    // Count commits for each branch
    for (const branch of branchesToCheck) {
      const targetHasIt = targetRefs.has(`refs/heads/${branch}`);
      let commits = 0;

      if (targetHasIt) {
        // Count commits that are in local but not in target
        try {
          const countOutput = await git.env(env).raw([
            'rev-list', '--count', `target/${branch}..refs/heads/${branch}`
          ]);
          commits = parseInt(countOutput.trim(), 10) || 0;
        } catch {
          // If comparison fails, try counting all commits
          try {
            const countOutput = await git.raw(['rev-list', '--count', `refs/heads/${branch}`]);
            commits = parseInt(countOutput.trim(), 10) || 0;
          } catch {
            commits = 0;
          }
        }
      } else {
        // New branch - count all commits on it
        try {
          const countOutput = await git.raw(['rev-list', '--count', `refs/heads/${branch}`]);
          commits = parseInt(countOutput.trim(), 10) || 0;
        } catch {
          commits = 0;
        }
      }

      branches.push({ name: branch, commits });
      totalCommits += commits;
    }

    // Determine which tags to report on
    let tagsToCheck: string[] = [];
    if (branchesConfig.syncAllTags) {
      tagsToCheck = localTags;
    } else if (branchesConfig.tags.length > 0) {
      tagsToCheck = branchesConfig.tags.filter(t => localTags.includes(t));
    }

    // Check which tags are new
    for (const tag of tagsToCheck) {
      const targetHasIt = targetRefs.has(`refs/tags/${tag}`);
      tags.push({ name: tag, isNew: !targetHasIt });
    }
  } catch (err) {
    // If detail gathering fails, return basic info from config
    if (branchesConfig.syncAllBranches) {
      branches.push({ name: '(all)', commits: 0 });
    } else {
      for (const b of branchesConfig.branches) {
        branches.push({ name: b, commits: 0 });
      }
    }
    if (branchesConfig.syncAllTags) {
      tags.push({ name: '(all)', isNew: false });
    } else {
      for (const t of branchesConfig.tags) {
        tags.push({ name: t, isNew: false });
      }
    }
  }

  return {
    branches,
    tags,
    totalCommits,
    mode: branchesConfig.mode,
  };
}

/**
 * Execute a git sync operation for a task.
 * Steps:
 * 1. Read task config and parse branches
 * 2. Update status to running
 * 3. Prepare working directory
 * 4. Clone or fetch source (using source auth only)
 * 5. Push to target based on branch config (using target auth only)
 * 6. Update status and write log
 */
export async function executeSync(taskId: string, triggerType: 'cron' | 'manual'): Promise<SyncLog> {
  const startTime = new Date();
  const startTimeStr = formatLocal(startTime);

  // Read task
  const task = getTaskById(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Parse branches configuration
  const branchesConfig = parseBranchesConfig(task);

  // Update status to running
  updateTaskStatus(taskId, 'running');

  let commitCount = 0;
  let errorMessage: string | null = null;
  let syncStatus: 'success' | 'failed' = 'success';
  let syncDetail: string | null = null;  // JSON detail of synced branches/tags

  try {
    const repoPath = ensureRepoDir(taskId);

    // Resolve source and target URLs with their respective authentication
    const source = resolveSourceUrl(task);
    const target = resolveTargetUrl(task);

    // FIX: Use separate env for fetch (source) and push (target) to avoid SSH key conflicts
    const sourceEnv = source.env || {};
    const targetEnv = target.env || {};

    // Always ensure we have a clean directory for bare clone, or a valid repo for fetch
    if (isValidGitRepo(repoPath)) {
      // Fetch from source using SOURCE auth only
      const git = createGitInstance(repoPath);
      const fetchRefspecs = buildFetchRefspecs(branchesConfig);
      await git.env(sourceEnv).raw([
        'fetch', 'origin',
        ...fetchRefspecs,
        '--prune',
      ]);
    } else {
      // Directory is empty, corrupted, or has leftover files — clean it and do a bare clone
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
      }
      fs.mkdirSync(repoPath, { recursive: true });

      // Clone using SOURCE auth only
      const tmpGit = simpleGit({
        baseDir: os.tmpdir(),
        binary: 'git',
        unsafe: { allowUnsafeSshCommand: true },
      });
      await tmpGit.env(sourceEnv).clone(source.url, repoPath, ['--bare', '--origin', 'origin']);
    }

    // Create a new git instance pointing to the now-valid repo
    const git = createGitInstance(repoPath);

    // Ensure the 'target' remote points to the target URL
    const remotes = await git.getRemotes(true);
    const targetRemote = remotes.find((r: any) => r.name === 'target');

    if (targetRemote) {
      await git.remote(['set-url', 'target', target.url]);
    } else {
      await git.addRemote('target', target.url);
    }

    // Build push refspecs based on branches config
    const pushRefspecs = buildPushRefspecs(branchesConfig);

    if (pushRefspecs.length === 0) {
      throw new Error('No branches or tags configured for sync');
    }

    // Gather detail BEFORE push (compare local vs target to count commits)
    const detail = await buildSyncDetail(git, branchesConfig, targetEnv);
    syncDetail = JSON.stringify(detail);
    commitCount = detail.totalCommits;

    // Push to target using TARGET auth only
    await git.env(targetEnv).raw([
      'push', '--force', 'target',
      ...pushRefspecs,
    ]);

    syncStatus = 'success';
  } catch (err: any) {
    syncStatus = 'failed';
    errorMessage = err.message || 'Unknown sync error';

    // Update task status to error
    updateTaskStatus(taskId, 'error', {
      lastSyncAt: startTimeStr,
      lastSyncStatus: 'failed',
      errorMessage: errorMessage,
    });

    // Trigger notification on failure
    if (errorMessage) {
      sendFailureNotification(task, errorMessage).catch(() => {
        // Notification failure is logged but doesn't throw
      });
    }
  }

  const endTime = new Date();
  const endTimeStr = formatLocal(endTime);
  const duration = endTime.getTime() - startTime.getTime();

  // If success, update task status
  if (syncStatus === 'success') {
    updateTaskStatus(taskId, 'idle', {
      lastSyncAt: endTimeStr,
      lastSyncStatus: 'success',
      lastSyncDuration: duration,
      errorMessage: null,
    });

    // Send success notification if configured
    sendSuccessNotification(task, duration).catch(() => {
      // Notification failure is logged but doesn't throw
    });
  } else {
    // Update duration for failed sync
    updateTaskStatus(taskId, 'error', {
      lastSyncDuration: duration,
    });
  }

  // Create sync log
  const log = createSyncLog({
    taskId: task.id,
    taskName: task.name,
    status: syncStatus,
    startTime: startTimeStr,
    endTime: endTimeStr,
    duration,
    commitCount,
    errorMessage,
    detail: syncDetail,
    triggerType,
  });

  return log;
}

/**
 * List remote branches and tags for a given repository URL.
 * Used by the UI to populate branch selection.
 */
export async function listRemoteRefs(
  repoUrl: string,
  authType: 'https_token' | 'ssh_key',
  token?: string,
  sshKeyName?: string
): Promise<{ branches: string[]; tags: string[] }> {
  let url = repoUrl;
  let env: Record<string, string> = {};

  if (authType === 'ssh_key' && sshKeyName) {
    env = getSshEnv(sshKeyName);
  } else if (authType === 'https_token' && token) {
    url = buildAuthUrl(repoUrl, token);
  }

  const git = simpleGit({
    binary: 'git',
    unsafe: { allowUnsafeSshCommand: true },
  });

  // Use ls-remote to list refs without cloning
  const result = await git.env(env).listRemote(['--refs', url]);

  const branches: string[] = [];
  const tags: string[] = [];

  for (const line of result.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');
    if (parts.length < 2) continue;

    const ref = parts[1];
    if (ref.startsWith('refs/heads/')) {
      branches.push(ref.replace('refs/heads/', ''));
    } else if (ref.startsWith('refs/tags/')) {
      // Skip ^{} dereferenced tag entries
      const tagName = ref.replace('refs/tags/', '');
      if (!tagName.endsWith('^{}')) {
        tags.push(tagName);
      }
    }
  }

  return { branches, tags };
}

/**
 * Initialize the repos data directory.
 */
export function initRepoDir(): void {
  if (!fs.existsSync(config.repoDir)) {
    fs.mkdirSync(config.repoDir, { recursive: true });
  }
  if (!fs.existsSync(config.sshKeyDir)) {
    fs.mkdirSync(config.sshKeyDir, { recursive: true });
  }
}
