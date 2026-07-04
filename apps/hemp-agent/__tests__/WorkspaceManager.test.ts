import { describe, it, expect, vi, beforeEach } from 'vitest';

let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
}));

import { WorkspaceManager } from '../src/orchestrator/workspace/WorkspaceManager';

describe('WorkspaceManager', () => {
  let wm: WorkspaceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    wm = new WorkspaceManager();
  });

  describe('createWorkspace', () => {
    it('should create a workspace with generated id', async () => {
      const ws = await wm.createWorkspace('task-1');
      expect(ws.id).toBe('ws-test-uuid-1');
      expect(ws.taskId).toBe('task-1');
      expect(ws.version).toBe(1);
      expect(ws.isArchived).toBe(false);
    });

    it('should initialize state with defaults', async () => {
      const ws = await wm.createWorkspace('task-1');
      expect(ws.state.version).toBe(1);
      expect(ws.state.variables).toEqual({});
      expect(ws.state.graphSnapshot).toEqual({ nodes: [], edges: [] });
      expect(ws.state.memorySnapshot).toEqual([]);
      expect(ws.state.queryHistory).toEqual([]);
    });

    it('should apply provided context', async () => {
      const ws = await wm.createWorkspace('task-1', {
        taskDescription: 'Research hemp',
        constraints: ['no gmo'],
      });
      expect(ws.context.taskDescription).toBe('Research hemp');
      expect(ws.context.constraints).toEqual(['no gmo']);
    });

    it('should emit workspace-created event', async () => {
      const handler = vi.fn();
      wm.on('workspace-created', handler);
      await wm.createWorkspace('task-1');
      expect(handler).toHaveBeenCalledWith({ workspaceId: 'ws-test-uuid-1', taskId: 'task-1' });
    });
  });

  describe('getWorkspace', () => {
    it('should return null for non-existent workspace', async () => {
      expect(await wm.getWorkspace('non-existent')).toBeNull();
    });

    it('should find archived workspaces', async () => {
      const ws = await wm.createWorkspace('task-1');
      await wm.cleanupWorkspace(ws.id, false);
      const found = await wm.getWorkspace(ws.id);
      expect(found).not.toBeNull();
      expect(found!.isArchived).toBe(true);
    });
  });

  describe('updateWorkspace', () => {
    it('should update variables and bump version', async () => {
      const ws = await wm.createWorkspace('task-1');
      const updated = await wm.updateWorkspace(ws.id, { variables: { temp: 25 } });
      expect(updated.state.variables).toEqual({ temp: 25 });
      expect(updated.state.version).toBe(2);
    });

    it('should merge variables', async () => {
      const ws = await wm.createWorkspace('task-1');
      await wm.updateWorkspace(ws.id, { variables: { a: 1 } });
      const updated = await wm.updateWorkspace(ws.id, { variables: { b: 2 } });
      expect(updated.state.variables).toEqual({ a: 1, b: 2 });
    });

    it('should append to queryHistory', async () => {
      const ws = await wm.createWorkspace('task-1');
      await wm.updateWorkspace(ws.id, { queryHistory: ['q1'] });
      const updated = await wm.updateWorkspace(ws.id, { queryHistory: ['q2'] });
      expect(updated.state.queryHistory).toEqual(['q1', 'q2']);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(wm.updateWorkspace('nope', { variables: {} })).rejects.toThrow('not found');
    });

    it('should enforce optimistic locking', async () => {
      const ws = await wm.createWorkspace('task-1');
      await expect(wm.updateWorkspace(ws.id, {}, 999)).rejects.toThrow('version mismatch');
    });

    it('should succeed with correct expectedVersion', async () => {
      const ws = await wm.createWorkspace('task-1');
      const updated = await wm.updateWorkspace(ws.id, { variables: { x: 1 } }, 1);
      expect(updated.state.version).toBe(2);
    });

    it('should emit workspace-updated event', async () => {
      const handler = vi.fn();
      wm.on('workspace-updated', handler);
      const ws = await wm.createWorkspace('task-1');
      await wm.updateWorkspace(ws.id, { variables: { a: 1 } });
      expect(handler).toHaveBeenCalledWith({ workspaceId: ws.id, version: 2 });
    });
  });

  describe('appendAgentExecution', () => {
    it('should append execution to agentHistory', async () => {
      const ws = await wm.createWorkspace('task-1');
      await wm.appendAgentExecution(ws.id, {
        agentId: 'agent-1', action: 'search', durationMs: 150, status: 'success',
      });
      const updated = await wm.getWorkspace(ws.id);
      expect(updated!.agentHistory).toHaveLength(1);
      expect(updated!.agentHistory[0].agentId).toBe('agent-1');
    });

    it('should throw for non-existent workspace', async () => {
      await expect(wm.appendAgentExecution('nope', {
        agentId: 'a', action: 'x', durationMs: 0, status: 'success',
      })).rejects.toThrow('not found');
    });

    it('should emit agent-execution-recorded event', async () => {
      const handler = vi.fn();
      wm.on('agent-execution-recorded', handler);
      const ws = await wm.createWorkspace('task-1');
      await wm.appendAgentExecution(ws.id, {
        agentId: 'a1', action: 'analyze', durationMs: 100, status: 'success',
      });
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: ws.id }));
    });
  });

  describe('snapshotWorkspace', () => {
    it('should return snapshot with hash', async () => {
      const ws = await wm.createWorkspace('task-1');
      const { snapshot, hash } = await wm.snapshotWorkspace(ws.id);
      expect(snapshot.workspace.id).toBe(ws.id);
      expect(typeof hash).toBe('string');
    });

    it('should throw for non-existent workspace', async () => {
      await expect(wm.snapshotWorkspace('nope')).rejects.toThrow('not found');
    });
  });

  describe('restoreWorkspace', () => {
    it('should restore from snapshot with new id', async () => {
      const ws = await wm.createWorkspace('task-1');
      const originalId = ws.id;
      const { snapshot } = await wm.snapshotWorkspace(ws.id);
      const restored = await wm.restoreWorkspace(snapshot);
      expect(restored.id).not.toBe(originalId);
      expect(restored.version).toBe(1);
      expect(restored.isArchived).toBe(false);
    });

    it('should emit workspace-restored event', async () => {
      const handler = vi.fn();
      wm.on('workspace-restored', handler);
      const ws = await wm.createWorkspace('task-1');
      const { snapshot } = await wm.snapshotWorkspace(ws.id);
      await wm.restoreWorkspace(snapshot);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('cleanupWorkspace', () => {
    it('should archive workspace by default', async () => {
      const ws = await wm.createWorkspace('task-1');
      await wm.cleanupWorkspace(ws.id);
      expect(await wm.getActiveWorkspaces()).toHaveLength(0);
      expect(await wm.getArchivedWorkspaces()).toHaveLength(1);
    });

    it('should permanently delete when flag is true', async () => {
      const ws = await wm.createWorkspace('task-1');
      await wm.cleanupWorkspace(ws.id, true);
      expect(await wm.getWorkspace(ws.id)).toBeNull();
    });

    it('should be a no-op for non-existent workspace', async () => {
      await expect(wm.cleanupWorkspace('nope')).resolves.toBeUndefined();
    });

    it('should emit workspace-archived event', async () => {
      const handler = vi.fn();
      wm.on('workspace-archived', handler);
      const ws = await wm.createWorkspace('task-1');
      await wm.cleanupWorkspace(ws.id);
      expect(handler).toHaveBeenCalledWith({ workspaceId: ws.id });
    });

    it('should emit workspace-permanently-deleted event', async () => {
      const handler = vi.fn();
      wm.on('workspace-permanently-deleted', handler);
      const ws = await wm.createWorkspace('task-1');
      await wm.cleanupWorkspace(ws.id, true);
      expect(handler).toHaveBeenCalledWith({ workspaceId: ws.id });
    });
  });

  describe('getActiveWorkspaces', () => {
    it('should return all active workspaces', async () => {
      await wm.createWorkspace('t1');
      await wm.createWorkspace('t2');
      expect(await wm.getActiveWorkspaces()).toHaveLength(2);
    });

    it('should filter by taskId', async () => {
      await wm.createWorkspace('t1');
      await wm.createWorkspace('t2');
      await wm.createWorkspace('t1');
      expect(await wm.getActiveWorkspaces('t1')).toHaveLength(2);
    });

    it('should return empty array when none exist', async () => {
      expect(await wm.getActiveWorkspaces()).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct counts', async () => {
      await wm.createWorkspace('t1');
      await wm.createWorkspace('t2');
      const ws3 = await wm.createWorkspace('t3');
      await wm.cleanupWorkspace(ws3.id);
      const stats = await wm.getStats();
      expect(stats.active).toBe(2);
      expect(stats.archived).toBe(1);
      expect(stats.total).toBe(3);
    });

    it('should return null dates when no active workspaces', async () => {
      const stats = await wm.getStats();
      expect(stats.oldestActive).toBeNull();
      expect(stats.newestActive).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should remove all workspaces', async () => {
      await wm.createWorkspace('t1');
      await wm.createWorkspace('t2');
      await wm.clearAll();
      expect(await wm.getActiveWorkspaces()).toEqual([]);
      expect(await wm.getArchivedWorkspaces()).toEqual([]);
    });

    it('should emit workspaces-cleared event', async () => {
      const handler = vi.fn();
      wm.on('workspaces-cleared', handler);
      await wm.clearAll();
      expect(handler).toHaveBeenCalled();
    });
  });
});
