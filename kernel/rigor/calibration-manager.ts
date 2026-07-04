/**
 * Calibration Drift Detection & Dependency Mapping (Criteria 7c, 8b, 8c)
 *
 * Tracks calibration profiles over time, detects drift when actual
 * extraction performance deviates from model predictions, and maps
 * which calibration profiles each process node depends on.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

export interface CalibrationEntry {
  id: string;
  modelId: string;
  parameter: string;
  expectedValue: number;
  measuredValue: number;
  driftPercent: number;
  timestamp: string;
  batchId: string;
}

export interface CalibrationDependency {
  stageType: string;
  dependsOn: string[];
  description: string;
}

const CALIBRATION_DEPENDENCIES: CalibrationDependency[] = [
  { stageType: 'extraction', dependsOn: ['extraction.v2.0.0', 'biomass_profile'], description: 'Extraction yield depends on solvent calibration and biomass potency profile' },
  { stageType: 'winterization', dependsOn: ['winterization.v2.0.0', 'extraction_output'], description: 'Winterization efficiency depends on crude oil composition from extraction' },
  { stageType: 'decarboxylation', dependsOn: ['decarboxylation.v2.0.0', 'winterization_output'], description: 'Decarb kinetics depend on cannabinoid profile from previous stage' },
  { stageType: 'distillation', dependsOn: ['distillation.v2.0.0', 'decarboxylation_output'], description: 'Distillation recovery depends on feed composition from decarb' },
];

export class CalibrationManager {
  private driftLog: CalibrationEntry[] = [];

  constructor() {
    this.ensureTables();
  }

  private ensureTables() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS calibration_drift_log (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        parameter TEXT NOT NULL,
        expected_value REAL NOT NULL,
        measured_value REAL NOT NULL,
        drift_percent REAL NOT NULL,
        timestamp TEXT NOT NULL,
        batch_id TEXT NOT NULL
      );
    `);
  }

  getDependencies(): CalibrationDependency[] { return CALIBRATION_DEPENDENCIES; }

  /**
   * Record a calibration measurement and check for drift
   */
  recordMeasurement(modelId: string, parameter: string, expected: number, measured: number, batchId: string): CalibrationEntry {
    const driftPercent = expected !== 0 ? ((measured - expected) / Math.abs(expected)) * 100 : 0;
    const entry: CalibrationEntry = {
      id: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      modelId, parameter, expectedValue: expected, measuredValue: measured,
      driftPercent, timestamp: new Date().toISOString(), batchId,
    };

    this.driftLog.push(entry);
    db.prepare('INSERT INTO calibration_drift_log VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      entry.id, entry.modelId, entry.parameter, entry.expectedValue,
      entry.measuredValue, entry.driftPercent, entry.timestamp, entry.batchId,
    );

    if (Math.abs(driftPercent) > 10) {
      console.warn(`[CalibrationDrift] ${modelId}/${parameter}: ${driftPercent.toFixed(1)}% drift (expected ${expected}, measured ${measured})`);
    }

    return entry;
  }

  /**
   * Get recent drift entries for a model
   */
  getDrift(modelId: string, limit = 20): CalibrationEntry[] {
    return db.prepare(
      'SELECT * FROM calibration_drift_log WHERE model_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(modelId, limit) as CalibrationEntry[];
  }

  /**
   * Check if any model is in significant drift (>10%)
   */
  checkCriticalDrift(): CalibrationEntry[] {
    return db.prepare(
      "SELECT * FROM calibration_drift_log WHERE ABS(drift_percent) > 10 ORDER BY ABS(drift_percent) DESC LIMIT 10"
    ).all() as CalibrationEntry[];
  }

  /**
   * Get dependency chain for a stage type
   */
  getDependencyChain(stageType: string): CalibrationDependency[] {
    const chain: CalibrationDependency[] = [];
    const dep = CALIBRATION_DEPENDENCIES.find(d => d.stageType === stageType);
    if (dep) {chain.push(dep);}
    return chain;
  }
}

export const calibrationManager = new CalibrationManager();
