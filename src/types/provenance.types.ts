export interface AgenticThoughtChain {
  step: number;
  timestamp: number;
  module: string;
  hypothesis: string;
  supporting_evidence: string[];
  parameter_delta: Record<string, any>;
}

export interface StagedHypothesis {
  id: string;
  thoughtChain: AgenticThoughtChain;
  parameterDelta: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  riskScore: number;
  requiresHumanReview: boolean;
  operatorReviewer?: string;
  operatorComment?: string;
  reviewedAt?: number;
  createdAt: number;
  proxyPassed?: boolean;
  simulationResults?: any;
}
