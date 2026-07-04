import { describe, it, expect } from 'vitest';
import { AppError } from '../../lib/AppError';

describe('AppError', () => {
  it('should set statusCode and message', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
  });

  it('should extend Error', () => {
    const err = new AppError(500, 'fail');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('Error');
  });

  it('should store details when provided', () => {
    const details = { field: 'email', reason: 'invalid' };
    const err = new AppError(400, 'Validation failed', details);
    expect(err.details).toEqual(details);
  });

  it('should have undefined details when not provided', () => {
    const err = new AppError(500, 'oops');
    expect(err.details).toBeUndefined();
  });

  it('should preserve stack trace', () => {
    const err = new AppError(500, 'err');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });

  it('should accept various status codes', () => {
    expect(new AppError(200, 'ok').statusCode).toBe(200);
    expect(new AppError(401, 'unauth').statusCode).toBe(401);
    expect(new AppError(429, 'rate limited').statusCode).toBe(429);
    expect(new AppError(502, 'bad gateway').statusCode).toBe(502);
  });
});
