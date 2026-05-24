import { useState, useEffect, useCallback } from 'react';
import { getSettings, setSetting, testNotification } from '../api';
import { NotificationChannel, TestNotificationResult } from '../types';

/** Hook for managing system settings */
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  /** Fetch all settings */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Update a setting value */
  const updateSetting = useCallback(async (key: string, value: any): Promise<boolean> => {
    try {
      setError(null);
      await setSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update setting');
      return false;
    }
  }, []);

  /** Test a notification channel */
  const testNotif = useCallback(async (channel: NotificationChannel): Promise<TestNotificationResult> => {
    try {
      setTesting(true);
      setError(null);
      const result = await testNotification(channel);
      return result;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to test notification';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    testing,
    fetchSettings,
    updateSetting,
    testNotif,
    setError,
  };
}
