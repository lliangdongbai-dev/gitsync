import { getDb } from '../db';
import { Task, TaskRow, CreateTaskReq, UpdateTaskReq } from '../types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import config from '../config';
import { broadcast } from '../services/eventBus';
import { nowLocal } from '../utils/time';

/**
 * Encrypt a token value if ENCRYPTION_KEY is set.
 */
function encryptToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (!config.encryptionKey) return token;
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(config.encryptionKey.padEnd(32, '0').slice(0, 32), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a token value if ENCRYPTION_KEY is set.
 */
function decryptToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (!config.encryptionKey) return token;
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return token;
    const iv = Buffer.from(parts[0], 'hex');
    const key = Buffer.from(config.encryptionKey.padEnd(32, '0').slice(0, 32), 'utf8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return token;
  }
}

/**
 * Convert a database row (snake_case) to a Task object (camelCase).
 */
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    sourceRepo: row.source_repo,
    targetRepo: row.target_repo,
    branch: row.branch,
    branches: row.branches || '{"mode":"all"}',
    syncFrequency: row.sync_frequency,
    sourceAuthType: row.source_auth_type as Task['sourceAuthType'],
    sourceHttpsToken: decryptToken(row.source_https_token),
    sourceSshKeyName: row.source_ssh_key_name,
    targetAuthType: row.target_auth_type as Task['targetAuthType'],
    targetHttpsToken: decryptToken(row.target_https_token),
    targetSshKeyName: row.target_ssh_key_name,
    status: row.status as Task['status'],
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status as Task['lastSyncStatus'],
    lastSyncDuration: row.last_sync_duration,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all tasks.
 */
export function getAllTasks(): Task[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as TaskRow[];
  return rows.map(rowToTask);
}

/**
 * Get a task by ID.
 */
export function getTaskById(id: string): Task | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

/**
 * Create a new task.
 */
export function createTask(req: CreateTaskReq): Task {
  const db = getDb();
  const id = uuidv4();
  const now = nowLocal();

  const branch = req.branch || 'main';
  const branches = req.branches || '{"mode":"all"}';
  const encryptedSourceToken = encryptToken(req.sourceHttpsToken);
  const encryptedTargetToken = encryptToken(req.targetHttpsToken);

  db.prepare(`
    INSERT INTO tasks (id, name, source_repo, target_repo, branch, branches, sync_frequency,
      source_auth_type, source_https_token, source_ssh_key_name,
      target_auth_type, target_https_token, target_ssh_key_name,
      status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stopped', ?, ?)
  `).run(
    id,
    req.name,
    req.sourceRepo,
    req.targetRepo,
    branch,
    branches,
    req.syncFrequency,
    req.sourceAuthType,
    encryptedSourceToken,
    req.sourceSshKeyName || null,
    req.targetAuthType,
    encryptedTargetToken,
    req.targetSshKeyName || null,
    now,
    now
  );

  return getTaskById(id)!;
}

/**
 * Update an existing task.
 */
export function updateTask(id: string, req: UpdateTaskReq): Task | null {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const now = nowLocal();
  const encryptedSourceToken = req.sourceHttpsToken !== undefined ? encryptToken(req.sourceHttpsToken) : undefined;
  const encryptedTargetToken = req.targetHttpsToken !== undefined ? encryptToken(req.targetHttpsToken) : undefined;

  const fields: string[] = [];
  const values: any[] = [];

  if (req.name !== undefined) { fields.push('name = ?'); values.push(req.name); }
  if (req.sourceRepo !== undefined) { fields.push('source_repo = ?'); values.push(req.sourceRepo); }
  if (req.targetRepo !== undefined) { fields.push('target_repo = ?'); values.push(req.targetRepo); }
  if (req.branch !== undefined) { fields.push('branch = ?'); values.push(req.branch); }
  if (req.branches !== undefined) { fields.push('branches = ?'); values.push(req.branches); }
  if (req.syncFrequency !== undefined) { fields.push('sync_frequency = ?'); values.push(req.syncFrequency); }
  if (req.sourceAuthType !== undefined) { fields.push('source_auth_type = ?'); values.push(req.sourceAuthType); }
  if (encryptedSourceToken !== undefined) { fields.push('source_https_token = ?'); values.push(encryptedSourceToken); }
  if (req.sourceSshKeyName !== undefined) { fields.push('source_ssh_key_name = ?'); values.push(req.sourceSshKeyName); }
  if (req.targetAuthType !== undefined) { fields.push('target_auth_type = ?'); values.push(req.targetAuthType); }
  if (encryptedTargetToken !== undefined) { fields.push('target_https_token = ?'); values.push(encryptedTargetToken); }
  if (req.targetSshKeyName !== undefined) { fields.push('target_ssh_key_name = ?'); values.push(req.targetSshKeyName); }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getTaskById(id);
}

/**
 * Update task status and related sync fields.
 * Broadcasts status change via SSE to connected clients.
 */
export function updateTaskStatus(
  id: string,
  status: Task['status'],
  options?: {
    lastSyncAt?: string;
    lastSyncStatus?: Task['lastSyncStatus'];
    lastSyncDuration?: number;
    errorMessage?: string | null;
  }
): Task | null {
  const db = getDb();
  const now = nowLocal();

  const fields: string[] = ['status = ?', 'updated_at = ?'];
  const values: any[] = [status, now];

  if (options?.lastSyncAt !== undefined) {
    fields.push('last_sync_at = ?');
    values.push(options.lastSyncAt);
  }
  if (options?.lastSyncStatus !== undefined) {
    fields.push('last_sync_status = ?');
    values.push(options.lastSyncStatus);
  }
  if (options?.lastSyncDuration !== undefined) {
    fields.push('last_sync_duration = ?');
    values.push(options.lastSyncDuration);
  }
  if (options?.errorMessage !== undefined) {
    fields.push('error_message = ?');
    values.push(options.errorMessage);
  }

  values.push(id);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updatedTask = getTaskById(id);

  // Broadcast status change to SSE clients
  if (updatedTask) {
    broadcast('taskStatusChange', {
      taskId: id,
      status: updatedTask.status,
      lastSyncAt: updatedTask.lastSyncAt,
      lastSyncStatus: updatedTask.lastSyncStatus,
      lastSyncDuration: updatedTask.lastSyncDuration,
      errorMessage: updatedTask.errorMessage,
    });
  }

  return updatedTask;
}

/**
 * Delete a task by ID. Also cleans up the local bare repo directory.
 */
export function deleteTask(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  // Clean up the local bare repo directory
  if (result.changes > 0) {
    const repoPath = path.join(config.repoDir, id);
    if (fs.existsSync(repoPath)) {
      try {
        fs.rmSync(repoPath, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to clean up repo directory for task ${id}:`, err);
      }
    }
  }

  return result.changes > 0;
}

/**
 * Get all tasks with a specific status (for scheduler).
 */
export function getTasksByStatus(status: string): Task[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tasks WHERE status = ?').all(status) as TaskRow[];
  return rows.map(rowToTask);
}

/**
 * Get the decrypted source token for a task.
 */
export function getTaskSourceToken(id: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT source_https_token FROM tasks WHERE id = ?').get(id) as { source_https_token: string | null } | undefined;
  return row ? decryptToken(row.source_https_token) : null;
}

/**
 * Get the decrypted target token for a task.
 */
export function getTaskTargetToken(id: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT target_https_token FROM tasks WHERE id = ?').get(id) as { target_https_token: string | null } | undefined;
  return row ? decryptToken(row.target_https_token) : null;
}
