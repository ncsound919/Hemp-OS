import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * asyncHandler: removes repetitive try/catch boilerplate from every route.
 * Any thrown/rejected error is funneled to Express's centralized error
 * handler (see src/middleware/errorHandler.ts) instead of crashing the
 * process or leaving the request hanging.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
