import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const mocks = vi.hoisted(() => {
  const { EventEmitter } = require('events') as typeof import('events');
  const child = Object.assign(new EventEmitter(), {
    pid: 1234,
    kill: vi.fn(),
    send: vi.fn(),
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    connected: true,
    killed: false,
  });
  return {
    child,
    fork: vi.fn(() => child),
  };
});

vi.mock('child_process', () => ({
  fork: mocks.fork,
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import { AgentFactory } from '../src/orchestrator/agents/AgentFactory.ts';

function agentConfig() {
  return {
    taskId: 'task-1',
    workspaceId: 'ws-1',
    query: 'test query',
    context: { studies: [], omics: [], imaging: [], memories: [] },
    timeoutMs: 5000,
  };
}

describe('AgentFactory', () => {
  let factory: AgentFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.child.killed = false;
    mocks.child.connected = true;
    factory = new AgentFactory();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(factory).toBeDefined();
    });
  });

  describe('spawnSubagent', () => {
    it('should fork a child process', async () => {
      await factory.spawnSubagent('semantic', agentConfig());

      expect(mocks.fork).toHaveBeenCalled();
    });

    it('should return agent info', async () => {
      const result = await factory.spawnSubagent('simulation', agentConfig());

      expect(result.id).toBe('agent-test-uuid-1234');
      expect(result.agentType).toBe('simulation');
      expect(result.taskId).toBe('task-1');
      expect(result.workspaceId).toBe('ws-1');
      expect(result.status).toBe('running');
    });

    it('should emit agent-spawned event', async () => {
      const handler = vi.fn();
      factory.on('agent-spawned', handler);

      await factory.spawnSubagent('semantic', agentConfig());

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        agentId: 'agent-test-uuid-1234',
        type: 'semantic',
      }));
    });

    it('should send start message via IPC', async () => {
      await factory.spawnSubagent('verification', agentConfig());

      expect(mocks.child.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'start',
        payload: expect.objectContaining({
          agentType: 'verification',
          taskId: 'task-1',
        }),
      }));
    });

    it('should increment totalSpawned', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      await factory.spawnSubagent('design', agentConfig());

      const stats = factory.getStats();
      expect(stats.totalSpawned).toBe(2);
    });
  });

  describe('message handling', () => {
    it('should handle pong message and update heartbeat', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-heartbeat', handler);

      mocks.child.emit('message', { type: 'pong' });

      expect(handler).toHaveBeenCalledWith({ agentId: 'agent-test-uuid-1234' });
    });

    it('should handle progress message', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-progress', handler);

      mocks.child.emit('message', { type: 'progress', progress: 0.5 });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        progress: 0.5,
      }));
    });

    it('should handle result message and cleanup', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-result', handler);

      const result = { taskId: 'task-1', confidence: 0.9 };
      mocks.child.emit('message', { type: 'result', result });

      expect(handler).toHaveBeenCalled();
      const stats = factory.getStats();
      expect(stats.results.completed).toBe(1);
    });

    it('should handle error message', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-error', handler);

      mocks.child.emit('message', { type: 'error', error: 'Something failed' });

      expect(handler).toHaveBeenCalled();
      const stats = factory.getStats();
      expect(stats.results.failed).toBe(1);
    });
  });

  describe('process error/exit', () => {
    it('should handle child process error', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-error', handler);

      mocks.child.emit('error', new Error('spawn failed'));

      expect(handler).toHaveBeenCalled();
    });

    it('should handle child exit with code 0 as completed', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-exit', handler);

      mocks.child.emit('exit', 0, null);

      expect(handler).toHaveBeenCalled();
      const stats = factory.getStats();
      expect(stats.results.completed).toBe(1);
    });

    it('should handle child exit with non-zero code as failed', async () => {
      await factory.spawnSubagent('semantic', agentConfig());

      mocks.child.emit('exit', 1, 'SIGTERM');

      const stats = factory.getStats();
      expect(stats.results.failed).toBe(1);
    });
  });

  describe('getResult', () => {
    it('should return null for unknown agent', async () => {
      const result = await factory.getResult('nonexistent');
      expect(result).toBeNull();
    });

    it('should return result after agent completes', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const agentResult = { taskId: 'task-1', confidence: 0.95 };
      mocks.child.emit('message', { type: 'result', result: agentResult });

      const result = await factory.getResult('agent-test-uuid-1234');
      expect(result).toEqual(agentResult);
    });
  });

  describe('terminateSubagent', () => {
    it('should terminate gracefully', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-terminated', handler);

      await factory.terminateSubagent('agent-test-uuid-1234');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ force: false }));
    });

    it('should force-terminate with SIGKILL', async () => {
      await factory.spawnSubagent('semantic', agentConfig());

      await factory.terminateSubagent('agent-test-uuid-1234', true);

      expect(mocks.child.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should be a no-op for unknown agent', async () => {
      await factory.terminateSubagent('nonexistent');
      // Should not throw
    });
  });

  describe('cleanupAll', () => {
    it('should terminate all agents', async () => {
      // Use unique mock children per spawn
      let spawnIdx = 0;
      mocks.fork.mockImplementation(() => {
        spawnIdx++;
        const { EventEmitter } = require('events');
        return Object.assign(new EventEmitter(), {
          pid: 1000 + spawnIdx,
          kill: vi.fn(),
          send: vi.fn(),
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          connected: true,
          killed: false,
        });
      });

      await factory.spawnSubagent('semantic', agentConfig());
      await factory.spawnSubagent('design', agentConfig());

      const handler = vi.fn();
      factory.on('cleaned-up', handler);

      await factory.cleanupAll();

      expect(handler).toHaveBeenCalled();
      const count = handler.mock.calls[0][0].count;
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should emit cleaned-up event', async () => {
      const handler = vi.fn();
      factory.on('cleaned-up', handler);

      await factory.cleanupAll();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct stats shape', async () => {
      await factory.spawnSubagent('semantic', agentConfig());

      const stats = factory.getStats();

      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('totalSpawned');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('results');
      expect(stats.totalSpawned).toBe(1);
    });

    it('should count active agents', async () => {
      await factory.spawnSubagent('semantic', agentConfig());

      const stats = factory.getStats();
      expect(stats.active).toBe(1);
    });

    it('should count by status', async () => {
      await factory.spawnSubagent('semantic', agentConfig());

      const stats = factory.getStats();
      expect(stats.byStatus['running']).toBe(1);
      expect(stats.results.completed).toBe(0);
    });
  });

  describe('heartbeat monitoring', () => {
    it('should timeout stale agents', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-timeout', handler);

      // Advance past heartbeat timeout (45s) + interval (15s) = 60s
      vi.advanceTimersByTime(60000);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('timeout', () => {
    it('should timeout agent after timeoutMs', async () => {
      await factory.spawnSubagent('semantic', agentConfig());
      const handler = vi.fn();
      factory.on('agent-timeout', handler);

      vi.advanceTimersByTime(5001);

      expect(handler).toHaveBeenCalled();
    });
  });
});
