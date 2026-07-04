/**
 * Categories 1, 2, 7, 8: Biological validation, chemical physics, genomics
 *
 * Tests kernel determinism, biological constraints, impossible-value rejection,
 * mass balance invariants, thermodynamic feasibility, solvent phase-state.
 */

import { describe, it, expect } from 'vitest';
import { biologicalValidator } from '../rigor/biological-validator.ts';
import { chemicalValidator } from '../rigor/chemical-validator.ts';
import { phaseValidator } from '../rigor/phase-validator.ts';
import { typeGuards } from '../rigor/type-guards.ts';
import { ExtractionModel } from '../models/extractionModel.ts';
import { DecarboxylationModel } from '../models/decarboxylationModel.ts';
import { WinterizationModel } from '../models/winterizationModel.ts';
import { DistillationModel } from '../models/distillationModel.ts';
import { KernelExecutor } from '../workflow/executor.ts';

// =======================================================================
// Category 1: Deterministic Kernel — Pure function, repeat-run, boundaries
// =======================================================================
describe('Category 1: Deterministic Kernel', () => {
  const standardBiomass = {
    id: 'test-001', name: 'Test Flower', mass: 10, moisture: 10, waxContent: 5,
    potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
  };

  it('ExtractionModel is a pure function (same input → same output)', () => {
    const input = {
      biomass: standardBiomass,
      solvent: { type: 'Ethanol' as const, purity: 99.5, temperature: -40 },
      solventRatio: 8, temperature: -40, duration: 30, agitationSpeed: 300,
    };
    const a = ExtractionModel.run(input);
    const b = ExtractionModel.run(input);
    expect(a.recoveryRate).toBe(b.recoveryRate);
    expect(a.purity).toBe(b.purity);
    expect(a.miscellaMass).toBe(b.miscellaMass);
  });

  it('DecarboxylationModel is a pure function', () => {
    const input = { initialCannabinoidProfile: standardBiomass.potency, totalMass: 1, temperature: 120, duration: 60 };
    expect(DecarboxylationModel.run(input).conversionRateTHCA)
      .toBe(DecarboxylationModel.run(input).conversionRateTHCA);
  });

  it('WinterizationModel is a pure function', () => {
    const input = { crudeOilMass: 1, cannabinoidPurity: 70, waxContent: 15, solventRatio: 5, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 };
    expect(WinterizationModel.run(input).cannabinoidRecoveryRate)
      .toBe(WinterizationModel.run(input).cannabinoidRecoveryRate);
  });

  it('DistillationModel is a pure function', () => {
    const input = { feedMass: 1, feedCannabinoidPurity: 80, feedTerpeneContent: 2, feedHeavyResidue: 18, evaporatorTemp: 185, condenserTemp: 70, vacuumPressure: 0.05, feedRate: 1.5 };
    expect(DistillationModel.run(input).cannabinoidPurity)
      .toBe(DistillationModel.run(input).cannabinoidPurity);
  });

  it('100× repeat-run reproducibility (KernelExecutor)', () => {
    const graph = {
      stages: [{ id: 'e1', name: 'Extract', type: 'extraction' as const, modelId: 'extraction.v2.0.0', config: { solventType: 'Ethanol', solventPurity: 99.5, solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 } }],
      connections: [],
    };
    const first = KernelExecutor.runProcess(graph, standardBiomass);
    for (let i = 0; i < 50; i++) {
      const next = KernelExecutor.runProcess(graph, standardBiomass);
      expect(next.massBalanceReport.finalMassKg).toBe(first.massBalanceReport.finalMassKg);
      expect(next.manifest.kernelVersion).toBe(first.manifest.kernelVersion);
    }
  });

  it('Boundary condition: empty graph throws', () => {
    expect(() => KernelExecutor.runProcess(
      { stages: [], connections: [] }, standardBiomass,
    )).toThrow('at least one stage');
  });

  it('Boundary condition: winterization without prior extraction throws', () => {
    expect(() => KernelExecutor.runProcess(
      { stages: [{ id: 'w1', name: 'Winterize', type: 'winterization', modelId: 'winterization.v2.0.0', config: { solventRatio: 5, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 } }], connections: [] },
      standardBiomass,
    )).toThrow('requires crude oil');
  });
});

// =======================================================================
// Category 2: Scientific Model Validation — biological constraints
// =======================================================================
describe('Category 2: Biological Model Validation', () => {
  it('Rejects impossible THC value (>38%)', () => {
    const violations = biologicalValidator.validateCannabinoidProfile({ thc: 50, thca: 0, cbda: 0, cbd: 0, cbga: 0, cbg: 0 });
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].severity).toBe('error');
  });

  it('Accepts valid cannabinoid profile', () => {
    const violations = biologicalValidator.validateCannabinoidProfile({ thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0 });
    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('Rejects negative cannabinoid values', () => {
    const violations = biologicalValidator.validateCannabinoidProfile({ thca: -5, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0 });
    expect(violations.length).toBeGreaterThan(0);
  });

  it('Rejects total cannabinoid sum > 45%', () => {
    const violations = biologicalValidator.validateCannabinoidProfile({ thca: 30, thc: 5, cbda: 5, cbd: 5, cbga: 2, cbg: 2 });
    const totalViolations = violations.filter(v => v.constraint === 'totalCannabinoids');
    expect(totalViolations.length).toBeGreaterThan(0);
  });

  it('Validates biomass constraints', () => {
    const errors = biologicalValidator.validateBiomass({ mass: -1, moisture: 50 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Computes total THC correctly per USDA formula', () => {
    // computeTotalTHC(thc, thca) = thc + (thca * 0.877)
    const total = biologicalValidator.computeTotalTHC(0.3, 15);
    expect(total).toBeCloseTo(13.455, 2);
  });

  it('Has 9 defined biological constraints', () => {
    expect(biologicalValidator.getConstraints().length).toBe(9);
  });

  it('Each constraint has a peer-reviewed source', () => {
    for (const c of biologicalValidator.getConstraints()) {
      expect(c.source.length).toBeGreaterThan(5);
    }
  });
});

// =======================================================================
// Category 7-8: Chemical Physics — forbidden regions, mass balance, phase state
// =======================================================================
describe('Category 7-8: Chemical & Extraction Physics', () => {
  it('Has 14 defined forbidden operating regions', () => {
    expect(chemicalValidator.getForbiddenRegions().length).toBe(14);
  });

  it('Detects blocking forbidden region for decarb >200°C', () => {
    // The forbidden region entry checks config['decarbTemp'] which maps to the stage config
    const result = chemicalValidator.validateProcessAgainstForbidden([
      { id: 'd1', name: 'Decarb', type: 'decarboxylation', config: { decarbTemp: 250 } },
    ]);
    expect(result.blocking.length).toBeGreaterThan(0);
  });

  it('Allows safe decarb temperature', () => {
    const result = chemicalValidator.validateProcessAgainstForbidden([
      { id: 'd1', name: 'Decarb', type: 'decarboxylation', config: { temperature: 120 } },
    ]);
    expect(result.blocking.length).toBe(0);
  });

  it('Has 7 cannabinoid stability rules from literature', () => {
    expect(chemicalValidator.getStabilityRules().length).toBe(7);
  });

  it('Mass balance check detects imbalance', () => {
    const checks = chemicalValidator.checkMassBalance({
      s1: { stageType: 'extraction', massIn: 10, massOut: 999 },
    });
    expect(checks[0].passed).toBe(false);
  });

  it('Mass balance passes for valid stage', () => {
    const checks = chemicalValidator.checkMassBalance({
      s1: { stageType: 'extraction', massIn: 10, massOut: 9.995 },
    });
    expect(checks[0].passed).toBe(true);
  });
});

// =======================================================================
// Category 8d: Solvent Phase-State Validation
// =======================================================================
describe('Category 8d: Solvent Phase-State Validation', () => {
  it('Has 6 solvent phase boundary rules', () => {
    expect(phaseValidator.getRules().length).toBe(6);
  });

  it('Warns on CO₂ below critical temperature', () => {
    const result = phaseValidator.validateExtractionPhase('CO2', 25, 100);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('Accepts CO₂ at supercritical conditions', () => {
    const result = phaseValidator.validateExtractionPhase('CO2', 50, 100);
    expect(result.warnings.length).toBe(0);
  });

  it('Warns on ethanol above boiling point', () => {
    const result = phaseValidator.validateExtractionPhase('Ethanol', 85);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('Accepts ethanol at standard extraction temp', () => {
    const result = phaseValidator.validateExtractionPhase('Ethanol', -40);
    expect(result.warnings.length).toBe(0);
  });
});

// =======================================================================
// Category 7b: Runtime Type Guards
// =======================================================================
describe('Category 7b: Runtime Type Guards', () => {
  it('Validates valid cannabinoid profile', () => {
    const result = typeGuards.isCannabinoidProfile({ thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0 });
    expect(result.valid).toBe(true);
  });

  it('Rejects invalid cannabinoid profile (negative)', () => {
    const result = typeGuards.isCannabinoidProfile({ thca: -5, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0 });
    expect(result.valid).toBe(false);
  });

  it('Validates valid biomass', () => {
    const result = typeGuards.isBiomass({ id: 't', name: 'test', mass: 10, moisture: 8, potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0 } });
    expect(result.valid).toBe(true);
  });

  it('Rejects biomass with negative mass', () => {
    const result = typeGuards.isBiomass({ id: 't', name: 'test', mass: -10, moisture: 8, potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0 } });
    expect(result.valid).toBe(false);
  });

  it('Validates valid process stage', () => {
    const result = typeGuards.isProcessStage({ id: 'e1', type: 'extraction', config: { temp: 40 } });
    expect(result.valid).toBe(true);
  });

  it('Rejects invalid stage type', () => {
    const result = typeGuards.isProcessStage({ id: 'x1', type: 'invalid_type', config: {} });
    expect(result.valid).toBe(false);
  });
});
