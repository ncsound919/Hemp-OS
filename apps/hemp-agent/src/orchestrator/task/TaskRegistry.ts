import { ResearchTask, TaskStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class TaskRegistry {
  private tasks: Map<string, ResearchTask> = new Map();

  async createTask(input: Partial<ResearchTask>): Promise<ResearchTask> {
    const task: ResearchTask = {
      id: `task-${uuidv4()}`,
      type: input.type || 'literature-review',
      title: input.title || 'Untitled Research Task',
      description: input.description || '',
      status: 'pending',
      priority: input.priority || 3,
      workspaceId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      deadlines: {
        suggested: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      dependencies: input.dependencies || [],
      metadata: {
        retries: 0,
        ...input.metadata
      }
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(id: string): Promise<ResearchTask | null> {
    return this.tasks.get(id) || null;
  }
}
