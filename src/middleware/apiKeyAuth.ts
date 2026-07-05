import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.ts';
import { logger } from '../lib/logger.ts';
import crypto from 'crypto';

let hasWarnedNoApiKey = false;

/**
 * Gates access to the internal API surface (kernel, ingest, ollama, ai
 * routes) behind a shared secret. When `API_KEY` is not configured, the
 * gate is a no-op — appropriate for local/single-user deployments (e.g.
 * AI Studio applets) — but a warning is logged once so operators exposing
 * this server publicly are aware it is unprotected.
 *
 * When configured, callers must send a matching `x-api-key` header.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (!env.API_KEY) {
    if (!hasWarnedNoApiKey) {
      hasWarnedNoApiKey = true;
      logger.warn(
        'API_KEY is not set — internal API routes (kernel, ingest, ollama, ai) are unauthenticated. Set API_KEY to require an x-api-key header.'
      );
    }
    return next();
  }

  const provided = req.headers['x-api-key'];
  if (!provided || typeof provided !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      requestId: req.headers['x-request-id'],
    });
  }

  const keyHash = crypto.createHash('sha256').update(env.API_KEY).digest();
  const providedHash = crypto.createHash('sha256').update(provided).digest();
  if (!crypto.timingSafeEqual(keyHash, providedHash)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      requestId: req.headers['x-request-id'],
    });
  }

  next();
}
