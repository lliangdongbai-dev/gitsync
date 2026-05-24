import { getDb } from '../db';
import { Setting, SettingRow } from '../types';
import { nowLocal } from '../utils/time';

/**
 * Convert a database row (snake_case) to a Setting object (camelCase).
 */
function rowToSetting(row: SettingRow): Setting {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all settings as a key-value record.
 */
export function getAllSettings(): Record<string, any> {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all() as SettingRow[];
  const result: Record<string, any> = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}

/**
 * Get a single setting by key.
 */
export function getSetting(key: string): Setting | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key) as SettingRow | undefined;
  return row ? rowToSetting(row) : null;
}

/**
 * Get a setting value directly.
 */
export function getSettingValue(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

/**
 * Set (upsert) a setting value.
 */
export function setSetting(key: string, value: any): Setting {
  const db = getDb();
  const now = nowLocal();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, serialized, now);

  return getSetting(key)!;
}

/**
 * Delete a setting by key.
 */
export function deleteSetting(key: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  return result.changes > 0;
}
