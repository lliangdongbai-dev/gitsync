import { createApp } from './app';
import { startScheduler } from './services/scheduler';
import { initRepoDir } from './services/gitSync';
import config from './config';

const PORT = config.port;

async function main(): Promise<void> {
  // Initialize repository directories
  initRepoDir();

  // Create Express app
  const app = createApp();

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`GitSync server running on http://localhost:${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);

    // Start the scheduler after server is up
    startScheduler();
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down GitSync server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start GitSync server:', err);
  process.exit(1);
});
