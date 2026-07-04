import { EventEmitter } from 'events';
import { 
  ResearchTask, 
  TaskStatus, 
  OrchestratorState, 
  OrchestratorConfig,
  Workspace,
  SubagentProcess
} from '../types';
import { WorkspaceManager } from '../workspace/WorkspaceManager';
import { TaskRegistry } from '../task/TaskRegistry';
import { AgentFactory } from '../agents/AgentFactory';
import { ProofValidator } from '../task/proof-of-work/Validator';

export class OrchestratorStateMachine extends EventEmitter {
  private state: OrchestratorState;
  private workspaceManager: WorkspaceManager;
  private taskRegistry: TaskRegistry;
  private agentFactory: AgentFactory;
  private proofValidator: ProofValidator;
  private config: OrchestratorConfig;
  private pollTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.state = {
      status: 'idle',
      tasks: new Map(),
      workspaces: new Map(),
      activeAgents: new Map(),
      pendingReviews: []
    };
    this.workspaceManager = new WorkspaceManager();
    this.taskRegistry = new TaskRegistry();
    this.agentFactory = new AgentFactory();
    this.proofValidator = new ProofValidator();

    // Listen to agent events
    this.agentFactory.on('proof-ready', this.handleProofReady.bind(this));
  }

  async start(): Promise<void> {
    this.state.status = 'monitoring';
    this.emit('started', { timestamp: new Date() });
    
    // Start polling for tasks
    this.pollTimer = setInterval(() => this.step(), this.config.taskPollInterval);
    
    // Initial step
    await this.step();
  }

  /**
   * Main orchestrator step - called on every poll interval
   */
  async step(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Sync with external task sources (Linear, GitHub, etc.)
      await this.syncExternalTasks();

      // 2. Process pending tasks (assign to agents)
      await this.processPendingTasks();

      // 3. Monitor running agents (timeouts, health checks)
      await this.monitorActiveAgents();

      // 4. Process completed proofs
      await this.processCompletedProofs();

      // 5. Handle stalled tasks (long-running, stuck in review)
      await this.handleStalledTasks();

      // 6. Cleanup completed workspaces
      await this.cleanupCompleted();

      // 7. Update task dependencies (if any tasks are blocked, check if dependencies are complete)
      await this.updateTaskDependencies();

    } catch (error) {
      this.emit('error', { error, timestamp: new Date() });
      console.error('Orchestrator step failed:', error);
      
      // Attempt to recover by marking status as idle
      this.state.status = 'idle';
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 1. Sync with external task sources
   */
  private async syncExternalTasks(): Promise<void> {
    // If Linear integration is configured, fetch new issues
    if (this.config.linearApiKey) {
      try {
        const { LinearClient } = await import('../integrations/linear/LinearClient');
        const client = new LinearClient(this.config.linearApiKey);
        
        const issues = await client.getNewIssues();
        for (const issue of issues) {
          // Check if task already exists
          const existing = await this.taskRegistry.getTaskByExternalId(issue.id);
          if (!existing) {
            const task = await this.taskRegistry.createTask({
              externalId: issue.id,
              source: 'linear',
              title: issue.title,
              description: issue.description,
              type: this.detectTaskType(issue.labels || []),
              priority: issue.priority || 3
            });
            this.state.tasks.set(task.id, task);
            this.emit('task-created', { task, source: 'linear' });
          }
        }
      } catch (error) {
        this.emit('sync-error', { source: 'linear', error });
      }
    }

    // If GitHub integration is configured, sync issues
    if (this.config.githubToken) {
      // Similar logic for GitHub Issues
    }
  }

  /**
   * 2. Process pending tasks - assign to agents
   */
  private async processPendingTasks(): Promise<void> {
    // Check capacity
    if (this.state.activeAgents.size >= this.config.maxConcurrentAgents) {
      this.emit('capacity-limited', { 
        current: this.state.activeAgents.size, 
        max: this.config.maxConcurrentAgents 
      });
      return;
    }

    // Get pending tasks (pending or re-assign)
    const pendingTasks = Array.from(this.state.tasks.values())
      .filter(t => t.status === 'pending' || t.status === 're-assign')
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    for (const task of pendingTasks) {
      // Check if we still have capacity
      if (this.state.activeAgents.size >= this.config.maxConcurrentAgents) break;

      // Check if dependencies are satisfied
      if (!await this.areDependenciesMet(task)) {
        task.status = 'blocked';
        this.state.tasks.set(task.id, task);
        this.emit('task-blocked', { task, reason: 'Unmet dependencies' });
        continue;
      }

      // Assign the task
      await this.assignTask(task);
    }
  }

  /**
   * Assign a single task to an agent
   */
  private async assignTask(task: ResearchTask): Promise<void> {
    try {
      // Determine agent type based on task type
      const agentType = this.getAgentForTask(task);

      // Create isolated workspace
      const context = {
        taskDescription: task.title,
        providedEvidence: task.metadata?.evidence || [],
        constraints: this.getConstraintsForTask(task),
        successCriteria: this.getSuccessCriteriaForTask(task),
        knownEntities: task.metadata?.entities || []
      };

      const workspace = await this.workspaceManager.createWorkspace(task.id, context);

      // Create proof of work expectations
      const proofExpectations = this.getProofExpectationsForTask(task);

      // Spawn the subagent
      const subagent = await this.agentFactory.spawnSubagent(agentType, {
        taskId: task.id,
        workspaceId: workspace.id,
        context: workspace.context,
        proofExpectations,
        timeoutMs: this.config.agentTimeoutMs
      });

      // Update task state
      task.status = 'assigned';
      task.assignedAgent = subagent.id;
      task.workspaceId = workspace.id;
      task.updatedAt = new Date();
      task.metadata = {
        ...task.metadata,
        assignedAt: new Date().toISOString(),
        agentType,
        retries: (task.metadata?.retries || 0)
      };

      // Store in state
      this.state.tasks.set(task.id, task);
      this.state.workspaces.set(workspace.id, workspace);
      this.state.activeAgents.set(subagent.id, subagent);

      this.emit('task-assigned', { task, subagent, workspace });
    } catch (error) {
      this.emit('assignment-error', { task, error });
      task.status = 'failed';
      this.state.tasks.set(task.id, task);
    }
  }

  /**
   * 3. Monitor active agents for timeouts and health
   */
  private async monitorActiveAgents(): Promise<void> {
    const now = Date.now();

    for (const [agentId, process] of this.state.activeAgents) {
      // Check for timeout
      const elapsed = now - process.startedAt.getTime();
      if (elapsed > this.config.agentTimeoutMs) {
        this.emit('agent-timeout', { agentId, process });
        
        // Terminate the agent
        await this.agentFactory.terminateSubagent(agentId);
        this.state.activeAgents.delete(agentId);

        // Mark task as failed
        const task = await this.taskRegistry.getTask(process.taskId);
        if (task) {
          task.status = 'failed';
          task.metadata = {
            ...task.metadata,
            failureReason: 'timeout',
            timeoutAt: new Date().toISOString()
          };
          this.state.tasks.set(task.id, task);
          this.emit('task-timeout', { task, agentId });
        }
      }

      // Check if agent process is still alive (if we have the PID)
      if (process.pid) {
        try {
          // Node.js: process.kill(pid, 0) checks if process exists
          const isAlive = process.kill(process.pid, 0);
          if (!isAlive) {
            // Process died unexpectedly
            this.emit('agent-crashed', { agentId, process });
            
            // Cleanup and mark task as failed
            this.state.activeAgents.delete(agentId);
            const task = await this.taskRegistry.getTask(process.taskId);
            if (task) {
              task.status = 'failed';
              task.metadata = {
                ...task.metadata,
                failureReason: 'crash'
              };
              this.state.tasks.set(task.id, task);
            }
          }
        } catch (error) {
          // Process doesn't exist
          this.state.activeAgents.delete(agentId);
          const task = await this.taskRegistry.getTask(process.taskId);
          if (task) {
            task.status = 'failed';
            task.metadata = {
              ...task.metadata,
              failureReason: 'process-lost'
            };
            this.state.tasks.set(task.id, task);
          }
        }
      }
    }
  }

  /**
   * 4. Process completed proofs from agents
   */
  private async processCompletedProofs(): Promise<void> {
    // Check for agents that have completed
    const completedAgents = Array.from(this.state.activeAgents.entries())
      .filter(([_, process]) => process.status === 'completed');

    for (const [agentId, process] of completedAgents) {
      const task = await this.taskRegistry.getTask(process.taskId);
      if (!task) continue;

      // Get the proof from the agent
      const proof = await this.agentFactory.getProof(agentId);
      
      if (proof) {
        // Validate the proof
        const validationResult = await this.proofValidator.validate(proof, task);
        
        if (validationResult.passed) {
          task.status = 'ready-review';
          task.proofOfWork = proof;
          task.updatedAt = new Date();
          this.state.tasks.set(task.id, task);
          this.state.pendingReviews.push(task.id);
          
          this.emit('proof-ready', { 
            task, 
            proof, 
            validation: validationResult 
          });

          // Send notification if configured
          await this.notifyReviewRequired(task);
        } else {
          task.status = 'failed';
          task.metadata = {
            ...task.metadata,
            failureReason: 'invalid-proof',
            validationErrors: validationResult.reason
          };
          this.state.tasks.set(task.id, task);
          
          this.emit('proof-failed', { 
            task, 
            proof, 
            reason: validationResult.reason 
          });

          // Auto-retry if within limits
          const retries = (task.metadata?.retries || 0) + 1;
          if (retries <= this.config.maxRetries) {
            task.status = 're-assign';
            task.metadata = {
              ...task.metadata,
              retries
            };
            this.state.tasks.set(task.id, task);
            this.emit('retry', { task, attempt: retries });
          }
        }
      }

      // Cleanup agent
      this.state.activeAgents.delete(agentId);
      await this.agentFactory.terminateSubagent(agentId);
    }
  }

  /**
   * 5. Handle stalled tasks
   */
  private async handleStalledTasks(): Promise<void> {
    const now = new Date();

    // Check tasks stuck in review
    for (const taskId of this.state.pendingReviews) {
      const task = await this.taskRegistry.getTask(taskId);
      if (!task) continue;

      const reviewElapsed = now.getTime() - task.updatedAt.getTime();
      if (reviewElapsed > this.config.reviewTimeoutMs) {
        // Review timed out - reassign or flag
        this.state.pendingReviews = this.state.pendingReviews.filter(id => id !== taskId);
        
        if ((task.metadata?.retries || 0) < this.config.maxRetries) {
          task.status = 're-assign';
          task.metadata = {
            ...task.metadata,
            retries: (task.metadata?.retries || 0) + 1,
            stalledReason: 'review-timeout'
          };
          this.state.tasks.set(task.id, task);
          this.emit('task-reassigned-stalled', { task });
        } else {
          task.status = 'failed';
          task.metadata = {
            ...task.metadata,
            failureReason: 'review-timeout'
          };
          this.state.tasks.set(task.id, task);
          this.emit('task-failed-stalled', { task });
        }
      }
    }

    // Check tasks that have been in-progress too long (agent not responding)
    // This is handled in monitorActiveAgents
  }

  /**
   * 6. Cleanup completed workspaces
   */
  private async cleanupCompleted(): Promise<void> {
    const completedTasks = Array.from(this.state.tasks.values())
      .filter(t => t.status === 'completed' || t.status === 'failed');

    for (const task of completedTasks) {
      if (task.workspaceId) {
        const workspace = await this.workspaceManager.getWorkspace(task.workspaceId);
        if (workspace) {
          // Archive the workspace
          await this.workspaceManager.cleanupWorkspace(task.workspaceId, false);
          this.state.workspaces.delete(task.workspaceId);
          this.emit('workspace-archived', { workspaceId: task.workspaceId, taskId: task.id });
        }
      }
    }

    // Remove old completed/failed tasks from active state (keep for audit, but clean up memory)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [taskId, task] of this.state.tasks) {
      if ((task.status === 'completed' || task.status === 'failed') && 
          task.updatedAt < oneWeekAgo) {
        // Archive or delete old tasks
        this.state.tasks.delete(taskId);
        this.emit('task-archived', { taskId, status: task.status });
      }
    }
  }

  /**
   * 7. Update task dependencies
   */
  private async updateTaskDependencies(): Promise<void> {
    const blockedTasks = Array.from(this.state.tasks.values())
      .filter(t => t.status === 'blocked');

    for (const task of blockedTasks) {
      const depsMet = await this.areDependenciesMet(task);
      if (depsMet) {
        task.status = 'pending';
        task.updatedAt = new Date();
        this.state.tasks.set(task.id, task);
        this.emit('task-unblocked', { task });
      }
    }
  }

  // --- Helper Methods ---

  private getAgentForTask(task: ResearchTask): string {
    const mapping = {
      'hypothesis-test': 'simulation',
      'literature-review': 'semantic',
      'experiment-design': 'design',
      'risk-assessment': 'verification'
    };
    return mapping[task.type] || 'semantic';
  }

  private getConstraintsForTask(task: ResearchTask): string[] {
    const baseConstraints = [
      'Must follow Hemp OS safety guidelines',
      'Must include provenance for all claims'
    ];
    
    if (task.type === 'risk-assessment') {
      baseConstraints.push('Must include adolescent risk scoring');
      baseConstraints.push('Must reference at least 3 peer-reviewed studies');
    }
    
    if (task.type === 'hypothesis-test') {
      baseConstraints.push('Must include statistical analysis');
      baseConstraints.push('Must have defined null hypothesis');
    }
    
    return baseConstraints;
  }

  private getSuccessCriteriaForTask(task: ResearchTask): string[] {
    const criteria = [
      'All required artifacts present',
      'Confidence score > 0.7',
      'No contradictions with existing knowledge'
    ];
    
    if (task.type === 'risk-assessment') {
      criteria.push('Risk score calculated for all relevant demographics');
      criteria.push('Supporting evidence cited');
    }
    
    return criteria;
  }

  private getProofExpectationsForTask(task: ResearchTask): string[] {
    const mapping = {
      'hypothesis-test': ['trace', 'summary', 'simulation'],
      'literature-review': ['summary', 'graph-node'],
      'experiment-design': ['design', 'simulation'],
      'risk-assessment': ['trace', 'summary', 'simulation']
    };
    return mapping[task.type] || ['summary'];
  }

  private async areDependenciesMet(task: ResearchTask): Promise<boolean> {
    if (!task.dependencies || task.dependencies.length === 0) return true;
    
    for (const depId of task.dependencies) {
      const depTask = await this.taskRegistry.getTask(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  private detectTaskType(labels: string[]): string {
    if (labels.some(l => l.toLowerCase().includes('hypothesis'))) return 'hypothesis-test';
    if (labels.some(l => l.toLowerCase().includes('review'))) return 'literature-review';
    if (labels.some(l => l.toLowerCase().includes('design'))) return 'experiment-design';
    return 'risk-assessment';
  }

  private async notifyReviewRequired(task: ResearchTask): Promise<void> {
    // Slack notification
    if (this.config.slackWebhookUrl) {
      try {
        await fetch(this.config.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📋 *Research Task Ready for Review*\n*Task:* ${task.title}\n*ID:* ${task.id}\n*Type:* ${task.type}\n*Confidence:* ${task.proofOfWork?.metadata.confidence || 'N/A'}`,
            attachments: [{
              color: '#00ff66',
              actions: [{
                type: 'button',
                text: 'View Task',
                url: `${this.config.dashboardUrl}/tasks/${task.id}`
              }]
            }]
          })
        });
      } catch (error) {
        this.emit('notification-error', { error, task });
      }
    }
  }

  /**
   * Handle proof-ready events from agent factory
   */
  private handleProofReady(data: { agentId: string; proof: any }): void {
    this.emit('proof-ready', data);
  }

  // --- Public API Methods ---

  async getTasks(): Promise<ResearchTask[]> {
    return Array.from(this.state.tasks.values());
  }

  async getTask(id: string): Promise<ResearchTask | null> {
    return this.state.tasks.get(id) || null;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return Array.from(this.state.workspaces.values());
  }

  async getActiveAgents(): Promise<SubagentProcess[]> {
    return Array.from(this.state.activeAgents.values());
  }

  async approveTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    
    if (task.status === 'ready-review') {
      task.status = 'completed';
      task.updatedAt = new Date();
      this.state.tasks.set(task.id, task);
      this.state.pendingReviews = this.state.pendingReviews.filter(id => id !== taskId);
      this.emit('task-approved', { task });
    }
  }

  async rejectTask(taskId: string, reason: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    
    if (task.status === 'ready-review') {
      task.status = 'failed';
      task.metadata = {
        ...task.metadata,
        failureReason: `rejected: ${reason}`
      };
      task.updatedAt = new Date();
      this.state.tasks.set(task.id, task);
      this.state.pendingReviews = this.state.pendingReviews.filter(id => id !== taskId);
      this.emit('task-rejected', { task, reason });
    }
  }

  async submitTask(taskInput: Partial<ResearchTask>): Promise<ResearchTask> {
    const task = await this.taskRegistry.createTask(taskInput);
    this.state.tasks.set(task.id, task);
    this.emit('task-submitted', { task });
    return task;
  }

  getTaskCount(): number {
    return this.state.tasks.size;
  }

  getActiveAgentCount(): number {
    return this.state.activeAgents.size;
  }

  getPendingReviewCount(): number {
    return this.state.pendingReviews.length;
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.state.status = 'idle';
    this.emit('stopped', { timestamp: new Date() });
  }
}