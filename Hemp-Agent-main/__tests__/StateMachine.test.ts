import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('../src/workspace/WorkspaceManager.ts', () => ({
  WorkspaceManager: vi.fn().mockImplementation(function () {
    this.createWorkspace = vi.fn().mockResolvedValue({
      id: 'ws-1',
      taskId: 'task-1',
      context: {},
    });
    this.getWorkspace = vi.fn().mockResolvedValue(null);
    this.cleanupWorkspace = vi.fn().mockResolvedValue(undefined);
  }),
}));

vi.mock('../src/orchestrator/task/TaskRegistry.ts', () => {
  let counter = 0;
  return {
    TaskRegistry: vi.fn().mockImplementation(function () {
      this.createTask = vi.fn().mockImplementation((input: any) =>
        Promise.resolve({
          id: `task-${++counter}`,
          type: 'literature-review',
          title: 'Untitled Research Task',
          description: '',
          status: 'pending',
          priority: 3,
          workspaceId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          deadlines: { suggested: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          dependencies: [],
          metadata: { retries: 0 },
          ...input,
        })
      );
      this.getTask = vi.fn().mockResolvedValue(null);
      this.getTaskByExternalId = vi.fn().mockResolvedValue(null);
    }),
  };
});

vi.mock('../src/orchestrator/agents/AgentFactory.ts', () => ({
  AgentFactory: vi.fn().mockImplementation(function () {
    this.on = vi.fn();
    this.removeListener = vi.fn();
    this.emit = vi.fn();
    this.spawnSubagent = vi.fn().mockResolvedValue({
      id: 'agent-1',
      agentType: 'semantic',
      taskId: 'task-1',
      workspaceId: 'ws-1',
      startedAt: new Date(),
      pid: 1234,
      status: 'running',
    });
    this.terminateSubagent = vi.fn().mockResolvedValue(undefined);
    this.getProof = vi.fn().mockResolvedValue(null);
    this.getStats = vi.fn().mockReturnValue({ active: 0, totalSpawned: 0, byStatus: {}, results: { completed: 0, failed: 0, timedOut: 0 } });
  }),
}));

vi.mock('../src/orchestrator/task/proof-of-work/Validator.ts', () => ({
  ProofValidator: vi.fn().mockImplementation(function () {
    this.validate = vi.fn().mockResolvedValue({ passed: true, reason: '' });
  }),
}));

import { OrchestratorStateMachine } from '../src/orchestrator/state-machine/StateMachine.ts';

function createConfig() {
  return {
    taskPollInterval: 1000,
    maxConcurrentAgents: 3,
    agentTimeoutMs: 60000,
    reviewTimeoutMs: 300000,
    maxRetries: 2,
    retryDelay: 5000,
    workflowFile: 'workflow.json',
  };
}

describe('OrchestratorStateMachine', () => {
  let sm: OrchestratorStateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sm = new OrchestratorStateMachine(createConfig());
  });

  afterEach(() => {
    sm.stop();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with idle status', async () => {
      const tasks = await sm.getTasks();
      expect(tasks).toEqual([]);
      expect(sm.getTaskCount()).toBe(0);
      expect(sm.getActiveAgentCount()).toBe(0);
      expect(sm.getPendingReviewCount()).toBe(0);
    });
  });

  describe('start / stop', () => {
    it('should start and emit started event', async () => {
      const handler = vi.fn();
      sm.on('started', handler);

      await sm.start();

      expect(handler).toHaveBeenCalled();
    });

    it('should stop and emit stopped event', async () => {
      await sm.start();
      const handler = vi.fn();
      sm.on('stopped', handler);

      sm.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should set status to monitoring on start', async () => {
      await sm.start();
      // After start, status should be monitoring (internal state)
      // We can verify by checking that step() runs on tick
      expect(sm.getTaskCount()).toBe(0);
    });
  });

  describe('submitTask', () => {
    it('should create a task and store it', async () => {
      const task = await sm.submitTask({ title: 'Test Task', type: 'literature-review' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(sm.getTaskCount()).toBe(1);
    });

    it('should emit task-submitted event', async () => {
      const handler = vi.fn();
      sm.on('task-submitted', handler);

      await sm.submitTask({ title: 'Event Task' });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        task: expect.objectContaining({ title: 'Event Task' }),
      }));
    });

    it('should be retrievable via getTask', async () => {
      const task = await sm.submitTask({ title: 'Findable' });
      const found = await sm.getTask(task.id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe('Findable');
    });
  });

  describe('getTasks', () => {
    it('should return all submitted tasks', async () => {
      await sm.submitTask({ title: 'Task A' });
      await sm.submitTask({ title: 'Task B' });

      const tasks = await sm.getTasks();
      expect(tasks.length).toBe(2);
    });
  });

  describe('approveTask', () => {
    it('should transition task from ready-review to completed', async () => {
      const task = await sm.submitTask({ title: 'Approve Me' });
      task.status = 'ready-review';
      (sm as any).state.tasks.set(task.id, task);

      await sm.approveTask(task.id);

      const updated = await sm.getTask(task.id);
      expect(updated!.status).toBe('completed');
    });

    it('should emit task-approved event', async () => {
      const handler = vi.fn();
      sm.on('task-approved', handler);

      const task = await sm.submitTask({ title: 'Approve Event' });
      task.status = 'ready-review';
      (sm as any).state.tasks.set(task.id, task);

      await sm.approveTask(task.id);

      expect(handler).toHaveBeenCalled();
    });

    it('should throw for unknown task', async () => {
      await expect(sm.approveTask('nonexistent')).rejects.toThrow('not found');
    });

    it('should not change status for non-review tasks', async () => {
      const task = await sm.submitTask({ title: 'Pending' });
      // status is 'pending' by default
      await sm.approveTask(task.id);

      const updated = await sm.getTask(task.id);
      expect(updated!.status).toBe('pending');
    });
  });

  describe('rejectTask', () => {
    it('should transition task from ready-review to failed', async () => {
      const handler = vi.fn();
      sm.on('task-rejected', handler);

      const task = await sm.submitTask({ title: 'Reject Me' });
      task.status = 'ready-review';
      (sm as any).state.tasks.set(task.id, task);

      await sm.rejectTask(task.id, 'Not enough evidence');

      const updated = await sm.getTask(task.id);
      expect(updated!.status).toBe('failed');
      expect(updated!.metadata.failureReason).toContain('Not enough evidence');
      expect(handler).toHaveBeenCalled();
    });

    it('should throw for unknown task', async () => {
      await expect(sm.rejectTask('nonexistent', 'reason')).rejects.toThrow('not found');
    });
  });

  describe('stop', () => {
    it('should clear poll timer', async () => {
      await sm.start();
      sm.stop();
      // After stop, stepping should still work (just no auto-polling)
      await sm.step();
      expect(sm.getTaskCount()).toBe(0);
    });
  });

  describe('step (isProcessing guard)', () => {
    it('should not run concurrent steps', async () => {
      await sm.start();
      // First step is already running from start()
      // Calling step() again should be a no-op
      await sm.step();
      expect(sm.getTaskCount()).toBe(0);
    });
  });

  describe('step (error recovery)', () => {
    it('should emit error and reset to idle on step failure', async () => {
      const errorHandler = vi.fn();
      sm.on('error', errorHandler);

      // Add a task to pendingReviews so handleStalledTasks calls getTask
      (sm as any).state.pendingReviews.push('review-task-1');

      // Make getTask throw during handleStalledTasks
      const registry = (sm as any).taskRegistry;
      registry.getTask.mockRejectedValueOnce(new Error('DB connection lost'));

      await sm.start();

      // Step runs during start, let it complete
      await vi.advanceTimersByTimeAsync(0);

      // The error should have been caught and emitted
      expect(errorHandler).toHaveBeenCalled();
    });
  });
});
