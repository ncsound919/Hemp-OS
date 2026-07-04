import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import type { Request, Response, NextFunction } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    headersSent: false,
  } as unknown as Response;
}

function mockNext(): NextFunction {
  return vi.fn();
}

describe('validate middleware', () => {
  it('should call next() on valid input', () => {
    const schema = z.object({ body: z.object({ name: z.string() }) });
    const req = mockReq({ body: { name: 'test' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should parse and write back sanitized body', () => {
    const schema = z.object({ body: z.object({ name: z.string(), count: z.coerce.number() }) });
    const req = mockReq({ body: { name: 'test', count: '42' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);
    expect((req as any).body.count).toBe(42);
  });

  it('should call next(err) on validation failure', () => {
    const schema = z.object({ body: z.object({ name: z.string() }) });
    const req = mockReq({ body: { name: 123 } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should parse query params', () => {
    const schema = z.object({ query: z.object({ page: z.coerce.number() }) });
    const req = mockReq({ query: { page: '5' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);
    expect((req as any).query.page).toBe(5);
    expect(next).toHaveBeenCalledWith();
  });

  it('should parse route params', () => {
    const schema = z.object({ params: z.object({ id: z.string() }) });
    const req = mockReq({ params: { id: 'abc-123' } });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);
    expect((req as any).params.id).toBe('abc-123');
    expect(next).toHaveBeenCalledWith();
  });

  it('should not overwrite req.headers', () => {
    const originalHeaders = { 'x-custom': 'val' };
    const schema = z.object({ body: z.object({ ok: z.boolean() }) });
    const req = mockReq({ body: { ok: true }, headers: originalHeaders });
    const res = mockRes();
    const next = mockNext();

    validate(schema)(req, res, next);
    expect(req.headers).toBe(originalHeaders);
  });

  it('should not write back undefined parsed fields', () => {
    const schema = z.object({ body: z.object({ x: z.number() }) });
    const req = mockReq({ body: { x: 1 } });
    const res = mockRes();
    const next = mockNext();
    const originalQuery = req.query;

    validate(schema)(req, res, next);
    expect(req.query).toBe(originalQuery);
  });
});
