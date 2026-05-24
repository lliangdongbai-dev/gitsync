import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from '../config';

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database connection and run migrations.
 * Creates the data directory if it doesn't exist.
 */
export function initDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  return db;
}

/**
 * Get the current database connection.
 * Throws if database has not been initialized.
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Close the database connection.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run database migrations (create tables and indexes).
 */
function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_repo TEXT NOT NULL,
      target_repo TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT 'main',
      branches TEXT NOT NULL DEFAULT '{"mode":"all"}',
      sync_frequency INTEGER NOT NULL DEFAULT 30,
      source_auth_type TEXT NOT NULL DEFAULT 'https_token',
      source_https_token TEXT,
      source_ssh_key_name TEXT,
      target_auth_type TEXT NOT NULL DEFAULT 'https_token',
      target_https_token TEXT,
      target_ssh_key_name TEXT,
      status TEXT NOT NULL DEFAULT 'stopped',
      last_sync_at TEXT,
      last_sync_status TEXT,
      last_sync_duration INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      commit_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      trigger_type TEXT NOT NULL DEFAULT 'cron',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sync_logs_task_id ON sync_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_start_time ON sync_logs(start_time);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add branches column if it doesn't exist
  const columns = database.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  const hasBranches = columns.some(col => col.name === 'branches');
  if (!hasBranches) {
    database.exec(`ALTER TABLE tasks ADD COLUMN branches TEXT NOT NULL DEFAULT '{"mode":"all"}'`);
  }

  // Migration: add detail column to sync_logs if it doesn't exist
  const logColumns = database.prepare("PRAGMA table_info(sync_logs)").all() as { name: string }[];
  const hasDetail = logColumns.some(col => col.name === 'detail');
  if (!hasDetail) {
    database.exec(`ALTER TABLE sync_logs ADD COLUMN detail TEXT`);
  }
}
