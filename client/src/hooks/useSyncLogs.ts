import { useState, useEffect, useCallback } from 'react';
import { SyncLog, SyncLogQuery, PaginatedSyncLogs } from '../types';
import { getSyncLogs } from '../api';

/** Hook for managing sync logs with filtering and pagination */
export function useSyncLogs() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<SyncLogQuery>({
    tab: 'recent',
    limit: 20,
    offset: 0,
  });

  /** Fetch sync logs with current query */
  const fetchLogs = useCallback(async (queryOverride?: Partial<SyncLogQuery>) => {
    try {
      setLoading(true);
      setError(null);
      const mergedQuery = { ...query, ...queryOverride };
      const result: PaginatedSyncLogs = await getSyncLogs(mergedQuery);
      setLogs(result.items);
      setTotal(result.total);
      if (queryOverride) {
        setQuery(prev => ({ ...prev, ...queryOverride }));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch sync logs');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /** Update query and refetch */
  const updateQuery = useCallback((updates: Partial<SyncLogQuery>) => {
    setQuery(prev => {
      const newQuery = { ...prev, ...updates };
      // Reset offset when filters change (not when offset itself changes)
      if (!('offset' in updates)) {
        newQuery.offset = 0;
      }
      return newQuery;
    });
  }, []);

  /** Change page */
  const changePage = useCallback((page: number) => {
    const offset = page * (query.limit || 20);
    updateQuery({ offset });
  }, [query.limit, updateQuery]);

  // Refetch when query changes
  useEffect(() => {
    fetchLogs();
  }, [query]);

  return {
    logs,
    total,
    loading,
    error,
    query,
    fetchLogs,
    updateQuery,
    changePage,
    setError,
  };
}
