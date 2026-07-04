/**
 * Integration Route Helpers
 *
 * Extracts the repetitive try/catch + res.json pattern from routes.ts
 * into reusable wrappers, cutting ~15 lines per handler to 3.
 */

import { Request, Response, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Wraps an async route handler with consistent error handling.
 * Replaces 20+ identical try/catch blocks in routes.ts.
 */
export function wrap(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Route Error] ${req.method} ${req.path}: ${message}`);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: message });
      }
    });
  };
}

/**
 * Validates that required body fields are present
 */
export function requireFields(body: any, fields: string[]): string | null {
  for (const field of fields) {
    if (body?.[field] === undefined || body?.[field] === null) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Validates required query params
 */
export function requireQuery(query: any, fields: string[]): string | null {
  for (const field of fields) {
    if (query?.[field] === undefined || query?.[field] === '') {
      return `Missing required query parameter: ${field}`;
    }
  }
  return null;
}

/**
 * Sends a success response
 */
export function ok(res: Response, data?: Record<string, unknown>) {
  res.json({ success: true, ...data });
}

/**
 * Sends an error response with consistent format
 */
export function fail(res: Response, status: number, error: string) {
  res.status(status).json({ success: false, error });
}
