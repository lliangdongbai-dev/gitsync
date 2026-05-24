import dotenv from 'dotenv';
import path from 'path';
import { AppConfig } from '../types';

// Load .env file
dotenv.config();

// Calculate the application root directory (server/ folder)
// In compiled JS: dist/config/index.js -> ../.. = server/
declare const __filename: string;
const APP_ROOT = path.resolve(path.dirname(__filename), '..', '..');

/**
 * Resolve a path to absolute. If the input is already absolute, return as-is.
 * If relative, resolve it relative to APP_ROOT.
 */
function toAbsolute(p: string | undefined, defaultRelative: string): string {
  if (p && path.isAbsolute(p)) return p;
  const base = p || defaultRelative;
  return path.resolve(APP_ROOT, base);
}

/** Application configuration singleton */
const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: toAbsolute(process.env.DB_PATH, 'data/gitsync.db'),
  repoDir: toAbsolute(process.env.REPO_DIR, 'data/repos'),
  sshKeyDir: toAbsolute(process.env.SSH_KEY_DIR, 'data/ssh_keys'),
  authUser: process.env.AUTH_USER || '',
  authPass: process.env.AUTH_PASS || '',
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '7', 10),
  encryptionKey: process.env.ENCRYPTION_KEY || '',
};

export default config;
