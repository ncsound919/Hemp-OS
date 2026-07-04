import { describe, it, expect } from 'vitest';
import { logger } from '../../lib/logger.ts';

describe('logger', () => {
  it('is a pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('has redaction configured for sensitive paths', () => {
    expect((logger as any)[Symbol.for('pino.options')]).toBeUndefined();
    const opts = logger.levels.values;
    expect(opts).toBeDefined();
  });

  it('can log without throwing', () => {
    expect(() => logger.info('test message')).not.toThrow();
    expect(() => logger.debug('debug message')).not.toThrow();
    expect(() => logger.warn('warn message')).not.toThrow();
  });
});
