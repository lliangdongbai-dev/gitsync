import express from 'express';
import cors from 'cors';
import path from 'path';
import { basicAuth } from './middleware/auth';
import { errorHandler, HttpError } from './middleware/errorHandler';
import taskRoutes from './routes/tasks';
import syncLogRoutes from './routes/syncLogs';
import settingRoutes from './routes/settings';
import syncRoutes from './routes/sync';
import { initDb, getDb } from './db';
import { ApiResponse, HealthResponse } from './types';
import { addClient, removeClient } from './services/eventBus';

/**
 * Create and configure the Express application.
 */
export function createApp(): express.Application {
  const app = express();

  // Initialize database
  initDb();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from client build
  const clientBuildPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // Health check endpoint (no auth required)
  app.get('/api/health', (req, res) => {
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      getDb().prepare('SELECT 1').get();
    } catch {
      dbStatus = 'error';
    }

    const health: HealthResponse = {
      status: 'ok',
      uptime: process.uptime(),
      db: dbStatus,
    };

    const response: ApiResponse<HealthResponse> = {
      code: 0,
      data: health,
      message: 'ok',
    };
    res.json(response);
  });

  // SSE endpoint for real-time task status updates (no auth for simplicity)
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send initial heartbeat
    res.write('event: connected\ndata: {"status":"ok"}\n\n');

    addClient(res);

    // Remove client on disconnect
    req.on('close', () => {
      removeClient(res);
    });
  });

  // Apply basic auth to API routes
  app.use('/api', basicAuth);

  // API routes
  app.use('/api/tasks', taskRoutes);
  app.use('/api/sync-logs', syncLogRoutes);
  app.use('/api/settings', settingRoutes);
  app.use('/api/sync', syncRoutes);

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
          res.status(404).json({ code: 404, data: null, message: 'Page not found' });
        }
      });
    }
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
