import cron, { ScheduledTask } from 'node-cron';
import { getAllTasks, getTaskById } from '../models/task';
import { deleteOldLogs } from '../models/syncLog';
import { executeSync } from './gitSync';
import config from '../config';

/** Map of scheduled tasks keyed by task ID */
const scheduledTasks = new Map<string, ScheduledTask>();

/** Flag indicating if scheduler has been started */
let schedulerStarted = false;

/**
 * Convert a frequency in minutes to a 6-field cron expression.
 * Format: second minute hour day month dayOfWeek
 * Example: 5 minutes => "0 *\/5 * * * *"
 */
function minutesToCron(minutes: number): string {
  // Validate minutes is a positive integer
  const mins = Math.max(1, Math.floor(minutes));
  return `0 */${mins} * * * *`;
}

/**
 * Register a scheduled sync task.
 * Converts the task's syncFrequency (minutes) to a cron expression
 * and registers it with node-cron.
 */
export function registerTask(taskId: string, minutes: number): void {
  // Unregister existing schedule first
  unregisterTask(taskId);

  const cronExpression = minutesToCron(minutes);

  if (!cron.validate(cronExpression)) {
    console.error(`Invalid cron expression for task ${taskId}: ${cronExpression}`);
    return;
  }

  const task = cron.schedule(cronExpression, async () => {
    try {
      const currentTask = getTaskById(taskId);
      if (currentTask && currentTask.status !== 'running') {
        await executeSync(taskId, 'cron');
      }
    } catch (err) {
      console.error(`Scheduled sync failed for task ${taskId}:`, err);
    }
  }, {
    scheduled: schedulerStarted,
  } as any);

  scheduledTasks.set(taskId, task);
  console.log(`Registered task ${taskId} with cron: ${cronExpression} (${minutes} min)`);
}

/**
 * Unregister a scheduled sync task.
 */
export function unregisterTask(taskId: string): void {
  const existing = scheduledTasks.get(taskId);
  if (existing) {
    existing.stop();
    scheduledTasks.delete(taskId);
    console.log(`Unregistered task ${taskId}`);
  }
}

/**
 * Start the scheduler and register all active tasks.
 * Active tasks are those with status 'idle' (previously started).
 */
export function startScheduler(): void {
  schedulerStarted = true;

  // Load all tasks that are in 'idle' status (meaning they were previously started)
  const tasks = getAllTasks();
  for (const task of tasks) {
    if (task.status === 'idle') {
      registerTask(task.id, task.syncFrequency);
    }
  }

  // Start all registered tasks
  for (const [, scheduled] of scheduledTasks) {
    scheduled.start();
  }

  // Register daily cleanup job
  registerDailyCleanup();

  console.log(`Scheduler started. ${scheduledTasks.size} tasks registered.`);
}

/**
 * Stop the scheduler and unregister all tasks.
 */
export function stopScheduler(): void {
  for (const [taskId, scheduled] of scheduledTasks) {
    scheduled.stop();
  }
  scheduledTasks.clear();
  schedulerStarted = false;
  console.log('Scheduler stopped.');
}

/**
 * Register the daily cleanup job to delete old sync logs.
 * Runs at 00:00 every day.
 */
function registerDailyCleanup(): void {
  const cleanupExpression = '0 0 * * *';

  if (!cron.validate(cleanupExpression)) {
    console.error('Invalid cron expression for daily cleanup:', cleanupExpression);
    return;
  }

  cron.schedule(cleanupExpression, () => {
    try {
      const days = config.logRetentionDays;
      const deleted = deleteOldLogs(days);
      console.log(`Daily cleanup: deleted ${deleted} sync logs older than ${days} days`);
    } catch (err) {
      console.error('Daily cleanup failed:', err);
    }
  }, {
    scheduled: true,
  } as any);

  console.log(`Registered daily cleanup job (retention: ${config.logRetentionDays} days)`);
}

/**
 * Check if a task is currently scheduled.
 */
export function isTaskScheduled(taskId: string): boolean {
  return scheduledTasks.has(taskId);
}

/**
 * Get the count of currently scheduled tasks.
 */
export function getScheduledTaskCount(): number {
  return scheduledTasks.size;
}
