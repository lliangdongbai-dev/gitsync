// GitSync Client Type Definitions

/** Authentication type for git operations */
export type AuthType = 'https_token' | 'ssh_key';

/** Task status values */
export type TaskStatus = 'idle' | 'running' | 'stopped' | 'error';

/** Sync log status values */
export type SyncStatus = 'success' | 'failed';

/** Trigger type for sync operations */
export type TriggerType = 'cron' | 'manual';

/** Branch sync mode */
export type BranchSyncMode = 'all_branches' | 'all_tags' | 'all' | 'custom';

/** Branches configuration stored as JSON */
export interface BranchesConfig {
  mode: BranchSyncMode;
  branches?: string[];  // specific branch names (when mode is 'custom')
  tags?: string[];      // specific tag names (when mode is 'custom')
}

/** Task entity */
export interface Task {
  id: string;
  name: string;
  sourceRepo: string;
  targetRepo: string;
  branch: string;
  branches: string;  // JSON string of BranchesConfig
  syncFrequency: number; // minutes
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

/** Request body for creating a task */
export interface CreateTaskReq {
  name: string;
  sourceRepo: string;
  targetRepo: string;
  branch?: string;
  branches?: string;  // JSON string of BranchesConfig
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
  branches?: string;  // JSON string of BranchesConfig
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

/** Remote refs response */
export interface RemoteRefs {
  branches: string[];
  tags: string[];
}

/** Sync log entity */
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

/** Parsed sync detail */
export interface SyncDetail {
  branches: { name: string; commits: number }[];
  tags: { name: string; isNew: boolean }[];
  totalCommits: number;
  mode: string;
}

/** Setting entity */
export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
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

/** Notification channel type */
export type NotificationChannel = 'dingtalk' | 'feishu' | 'smtp' | 'webhook';

/** Test notification result */
export interface TestNotificationResult {
  success: boolean;
  message: string;
}
