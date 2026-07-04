import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { mockRunProcess, mockVerify, mockListProfiles } = vi.hoisted(() => ({
  mockRunProcess: vi.fn(),
  mockVerify: vi.fn(),
  mockListProfiles: vi.fn(),
}));

vi.mock('../../services/kernel.service', () => ({
  KernelService: vi.fn().mockImplementation(function () {
    (this as any).runProcess = mockRunProcess;
    (this as any).verify = mockVerify;
    (this as any).listProfiles = mockListProfiles;
  }),
}));

vi.mock('../../lib/asyncHandler.ts', () => ({
  asyncHandler: (fn: any) => fn,
}));

import { runKernelProcess, verifyKernel, listProfiles } from '../../controllers/kernel.controller';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, query: {}, headers: {}, ...overrides } as Request;
}

function mockRes(): Response {
  return { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() } as unknown as Response;
}

describe('kernel.controller', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('runKernelProcess', () => {
    it('should call kernelService.runProcess with graph and biomass', async () => {
      const graph = { nodes: [], edges: [] };
      const biomass = { weight: 10 };
      const results = { yield: 0.15 };
      mockRunProcess.mockReturnValue(results);
      const res = mockRes();
      await runKernelProcess(mockReq({ body: { graph, biomass } }), res);
      expect(mockRunProcess).toHaveBeenCalledWith(graph, biomass);
      expect(res.json).toHaveBeenCalledWith({ success: true, results });
    });

    it('should propagate validation errors', async () => {
      mockRunProcess.mockImplementation(() => { throw new Error('Invalid graph'); });
      const res = mockRes();
      await expect(runKernelProcess(mockReq({ body: { graph: null, biomass: {} } }), res)).rejects.toThrow('Invalid graph');
    });
  });

  describe('verifyKernel', () => {
    it('should return verification report', async () => {
      const report = { status: 'ok', checks: 5 };
      mockVerify.mockReturnValue(report);
      const res = mockRes();
      await verifyKernel(mockReq(), res);
      expect(mockVerify).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, report });
    });
  });

  describe('listProfiles', () => {
    it('should return biomass profiles', async () => {
      const profiles = [{ name: 'hemp', thc: 0.03 }];
      mockListProfiles.mockReturnValue(profiles);
      const res = mockRes();
      await listProfiles(mockReq(), res);
      expect(mockListProfiles).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, profiles });
    });
  });
});
