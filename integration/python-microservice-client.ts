/**
 * Python Microservice Client
 *
 * Calls the Hemp OS Python Scientific Microservice (FastAPI).
 * Falls back to jstat/RDKit.js TypeScript implementations when
 * the Python service is not available.
 *
 * The Python service provides access to:
 *  - Biopython (PubMed, genome, NCBI)
 *  - SciPy (advanced statistics)
 *  - RDKit-native (canonical SMILES handling)
 *  - StatsModels (time-series, regression)
 */

import { stats, StatisticalResult } from './statistical-validation.ts';
import { pubchem } from './pubchem.service.ts';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
}

export class PythonMicroserviceClient {
  private async call<T>(endpoint: string, body: any): Promise<T | null> {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {return null;}
      return res.json();
    } catch {
      return null;
    }
  }

  async health(): Promise<string | null> {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) {return null;}
      const data = await res.json();
      return data.status;
    } catch { return null; }
  }

  /**
   * Search PubMed via Biopython (replaces regex-based XML parser)
   */
  async searchPubMed(query: string, maxResults = 20): Promise<PubMedArticle[] | null> {
    return this.call<PubMedArticle[]>('/pubmed/search', { query, max_results: maxResults });
  }

  /**
   * Compute Tanimoto similarity via RDKit (Python-native RDKit)
   */
  async computeTanimoto(smilesA: string, smilesB: string): Promise<number | null> {
    const result = await this.call<{ tanimoto: number }>('/chem/tanimoto', { smiles_a: smilesA, smiles_b: smilesB });
    return result?.tanimoto ?? null;
  }

  /**
   * Welch's t-test with effect size via SciPy
   * Falls back to jstat if Python service is unavailable
   */
  async tTest(group1: number[], group2: number[]): Promise<StatisticalResult> {
    const result = await this.call<any>('/stats/ttest', { group1, group2 });
    if (result) {
      return {
        type: 't-test',
        statistic: result.t_statistic,
        pValue: result.p_value,
        degreesOfFreedom: result.n1 + result.n2 - 2,
        effectSize: result.cohens_d,
        confidenceInterval: [result.mean1 - result.mean2 - 1.96 * Math.abs(result.t_statistic), result.mean1 - result.mean2 + 1.96 * Math.abs(result.t_statistic)],
        interpretation: `${result.significant ? 'STATISTICALLY SIGNIFICANT' : 'NOT significant'} (p = ${result.p_value < 0.001 ? '< 0.001' : result.p_value.toFixed(4)}), d = ${result.cohens_d.toFixed(3)}`,
        significant: result.significant,
      };
    }
    // Fallback to TS implementation
    return stats.tTestIndependent(group1, group2);
  }

  /**
   * Check if Python service is healthy and which modules are available
   */
  async getStatus(): Promise<{ ok: boolean; modules: Record<string, string> }> {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, modules: data.modules || {} };
      }
    } catch { /* ignore */ }
    return { ok: false, modules: {} };
  }
}

export const pythonClient = new PythonMicroserviceClient();
