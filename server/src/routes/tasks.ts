import { Router, Request, Response, NextFunction } from 'express';
import { getAllTasks, getTaskById, createTask, updateTask, deleteTask } from '../models/task';
import { listRemoteRefs } from '../services/gitSync';
import { registerTask, isTaskScheduled } from '../services/scheduler';
import { ApiResponse, CreateTaskReq, UpdateTaskReq, ListBranchesReq } from '../types';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/** Async route handler wrapper for Express 4 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/tasks - Get all tasks
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = getAllTasks();
    const response: ApiResponse<typeof tasks> = {
      code: 0,
      data: tasks,
      message: 'ok',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/list-branches - List remote branches and tags
 * NOTE: Must be registered before /:id routes to avoid path conflicts
 */
router.post('/list-branches', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as ListBranchesReq;

  if (!body.repoUrl) {
    throw new HttpError(400, 'Repository URL is required');
  }
  if (!body.authType) {
    throw new HttpError(400, 'Auth type is required');
  }

  try {
    const refs = await listRemoteRefs(
      body.repoUrl,
      body.authType,
      body.httpsToken,
      body.sshKeyName
    );

    const response: ApiResponse<{ branches: string[]; tags: string[] }> = {
      code: 0,
      data: refs,
      message: 'ok',
    };
    res.json(response);
  } catch (err: any) {
    throw new HttpError(400, `Failed to list remote refs: ${err.message}`);
  }
}));

/**
 * GET /api/tasks/:id - Get a task by ID
 */
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = getTaskById(req.params.id);
    if (!task) {
      throw new HttpError(404, `Task not found: ${req.params.id}`);
    }
    const response: ApiResponse<typeof task> = {
      code: 0,
      data: task,
      message: 'ok',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as CreateTaskReq;

    // Validate required fields
    if (!body.name) throw new HttpError(400, 'Task name is required');
    if (!body.sourceRepo) throw new HttpError(400, 'Source repository URL is required');
    if (!body.targetRepo) throw new HttpError(400, 'Target repository URL is required');
    if (!body.syncFrequency || body.syncFrequency < 1) throw new HttpError(400, 'Sync frequency must be at least 1 minute');

    const task = createTask(body);
    const response: ApiResponse<typeof task> = {
      code: 0,
      data: task,
      message: 'Task created successfully',
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id - Update a task
 */
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = getTaskById(req.params.id);
    if (!existing) {
      throw new HttpError(404, `Task not found: ${req.params.id}`);
    }

    const body = req.body as UpdateTaskReq;
    const task = updateTask(req.params.id, body);

    // If task is active and frequency changed, re-register the cron job
    if (task && (task.status === 'idle' || isTaskScheduled(req.params.id))) {
      const newFreq = body.syncFrequency ?? existing.syncFrequency;
      registerTask(req.params.id, newFreq);
    }

    const response: ApiResponse<typeof task> = {
      code: 0,
      data: task,
      message: 'Task updated successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id - Delete a task
 */
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = deleteTask(req.params.id);
    if (!deleted) {
      throw new HttpError(404, `Task not found: ${req.params.id}`);
    }
    const response: ApiResponse<Record<string, never>> = {
      code: 0,
      data: {},
      message: 'Task deleted successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
