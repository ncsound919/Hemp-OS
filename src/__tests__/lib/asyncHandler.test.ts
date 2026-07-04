import { describe, it, expect, vi } from 'vitest';

const error = new Error('sync throw');
const handler = vi.fn().mockImplementation(() => { throw error; });

import { asyncHandler } from '../../lib/asyncHandler';

describe('asyncHandler', () => {
  it('should call the handler with req, res, next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(fn);
    const req = {} as any;
    const res = {} as any;
    const next = vi.fn();
    await wrapped(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should forward resolved value without calling next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(fn);
    const next = vi.fn();
    await wrapped({} as any, {} as any, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with error when handler rejects', async () => {
    const error = new Error('handler failed');
    const fn = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(fn);
    const next = vi.fn();
    await wrapped({} as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should return a function (RequestHandler)', () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(fn);
    expect(typeof wrapped).toBe('function');
  });

  it('should propagate synchronous throws from the handler', () => {
    const fn = vi.fn().mockImplementation(() => { throw new Error('sync throw'); });
    const wrapped = asyncHandler(fn);
    const next = vi.fn();
    expect(() => wrapped({} as any, {} as any, next)).toThrow('sync throw');
  });
});
