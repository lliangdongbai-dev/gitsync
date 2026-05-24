import axios, { AxiosInstance } from 'axios';
import { ApiResponse, Task, CreateTaskReq, UpdateTaskReq, SyncLog, PaginatedSyncLogs, SyncLogQuery, NotificationChannel, TestNotificationResult, Setting, ListBranchesReq, RemoteRefs } from '../types';

/** Base API URL - uses relative path in production (proxied), localhost in dev */
const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

/** Axios instance with default configuration */
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Basic Auth header if credentials are available
apiClient.interceptors.request.use((config) => {
  const authUser = localStorage.getItem('gitsync_auth_user') || '';
  const authPass = localStorage.getItem('gitsync_auth_pass') || '';
  if (authUser && authPass) {
    config.headers.Authorization = `Basic ${btoa(`${authUser}:${authPass}`)}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored credentials on auth failure
      localStorage.removeItem('gitsync_auth_user');
      localStorage.removeItem('gitsync_auth_pass');
    }
    return Promise.reject(error);
  }
);

// ==================== Tasks API ====================

/** Get all tasks */
export async function getTasks(): Promise<Task[]> {
  const res = await apiClient.get<ApiResponse<Task[]>>('/api/tasks');
  return res.data.data;
}

/** Get a task by ID */
export async function getTask(id: string): Promise<Task> {
  const res = await apiClient.get<ApiResponse<Task>>(`/api/tasks/${id}`);
  return res.data.data;
}

/** Create a new task */
export async function createTask(req: CreateTaskReq): Promise<Task> {
  const res = await apiClient.post<ApiResponse<Task>>('/api/tasks', req);
  return res.data.data;
}

/** Update an existing task */
export async function updateTask(id: string, req: UpdateTaskReq): Promise<Task> {
  const res = await apiClient.put<ApiResponse<Task>>(`/api/tasks/${id}`, req);
  return res.data.data;
}

/** Delete a task */
export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}

/** List remote branches and tags for a repository */
export async function listBranches(req: ListBranchesReq): Promise<RemoteRefs> {
  const res = await apiClient.post<ApiResponse<RemoteRefs>>('/api/tasks/list-branches', req);
  return res.data.data;
}

// ==================== Sync API ====================

/** Start a task's scheduled sync */
export async function startTask(id: string): Promise<{ taskId: string; status: string }> {
  const res = await apiClient.post<ApiResponse<{ taskId: string; status: string }>>(`/api/sync/${id}/start`);
  return res.data.data;
}

/** Stop a task's scheduled sync */
export async function stopTask(id: string): Promise<{ taskId: string; status: string }> {
  const res = await apiClient.post<ApiResponse<{ taskId: string; status: string }>>(`/api/sync/${id}/stop`);
  return res.data.data;
}

/** Manually trigger a sync - waits for completion and returns result */
export async function triggerSync(id: string): Promise<SyncLog> {
  const res = await apiClient.post<ApiResponse<SyncLog>>(`/api/sync/${id}/trigger`);
  return res.data.data;
}

// ==================== Sync Logs API ====================

/** Query sync logs with filtering and pagination */
export async function getSyncLogs(query: SyncLogQuery): Promise<PaginatedSyncLogs> {
  const params: Record<string, string | number> = {};
  if (query.taskId) params.taskId = query.taskId;
  if (query.status) params.status = query.status;
  if (query.tab) params.tab = query.tab;
  if (query.limit) params.limit = query.limit;
  if (query.offset) params.offset = query.offset;

  const res = await apiClient.get<ApiResponse<PaginatedSyncLogs>>('/api/sync-logs', { params });
  return res.data.data;
}

/** Get a sync log by ID */
export async function getSyncLog(id: string): Promise<SyncLog> {
  const res = await apiClient.get<ApiResponse<SyncLog>>(`/api/sync-logs/${id}`);
  return res.data.data;
}

/** Delete a sync log */
export async function deleteSyncLog(id: string): Promise<void> {
  await apiClient.delete(`/api/sync-logs/${id}`);
}

// ==================== Settings API ====================

/** Get all settings */
export async function getSettings(): Promise<Record<string, any>> {
  const res = await apiClient.get<ApiResponse<Record<string, any>>>('/api/settings');
  return res.data.data;
}

/** Get a single setting */
export async function getSetting(key: string): Promise<Setting> {
  const res = await apiClient.get<ApiResponse<Setting>>(`/api/settings/${key}`);
  return res.data.data;
}

/** Set a setting value */
export async function setSetting(key: string, value: any): Promise<Setting> {
  const res = await apiClient.put<ApiResponse<Setting>>(`/api/settings/${key}`, { value });
  return res.data.data;
}

/** Test a notification channel */
export async function testNotification(channel: NotificationChannel): Promise<TestNotificationResult> {
  const res = await apiClient.post<ApiResponse<TestNotificationResult>>('/api/settings/test-notification', { channel });
  return res.data.data;
}

// ==================== Health API ====================

/** Health check */
export async function healthCheck(): Promise<{ status: string; uptime: number; db: string }> {
  const res = await apiClient.get<ApiResponse<{ status: string; uptime: number; db: string }>>('/api/health');
  return res.data.data;
}
