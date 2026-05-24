// GitSync TypeScript Type Definitions

/** Authentication type for git operations */
export type AuthType = 'https_token' | 'ssh_key';

/** Task status values */
export type TaskStatus = 'idle' | 'running' | 'stopped' | 'error';

/** Sync log status values */
export type SyncStatus = 'success' | 'failed';

/** Trigger type for sync operations */
export type TriggerType = 'cron' | 'manual';

/**
 * Branch sync mode:
 * - 'all_branches': sync all branches
 * - 'all_tags': sync all tags
 * - 'all': sync all branches AND tags
 * - string[]: specific branch/tag names to sync
 */
export type BranchSyncMode = 'all_branches' | 'all_tags' | 'all';

/** Parsed branches configuration */
export interface BranchesConfig {
  mode: BranchSyncMode | 'custom';
  branches: string[];  // specific branch names (when mode is 'custom')
  tags: string[];      // specific tag names (when mode is 'custom')
  syncAllBranches: boolean;
  syncAllTags: boolean;
}

/** Task entity from database */
export interface Task {
  id: string;
  name: string;
  sourceRepo: string;
  targetRepo: string;
  branch: string;           // legacy field (kept for backward compat)
  branches: string;         // JSON string: e.g. {"mode":"all"} or {"mode":"custom","branches":["main"],"tags":["v1.0"]}
  syncFrequency: number;    // minutes
  sourceAuthType: AuthType;
  sourceHttpsToken: string | null;
  sourceSshKeyName: string | null;
  targetAuthType: AuthType;
  targetHttpsToken: string | null;
  targetSshKeyName: string | null;
  status: TaskStatus;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncDuration: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Database row representation (snake_case) */
export interface TaskRow {
  id: string;
  name: string;
  source_repo: string;
  target_repo: string;
  branch: string;
  branches: string;
  sync_frequency: number;
  source_auth_type: string;
  source_https_token: string | null;
  source_ssh_key_name: string | null;
  target_auth_type: string;
  target_https_token: string | null;
  target_ssh_key_name: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_duration: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Request body for creating a task */
export interface CreateTaskReq {
  name: string;
  sourceRepo: string;
  targetRepo: string;
  branch?: string;
  branches?: string;  // JSON string for branch config
  syncFrequency: number; // minutes
  sourceAuthType: AuthType;
  sourceHttpsToken?: string;
  sourceSshKeyName?: string;
  targetAuthType: AuthType;
  targetHttpsToken?: string;
  targetSshKeyName?: string;
}

/** Request body for updating a task */
export interface UpdateTaskReq {
  name?: string;
  sourceRepo?: string;
  targetRepo?: string;
  branch?: string;
  branches?: string;  // JSON string for branch config
  syncFrequency?: number;
  sourceAuthType?: AuthType;
  sourceHttpsToken?: string;
  sourceSshKeyName?: string;
  targetAuthType?: AuthType;
  targetHttpsToken?: string;
  targetSshKeyName?: string;
}

/** Request body for listing remote branches */
export interface ListBranchesReq {
  repoUrl: string;
  authType: AuthType;
  httpsToken?: string;
  sshKeyName?: string;
}

/** Remote ref info */
export interface RemoteRef {
  name: string;
  type: 'branch' | 'tag';
}

/** Sync log entity from database */
export interface SyncLog {
  id: string;
  taskId: string;
  taskName: string;
  status: SyncStatus;
  startTime: string;
  endTime: string;
  duration: number;
  commitCount: number;
  errorMessage: string | null;
  detail: string | null;  // JSON: synced branches/tags info
  triggerType: TriggerType;
  createdAt: string;
}

/** Database row representation for sync logs (snake_case) */
export interface SyncLogRow {
  id: string;
  task_id: string;
  task_name: string;
  status: string;
  start_time: string;
  end_time: string;
  duration: number;
  commit_count: number;
  error_message: string | null;
  detail: string | null;
  trigger_type: string;
  created_at: string;
}

/** Setting entity from database */
export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

/** Database row representation for settings (snake_case) */
export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

/** API response wrapper */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/** Paginated sync logs response */
export interface PaginatedSyncLogs {
  items: SyncLog[];
  total: number;
}

/** Sync logs query parameters */
export interface SyncLogQuery {
  taskId?: string;
  status?: SyncStatus;
  tab?: 'recent' | 'all';
  limit?: number;
  offset?: number;
}

/** Health check response */
export interface HealthResponse {
  status: 'ok';
  uptime: number;
  db: 'ok' | 'error';
}

/** Notification channel type */
export type NotificationChannel = 'dingtalk' | 'feishu' | 'smtp' | 'webhook';

/** Test notification request */
export interface TestNotificationReq {
  channel: NotificationChannel;
}

/** Application configuration */
export interface AppConfig {
  port: number;
  dbPath: string;
  repoDir: string;
  sshKeyDir: string;
  authUser: string;
  authPass: string;
  logRetentionDays: number;
  encryptionKey: string;
}
