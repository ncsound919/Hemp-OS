// Shared types for inter-service communication

export interface ServiceConfig {
  name: string;
  port: number;
  host: string;
  capabilities: string[];
}

export type ServiceName = 'hemp-os' | 'hemp-os-db' | 'hemp-agent';

export const SERVICES: Record<ServiceName, ServiceConfig> = {
  'hemp-os': {
    name: 'hemp-os',
    port: 3100,
    host: 'http://localhost:3100',
    capabilities: ['kernel', 'simulation', 'provenance', 'cron', 'breeding'],
  },
  'hemp-os-db': {
    name: 'hemp-os-db',
    port: 3200,
    host: 'http://localhost:3200',
    capabilities: ['ingestion', 'insights', 'knowledge-bank', 'experiments', 'simulations'],
  },
  'hemp-agent': {
    name: 'hemp-agent',
    port: 3300,
    host: 'http://localhost:3300',
    capabilities: ['ncbi-search', 'brain-kernel', 'dream-loop', 'cognitive-swarm'],
  },
};

export function isValidServiceName(name: string): name is ServiceName {
  return name in SERVICES;
}

export interface RPCRequest {
  id: string;
  source: ServiceName;
  target: ServiceName;
  method: string;
  params: Record<string, any>;
  timestamp: number;
}

export interface RPCResponse {
  id: string;
  source: ServiceName;
  target: ServiceName;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface EventBusEvent {
  id: string;
  source: ServiceName;
  type: string;
  payload: any;
  timestamp: number;
}

export interface ProvenanceEntry {
  id: string;
  sourceSystem: ServiceName | string;
  targetSystem: ServiceName | string;
  action: string;
  payload: any;
  status: 'pending' | 'completed' | 'failed';
  correlationId: string;
  timestamp: number;
}

export interface StrainData {
  id?: string;
  name: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'other';
  thcMin: number;
  thcMax: number;
  cbdMin: number;
  cbdMax: number;
  terpeneProfile: Record<string, number>;
  effects: string[];
  medicalUses: string[];
  source: string;
}

export interface ResearchPaper {
  id?: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi?: string;
  abstract: string;
  fullText?: string;
  topicTags: string[];
  population?: string;
  dose?: string;
  route?: string;
  outcomes?: string[];
  source: string;
}

export interface Experiment {
  id?: string;
  name: string;
  hypothesis: string;
  methodology: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  results?: any;
  assignedSystem: ServiceName;
}

export interface Simulation {
  id?: string;
  name: string;
  parameters: Record<string, any>;
  results?: any;
  status: 'queued' | 'running' | 'completed' | 'failed';
  assignedSystem: ServiceName;
}

export interface Insight {
  id?: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  sourceEntities: any[];
  evidence: any[];
  category: string;
  tags: string[];
}

export interface ResearchTask {
  id?: string;
  title: string;
  description: string;
  sourceSystem: ServiceName;
  assignedSystem: ServiceName;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  inputData?: any;
  outputData?: any;
}

// --- Constants ---

export const MAX_PROVENANCE_LOG_SIZE = 10_000;
export const MAX_DRAFT_AGE_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_DRAFTS = 100;
