import { getDb } from '../db';
import { SyncLog, SyncLogRow, SyncLogQuery, PaginatedSyncLogs } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { nowLocal } from '../utils/time';

/**
 * Convert a database row (snake_case) to a SyncLog object (camelCase).
 */
function rowToSyncLog(row: SyncLogRow): SyncLog {
  return {
    id: row.id,
    taskId: row.task_id,
    taskName: row.task_name,
    status: row.status as SyncLog['status'],
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    commitCount: row.commit_count,
    errorMessage: row.error_message,
    detail: row.detail,
    triggerType: row.trigger_type as SyncLog['triggerType'],
    createdAt: row.created_at,
  };
}

/**
 * Create a new sync log entry.
 */
export function createSyncLog(log: Omit<SyncLog, 'id' | 'createdAt'>): SyncLog {
  const db = getDb();
  const id = uuidv4();
  const now = nowLocal();

  db.prepare(`
    INSERT INTO sync_logs (id, task_id, task_name, status, start_time, end_time, duration, commit_count, error_message, detail, trigger_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    log.taskId,
    log.taskName,
    log.status,
    log.startTime,
    log.endTime,
    log.duration,
    log.commitCount,
    log.errorMessage,
    log.detail,
    log.triggerType,
    now
  );

  return getSyncLogById(id)!;
}

/**
 * Get a sync log by ID.
 */
export function getSyncLogById(id: string): SyncLog | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sync_logs WHERE id = ?').get(id) as SyncLogRow | undefined;
  return row ? rowToSyncLog(row) : null;
}

/**
 * Query sync logs with filtering and pagination.
 */
export function querySyncLogs(query: SyncLogQuery): PaginatedSyncLogs {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  // Filter by taskId
  if (query.taskId) {
    conditions.push('task_id = ?');
    params.push(query.taskId);
  }

  // Filter by status
  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }

  // Filter by tab
  if (query.tab === 'recent') {
    conditions.push("start_time >= datetime('now', '-24 hours')");
  } else if (query.tab === 'all') {
    // For 'all' tab, limit to 7 days
    conditions.push("start_time >= datetime('now', '-7 days')");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM sync_logs ${whereClause}`).get(...params) as { count: number };
  const total = countRow.count;

  // Get paginated results
  const limit = query.limit || 20;
  const offset = query.offset || 0;

  const rows = db.prepare(
    `SELECT * FROM sync_logs ${whereClause} ORDER BY start_time DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as SyncLogRow[];

  return {
    items: rows.map(rowToSyncLog),
    total,
  };
}

/**
 * Delete a sync log by ID.
 */
export function deleteSyncLog(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM sync_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Delete sync logs older than a specified number of days.
 */
export function deleteOldLogs(days: number): number {
  const db = getDb();
  const result = db.prepare(
    `DELETE FROM sync_logs WHERE created_at < datetime('now', '-' || ? || ' days')`
  ).run(days);
  return result.changes;
}
