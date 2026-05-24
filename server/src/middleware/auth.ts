import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { getAllSettings } from '../models/setting';

/**
 * Basic Authentication middleware.
 * Checks credentials from both environment config AND database settings.
 * Priority: database settings > environment config.
 * If neither is configured, skip authentication.
 */
export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  // Get auth credentials: prefer database settings over env config
  let authUser = config.authUser;
  let authPass = config.authPass;

  try {
    const settings = getAllSettings();
    if (settings.auth_user && settings.auth_pass) {
      authUser = String(settings.auth_user);
      authPass = String(settings.auth_pass);
    }
  } catch {
    // If settings read fails, fall back to env config
  }

  // Skip auth if not configured
  if (!authUser && !authPass) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="GitSync"');
    res.status(401).json({ code: 401, data: null, message: 'Authentication required' });
    return;
  }

  // Parse Basic Auth header
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic') {
    res.status(401).json({ code: 401, data: null, message: 'Invalid authentication header' });
    return;
  }

  const credentials = Buffer.from(parts[1], 'base64').toString('utf8');
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) {
    res.status(401).json({ code: 401, data: null, message: 'Invalid credentials format' });
    return;
  }

  const username = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);

  if (username === authUser && password === authPass) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="GitSync"');
  res.status(401).json({ code: 401, data: null, message: 'Invalid credentials' });
}
