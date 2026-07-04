import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mesh } from '../service-mesh.js';
import { MAX_PROVENANCE_LOG_SIZE } from '../types.js';

describe('ServiceMesh', () => {
  beforeEach(() => {
    mesh.reset();
  });

  describe('RPC', () => {
    it('should register and invoke an RPC handler', async () => {
      const handler = async (req: any) => ({ echo: req.params });
      mesh.rpc('test:echo', handler);

      const result = await mesh.rpc('test:echo');
      expect(result).toEqual({ echo: {} });
    });

    it('should throw if no handler registered for method', async () => {
      await expect(mesh.rpc('nonexistent:method')).rejects.toThrow('No handler registered');
    });

    it('should register multiple handlers without conflict', async () => {
      mesh.rpc('a:method', async () => 'a');
      mesh.rpc('b:method', async () => 'b');

      const a = await mesh.rpc('a:method');
      const b = await mesh.rpc('b:method');
      expect(a).toBe('a');
      expect(b).toBe('b');
    });
  });

  describe('Event Bus', () => {
    it('should deliver events to registered handlers', async () => {
      const received: any[] = [];
      mesh.on('test:event', (e) => { received.push(e); });

      const event = {
        id: '1',
        source: 'hemp-os' as const,
        type: 'test:event',
        payload: { data: 42 },
        timestamp: Date.now(),
      };
      await mesh.emit(event);

      expect(received).toHaveLength(1);
      expect(received[0].payload.data).toBe(42);
    });

    it('should deliver to wildcard handlers', async () => {
      const received: any[] = [];
      mesh.on('*', (e) => { received.push(e); });

      const event = {
        id: '1',
        source: 'hemp-os-db' as const,
        type: 'any:event',
        payload: {},
        timestamp: Date.now(),
      };
      await mesh.emit(event);

      expect(received).toHaveLength(1);
    });

    it('should support off() to unsubscribe', async () => {
      const received: any[] = [];
      const handler = (e: any) => { received.push(e); };
      mesh.on('test:event', handler);
      mesh.off('test:event', handler);

      const event = {
        id: '1',
        source: 'hemp-os' as const,
        type: 'test:event',
        payload: {},
        timestamp: Date.now(),
      };
      await mesh.emit(event);

      expect(received).toHaveLength(0);
    });

    it('should not crash on handler errors', async () => {
      mesh.on('bad:event', () => { throw new Error('handler failed'); });

      // Should not throw
      await mesh.emit({
        id: '1',
        source: 'hemp-os' as const,
        type: 'bad:event',
        payload: {},
        timestamp: Date.now(),
      });
    });

    it('fireEvent should emit event and log provenance', async () => {
      const received: any[] = [];
      mesh.on('test:fire', (e) => { received.push(e); });

      mesh.fireEvent('hemp-os', 'test:fire', { key: 'value' });

      // fireEvent calls emit which is sync (handlers may be async but fire-and-forget)
      await new Promise(r => setTimeout(r, 10));

      expect(received).toHaveLength(1);
      expect(mesh.getProvenanceLog().length).toBe(1);
      expect(mesh.getProvenanceLog()[0].action).toBe('test:fire');
    });
  });

  describe('Provenance', () => {
    it('should log and retrieve provenance entries', () => {
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'query', { q: 'test' });
      mesh.logProvenance('hemp-agent', 'hemp-os', 'response', { r: 1 });

      const all = mesh.getProvenanceLog();
      expect(all).toHaveLength(2);
    });

    it('should filter by source', () => {
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'query', {});
      mesh.logProvenance('hemp-agent', 'hemp-os', 'response', {});

      const osLogs = mesh.getProvenanceLog({ source: 'hemp-os' });
      expect(osLogs).toHaveLength(1);
      expect(osLogs[0].sourceSystem).toBe('hemp-os');
    });

    it('should filter by target', () => {
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'query', {});
      mesh.logProvenance('hemp-agent', 'hemp-os', 'response', {});

      const dbLogs = mesh.getProvenanceLog({ target: 'hemp-os-db' });
      expect(dbLogs).toHaveLength(1);
    });

    it('should filter by action', () => {
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'query', {});
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'write', {});

      const queryLogs = mesh.getProvenanceLog({ action: 'query' });
      expect(queryLogs).toHaveLength(1);
    });

    it('should filter by since', () => {
      const now = Date.now();
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'old', {});
      // Simulate older entry by manipulating the log directly
      const log = mesh.getProvenanceLog();
      log[0].timestamp = now - 10000;

      mesh.logProvenance('hemp-os', 'hemp-os-db', 'new', {});

      const recent = mesh.getProvenanceLog({ since: now - 1000 });
      expect(recent).toHaveLength(1);
      expect(recent[0].action).toBe('new');
    });

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        mesh.logProvenance('hemp-os', 'hemp-os-db', `action-${i}`, {});
      }

      const limited = mesh.getProvenanceLog({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should evict oldest entries when max size exceeded', () => {
      // Add entries up to max
      for (let i = 0; i < MAX_PROVENANCE_LOG_SIZE + 5; i++) {
        mesh.logProvenance('hemp-os', 'hemp-os-db', `action-${i}`, {});
      }

      const log = mesh.getProvenanceLog();
      expect(log.length).toBeLessThanOrEqual(MAX_PROVENANCE_LOG_SIZE);
      // Last entry should be the most recent
      expect(log[log.length - 1].action).toBe(`action-${MAX_PROVENANCE_LOG_SIZE + 4}`);
    });
  });

  describe('Correlation Store', () => {
    it('should store and retrieve correlation data', () => {
      mesh.setCorrelation('corr-1', { step: 1 });
      expect(mesh.getCorrelation('corr-1')).toEqual({ step: 1 });
    });

    it('should clear correlation data', () => {
      mesh.setCorrelation('corr-1', { step: 1 });
      mesh.clearCorrelation('corr-1');
      expect(mesh.getCorrelation('corr-1')).toBeUndefined();
    });

    it('should return undefined for unknown correlation', () => {
      expect(mesh.getCorrelation('unknown')).toBeUndefined();
    });
  });

  describe('Service Discovery', () => {
    it('should return all registered services', () => {
      const services = mesh.getServices();
      expect(services.size).toBe(3);
      expect(services.has('hemp-os')).toBe(true);
      expect(services.has('hemp-os-db')).toBe(true);
      expect(services.has('hemp-agent')).toBe(true);
    });

    it('should return correct service URL', () => {
      expect(mesh.getServiceUrl('hemp-os')).toBe('http://localhost:3100');
      expect(mesh.getServiceUrl('hemp-os-db')).toBe('http://localhost:3200');
      expect(mesh.getServiceUrl('hemp-agent')).toBe('http://localhost:3300');
    });

    it('should return empty string for unknown service', () => {
      expect(mesh.getServiceUrl('unknown' as any)).toBe('');
    });
  });

  describe('Default Source', () => {
    it('should default to hemp-os', () => {
      expect(() => mesh.rpc('health')).not.toThrow();
    });

    it('should allow changing default source', () => {
      mesh.setDefaultSource('hemp-agent');
      expect(() => mesh.rpc('health')).not.toThrow();
    });
  });

  describe('Health Checking', () => {
    it('should return unknown for unregistered service', async () => {
      const result = await mesh.checkHealth('unknown-service' as any);
      expect(result.status).toBe('unknown');
      expect(result.latency).toBe(-1);
    });
  });

  describe('reset()', () => {
    it('should clear all state', () => {
      mesh.logProvenance('hemp-os', 'hemp-os-db', 'test', {});
      mesh.setCorrelation('c1', { data: 1 });

      mesh.reset();

      expect(mesh.getProvenanceLog()).toHaveLength(0);
      expect(mesh.getCorrelation('c1')).toBeUndefined();
    });
  });
});
