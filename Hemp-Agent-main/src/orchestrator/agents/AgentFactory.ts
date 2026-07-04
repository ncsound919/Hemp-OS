import { EventEmitter } from 'events';
import { fork } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AgentType, AgentConfig, AgentResult, AgentRecord } from './agent-types';

export class AgentFactory extends EventEmitter {
  private agents = new Map<string, AgentRecord>();
  private totalSpawned = 0;
  private workerPath: string;

  constructor() {
    super();
    // Use compiled JS in production, TS in development
    const isDev = process.env.NODE_ENV !== 'production';
    const ext = isDev ? '.ts' : '.js';
    
    this.workerPath = path.join(__dirname, `agent-worker${ext}`);
  }

  async spawnSubagent(
    type: AgentType,
    config: AgentConfig
  ): Promise<{
    id: string;
    agentType: AgentType;
    taskId: string;
    workspaceId: string;
    startedAt: Date;
    pid: number;
    status: string;
  }> {
    const id = `agent-${uuidv4()}`;

    // Spawn worker process
    const child = fork(this.workerPath, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        AGENT_ID: id,
        AGENT_TYPE: type,
        NODE_OPTIONS: '--max-old-space-size=512',
      },
      execArgv: process.env.NODE_ENV !== 'production' ? ['--loader', 'ts-node/esm'] : [],
    });

    const record: AgentRecord = {
      id,
      type,
      taskId: config.taskId,
      workspaceId: config.workspaceId,
      child,
      status: 'starting',
      startedAt: new Date(),
      lastHeartbeatAt: Date.now(),
    };

    this.agents.set(id, record);
    this.totalSpawned += 1;

    // Set up event handlers
    child.on('message', (msg: any) => this.handleMessage(id, msg));
    child.on('error', (err: Error) => this.handleError(id, err));
    child.on('exit', (code, signal) => this.handleExit(id, code, signal));

    // Forward stdout/stderr
    child.stdout?.on('data', (buf) => {
      this.emit('agent-stdout', { agentId: id, data: buf.toString() });
    });
    child.stderr?.on('data', (buf) => {
      this.emit('agent-stderr', { agentId: id, data: buf.toString() });
    });

    // Set up heartbeat monitoring
    record.heartbeatInterval = setInterval(() => {
      const current = this.agents.get(id);
      if (!current) return;
      
      // Check if heartbeat is stale (> 45 seconds)
      if (Date.now() - current.lastHeartbeatAt > 45000) {
        this.markTimedOut(id);
        return;
      }
      
      // Send ping
      if (current.child.connected) {
        current.child.send({ type: 'ping' });
      }
    }, 15000);

    // Set up timeout
    record.timeout = setTimeout(() => {
      this.markTimedOut(id);
    }, config.timeoutMs);

    // Send startup config via IPC (not env vars)
    child.send({
      type: 'start',
      payload: {
        agentId: id,
        agentType: type,
        taskId: config.taskId,
        workspaceId: config.workspaceId,
        query: config.query,
        context: config.context,
        timeoutMs: config.timeoutMs,
      },
    });

    record.status = 'running';
    this.emit('agent-spawned', { agentId: id, type });

    return {
      id,
      agentType: type,
      taskId: config.taskId,
      workspaceId: config.workspaceId,
      startedAt: record.startedAt,
      pid: child.pid || 0,
      status: record.status,
    };
  }

  private handleMessage(agentId: string, msg: any): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    switch (msg?.type) {
      case 'pong':
        agent.lastHeartbeatAt = Date.now();
        this.emit('agent-heartbeat', { agentId });
        break;

      case 'progress':
        this.emit('agent-progress', { agentId, progress: msg.progress });
        break;

      case 'result':
        agent.result = msg.result as AgentResult;
        agent.status = 'completed';
        this.emit('agent-result', { agentId, result: agent.result });
        // Cleanup after successful completion
        this.cleanupAgent(agentId);
        break;

      case 'error':
        agent.error = String(msg.error || 'Unknown agent error');
        agent.status = 'failed';
        this.emit('agent-error', { agentId, error: agent.error });
        this.cleanupAgent(agentId);
        break;

      default:
        this.emit('agent-message', { agentId, message: msg });
    }
  }

  private handleError(agentId: string, err: Error): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = 'failed';
    agent.error = err.message;
    this.emit('agent-error', { agentId, error: err.message });
    this.cleanupAgent(agentId);
  }

  private handleExit(
    agentId: string,
    code: number | null,
    signal: NodeJS.Signals | null
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // If agent is still running and exit was unexpected
    if (agent.status === 'running' || agent.status === 'starting') {
      if (code === 0) {
        agent.status = 'completed';
      } else {
        agent.status = 'failed';
        agent.error = `Process exited with code ${code}, signal ${signal}`;
      }
    }

    this.emit('agent-exit', {
      agentId,
      code,
      signal,
      status: agent.status,
    });

    this.cleanupAgent(agentId);
  }

  private markTimedOut(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.status === 'completed' || agent.status === 'failed') {
      return;
    }

    agent.status = 'timed_out';
    agent.error = 'Agent timed out';
    agent.child.kill('SIGTERM');
    
    this.emit('agent-timeout', { agentId });
    this.cleanupAgent(agentId);
  }

  private cleanupAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Clear timers
    if (agent.timeout) {
      clearTimeout(agent.timeout);
      delete agent.timeout;
    }
    if (agent.heartbeatInterval) {
      clearInterval(agent.heartbeatInterval);
      delete agent.heartbeatInterval;
    }

    // Kill if still alive
    try {
      if (!agent.child.killed) {
        agent.child.kill('SIGTERM');
      }
    } catch {
      // Ignore
    }
  }

  async getResult(agentId: string): Promise<AgentResult | null> {
    return this.agents.get(agentId)?.result || null;
  }

  async terminateSubagent(agentId: string, force = false): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = 'terminated';
    this.cleanupAgent(agentId);

    if (force) {
      agent.child.kill('SIGKILL');
    } else {
      agent.child.send?.({ type: 'terminate' });
      // Give it 3 seconds to clean up
      setTimeout(() => {
        if (!agent.child.killed) {
          agent.child.kill('SIGTERM');
        }
      }, 3000);
    }

    this.emit('agent-terminated', { agentId, force });
  }

  getStats(): {
    active: number;
    totalSpawned: number;
    byStatus: Record<string, number>;
    results: {
      completed: number;
      failed: number;
      timedOut: number;
    };
  } {
    const byStatus: Record<string, number> = {};
    let completed = 0,
      failed = 0,
      timedOut = 0;

    for (const agent of this.agents.values()) {
      byStatus[agent.status] = (byStatus[agent.status] || 0) + 1;
      if (agent.status === 'completed') completed++;
      if (agent.status === 'failed') failed++;
      if (agent.status === 'timed_out') timedOut++;
    }

    return {
      active: [...this.agents.values()].filter((a) => a.status === 'running').length,
      totalSpawned: this.totalSpawned,
      byStatus,
      results: { completed, failed, timedOut },
    };
  }

  async cleanupAll(): Promise<void> {
    const ids = Array.from(this.agents.keys());
    for (const id of ids) {
      await this.terminateSubagent(id, true);
    }
    this.emit('cleaned-up', { count: ids.length });
  }
}
