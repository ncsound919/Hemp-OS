import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError';
import { logger } from '../lib/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: (err as ZodError).flatten(),
      requestId: req.headers['x-request-id'],
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
      requestId: req.headers['x-request-id'],
    });
  }

  logger.error({ err }, 'Unhandled server error');

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.headers['x-request-id'],
  });
}
