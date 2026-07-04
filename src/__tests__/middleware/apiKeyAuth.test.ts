import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mocks = vi.hoisted(() => {
  const envObj: { API_KEY: string | undefined } = { API_KEY: undefined };
  return {
    envObj,
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  };
});

vi.mock('../../config/env.ts', () => ({
  env: mocks.envObj,
}));

vi.mock('../../lib/logger.ts', () => ({
  logger: mocks.logger,
}));

import { apiKeyAuth } from '../../middleware/apiKeyAuth';

function mockReq(apiKey?: string): Request {
  return {
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockNext(): NextFunction {
  return vi.fn();
}

describe('apiKeyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.envObj.API_KEY = undefined;
  });

  it('should call next() when API_KEY is not configured', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should warn once when API_KEY is not configured', async () => {
    vi.resetModules();
    const { apiKeyAuth: freshAuth } = await import('../../middleware/apiKeyAuth');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    freshAuth(req, res, next);
    freshAuth(req, res, next);

    expect(mocks.logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should return 401 when API_KEY is set but header is missing', () => {
    mocks.envObj.API_KEY = 'secret-key';
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Unauthorized',
      })
    );
  });

  it('should return 401 when API_KEY does not match', () => {
    mocks.envObj.API_KEY = 'secret-key';
    const req = mockReq('wrong-key');
    const res = mockRes();
    const next = mockNext();

    apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next() when API_KEY matches', () => {
    mocks.envObj.API_KEY = 'secret-key';
    const req = mockReq('secret-key');
    const res = mockRes();
    const next = mockNext();

    apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should include requestId in 401 response', () => {
    mocks.envObj.API_KEY = 'secret-key';
    const req = {
      headers: { 'x-request-id': 'req-abc' },
    } as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    apiKeyAuth(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-abc' })
    );
  });
});
