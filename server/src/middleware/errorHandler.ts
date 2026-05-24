import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

/**
 * Global error handler middleware.
 * Catches errors thrown in route handlers and returns a standardized error response.
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  console.error(err.stack);

  const statusCode = (err as any).statusCode || 500;
  const response: ApiResponse<null> = {
    code: statusCode,
    data: null,
    message: err.message || 'Internal Server Error',
  };

  res.status(statusCode).json(response);
}

/**
 * Create a custom HTTP error with status code.
 */
export class HttpError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}
