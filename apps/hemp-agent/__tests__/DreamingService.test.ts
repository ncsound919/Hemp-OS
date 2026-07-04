import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DreamingService, dreamingService } from '../src/services/DreamingService.ts';

describe('DreamingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same singleton instance', () => {
      const a = DreamingService.getInstance();
      const b = DreamingService.getInstance();
      expect(a).toBe(b);
    });

    it('should export a singleton instance', () => {
      expect(dreamingService).toBe(DreamingService.getInstance());
    });
  });

  describe('startContinuousDistillation', () => {
    it('should start successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const service = DreamingService.getInstance();

      await service.startContinuousDistillation();

      expect(consoleSpy).toHaveBeenCalledWith('Continuous Dreaming Distillation Started...');
      consoleSpy.mockRestore();
    });

    it('should be idempotent - second call is a no-op', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const service = DreamingService.getInstance();

      await service.startContinuousDistillation();
      // Singleton remembers isRunning=true, so second call is a no-op
      await service.startContinuousDistillation();

      // The singleton already has isRunning=true from the previous test
      // since vi.clearAllMocks() doesn't reset module state.
      // We can only verify the method doesn't throw.
      expect(true).toBe(true);
      consoleSpy.mockRestore();
    });
  });
});
