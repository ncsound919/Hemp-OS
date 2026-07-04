import { describe, it, expect, vi } from 'vitest';
import { requestIdMiddleware } from '../../middleware/requestId';
import type { Request, Response, NextFunction } from 'express';

describe('requestIdMiddleware', () => {
  it('should set x-request-id on request headers', () => {
    const headers: Record<string, string> = {};
    const req = { headers } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(headers['x-request-id']).toBeDefined();
    expect(headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('should set x-request-id on response headers', () => {
    const headers: Record<string, string> = {};
    const req = { headers } as unknown as Request;
    const setHeader = vi.fn();
    const res = { setHeader } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(setHeader).toHaveBeenCalledWith('x-request-id', headers['x-request-id']);
  });

  it('should call next()', () => {
    const req = { headers: {} } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should generate unique ids for each request', () => {
    const req1 = { headers: {} } as unknown as Request;
    const req2 = { headers: {} } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req1, res, next);
    requestIdMiddleware(req2, res, next);

    expect(req1.headers['x-request-id']).not.toBe(req2.headers['x-request-id']);
  });
});
