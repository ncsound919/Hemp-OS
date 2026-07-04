import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRunProcess, mockRunIntegrityVerification, mockValidateProcessGraph } = vi.hoisted(() => ({
  mockRunProcess: vi.fn(),
  mockRunIntegrityVerification: vi.fn(),
  mockValidateProcessGraph: vi.fn(),
}));

vi.mock('../../../kernel/workflow/executor', () => ({
  KernelExecutor: { runProcess: mockRunProcess },
}));

vi.mock('../../../kernel/validation/reports', () => ({
  KernelValidationRunner: { runIntegrityVerification: mockRunIntegrityVerification },
}));

vi.mock('../../../kernel/workflow/processGraph', () => ({
  validateProcessGraph: mockValidateProcessGraph,
}));

vi.mock('../../../kernel/calibration/profiles', () => ({
  BIOMASS_PROFILES: [{ name: 'hemp', defaultMoisture: 0.1 }],
}));

import { KernelService } from '../../services/kernel.service';

describe('KernelService', () => {
  let service: KernelService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KernelService();
  });

  describe('runProcess', () => {
    it('should validate graph before running', () => {
      mockValidateProcessGraph.mockReturnValue([]);
      mockRunProcess.mockReturnValue({ yield: 0.15 });
      const result = service.runProcess({ nodes: [] }, { weight: 10 });
      expect(mockValidateProcessGraph).toHaveBeenCalledWith({ nodes: [] });
      expect(mockRunProcess).toHaveBeenCalledWith({ nodes: [] }, { weight: 10 });
      expect(result).toEqual({ yield: 0.15 });
    });

    it('should throw AppError when graph validation fails', () => {
      mockValidateProcessGraph.mockReturnValue(['Missing nodes']);
      expect(() => service.runProcess(null, {})).toThrow('Invalid process graph structure');
    });

    it('should include validation details in error', () => {
      mockValidateProcessGraph.mockReturnValue(['err1', 'err2']);
      try {
        service.runProcess({}, {});
        expect.fail('should throw');
      } catch (e: any) {
        expect(e.statusCode).toBe(400);
        expect(e.details).toEqual({ details: ['err1', 'err2'] });
      }
    });

    it('should pass through executor errors', () => {
      mockValidateProcessGraph.mockReturnValue([]);
      mockRunProcess.mockImplementation(() => { throw new Error('executor crash'); });
      expect(() => service.runProcess({}, {})).toThrow('executor crash');
    });
  });

  describe('verify', () => {
    it('should call KernelValidationRunner.runIntegrityVerification', () => {
      const report = { ok: true };
      mockRunIntegrityVerification.mockReturnValue(report);
      const result = service.verify();
      expect(mockRunIntegrityVerification).toHaveBeenCalled();
      expect(result).toEqual(report);
    });
  });

  describe('listProfiles', () => {
    it('should return BIOMASS_PROFILES', () => {
      const profiles = service.listProfiles();
      expect(profiles).toEqual([{ name: 'hemp', defaultMoisture: 0.1 }]);
    });
  });
});
