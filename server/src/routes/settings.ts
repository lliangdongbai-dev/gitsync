import { Router, Request, Response, NextFunction } from 'express';
import { getAllSettings, getSetting, setSetting } from '../models/setting';
import { ApiResponse, Setting, NotificationChannel } from '../types';
import { testNotification } from '../services/notifier';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/** Async route handler wrapper for Express 4 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/settings - Get all settings as a key-value record
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = getAllSettings();
    const response: ApiResponse<typeof settings> = {
      code: 0,
      data: settings,
      message: 'ok',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/settings/:key - Get a single setting by key
 */
router.get('/:key', (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = getSetting(req.params.key);
    if (!setting) {
      const response: ApiResponse<{ key: string; value: null }> = {
        code: 0,
        data: { key: req.params.key, value: null },
        message: 'ok',
      };
      res.json(response);
      return;
    }
    const response: ApiResponse<Setting> = {
      code: 0,
      data: setting,
      message: 'ok',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings/:key - Set a setting value
 */
router.put('/:key', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      throw new HttpError(400, 'Value is required');
    }

    const setting = setSetting(req.params.key, value);
    const response: ApiResponse<Setting> = {
      code: 0,
      data: setting,
      message: 'Setting updated successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/test-notification - Test a notification channel
 */
router.post('/test-notification', asyncHandler(async (req: Request, res: Response) => {
  const { channel } = req.body as { channel: NotificationChannel };
  if (!channel || !['dingtalk', 'feishu', 'smtp', 'webhook'].includes(channel)) {
    throw new HttpError(400, 'Invalid notification channel. Must be: dingtalk, feishu, smtp, or webhook');
  }

  const result = await testNotification(channel);
  const response: ApiResponse<typeof result> = {
    code: result.success ? 0 : 1,
    data: result,
    message: result.message,
  };
  res.json(response);
}));

export default router;
