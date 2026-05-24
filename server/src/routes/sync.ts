import { Router, Request, Response, NextFunction } from 'express';
import { getTaskById, updateTaskStatus } from '../models/task';
import { executeSync } from '../services/gitSync';
import { registerTask, unregisterTask } from '../services/scheduler';
import { ApiResponse } from '../types';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/** Async route handler wrapper for Express 4 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * POST /api/sync/:id/start - Start a task's scheduled sync
 */
router.post('/:id/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = getTaskById(req.params.id);
    if (!task) {
      throw new HttpError(404, `Task not found: ${req.params.id}`);
    }

    if (task.status === 'running') {
      throw new HttpError(400, 'Task is already running');
    }

    // Register the scheduled task
    registerTask(task.id, task.syncFrequency);

    // Update task status to idle (ready for scheduled runs)
    updateTaskStatus(task.id, 'idle');

    const updatedTask = getTaskById(req.params.id);
    const response: ApiResponse<{ taskId: string; status: string }> = {
      code: 0,
      data: {
        taskId: task.id,
        status: updatedTask?.status || 'idle',
      },
      message: 'Task started successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/:id/stop - Stop a task's scheduled sync
 */
router.post('/:id/stop', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = getTaskById(req.params.id);
    if (!task) {
      throw new HttpError(404, `Task not found: ${req.params.id}`);
    }

    // Unregister the scheduled task
    unregisterTask(task.id);

    // Update task status to stopped
    updateTaskStatus(task.id, 'stopped');

    const updatedTask = getTaskById(req.params.id);
    const response: ApiResponse<{ taskId: string; status: string }> = {
      code: 0,
      data: {
        taskId: task.id,
        status: updatedTask?.status || 'stopped',
      },
      message: 'Task stopped successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/:id/trigger - Manually trigger a sync for a task
 * Waits for sync to complete and returns the result.
 */
router.post('/:id/trigger', asyncHandler(async (req: Request, res: Response) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    throw new HttpError(404, `Task not found: ${req.params.id}`);
  }

  if (task.status === 'running') {
    throw new HttpError(400, 'Task is already running a sync');
  }

  // Execute sync and wait for result
  const log = await executeSync(task.id, 'manual');

  const response: ApiResponse<typeof log> = {
    code: 0,
    data: log,
    message: log.status === 'success' ? '同步成功' : `同步失败: ${log.errorMessage}`,
  };
  res.json(response);
}));

export default router;
