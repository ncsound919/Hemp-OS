import { DeterministicExecutionTrace, AgentStep } from '../../types';

export type AgentType = 
  | 'semantic'
  | 'simulation' 
  | 'verification'
  | 'design'
  | 'distillation';

export interface AgentConfig {
  taskId: string;
  workspaceId: string;
  query: string;
  context: {
    studies: any[];
    omics: any[];
    imaging: any[];
    memories: any[];
    aiClient?: any;
  };
  timeoutMs: number;
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  trace: DeterministicExecutionTrace;
  artifacts: {
    type: 'summary' | 'graph-node' | 'hypothesis' | 'design' | 'simulation';
    content: any;
    references: string[];
  }[];
  confidence: number;
  executionTimeMs: number;
  status: 'completed' | 'failed' | 'timeout';
  error?: string;
}

export interface AgentRecord {
  id: string;
  type: AgentType;
  taskId: string;
  workspaceId: string;
  child: import('child_process').ChildProcess;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'terminated' | 'timed_out';
  startedAt: Date;
  lastHeartbeatAt: number;
  timeout?: NodeJS.Timeout;
  heartbeatInterval?: NodeJS.Timeout;
  result?: AgentResult;
  error?: string;
}
