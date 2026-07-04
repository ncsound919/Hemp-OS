import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockAssist = vi.hoisted(() => vi.fn());
vi.mock('../../services/ai.service.ts', () => ({
  AiService: vi.fn().mockImplementation(function () {
    this.assist = mockAssist;
  }),
}));

import { assist } from '../../controllers/ai.controller.ts';

function mockReq(body: Record<string, unknown> = {}): Request {
  return { body } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('ai.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assist', () => {
    it('should return AI-generated text', async () => {
      mockAssist.mockResolvedValueOnce('Use CO2 at 100 bar for extraction');
      const req = mockReq({ prompt: 'How do I extract?' });
      const res = mockRes();

      await assist(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        text: 'Use CO2 at 100 bar for extraction',
      });
    });

    it('should pass all body fields to AiService', async () => {
      mockAssist.mockResolvedValueOnce('ok');
      const body = {
        prompt: 'Analyze',
        graph: { stages: [{ name: 'Extract', type: 'extraction' }] },
        currentResults: { massBalanceReport: {} },
        selectedBiomassName: 'Blue Dream',
      };
      const req = mockReq(body);
      const res = mockRes();

      await assist(req, res, vi.fn());

      expect(mockAssist).toHaveBeenCalledWith(body);
    });

    it('should propagate errors via next()', async () => {
      mockAssist.mockImplementationOnce(() => { throw new Error('AI offline'); });
      const req = mockReq({ prompt: 'test' });
      const res = mockRes();
      const next = vi.fn();

      await assist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle optional fields as undefined', async () => {
      mockAssist.mockResolvedValueOnce('ok');
      const req = mockReq({ prompt: 'minimal' });
      const res = mockRes();

      await assist(req, res, vi.fn());

      expect(mockAssist).toHaveBeenCalledWith({
        prompt: 'minimal',
        graph: undefined,
        currentResults: undefined,
        selectedBiomassName: undefined,
      });
    });
  });
});
