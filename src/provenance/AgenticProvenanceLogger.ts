// src/provenance/AgenticProvenanceLogger.ts

import { AgenticThoughtChain, StagedHypothesis } from '../types/provenance.types';

// -----------------------------------------------------------------------------
// Storage Interface (pluggable)
// -----------------------------------------------------------------------------
export interface ProvenanceStorage {
  load(): StagedHypothesis[];
  save(hypotheses: StagedHypothesis[]): void;
}

// In‑memory storage (useful for testing or when no persistence is desired)
export class InMemoryProvenanceStorage implements ProvenanceStorage {
  private data: StagedHypothesis[] = [];
  load(): StagedHypothesis[] { return this.data; }
  save(hypotheses: StagedHypothesis[]): void { this.data = hypotheses; }
}

// Browser localStorage adapter
export class LocalStorageProvenanceStorage implements ProvenanceStorage {
  private key = 'hempos_staged_hypotheses';
  load(): StagedHypothesis[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  save(hypotheses: StagedHypothesis[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(hypotheses));
    } catch { /* ignore */ }
  }
}

// -----------------------------------------------------------------------------
// Risk Evaluator Interface (pluggable)
// -----------------------------------------------------------------------------
export interface RiskEvaluator {
  evaluate(parameterDelta: Record<string, any>): { riskScore: number; requiresHumanReview: boolean };
}

// Default risk evaluator (copied from your original logic, slightly enhanced)
export class DefaultRiskEvaluator implements RiskEvaluator {
  evaluate(parameterDelta: Record<string, any>): { riskScore: number; requiresHumanReview: boolean } {
    let riskScore = 10;
    let requiresHumanReview = false;

    for (const [stageType, config] of Object.entries(parameterDelta)) {
      if (!config) continue;

      if (stageType === 'decarboxylation') {
        const temp = config.temperature ?? config.temperatureCelsius;
        if (temp !== undefined) {
          if (temp > 135 || temp < 105) {
            riskScore = Math.max(riskScore, 85);
            requiresHumanReview = true;
          } else if (Math.abs(temp - 120) > 10) {
            riskScore = Math.max(riskScore, 45);
          }
        }
      }

      if (stageType === 'winterization') {
        const coolingTemp = config.coolingTemp ?? config.coolingTempCelsius ?? config.temperatureCelsius;
        if (coolingTemp !== undefined) {
          if (coolingTemp > -30) {
            riskScore = Math.max(riskScore, 75);
            requiresHumanReview = true;
          } else if (coolingTemp < -55) {
            riskScore = Math.max(riskScore, 65);
            requiresHumanReview = true;
          }
        }
        const ratio = config.solventRatio;
        if (ratio !== undefined && (ratio < 4.0 || ratio > 12.0)) {
          riskScore = Math.max(riskScore, 80);
          requiresHumanReview = true;
        }
      }

      if (stageType === 'extraction') {
        const temp = config.extractionTemp;
        if (temp !== undefined && (temp > -20 || temp < -60)) {
          riskScore = Math.max(riskScore, 70);
          requiresHumanReview = true;
        }
      }

      if (stageType === 'distillation') {
        const vacuum = config.vacuumPressure;
        if (vacuum !== undefined && vacuum > 0.15) {
          riskScore = Math.max(riskScore, 90);
          requiresHumanReview = true;
        }
      }
    }

    return { riskScore, requiresHumanReview };
  }
}

// -----------------------------------------------------------------------------
// Main AgenticProvenanceLogger
// -----------------------------------------------------------------------------
export class AgenticProvenanceLogger {
  private storage: ProvenanceStorage;
  private riskEvaluator: RiskEvaluator;

  /**
   * @param storage - optional storage adapter (defaults to localStorage in browser, else in‑memory)
   * @param riskEvaluator - optional custom risk evaluator (defaults to DefaultRiskEvaluator)
   */
  constructor(storage?: ProvenanceStorage, riskEvaluator?: RiskEvaluator) {
    // Auto‑detect environment: if we're in a browser and localStorage exists, use it; otherwise in‑memory.
    if (!storage) {
      if (typeof window !== 'undefined' && window.localStorage) {
        storage = new LocalStorageProvenanceStorage();
      } else {
        storage = new InMemoryProvenanceStorage();
      }
    }
    this.storage = storage;
    this.riskEvaluator = riskEvaluator || new DefaultRiskEvaluator();
  }

  /**
   * Stage a hypothesis with its full chain‑of‑thought, assessing safety envelopes.
   */
  async stageHypothesis(
    thoughtChain: AgenticThoughtChain,
    parameterDelta: Record<string, any>
  ): Promise<string> {
    const { riskScore, requiresHumanReview } = this.riskEvaluator.evaluate(parameterDelta);
    const id = `hyp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newHypothesis: StagedHypothesis = {
      id,
      thoughtChain,
      parameterDelta,
      status: 'pending',
      riskScore,
      requiresHumanReview,
      createdAt: Date.now(),
      proxyPassed: false,
    };

    const all = this.storage.load();
    all.unshift(newHypothesis);
    this.storage.save(all);
    return id;
  }

  /**
   * Approve or reject a staged hypothesis (human‑in‑the‑loop).
   */
  async humanReviewsStaging(
    stageId: string,
    approved: boolean,
    operator: string,
    comment: string
  ): Promise<void> {
    const all = this.storage.load();
    const item = all.find(h => h.id === stageId);
    if (!item) {
      throw new Error(`Staged hypothesis ${stageId} not found`);
    }
    item.status = approved ? 'approved' : 'rejected';
    item.operatorReviewer = operator;
    item.operatorComment = comment;
    item.reviewedAt = Date.now();
    this.storage.save(all);
  }

  /**
   * Mark that the physics‑proxy simulation passed (optional step).
   */
  async markProxyPassed(stageId: string): Promise<void> {
    const all = this.storage.load();
    const item = all.find(h => h.id === stageId);
    if (item) {
      item.proxyPassed = true;
      this.storage.save(all);
    }
  }

  /**
   * Get all hypotheses awaiting human review.
   */
  async getPendingReviews(): Promise<Array<{ id: string; summary: string; record: StagedHypothesis }>> {
    const all = this.storage.load();
    return all
      .filter(h => h.status === 'pending')
      .map(h => ({
        id: h.id,
        summary: `${h.thoughtChain.module} proposes: ${h.thoughtChain.hypothesis} (Risk: ${h.riskScore}%)`,
        record: h,
      }));
  }

  /**
   * Finalize a hypothesis after the kernel simulation has run.
   */
  async finalizeWithKernelReport(stageId: string, results: any): Promise<StagedHypothesis> {
    const all = this.storage.load();
    const item = all.find(h => h.id === stageId);
    if (!item) {
      throw new Error(`Staged hypothesis ${stageId} not found`);
    }
    if (results && results.error) {
      item.status = 'failed';
    } else {
      item.status = 'completed';
    }
    item.simulationResults = results;
    this.storage.save(all);
    return item;
  }

  /**
   * Retrieve a single hypothesis by ID.
   */
  async getHypothesis(id: string): Promise<StagedHypothesis | undefined> {
    const all = this.storage.load();
    return all.find(h => h.id === id);
  }

  /**
   * Get all hypotheses (for debugging or admin views).
   */
  getHypotheses(): StagedHypothesis[] {
    return this.storage.load();
  }

  /**
   * Clear all stored hypotheses (for testing/reset).
   */
  clear(): void {
    this.storage.save([]);
  }

  /**
   * Compatibility layer: expose a `baseLogger` with a `get` method
   * to match the interface expected by the `DeterministicAutonomy` component.
   */
  get baseLogger() {
    return {
      get: async (id: string): Promise<StagedHypothesis> => {
        const h = await this.getHypothesis(id);
        if (!h) {
          throw new Error(`Hypothesis with id ${id} not found`);
        }
        return h;
      },
    };
  }
}
