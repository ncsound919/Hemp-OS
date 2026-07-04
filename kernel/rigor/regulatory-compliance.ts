/**
 * Regulatory Compliance Engine (Criteria #6, #9)
 *
 * USDA Hemp Rules compliance:
 *  - Δ9-THC limit: 0.3% dry weight (federal legal limit)
 *  - THCA must be converted to THC equivalent: THCTotal = THC + (THCA × 0.877)
 *  - Sampling: top 1/3 of plant, 15-30 plants per lot
 *  - Safe operating ranges for autonomous actions
 */

import { logger } from '../../src/lib/logger.ts';

export interface THCRegulatoryCheck {
  sampleId: string;
  totalTHC: number;
  delta9THC: number;
  thca: number;
  exceedsLimit: boolean;
  limit: number;
  jurisdiction: 'USDA' | 'state_medical' | 'state_recreational';
  samplingProtocol?: string;
}

export interface ComplianceLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  actor: 'system' | 'user' | 'autonomous';
  immutable: boolean;
  hash: string;
}

const USDA_THC_LIMIT = 0.3; // % dry weight
const STATE_MEDICAL_LIMITS: Record<string, number> = {
  'default': 0.3,
  'NY': 0.3, 'CA': 0.3, 'MA': 0.3,
};
const STATE_RECREATIONAL_LIMITS: Record<string, number> = {
  'default': 0.3,
  'CO': 0.3, 'WA': 0.3, 'OR': 0.3, 'CA': 0.3,
};

export class RegulatoryCompliance {
  private complianceLog: ComplianceLogEntry[] = [];
  private logMutex = false;

  /**
   * Compute total THC per USDA formula: Total THC = (THCA × 0.877) + THC
   * The 0.877 factor accounts for the molecular weight difference
   * when THCA decarboxylates to THC (CO₂ is released).
   */
  computeTotalTHC(thca: number, delta9THC: number): number {
    return delta9THC + (thca * 0.877);
  }

  /**
   * Check if a sample exceeds regulatory THC limit
   */
  checkTHCCompliance(sampleId: string, thca: number, delta9THC: number, jurisdiction: 'USDA' | 'state_medical' | 'state_recreational' = 'USDA'): THCRegulatoryCheck {
    const totalTHC = this.computeTotalTHC(thca, delta9THC);
    const limit = USDA_THC_LIMIT;

    const result: THCRegulatoryCheck = {
      sampleId,
      totalTHC,
      delta9THC,
      thca,
      exceedsLimit: totalTHC > limit,
      limit,
      jurisdiction,
    };

    if (result.exceedsLimit) {
      logger.warn({ sampleId, totalTHC, limit }, '[Regulatory] THC limit EXCEEDED');
      this.logCompliance('thc_check', `Sample ${sampleId}: ${totalTHC.toFixed(3)}% total THC exceeds ${limit}% limit`, 'system');
    }

    return result;
  }

  /**
   * Validates that a batch sampling plan follows USDA guidelines
   * USDA requires: top 1/3 of plant, 15-30 representative plants per lot
   */
  validateSamplingProtocol(lotSize: number, samplesTaken: number, sampleLocation: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const minSamples = Math.min(30, Math.max(15, Math.ceil(lotSize * 0.1)));

    if (samplesTaken < minSamples) {
      warnings.push(`Insufficient samples: ${samplesTaken} taken, ${minSamples} required for lot of ${lotSize} plants (USDA minimum: 15-30 per lot)`);
    }
    if (!sampleLocation.includes('top')) {
      warnings.push('USDA requires sampling from top 1/3 of the plant for THC compliance testing');
    }

    return { valid: warnings.length === 0, warnings };
  }

  /**
   * Log a compliance-related action (immutable after logging)
   */
  logCompliance(action: string, details: string, actor: 'system' | 'user' | 'autonomous'): ComplianceLogEntry {
    const entry: ComplianceLogEntry = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      actor,
      immutable: true,
      hash: this.computeHash(action + details + Date.now()),
    };
    this.complianceLog.push(entry);
    return entry;
  }

  /**
   * Safe operating ranges for autonomous actions (Criterion #9)
   */
  validateAutonomousAction(action: string, params: Record<string, number>): { allowed: boolean; reason?: string } {
    const safeRanges: Record<string, { min: number; max: number; unit: string }> = {
      'extraction_temperature': { min: -60, max: 60, unit: '°C' },
      'distillation_temperature': { min: 100, max: 220, unit: '°C' },
      'decarboxylation_temperature': { min: 80, max: 160, unit: '°C' },
      'winterization_temperature': { min: -60, max: 20, unit: '°C' },
      'vacuum_pressure': { min: 0.001, max: 10, unit: 'mbar' },
      'solvent_ratio': { min: 1, max: 15, unit: 'L/kg' },
      'agitation_speed': { min: 0, max: 1500, unit: 'RPM' },
      'feed_rate': { min: 0.1, max: 50, unit: 'kg/hr' },
    };

    for (const [key, value] of Object.entries(params)) {
      const range = safeRanges[key];
      if (!range) {continue;}
      if (value < range.min || value > range.max) {
        this.logCompliance(`safe_range_violation:${key}`, `Autonomous action rejected: ${key}=${value} outside safe range [${range.min}–${range.max}${range.unit}]`, 'autonomous');
        return { allowed: false, reason: `Parameter ${key}=${value} outside safe operating range [${range.min}, ${range.max}] ${range.unit}. Autonomous actions blocked for safety.` };
      }
    }
    return { allowed: true };
  }

  getComplianceLog(filter?: { action?: string; limit?: number }): ComplianceLogEntry[] {
    let log = this.complianceLog;
    if (filter?.action) {log = log.filter(e => e.action === filter.action);}
    if (filter?.limit) {log = log.slice(-filter.limit);}
    return log.reverse();
  }

  private computeHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return `h${Math.abs(hash).toString(16)}`;
  }
}

export const regulatoryCompliance = new RegulatoryCompliance();
