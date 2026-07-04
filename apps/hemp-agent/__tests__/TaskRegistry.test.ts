import { describe, it, expect, beforeEach } from 'vitest';
import { TaskRegistry } from '../src/orchestrator/task/TaskRegistry';

describe('TaskRegistry', () => {
  let registry: TaskRegistry;

  beforeEach(() => {
    registry = new TaskRegistry();
  });

  describe('createTask', () => {
    it('should create a task with generated id and defaults', async () => {
      const task = await registry.createTask({});
      expect(task.id).toMatch(/^task-/);
      expect(task.type).toBe('literature-review');
      expect(task.title).toBe('Untitled Research Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe(3);
      expect(task.workspaceId).toBe('');
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
      expect(task.deadlines.suggested).toBeInstanceOf(Date);
      expect(task.dependencies).toEqual([]);
      expect(task.metadata).toEqual({ retries: 0 });
    });

    it('should use provided input fields', async () => {
      const task = await registry.createTask({
        type: 'experiment',
        title: 'Test Task',
        description: 'A test',
        priority: 1,
        dependencies: ['dep-1'],
        metadata: { retries: 2, custom: 'value' },
      });
      expect(task.type).toBe('experiment');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('A test');
      expect(task.priority).toBe(1);
      expect(task.dependencies).toEqual(['dep-1']);
      expect(task.metadata).toEqual({ retries: 2, custom: 'value' });
    });

    it('should generate unique ids for each task', async () => {
      const t1 = await registry.createTask({});
      const t2 = await registry.createTask({});
      expect(t1.id).not.toBe(t2.id);
    });

    it('should set suggested deadline 7 days in the future', async () => {
      const before = Date.now() + 6 * 24 * 60 * 60 * 1000;
      const after = Date.now() + 8 * 24 * 60 * 60 * 1000;
      const task = await registry.createTask({});
      expect(task.deadlines.suggested.getTime()).toBeGreaterThan(before);
      expect(task.deadlines.suggested.getTime()).toBeLessThan(after);
    });
  });

  describe('getTask', () => {
    it('should return null for unknown id', async () => {
      const result = await registry.getTask('nonexistent');
      expect(result).toBeNull();
    });

    it('should return a previously created task', async () => {
      const created = await registry.createTask({ title: 'Find me' });
      const found = await registry.getTask(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Find me');
    });

    it('should return the same object reference (in-memory)', async () => {
      const created = await registry.createTask({});
      const found = await registry.getTask(created.id);
      expect(found).toBe(created);
    });
  });
});
