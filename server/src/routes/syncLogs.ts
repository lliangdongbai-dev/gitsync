import { Router, Request, Response, NextFunction } from 'express';
import { querySyncLogs, getSyncLogById, deleteSyncLog } from '../models/syncLog';
import { ApiResponse, SyncLogQuery, PaginatedSyncLogs, SyncLog } from '../types';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/sync-logs - Query sync logs with filtering and pagination
 * Query params: taskId, status, tab (recent|all), limit, offset
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: SyncLogQuery = {
      taskId: req.query.taskId as string | undefined,
      status: req.query.status as any | undefined,
      tab: req.query.tab as 'recent' | 'all' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const result = querySyncLogs(query);
    const response: ApiResponse<PaginatedSyncLogs> = {
      code: 0,
      data: result,
      message: 'ok',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sync-logs/:id - Get a sync log by ID
 */
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = getSyncLogById(req.params.id);
    if (!log) {
      throw new HttpError(404, `Sync log not found: ${req.params.id}`);
    }
    const response: ApiResponse<SyncLog> = {
      code: 0,
      data: log,
      message: 'ok',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/sync-logs/:id - Delete a sync log
 */
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = deleteSyncLog(req.params.id);
    if (!deleted) {
      throw new HttpError(404, `Sync log not found: ${req.params.id}`);
    }
    const response: ApiResponse<Record<string, never>> = {
      code: 0,
      data: {},
      message: 'Sync log deleted successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
