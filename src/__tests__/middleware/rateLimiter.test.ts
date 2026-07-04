import { describe, it, expect, vi } from 'vitest';

vi.mock('express-rate-limit', () => {
  return {
    default: vi.fn((config: any) => {
      const middleware = vi.fn((_req: any, _res: any, next: any) => next());
      (middleware as any).config = config;
      return middleware;
    }),
  };
});

import { apiRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter';
import rateLimit from 'express-rate-limit';

describe('rateLimiter', () => {
  it('should export apiRateLimiter', () => {
    expect(apiRateLimiter).toBeDefined();
    expect(typeof apiRateLimiter).toBe('function');
  });

  it('should export strictRateLimiter', () => {
    expect(strictRateLimiter).toBeDefined();
    expect(typeof strictRateLimiter).toBe('function');
  });

  it('should call rateLimit factory twice', () => {
    expect(rateLimit).toHaveBeenCalledTimes(2);
  });

  it('should configure apiRateLimiter with 30 req/min', () => {
    const calls = (rateLimit as any).mock.calls;
    const apiConfig = calls[0][0];
    expect(apiConfig.windowMs).toBe(60_000);
    expect(apiConfig.limit).toBe(30);
    expect(apiConfig.standardHeaders).toBe(true);
    expect(apiConfig.legacyHeaders).toBe(false);
    expect(apiConfig.message).toEqual({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  });

  it('should configure strictRateLimiter with 10 req/min', () => {
    const calls = (rateLimit as any).mock.calls;
    const strictConfig = calls[1][0];
    expect(strictConfig.windowMs).toBe(60_000);
    expect(strictConfig.limit).toBe(10);
    expect(strictConfig.standardHeaders).toBe(true);
    expect(strictConfig.legacyHeaders).toBe(false);
  });

  it('apiRateLimiter should pass through requests', () => {
    const next = vi.fn();
    (apiRateLimiter as any)({}, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('strictRateLimiter should pass through requests', () => {
    const next = vi.fn();
    (strictRateLimiter as any)({}, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
