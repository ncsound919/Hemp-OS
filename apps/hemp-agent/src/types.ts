export interface Study {
  id: string;
  title: string;
  year: number;
  cannabinoid: string;
  dose: string;
  route: string;
  population: string;
  brain_region: string;
  outcome: string;
  effect_size: string;
  evidence_level: "High" | "Medium" | "Low";
}

export interface OmicsSignature {
  id: string;
  cannabinoid: string;
  tissue: string;
  species: string;
  gene_set: string;
  direction: "Upregulated" | "Downregulated";
  pathway_enrichment: string;
}

export interface ImagingMetric {
  id: string;
  cannabinoid_status: string; // e.g. "Chronic User", "Acute administration"
  region: string;
  connectivity_change: string;
  structural_change: string;
  behavioral_correlates: string;
}

export interface RiskProfile {
  id: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  use_pattern: string;
  product_profile: string; // e.g. "90% THC Vape", "Balanced CBD/THC Flower"
  risk_score: number; // 0 to 100
  confidence: number; // 0 to 100
  supporting_studies: string[]; // study IDs
  reasons: string[];
}

export type EvidenceItem = {
  id: string;
  kind: "study" | "omics" | "imaging" | "memory" | "graph-node" | "simulation";
  label: string;
  sourceId?: string;
  snippet: string;
  confidence: number;
  relevance: number;
  contradicted?: boolean;
};

export type ProvenanceEdge = {
  source: string;
  target: string;
  relation: string;
};

export type HypothesisCandidate = {
  id: string;
  title: string;
  rationale: string;
  expectedInformationGain: number;
  experimentalPath: string;
  priority: "low" | "medium" | "high";
};

export type SimulationBlock = {
  receptorOccupancy?: number;
  pathwayActivation?: string[];
  pkpdSummary?: string;
  circuitPrediction?: string;
};

export type SimulationResult = {
  effectSize: number;
  pValue: number;
  metric: string;
  description: string;
  traceId: string;
};

export type ChemotypeProfile = {
  thc: number; // percentage (e.g., 20)
  cbd: number; // percentage
  cbg?: number; // optional
  type?: "I" | "II" | "III" | "IV" | "V"; // chemotype class
  name?: string; // strain or product name
  simulation?: {
    confidence: number; // 0–100
    riskScore?: number;
    notes?: string;
  };
};

export interface NodeProvenance {
  source: string; // "kernel-test", "paper:PMC123456", "agent:VerificationAgent"
  sourceType: "Document" | "URL" | "Agent" | "Kernel" | "Experiment";
  assertingAgent: string; // Which of the ten agents created this node
  confidence: number; // 0.0–1.0, scored by Meta-Evaluator
  verificationStatus: "verified" | "unverified" | "contradicted";
  timestamp: string; // ISO 8601
  episodeId: string; // Links to the Episode node this mutation belongs to
}

export interface EdgeProvenance {
  source: string;
  assertingAgent: string;
  confidence: number;
  verificationStatus: "verified" | "unverified" | "contradicted";
  timestamp: string;
  episodeId: string;
  evidence: string[]; // Array of node IDs that support this edge
}

export interface BaseGraphNode {
  id: string;
  label: string;
  schemaVersion?: "1.0";
  x?: number;
  y?: number;
  provenance?: NodeProvenance;
  agentRole?: string;
  taskStatus?: string;
  timestamp?: string;
  template?: string;
  constraint?: string;
  sourceWorkflow?: string;
}

export type GraphNode =
  | (BaseGraphNode & {
      type:
        | "Study"
        | "Cannabinoid"
        | "Receptor"
        | "Pathway"
        | "BrainRegion"
        | "Phenotype"
        | "Dataset"
        | "Population";
    })
  | (BaseGraphNode & { type: "Agent"; agentRole: string })
  | (BaseGraphNode & { type: "Task"; taskStatus: string })
  | (BaseGraphNode & { type: "Episode"; timestamp: string })
  | (BaseGraphNode & { type: "Workflow"; template: string })
  | (BaseGraphNode & { type: "Invariant"; constraint: string })
  | (BaseGraphNode & { type: "Procedure"; sourceWorkflow: string });

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  schemaVersion?: "1.0";
  relation:
    | "affects"
    | "associated_with"
    | "upregulates"
    | "downregulates"
    | "observed_in"
    | "contradicted_by"
    | "depends_on"
    | "refines"
    | "generalizes"
    | "supports"
    | "invalidates"
    | "derived_from"
    | "verified_by"
    | "asserted_by"
    | "compressed_into"
    | "triggers"
    | "produced_by";
  provenance?: EdgeProvenance;
}

export interface MemoryItem {
  id: string;
  type: "Episodic" | "Semantic" | "Procedural";
  content: string;
  confidence: number; // weight 0 to 1
  sources: string[]; // references
  timestamp: string;
  user_context?: string;
  tags?: string[];
}

export interface IngestionJob {
  id: string;
  sourceType: "Literature" | "Dataset" | "Drive";
  sourceName: string;
  status:
    "Idle" | "Scanning" | "Extracting" | "Mapping" | "Completed" | "Failed";
  progress: number;
  logs: string[];
  recordsCreated: {
    studies?: number;
    omics?: number;
    imaging?: number;
    nodes?: number;
    edges?: number;
  };
  timestamp: string;
}

export interface AgentContribution {
  agentName: string;
  analysis: string;
  confidence: number;
  evidenceUsed: string[];
}

export interface OrchestrationResult {
  query: string;
  summary: string;
  contributions: AgentContribution[];
  suggestedAction?: string;
  confidence: number;
  timestamp: string;
}

export interface VectorChunk {
  id: string;
  schemaVersion?: "1.0";
  source: string;
  content: string;
  tags: string[];
  coordinate: { x: number; y: number; z: number }; // For 3D vector-space visualizations
}

export interface AgentStep {
  agentId: string;
  agentName: string;
  action: string;
  input: string;
  output: string;
  status: "Pending" | "Success" | "Warning" | "Failed";
  durationMs: number;
}

export interface DeterministicExecutionTrace {
  schemaVersion?: "1.0";
  timestamp: string;
  confidence: number;
  metaEvaluationScore: number; // 0 to 100
  safetyClearance: boolean;
  summary: string;
  suggestedAction?: string;
  goalDecomposition: string[];
  plannedWorkflow: string[];
  contradictionsFound: string[];
  steps: AgentStep[];
  evidence?: EvidenceItem[];
  provenanceDag?: ProvenanceEdge[];
  hypothesisCandidates?: HypothesisCandidate[];
  simulation?: SimulationBlock;
  mode?: "clinical" | "mechanistic" | "hypothesis" | "cultivator" | "notebook";
  noveltyScore?: number;
  contradictionPressure?: number;
  query: string;
}

export interface DreamResult {
  id: string;
  schemaVersion?: "1.0";
  episodesReplayed: string[];
  distilledFacts: string[];
  proceduralTemplates: string[];
  nodesInjected: string[];
  edgesCreated: string[];
  logs: string[];
  timestamp: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  status: "Connected" | "Disconnected" | "Error";
  tools: string[];
}

export interface IntegrationRequestLog {
  id: string;
  timestamp: string;
  protocol: "MCP" | "OpenAI" | "NIM";
  endpoint: string;
  requestPayload: string;
  responsePayload: string;
  safetyStatus: "Approved" | "Blocked";
  durationMs: number;
}

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  target_system: string;
  independent_var: string;
  dependent_var: string;
  confidence: number;
  status: "Formulated" | "Testing" | "Validated" | "Refuted";
  contradictionReference?: string;
  timestamp: string;
}

export interface ExperimentEpisode {
  id: string;
  hypothesisId: string;
  parameters: string;
  inputs: string;
  findings: string;
  simulatedOccupancy: number;
  status: "Completed" | "Pending" | "Failed";
  timestamp: string;
}

export interface Conclusion {
  id: string;
  hypothesisId: string;
  evidenceGrade: "A" | "B" | "C" | "D";
  statisticalEffect: string;
  confidenceScore: number;
  text: string;
  paperRef?: string;
  timestamp: string;
}

export interface ResearchArtifact {
  id: string;
  title: string;
  type: "note" | "report" | "paper" | "experiment";
  abstract?: string;
  introduction?: string;
  methods?: string;
  results?: string;
  discussion?: string;
  citations: string[];
  provenance: string; // e.g. "Hemp-OS Agent Pipeline v1.2, hash: 0x82fca"
  confidence: number;
  evidenceLevel: "High" | "Medium" | "Low";
  fileUrl: string;
  timestamp: string;
}
