import { describe, it, expect, vi } from 'vitest';
import {
  validateBiomass,
  validateSolvent,
  validateExtractionInput,
  validateDecarboxylationInput,
  validateWinterizationInput,
  validateDistillationInput,
  assertValid,
} from '../core/validation.ts';
import type { Biomass, Solvent } from '../core/types.ts';

const validBiomass: Biomass = {
  id: 'test',
  name: 'Test Flower',
  mass: 10,
  moisture: 10,
  waxContent: 5,
  potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
};

const validSolvent: Solvent = { type: 'Ethanol', purity: 99.5, temperature: -40 };

// ─── validateBiomass ─────────────────────────────────────────────────────

describe('validateBiomass', () => {
  it('passes on valid biomass', () => {
    const errs = validateBiomass(validBiomass);
    expect(errs.filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('errors on zero mass', () => {
    const errs = validateBiomass({ ...validBiomass, mass: 0 });
    expect(errs.some(e => e.field === 'mass' && e.severity === 'error')).toBe(true);
  });

  it('errors on negative mass', () => {
    const errs = validateBiomass({ ...validBiomass, mass: -1 });
    expect(errs.some(e => e.field === 'mass' && e.severity === 'error')).toBe(true);
  });

  it('errors on moisture > 30%', () => {
    const errs = validateBiomass({ ...validBiomass, moisture: 35 });
    expect(errs.some(e => e.field === 'moisture' && e.severity === 'error')).toBe(true);
  });

  it('warns on moisture > 15%', () => {
    const errs = validateBiomass({ ...validBiomass, moisture: 20 });
    expect(errs.some(e => e.field === 'moisture' && e.severity === 'warning')).toBe(true);
  });

  it('errors on total potency > 100%', () => {
    const errs = validateBiomass({
      ...validBiomass,
      potency: { thca: 90, thc: 20, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
    });
    expect(errs.some(e => e.field === 'potency' && e.severity === 'error')).toBe(true);
  });

  it('errors on wax content > 20%', () => {
    const errs = validateBiomass({ ...validBiomass, waxContent: 25 });
    expect(errs.some(e => e.field === 'waxContent' && e.severity === 'error')).toBe(true);
  });

  it('passes on biomass with no cannabinoids', () => {
    const errs = validateBiomass({
      ...validBiomass,
      potency: { thca: 0, thc: 0, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
    });
    expect(errs.filter(e => e.severity === 'error')).toHaveLength(0);
  });
});

// ─── validateSolvent ──────────────────────────────────────────────────────

describe('validateSolvent', () => {
  it('passes on valid solvent', () => {
    const errs = validateSolvent(validSolvent);
    expect(errs.filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('errors on purity < 50%', () => {
    const errs = validateSolvent({ ...validSolvent, purity: 30 });
    expect(errs.some(e => e.field === 'purity')).toBe(true);
  });

  it('errors on purity > 100%', () => {
    const errs = validateSolvent({ ...validSolvent, purity: 110 });
    expect(errs.some(e => e.field === 'purity')).toBe(true);
  });

  it('errors on temperature below -100C', () => {
    const errs = validateSolvent({ ...validSolvent, temperature: -200 });
    expect(errs.some(e => e.field === 'temperature')).toBe(true);
  });

  it('errors on temperature above 80C', () => {
    const errs = validateSolvent({ ...validSolvent, temperature: 100 });
    expect(errs.some(e => e.field === 'temperature')).toBe(true);
  });
});

// ─── validateExtractionInput ─────────────────────────────────────────────

describe('validateExtractionInput', () => {
  const base = {
    biomass: validBiomass,
    solvent: validSolvent,
    solventRatio: 8,
    temperature: -40,
    duration: 30,
    agitationSpeed: 300,
  };

  it('passes on valid input', () => {
    expect(validateExtractionInput(base).filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('errors on solventRatio <= 0', () => {
    const errs = validateExtractionInput({ ...base, solventRatio: 0 });
    expect(errs.some(e => e.field === 'solventRatio')).toBe(true);
  });

  it('errors on solventRatio > 50', () => {
    const errs = validateExtractionInput({ ...base, solventRatio: 60 });
    expect(errs.some(e => e.field === 'solventRatio')).toBe(true);
  });

  it('errors on duration <= 0', () => {
    const errs = validateExtractionInput({ ...base, duration: 0 });
    expect(errs.some(e => e.field === 'duration')).toBe(true);
  });

  it('errors on temperature < -90', () => {
    const errs = validateExtractionInput({ ...base, temperature: -100 });
    expect(errs.some(e => e.field === 'temperature')).toBe(true);
  });

  it('errors on agitation > 2000 RPM', () => {
    const errs = validateExtractionInput({ ...base, agitationSpeed: 2500 });
    expect(errs.some(e => e.field === 'agitationSpeed')).toBe(true);
  });
});

// ─── validateDecarboxylationInput ─────────────────────────────────────────

describe('validateDecarboxylationInput', () => {
  const base = {
    initialCannabinoidProfile: validBiomass.potency,
    totalMass: 1,
    temperature: 120,
    duration: 60,
  };

  it('passes on valid input', () => {
    expect(validateDecarboxylationInput(base).filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('errors on totalMass <= 0', () => {
    const errs = validateDecarboxylationInput({ ...base, totalMass: 0 });
    expect(errs.some(e => e.field === 'totalMass')).toBe(true);
  });

  it('errors on temperature below 80C', () => {
    const errs = validateDecarboxylationInput({ ...base, temperature: 50 });
    expect(errs.some(e => e.field === 'temperature')).toBe(true);
  });

  it('warns on temperature above 150C', () => {
    const errs = validateDecarboxylationInput({ ...base, temperature: 180 });
    expect(errs.some(e => e.severity === 'warning' && e.field === 'temperature')).toBe(true);
  });

  it('errors on duration < 5 min', () => {
    const errs = validateDecarboxylationInput({ ...base, duration: 1 });
    expect(errs.some(e => e.field === 'duration')).toBe(true);
  });

  it('errors on zero potency profile', () => {
    const errs = validateDecarboxylationInput({
      ...base,
      initialCannabinoidProfile: { thca: 0, thc: 0, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
    });
    expect(errs.some(e => e.field === 'initialCannabinoidProfile')).toBe(true);
  });
});

// ─── validateWinterizationInput ───────────────────────────────────────────

describe('validateWinterizationInput', () => {
  const base = {
    crudeOilMass: 1,
    cannabinoidPurity: 70,
    waxContent: 15,
    solventRatio: 5,
    coolingTemp: -40,
    coolingTime: 24,
    filtrationPasses: 1,
  };

  it('passes on valid input', () => {
    expect(validateWinterizationInput(base).filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('errors on crudeOilMass <= 0', () => {
    const errs = validateWinterizationInput({ ...base, crudeOilMass: 0 });
    expect(errs.some(e => e.field === 'crudeOilMass')).toBe(true);
  });

  it('errors on cannabinoidPurity > 100', () => {
    const errs = validateWinterizationInput({ ...base, cannabinoidPurity: 110 });
    expect(errs.some(e => e.field === 'cannabinoidPurity')).toBe(true);
  });

  it('errors on waxContent > 50', () => {
    const errs = validateWinterizationInput({ ...base, waxContent: 60 });
    expect(errs.some(e => e.field === 'waxContent')).toBe(true);
  });

  it('errors on solventRatio < 1', () => {
    const errs = validateWinterizationInput({ ...base, solventRatio: 0.5 });
    expect(errs.some(e => e.field === 'solventRatio')).toBe(true);
  });

  it('warns on coolingTemp > -15C', () => {
    const errs = validateWinterizationInput({ ...base, coolingTemp: 0 });
    expect(errs.some(e => e.severity === 'warning' && e.field === 'coolingTemp')).toBe(true);
  });

  it('errors on coolingTime > 168 hours', () => {
    const errs = validateWinterizationInput({ ...base, coolingTime: 200 });
    expect(errs.some(e => e.field === 'coolingTime')).toBe(true);
  });
});

// ─── validateDistillationInput ────────────────────────────────────────────

describe('validateDistillationInput', () => {
  const base = {
    feedMass: 1,
    feedCannabinoidPurity: 80,
    feedCannabinoidProfile: { thca: 0, thc: 1, cbda: 0, cbd: 0, cbga: 0, cbg: 0 },
    feedTerpeneContent: 2,
    feedHeavyResidue: 18,
    evaporatorTemp: 185,
    condenserTemp: 70,
    vacuumPressure: 0.05,
    feedRate: 1.5,
  };

  it('passes on valid input', () => {
    expect(validateDistillationInput(base).filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('errors on feedMass <= 0', () => {
    const errs = validateDistillationInput({ ...base, feedMass: -1 });
    expect(errs.some(e => e.field === 'feedMass')).toBe(true);
  });

  it('errors on composition sum > 100%', () => {
    const errs = validateDistillationInput({ ...base, feedCannabinoidPurity: 80, feedTerpeneContent: 30, feedHeavyResidue: 20 });
    expect(errs.some(e => e.field === 'feedCompositions')).toBe(true);
  });

  it('warns on total composition < 85% (large other fraction)', () => {
    const errs = validateDistillationInput({ ...base, feedCannabinoidPurity: 50, feedTerpeneContent: 1, feedHeavyResidue: 10 });
    expect(errs.some(e => e.severity === 'warning')).toBe(true);
  });

  it('errors on evaporatorTemp < 100', () => {
    const errs = validateDistillationInput({ ...base, evaporatorTemp: 50 });
    expect(errs.some(e => e.field === 'evaporatorTemp')).toBe(true);
  });

  it('errors on condenserTemp < 20', () => {
    const errs = validateDistillationInput({ ...base, condenserTemp: 10 });
    expect(errs.some(e => e.field === 'condenserTemp')).toBe(true);
  });

  it('errors on vacuumPressure < 0.0001', () => {
    const errs = validateDistillationInput({ ...base, vacuumPressure: 0.00001 });
    expect(errs.some(e => e.field === 'vacuumPressure')).toBe(true);
  });

  it('errors on feedRate > 100', () => {
    const errs = validateDistillationInput({ ...base, feedRate: 200 });
    expect(errs.some(e => e.field === 'feedRate')).toBe(true);
  });
});

// ─── assertValid ──────────────────────────────────────────────────────────

describe('assertValid', () => {
  it('does not throw on empty errors', () => {
    expect(() => assertValid([], 'test')).not.toThrow();
  });

  it('does not throw on warnings only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => assertValid([{ field: 'x', message: 'warn', severity: 'warning' }], 'test')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws on fatal errors', () => {
    expect(() => assertValid([{ field: 'mass', message: 'bad', severity: 'error' }], 'test')).toThrow('Validation failed for test');
  });
});
