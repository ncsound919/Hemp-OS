import { describe, it, expect, vi } from 'vitest';
import { notFoundHandler } from '../../middleware/notFound';
import type { Request, Response } from 'express';

describe('notFoundHandler', () => {
  it('should return 404 status', () => {
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return success: false with "Not found" error', () => {
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not found',
    });
  });
});
