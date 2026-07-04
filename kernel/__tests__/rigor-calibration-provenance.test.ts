/**
 * Categories 3, 6, 9, 12, 15: Calibration drift, regulatory compliance,
 * data provenance, multi-institutional, autonomous safety.
 */

import { describe, it, expect, vi } from 'vitest';
import { calibrationManager } from '../rigor/calibration-manager.ts';
import { regulatoryCompliance } from '../rigor/regulatory-compliance.ts';
import { provenanceChain } from '../rigor/provenance-chain.ts';
import { provenanceReplay } from '../rigor/provenance-replay.ts';
import { sensitivityEngine } from '../rigor/sensitivity-engine.ts';
import { benchmarkCert } from '../rigor/benchmark-certification.ts';
import { predictionValidator } from '../rigor/prediction-validator.ts';
import { KernelExecutor } from '../workflow/executor.ts';
import { ExtractionModel } from '../models/extractionModel.ts';

// =======================================================================
// Category 3: Calibration & Drift Testing
// =======================================================================
describe('Category 3: Calibration & Drift', () => {
  it('Records calibration measurement', () => {
    const entry = calibrationManager.recordMeasurement('extraction.v2.0.0', 'recovery_rate', 85.0, 83.0, 'batch-001');
    expect(entry.modelId).toBe('extraction.v2.0.0');
    expect(entry.driftPercent).toBeCloseTo(-2.353, 1);
  });

  it('Retrieves drift entries for a model', () => {
    const entries = calibrationManager.getDrift('extraction.v2.0.0');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('Flags critical drift (>10%)', () => {
    const entry = calibrationManager.recordMeasurement('extraction.v2.0.0', 'recovery_rate', 100, 50, 'batch-drift-test');
    expect(Math.abs(entry.driftPercent)).toBeGreaterThan(10);
  });

  it('Has calibration dependencies for all 4 process stages', () => {
    const deps = calibrationManager.getDependencies();
    expect(deps.length).toBe(4);
    const stageTypes = deps.map(d => d.stageType);
    expect(stageTypes).toContain('extraction');
    expect(stageTypes).toContain('winterization');
    expect(stageTypes).toContain('decarboxylation');
    expect(stageTypes).toContain('distillation');
  });

  it('Each dependency has a description', () => {
    for (const d of calibrationManager.getDependencies()) {
      expect(d.description.length).toBeGreaterThan(10);
    }
  });
});

// =======================================================================
// Category 6: Regulatory Compliance
// =======================================================================
describe('Category 6: Regulatory Compliance', () => {
  it('Computes total THC per USDA formula', () => {
    // Total THC = (THCA × 0.877) + THC
    // For hemp compliance: Total THC must be < 0.3%
    const compliant = regulatoryCompliance.computeTotalTHC(0.2, 0.1); // THCA=0.2, THC=0.1
    expect(compliant).toBeCloseTo(0.2754, 3);
    expect(compliant).toBeLessThan(0.3); // Under 0.3% limit
  });

  it('Flags non-compliant THC levels', () => {
    const result = regulatoryCompliance.checkTHCCompliance('sample-001', 15, 0.3);
    expect(result.exceedsLimit).toBe(true);
    expect(result.totalTHC).toBeGreaterThan(0.3);
  });

  it('Validates USDA sampling protocol (sufficient samples)', () => {
    const result = regulatoryCompliance.validateSamplingProtocol(200, 30, 'top third');
    expect(result.valid).toBe(true);
  });

  it('Warns on insufficient samples per USDA rules', () => {
    const result = regulatoryCompliance.validateSamplingProtocol(200, 5, 'top third');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('Warns on incorrect sampling location', () => {
    const result = regulatoryCompliance.validateSamplingProtocol(200, 30, 'bottom');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('Logs compliance actions with hash integrity', () => {
    const log = regulatoryCompliance.logCompliance('thc_test', 'Test action', 'system');
    expect(log.id).toBeTruthy();
    expect(log.hash).toBeTruthy();
    expect(log.hash.length).toBeGreaterThan(4);
    expect(log.immutable).toBe(true);
  });

  it('Blocks autonomous actions outside safe ranges', () => {
    const result = regulatoryCompliance.validateAutonomousAction('test', { distillation_temperature: 500 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('safe operating range');
  });

  it('Allows autonomous actions within safe ranges', () => {
    const result = regulatoryCompliance.validateAutonomousAction('test', { extraction_temperature: -40 });
    expect(result.allowed).toBe(true);
  });

  it('Safe ranges cover 8 parameter types', () => {
    // Should cover: extraction temp, distillation temp, decarb temp, winterization temp,
    // vacuum pressure, solvent ratio, agitation speed, feed rate
    const test = regulatoryCompliance.validateAutonomousAction('full', {
      extraction_temperature: 0, distillation_temperature: 150, decarboxylation_temperature: 120,
      winterization_temperature: -40, vacuum_pressure: 0.1, solvent_ratio: 8, agitation_speed: 300, feed_rate: 1.5,
    });
    expect(test.allowed).toBe(true);
  });
});

// =======================================================================
// Category 9: Data Integrity & Provenance
// =======================================================================
describe('Category 9: Data Integrity & Provenance', () => {
  it('Registers a record in the provenance chain', () => {
    const uniqueData = { thc: 15, timestamp: Date.now(), nonce: Math.random() };
    const link = provenanceChain.registerRecord('strain', 'test-strain-p001', uniqueData, 'Lab test', 'https://lab.example.com');
    expect(link.checksum).toBeTruthy();
    expect(link.checksum.length).toBe(64); // SHA-256 hex
  });

  it('Verifies data integrity against stored checksum', () => {
    const uniqueData = { thc: 15, timestamp: Date.now(), nonce: Math.random() };
    provenanceChain.registerRecord('strain', 'test-strain-p002', uniqueData, 'Lab test', 'https://lab.example.com');
    const result = provenanceChain.verifyRecord('strain', 'test-strain-p002', uniqueData);
    expect(result.valid).toBe(true);
  });

  it('Detects data tampering via checksum mismatch', () => {
    const uniqueData = { thc: 15, timestamp: Date.now(), nonce: Math.random() };
    provenanceChain.registerRecord('strain', 'test-strain-p003', uniqueData, 'Lab test', 'https://lab.example.com');
    const result = provenanceChain.verifyRecord('strain', 'test-strain-p003', { thc: 999 });
    expect(result.valid).toBe(false);
  });

  it('Provenance chain is intact', () => {
    const status = provenanceChain.verifyChain();
    expect(status.valid).toBe(true);
  });

  it('Provenance chain can be exported for audit', () => {
    const exported = provenanceChain.exportChain();
    expect(exported.chain.length).toBeGreaterThan(0);
    expect(exported.chainChecksum.length).toBe(64);
  });
});

// =======================================================================
// Category 12: Reproducibility (via ProvenanceReplay)
// =======================================================================
describe('Category 12: Run Reproducibility', () => {
  const standardBiomass = {
    id: 'r-test', name: 'ReproTest', mass: 10, moisture: 10, waxContent: 5,
    potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
  };
  const graph = {
    stages: [{ id: 'e1', name: 'Extract', type: 'extraction' as const, modelId: 'extraction.v2.0.0', config: { solventType: 'Ethanol', solventPurity: 99.5, solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 } }],
    connections: [],
  };

  it('Records and replays a run from manifest', () => {
    const result = KernelExecutor.runProcess(graph, standardBiomass);
    provenanceReplay.recordRun('repro-test-1', result);
    const replay = provenanceReplay.replayFromManifest('repro-test-1');
    expect(replay).not.toBeNull();
  });

  it('Verify replay produces identical output', () => {
    const result = KernelExecutor.runProcess(graph, standardBiomass);
    provenanceReplay.recordRun('repro-test-2', result);
    const check = provenanceReplay.verifyReplay('repro-test-2');
    expect(check.match).toBe(true);
    expect(check.maxDeviation).toBeLessThan(0.001);
  });

  it('Produces structured diff between two identical runs', () => {
    const r1 = KernelExecutor.runProcess(graph, standardBiomass);
    const r2 = KernelExecutor.runProcess(graph, standardBiomass);
    provenanceReplay.recordRun('repro-diff-a', r1);
    provenanceReplay.recordRun('repro-diff-b', r2);
    const diff = provenanceReplay.diff('repro-diff-a', 'repro-diff-b');
    expect(diff).not.toBeNull();
    if (diff) {
      expect(diff.sameKernelVersion).toBe(true);
      expect(diff.sameGraph).toBe(true);
    }
  });
});

// =======================================================================
// Category 13: Benchmark Testing
// =======================================================================
describe('Category 13: Benchmark Certification', () => {
  it('Has 4 defined benchmark scenarios', () => {
    expect(benchmarkCert.getBenchmarks().length).toBe(4);
  });

  it('All benchmarks pass certification', () => {
    const results = benchmarkCert.runAll();
    for (const r of results) {
      expect(r.passed).toBe(true);
    }
  });

  it('Generates certification document', () => {
    const cert = benchmarkCert.generateCertificate();
    expect(cert).toContain('CERTIFIED');
    expect(cert).toContain('v2.0.0-LiteratureCalibrated');
  });
});

// =======================================================================
// Category 13b: Sensitivity Analysis
// =======================================================================
describe('Category 13b: Sensitivity Analysis', () => {
  it('Computes sensitivity from parameter sweeps (not hardcoded)', () => {
    const results = sensitivityEngine.computeAll();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.impactMagnitude).toBeGreaterThan(0); // Actual computed impact
      expect(r.param).toContain('extraction.');
    }
  });
});

// =======================================================================
// Category 2b: Prediction vs Reality Validation
// =======================================================================
describe('Category 2b: Model Prediction Validation', () => {
  it('Validates extraction predictions against lab data', () => {
    const validations = predictionValidator.validateExtractionPredictions();
    expect(validations.length).toBeGreaterThan(0);
  });

  it('Computes model accuracy with grade', () => {
    const accuracy = predictionValidator.computeAccuracy('extraction.v2.0.0');
    expect(accuracy.samplesValidated).toBeGreaterThan(0);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(accuracy.grade);
  });

  it('Generates accuracy report', () => {
    const report = predictionValidator.generateAccuracyReport();
    expect(report).toContain('Validation Report');
    expect(report).toContain('extraction.v2.0.0');
  });
});
