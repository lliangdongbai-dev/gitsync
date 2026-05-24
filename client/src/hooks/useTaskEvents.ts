import { useEffect, useRef, useCallback } from 'react';

/** Task status change event from SSE */
export interface TaskStatusEvent {
  taskId: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncDuration: number | null;
  errorMessage: string | null;
}

/** SSE base URL */
const SSE_URL = import.meta.env.DEV ? 'http://localhost:3001/api/events' : '/api/events';

/**
 * Hook to subscribe to real-time task status changes via SSE.
 * Automatically reconnects on disconnect.
 */
export function useTaskEvents(onStatusChange: (event: TaskStatusEvent) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onStatusChange);

  // Keep callback ref up to date
  callbackRef.current = onStatusChange;

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    es.addEventListener('taskStatusChange', (event) => {
      try {
        const data = JSON.parse(event.data) as TaskStatusEvent;
        callbackRef.current(data);
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('connected', () => {
      // Connection established
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);
}
