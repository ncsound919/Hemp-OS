import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

import { GatewayService, gateway } from '../src/services/GatewayService.ts';

describe('GatewayService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getInstance', () => {
    it('should return the same singleton instance', () => {
      const a = GatewayService.getInstance();
      const b = GatewayService.getInstance();
      expect(a).toBe(b);
    });

    it('should export a singleton instance', () => {
      expect(gateway).toBe(GatewayService.getInstance());
    });
  });

  describe('routeToOrchestrator', () => {
    it('should send POST request to /api/agents/query', async () => {
      const trace = { steps: [], confidence: 0.9 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(trace),
      });

      const result = await gateway.routeToOrchestrator('test query', 'clinical', {});

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/query', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      expect(result).toEqual(trace);
    });

    it('should include query and mode in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await gateway.routeToOrchestrator('analytic query', 'mechanistic', { studies: [] });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toBe('analytic query');
      expect(body.mode).toBe('mechanistic');
    });

    it('should default mode to mechanistic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await gateway.routeToOrchestrator('query', undefined as any, {});

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mode).toBe('mechanistic');
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
      });

      await expect(gateway.routeToOrchestrator('query', 'clinical', {}))
        .rejects.toThrow('Gateway Error: Bad Gateway');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      await expect(gateway.routeToOrchestrator('query', 'clinical', {}))
        .rejects.toThrow('fetch failed');
    });
  });
});
