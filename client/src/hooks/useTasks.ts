import { useState, useEffect, useCallback } from 'react';
import { Task, CreateTaskReq, UpdateTaskReq } from '../types';
import { getTasks, createTask as apiCreateTask, updateTask as apiUpdateTask, deleteTask as apiDeleteTask, startTask, stopTask, triggerSync } from '../api';
import { useTaskEvents, TaskStatusEvent } from './useTaskEvents';

/** Hook for managing tasks - CRUD operations and sync control */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch all tasks */
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Handle real-time task status updates from SSE */
  const handleStatusChange = useCallback((event: TaskStatusEvent) => {
    setTasks(prev => prev.map(t => {
      if (t.id === event.taskId) {
        return {
          ...t,
          status: event.status as Task['status'],
          lastSyncAt: event.lastSyncAt,
          lastSyncStatus: event.lastSyncStatus as Task['lastSyncStatus'],
          lastSyncDuration: event.lastSyncDuration,
          errorMessage: event.errorMessage,
        };
      }
      return t;
    }));
  }, []);

  // Subscribe to SSE events
  useTaskEvents(handleStatusChange);

  /** Create a new task */
  const createTask = useCallback(async (req: CreateTaskReq): Promise<Task | null> => {
    try {
      setError(null);
      const task = await apiCreateTask(req);
      setTasks(prev => [task, ...prev]);
      return task;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create task');
      return null;
    }
  }, []);

  /** Update an existing task */
  const updateTask = useCallback(async (id: string, req: UpdateTaskReq): Promise<Task | null> => {
    try {
      setError(null);
      const task = await apiUpdateTask(id, req);
      setTasks(prev => prev.map(t => t.id === id ? task : t));
      return task;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update task');
      return null;
    }
  }, []);

  /** Delete a task */
  const removeTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await apiDeleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete task');
      return false;
    }
  }, []);

  /** Start a task */
  const startTaskSync = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await startTask(id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: result.status as Task['status'] } : t));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to start task');
      return false;
    }
  }, []);

  /** Stop a task */
  const stopTaskSync = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await stopTask(id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: result.status as Task['status'] } : t));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to stop task');
      return false;
    }
  }, []);

  /** Manually trigger a sync - returns sync log with result details */
  const manualSync = useCallback(async (id: string): Promise<{ success: boolean; message: string; detail?: string | null }> => {
    try {
      setError(null);
      const log = await triggerSync(id);
      // Refresh tasks to get updated status
      await fetchTasks();
      if (log.status === 'success') {
        const durationStr = log.duration < 1000 ? `${log.duration}ms` : `${(log.duration / 1000).toFixed(1)}s`;
        return {
          success: true,
          message: `同步成功，耗时 ${durationStr}`,
          detail: log.detail,
        };
      } else {
        return {
          success: false,
          message: `同步失败: ${log.errorMessage || '未知错误'}`,
          detail: log.detail,
        };
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '触发同步失败';
      setError(msg);
      return { success: false, message: msg };
    }
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    removeTask,
    startTaskSync,
    stopTaskSync,
    manualSync,
    setError,
  };
}
