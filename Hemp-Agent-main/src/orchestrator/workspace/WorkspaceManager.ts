import { Workspace, WorkspaceContext } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface WorkspaceUpdate {
  variables?: Record<string, any>;
  graphSnapshot?: { nodes: any[]; edges: any[] };
  memorySnapshot?: any[];
  queryHistory?: string[];
  context?: Partial<WorkspaceContext>;
}

export class WorkspaceManager extends EventEmitter {
  private workspaces: Map<string, Workspace> = new Map();
  private archivedWorkspaces: Map<string, Workspace> = new Map();
  private maxWorkspaces: number = 100; // Configurable
  private autoArchiveAfter: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Create a new isolated workspace for a task
   */
  async createWorkspace(
    taskId: string,
    context: Partial<WorkspaceContext> = {}
  ): Promise<Workspace> {
    // Enforce workspace limits
    if (this.workspaces.size >= this.maxWorkspaces) {
      await this.cleanupOldestWorkspace();
    }

    const workspace: Workspace = {
      id: `ws-${uuidv4()}`,
      taskId,
      state: {
        variables: {},
        graphSnapshot: { nodes: [], edges: [] },
        memorySnapshot: [],
        queryHistory: [],
        version: 1, // For optimistic locking
        lastSnapshotAt: new Date()
      },
      context: {
        taskDescription: context.taskDescription || '',
        providedEvidence: context.providedEvidence || [],
        constraints: context.constraints || [],
        successCriteria: context.successCriteria || [],
        knownEntities: context.knownEntities || [],
        externalReferences: context.externalReferences || [],
        assignedAgentIds: context.assignedAgentIds || [],
        parentOrchestratorId: context.parentOrchestratorId || ''
      },
      agentHistory: [],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      version: 1,
      isArchived: false
    };

    this.workspaces.set(workspace.id, workspace);
    this.emit('workspace-created', { workspaceId: workspace.id, taskId });

    return workspace;
  }

  /**
   * Get a workspace by ID
   */
  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) || this.archivedWorkspaces.get(id) || null;
  }

  /**
   * Update a workspace with new state
   */
  async updateWorkspace(
    id: string,
    updates: WorkspaceUpdate,
    expectedVersion?: number
  ): Promise<Workspace> {
    const workspace = await this.getWorkspace(id);
    if (!workspace) {
      throw new Error(`Workspace ${id} not found`);
    }

    // Optimistic locking: check version
    if (expectedVersion !== undefined && workspace.state.version !== expectedVersion) {
      throw new Error(
        `Workspace ${id} version mismatch: expected ${expectedVersion}, got ${workspace.state.version}`
      );
    }

    // Apply updates
    if (updates.variables) {
      workspace.state.variables = { ...workspace.state.variables, ...updates.variables };
    }
    if (updates.graphSnapshot) {
      workspace.state.graphSnapshot = updates.graphSnapshot;
    }
    if (updates.memorySnapshot) {
      workspace.state.memorySnapshot = updates.memorySnapshot;
    }
    if (updates.queryHistory) {
      workspace.state.queryHistory = [
        ...workspace.state.queryHistory,
        ...updates.queryHistory
      ];
    }
    if (updates.context) {
      workspace.context = { ...workspace.context, ...updates.context };
    }

    workspace.state.version += 1;
    workspace.lastActiveAt = new Date();
    workspace.state.lastSnapshotAt = new Date();

    this.workspaces.set(id, workspace);
    this.emit('workspace-updated', { workspaceId: id, version: workspace.state.version });

    return workspace;
  }

  /**
   * Append an agent execution record to the workspace history
   */
  async appendAgentExecution(
    workspaceId: string,
    execution: {
      agentId: string;
      action: string;
      input?: any;
      output?: any;
      durationMs: number;
      status: 'success' | 'error' | 'timeout';
    }
  ): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    workspace.agentHistory.push({
      ...execution,
      timestamp: new Date()
    });
    workspace.lastActiveAt = new Date();

    this.workspaces.set(workspaceId, workspace);
    this.emit('agent-execution-recorded', { workspaceId, execution });
  }

  /**
   * Snapshot a workspace (serialize to JSON for persistence)
   */
  async snapshotWorkspace(id: string): Promise<{
    snapshot: any;
    hash: string;
  }> {
    const workspace = await this.getWorkspace(id);
    if (!workspace) {
      throw new Error(`Workspace ${id} not found`);
    }

    const snapshotData = {
      workspace,
      timestamp: new Date(),
      version: workspace.state.version,
      hash: this.computeHash(workspace)
    };

    return {
      snapshot: snapshotData,
      hash: snapshotData.hash
    };
  }

  /**
   * Restore a workspace from a snapshot
   */
  async restoreWorkspace(snapshot: any): Promise<Workspace> {
    const restored = snapshot.workspace as Workspace;
    
    // Ensure it has a new ID if restoring a new instance
    if (this.workspaces.has(restored.id)) {
      restored.id = `ws-${uuidv4()}`;
    }

    // Reset timestamps
    restored.createdAt = new Date();
    restored.lastActiveAt = new Date();
    restored.state.version = 1;
    restored.isArchived = false;

    this.workspaces.set(restored.id, restored);
    this.emit('workspace-restored', { workspaceId: restored.id });

    return restored;
  }

  /**
   * Archive (and optionally delete) a workspace
   */
  async cleanupWorkspace(id: string, permanentDelete: boolean = false): Promise<void> {
    const workspace = await this.getWorkspace(id);
    if (!workspace) {
      return;
    }

    if (permanentDelete) {
      this.workspaces.delete(id);
      this.archivedWorkspaces.delete(id);
      this.emit('workspace-permanently-deleted', { workspaceId: id });
    } else {
      // Archive the workspace
      const archived = { ...workspace, isArchived: true };
      this.archivedWorkspaces.set(id, archived);
      this.workspaces.delete(id);
      this.emit('workspace-archived', { workspaceId: id });
    }
  }

  /**
   * Get all active workspaces (optionally filtered by taskId)
   */
  async getActiveWorkspaces(taskId?: string): Promise<Workspace[]> {
    const workspaces = Array.from(this.workspaces.values());
    if (taskId) {
      return workspaces.filter(w => w.taskId === taskId);
    }
    return workspaces;
  }

  /**
   * Get archived workspaces
   */
  async getArchivedWorkspaces(): Promise<Workspace[]> {
    return Array.from(this.archivedWorkspaces.values());
  }

  /**
   * Get workspace statistics
   */
  async getStats(): Promise<{
    active: number;
    archived: number;
    total: number;
    oldestActive: Date | null;
    newestActive: Date | null;
  }> {
    const active = Array.from(this.workspaces.values());
    return {
      active: active.length,
      archived: this.archivedWorkspaces.size,
      total: this.workspaces.size + this.archivedWorkspaces.size,
      oldestActive: active.length > 0 ? new Date(Math.min(...active.map(w => w.createdAt.getTime()))) : null,
      newestActive: active.length > 0 ? new Date(Math.max(...active.map(w => w.createdAt.getTime()))) : null
    };
  }

  /**
   * Auto-cleanup oldest workspace when limit is exceeded
   */
  private async cleanupOldestWorkspace(): Promise<void> {
    const workspaces = Array.from(this.workspaces.values());
    if (workspaces.length === 0) return;

    // Find the oldest active workspace
    const oldest = workspaces.reduce((a, b) => 
      a.createdAt < b.createdAt ? a : b
    );

    await this.cleanupWorkspace(oldest.id, false);
    this.emit('workspace-auto-archived', { workspaceId: oldest.id });
  }

  /**
   * Compute a hash for a workspace (for integrity verification)
   */
  private computeHash(workspace: Workspace): string {
    const data = JSON.stringify({
      id: workspace.id,
      state: workspace.state,
      context: workspace.context,
      agentHistory: workspace.agentHistory.slice(-10) // Only last 10 for speed
    });
    // Simple hash (could use crypto.createHash in Node)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Clear all workspaces (dangerous, for testing)
   */
  async clearAll(): Promise<void> {
    this.workspaces.clear();
    this.archivedWorkspaces.clear();
    this.emit('workspaces-cleared');
  }
}
