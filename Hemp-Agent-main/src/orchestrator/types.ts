import { DeterministicExecutionTrace, Study, GraphNode, GraphEdge, MemoryItem } from "../../types";

// --- Task & Work Item ---
export interface ResearchTask {
  id: string;
  type: "hypothesis-test" | "literature-review" | "experiment-design" | "risk-assessment";
  title: string;
  description: string;
  status: TaskStatus;
  priority: 1 | 2 | 3 | 4 | 5;
  assignedAgent?: string;
  workspaceId: string;
  proofOfWork?: ProofOfWork;
  createdAt: Date;
  updatedAt: Date;
  deadlines: {
    suggested: Date;
    critical?: Date;
  };
  dependencies: string[]; // Task IDs that must complete first
  metadata: Record<string, any>;
}

export type TaskStatus = 
  | "pending"       // Awaiting assignment
  | "assigned"      // Agent allocated but not started
  | "in-progress"   // Agent actively working
  | "ready-review"  // Proof of work produced, awaiting human review
  | "under-review"  // Human reviewing
  | "completed"     // Accepted
  | "blocked"       // Waiting on dependency
  | "failed"        // Agent gave up or invalid proof
  | "re-assign";    // Needs different agent

// --- Proof of Work ---
export interface ProofOfWork {
  id: string;
  taskId: string;
  artifacts: Artifact[];
  validationLogs: string[];
  generatedAt: Date;
  agentId: string;
  metadata: {
    confidence: number;
    traceId?: string;
    executionTime?: number;
  };
}

export interface Artifact {
  type: "trace" | "summary" | "graph-node" | "hypothesis" | "design" | "simulation";
  content: any;
  references: string[];
  hash: string; // For integrity verification
}

// --- Workspace ---
export interface Workspace {
  id: string;
  taskId: string;
  state: WorkspaceState;
  context: WorkspaceContext;
  agentHistory: AgentExecutionRecord[];
  createdAt: Date;
  lastActiveAt: Date;
  version: number;
  isArchived: boolean;
}

export interface WorkspaceState {
  variables: Record<string, any>;
  graphSnapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  memorySnapshot: MemoryItem[];
  queryHistory: string[];
  version: number;
  lastSnapshotAt: Date;
}

export interface WorkspaceContext {
  taskDescription: string;
  providedEvidence: string[];
  constraints: string[];
  successCriteria: string[];
  knownEntities: string[];
  externalReferences: string[];
  assignedAgentIds: string[];
  parentOrchestratorId: string;
}

export interface AgentExecutionRecord {
  agentId: string;
  action: string;
  input?: any;
  output?: any;
  durationMs: number;
  status: 'success' | 'error' | 'timeout';
  timestamp: Date;
}

// --- Orchestrator State Machine ---
export interface OrchestratorState {
  status: "idle" | "monitoring" | "assigning" | "processing" | "reviewing" | "retrying";
  tasks: Map<string, ResearchTask>;
  workspaces: Map<string, Workspace>;
  activeAgents: Map<string, SubagentProcess>;
  pendingReviews: string[];
}

export interface OrchestratorConfig {
  maxConcurrentAgents: number;
  taskPollInterval: number;
  retryDelay: number;
  maxRetries: number;
  agentTimeoutMs: number;
  reviewTimeoutMs: number;
  workflowFile: string;
  linearApiKey?: string;
  slackWebhookUrl?: string;
  githubToken?: string;
  dashboardUrl?: string;
}

// Export agent types for use in other files
export * from './agents/agent-types';

// --- Subagent ---
export interface SubagentProcess {
  id: string;
  agentType: "semantic" | "simulation" | "verification" | "design" | "distillation" | "custom";
  taskId: string;
  workspaceId: string;
  startedAt: Date;
  pid: number;
  status: "running" | "completed" | "terminated";
}

// --- Workflow Definition ---
export interface WorkflowDefinition {
  name: string;
  version: string;
  policies: Policy[];
  taskTypes: TaskTypeDefinition[];
  defaultAgentMapping: Record<TaskStatus, string>;
  validationRules: ValidationRule[];
  notificationChannels: NotificationChannel[];
}

export interface Policy {
  name: string;
  condition: string; // Expression
  action: "assign-critic" | "escalate" | "block" | "notify";
  parameters: Record<string, any>;
}

export interface TaskTypeDefinition {
  type: string;
  requiredAgent: string;
  defaultDeadlineHours: number;
  reviewThreshold: "automated" | "human-required" | "optional";
  allowedProofArtifacts: string[];
}
export interface ValidationRule {
  name: string;
  check: string;
  required: boolean;
}
export interface NotificationChannel {
  type: "slack" | "linear";
  webhookUrl?: string;
  apiKey?: string;
  events: string[];
}
