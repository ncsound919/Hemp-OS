import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import { AppError } from '../../lib/AppError';
import { errorHandler } from '../../middleware/errorHandler';
import type { Request, Response, NextFunction } from 'express';

function mockReq(requestId?: string): Request {
  return {
    headers: requestId ? { 'x-request-id': requestId } : {},
  } as unknown as Request;
}

function mockRes(headersSent = false): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent,
  } as unknown as Response;
}

function mockNext(): NextFunction {
  return vi.fn();
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for ZodError', () => {
    const err = new ZodError([
      { code: 'invalid_type', expected: 'string', received: 'number', path: ['body', 'name'], message: 'Expected string, received number' },
    ]);
    const req = mockReq('req-1');
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation failed',
        requestId: 'req-1',
      })
    );
  });

  it('should return custom status for AppError', () => {
    const err = new AppError(404, 'Resource not found');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Resource not found',
      })
    );
  });

  it('should include AppError details in response', () => {
    const err = new AppError(422, 'Unprocessable', { field: 'email' });
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { field: 'email' },
      })
    );
  });

  it('should return 500 for unknown errors', () => {
    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Internal server error',
      })
    );
  });

  it('should delegate to next() when headers already sent', () => {
    const err = new Error('Too late');
    const req = mockReq();
    const res = mockRes(true);
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should include requestId from headers', () => {
    const err = new Error('test');
    const req = mockReq('my-request-id');
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'my-request-id' })
    );
  });

  it('should handle missing requestId gracefully', () => {
    const err = new Error('test');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: undefined })
    );
  });
});
