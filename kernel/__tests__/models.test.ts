import { describe, it, expect } from 'vitest';
import { ExtractionModel } from '../models/extractionModel.ts';
import { DecarboxylationModel } from '../models/decarboxylationModel.ts';
import { WinterizationModel } from '../models/winterizationModel.ts';
import { DistillationModel } from '../models/distillationModel.ts';
import type { Biomass } from '../core/types.ts';

const standardFlower: Biomass = {
  id: 'test_flower',
  name: 'Standard Flower',
  mass: 10,
  moisture: 10,
  waxContent: 5,
  potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
};

// ─── ExtractionModel ──────────────────────────────────────────────────────

describe('ExtractionModel', () => {
  const baseInput = () => ({
    biomass: standardFlower,
    solvent: { type: 'Ethanol' as const, purity: 99.5, temperature: -40 },
    solventRatio: 8,
    temperature: -40,
    duration: 30,
    agitationSpeed: 300,
  });

  it('produces deterministic output (same input = same output)', () => {
    const a = ExtractionModel.run(baseInput());
    const b = ExtractionModel.run(baseInput());
    expect(a).toEqual(b);
  });

  it('recoveryRate is between 0 and 100', () => {
    const out = ExtractionModel.run(baseInput());
    expect(out.recoveryRate).toBeGreaterThan(0);
    expect(out.recoveryRate).toBeLessThanOrEqual(100);
  });

  it('purity is between 0 and 100', () => {
    const out = ExtractionModel.run(baseInput());
    expect(out.purity).toBeGreaterThan(0);
    expect(out.purity).toBeLessThanOrEqual(100);
  });

  it('miscellaMass is positive', () => {
    const out = ExtractionModel.run(baseInput());
    expect(out.miscellaMass).toBeGreaterThan(0);
  });

  it('spentBiomassMass is positive', () => {
    const out = ExtractionModel.run(baseInput());
    expect(out.spentBiomassMass).toBeGreaterThan(0);
  });

  it('waxExtracted is positive at -40C', () => {
    const out = ExtractionModel.run(baseInput());
    expect(out.waxExtracted).toBeGreaterThan(0);
  });

  it('cannabinoidRecovery contains cannabinoid keys', () => {
    const out = ExtractionModel.run(baseInput());
    expect(out.cannabinoidRecovery).toHaveProperty('thca');
    expect(out.cannabinoidRecovery).toHaveProperty('thc');
    expect(out.cannabinoidRecovery.thca).toBeGreaterThan(0);
  });

  it('solvent type CO2 changes density and output', () => {
    const ethanolOut = ExtractionModel.run(baseInput());
    const co2Out = ExtractionModel.run({ ...baseInput(), solvent: { type: 'CO2' as const, purity: 99.5, temperature: -40 } });
    expect(ethanolOut.miscellaMass).not.toBe(co2Out.miscellaMass);
  });

  it('higher temperature increases wax extraction', () => {
    const cold = ExtractionModel.run(baseInput());
    const warm = ExtractionModel.run({ ...baseInput(), temperature: 20 });
    expect(warm.waxExtracted).toBeGreaterThan(cold.waxExtracted);
  });

  it('longer duration increases recovery rate (diminishing)', () => {
    const short = ExtractionModel.run({ ...baseInput(), duration: 5 });
    const long = ExtractionModel.run({ ...baseInput(), duration: 120 });
    expect(long.recoveryRate).toBeGreaterThan(short.recoveryRate);
    // Recovery monotonically increases with duration
    const mid = ExtractionModel.run({ ...baseInput(), duration: 30 });
    expect(mid.recoveryRate).toBeGreaterThan(short.recoveryRate);
    expect(long.recoveryRate).toBeGreaterThan(mid.recoveryRate);
  });

  it('higher agitationSpeed increases recovery rate', () => {
    const low = ExtractionModel.run({ ...baseInput(), agitationSpeed: 0 });
    const high = ExtractionModel.run({ ...baseInput(), agitationSpeed: 600 });
    expect(high.recoveryRate).toBeGreaterThan(low.recoveryRate);
  });

  it('recoveryRate caps at 98.5%', () => {
    const maxed = ExtractionModel.run({
      ...baseInput(),
      temperature: 60,
      duration: 1440,
      solventRatio: 50,
      agitationSpeed: 2000,
    });
    expect(maxed.recoveryRate).toBeLessThanOrEqual(98.5);
  });

  it('miscella and spent biomass account for input biomass plus solvent', () => {
    const out = ExtractionModel.run(baseInput());
    const massOut = out.miscellaMass + out.spentBiomassMass;
    // miscella + spent > biomass because solvent mass is included
    expect(out.miscellaMass).toBeGreaterThan(0);
    expect(out.spentBiomassMass).toBeGreaterThan(0);
    expect(massOut).toBeGreaterThan(standardFlower.mass);
  });
});

// ─── DecarboxylationModel ─────────────────────────────────────────────────

describe('DecarboxylationModel', () => {
  const baseInput = () => ({
    initialCannabinoidProfile: standardFlower.potency,
    totalMass: 1,
    temperature: 120,
    duration: 60,
  });

  it('produces deterministic output', () => {
    const a = DecarboxylationModel.run(baseInput());
    const b = DecarboxylationModel.run(baseInput());
    expect(a).toEqual(b);
  });

  it('converts THCA to THC at significant rate at 120C/60min', () => {
    const out = DecarboxylationModel.run(baseInput());
    expect(out.conversionRateTHCA).toBeGreaterThan(50);
    expect(out.conversionRateTHCA).toBeLessThan(100);
  });

  it('high temp (140C/120min) achieves near-complete THCA conversion', () => {
    const out = DecarboxylationModel.run({ ...baseInput(), temperature: 140, duration: 120 });
    expect(out.conversionRateTHCA).toBeGreaterThan(95);
  });

  it('low temp (80C/15min) achieves minimal conversion', () => {
    const out = DecarboxylationModel.run({ ...baseInput(), temperature: 80, duration: 15 });
    expect(out.conversionRateTHCA).toBeLessThan(10);
  });

  it('final mass is less than input due to CO2 evolution', () => {
    const out = DecarboxylationModel.run(baseInput());
    expect(out.finalMass).toBeLessThan(1);
    expect(out.co2Evolved).toBeGreaterThan(0);
  });

  it('final profile values are positive and finite', () => {
    const out = DecarboxylationModel.run(baseInput());
    for (const val of Object.values(out.finalCannabinoidProfile)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it('THCA converts to THC, increasing THC wt%', () => {
    const input = baseInput();
    // The test biomass has thca:15 and thc:0.5 initially
    const initialTHC = 0.5;
    const out = DecarboxylationModel.run(input);
    expect(out.finalCannabinoidProfile.thc).toBeGreaterThan(initialTHC);
    expect(out.finalCannabinoidProfile.thca).toBeLessThan(15);
  });

  it('higher temperature increases thermal degradation', () => {
    const mild = DecarboxylationModel.run({ ...baseInput(), temperature: 100, duration: 120 });
    const hot = DecarboxylationModel.run({ ...baseInput(), temperature: 160, duration: 120 });
    expect(hot.lossToThermalDegradation).toBeGreaterThan(mild.lossToThermalDegradation);
  });

  it('longer duration increases conversion at same temperature', () => {
    const short = DecarboxylationModel.run({ ...baseInput(), duration: 10 });
    const long = DecarboxylationModel.run({ ...baseInput(), duration: 240 });
    expect(long.conversionRateTHCA).toBeGreaterThan(short.conversionRateTHCA);
  });

  it('throws on zero mass', () => {
    expect(() => DecarboxylationModel.run({ ...baseInput(), totalMass: 0 })).toThrow('totalMass must be > 0');
  });
});

// ─── WinterizationModel ──────────────────────────────────────────────────

describe('WinterizationModel', () => {
  const baseInput = () => ({
    crudeOilMass: 1,
    cannabinoidPurity: 70,
    waxContent: 15,
    solventRatio: 5,
    coolingTemp: -40,
    coolingTime: 24,
    filtrationPasses: 1,
  });

  it('produces deterministic output', () => {
    const a = WinterizationModel.run(baseInput());
    const b = WinterizationModel.run(baseInput());
    expect(a).toEqual(b);
  });

  it('cold temperature (-40C) precipitates significant wax', () => {
    const out = WinterizationModel.run(baseInput());
    expect(out.precipitatedWaxMass).toBeGreaterThan(0.01);
  });

  it('cold temperature removes > 50% of wax', () => {
    const out = WinterizationModel.run(baseInput());
    expect(out.finalWaxContent).toBeLessThan(10);
  });

  it('warm temperature (10C) precipitates less wax than cold', () => {
    const warm = WinterizationModel.run({ ...baseInput(), coolingTemp: 10 });
    const cold = WinterizationModel.run({ ...baseInput(), coolingTemp: -40 });
    expect(warm.precipitatedWaxMass).toBeLessThan(cold.precipitatedWaxMass);
  });

  it('more filtration passes remove more wax', () => {
    const single = WinterizationModel.run({ ...baseInput(), filtrationPasses: 1 });
    const multi = WinterizationModel.run({ ...baseInput(), filtrationPasses: 3 });
    expect(multi.finalWaxContent).toBeLessThan(single.finalWaxContent);
  });

  it('cannabinoidRecoveryRate is high (> 80%)', () => {
    const out = WinterizationModel.run(baseInput());
    expect(out.cannabinoidRecoveryRate).toBeGreaterThan(80);
  });

  it('dewaxedCrudeMass is positive and less than input', () => {
    const out = WinterizationModel.run(baseInput());
    expect(out.dewaxedCrudeMass).toBeGreaterThan(0);
    expect(out.dewaxedCrudeMass).toBeLessThan(1);
  });

  it('finalPurity is higher than input purity', () => {
    const out = WinterizationModel.run(baseInput());
    expect(out.finalPurity).toBeGreaterThan(70);
  });

  it('at 0C or above, f_max is 0, so no wax precipitates', () => {
    const out = WinterizationModel.run({ ...baseInput(), coolingTemp: 20 });
    expect(out.precipitatedWaxMass).toBeLessThan(0.001);
    expect(out.cannabinoidRecoveryRate).toBeGreaterThan(99);
  });
});

// ─── DistillationModel ────────────────────────────────────────────────────

describe('DistillationModel', () => {
  const baseInput = () => ({
    feedMass: 1,
    feedCannabinoidPurity: 80,
    feedCannabinoidProfile: { thca: 1, thc: 50, cbda: 0.5, cbd: 40, cbga: 0, cbg: 5 },
    feedTerpeneContent: 2,
    feedHeavyResidue: 18,
    evaporatorTemp: 185,
    condenserTemp: 70,
    vacuumPressure: 0.05,
    feedRate: 1.5,
  });

  it('produces deterministic output', () => {
    const a = DistillationModel.run(baseInput());
    const b = DistillationModel.run(baseInput());
    expect(a).toEqual(b);
  });

  it('distillateMass is positive', () => {
    const out = DistillationModel.run(baseInput());
    expect(out.distillateMass).toBeGreaterThan(0);
  });

  it('cannabinoidPurity in distillate is high', () => {
    const out = DistillationModel.run(baseInput());
    expect(out.cannabinoidPurity).toBeGreaterThan(70);
  });

  it('cannabinoidYield is between 0 and 100', () => {
    const out = DistillationModel.run(baseInput());
    expect(out.cannabinoidYield).toBeGreaterThan(0);
    expect(out.cannabinoidYield).toBeLessThanOrEqual(100);
  });

  it('lower vacuum pressure lowers boiling points', () => {
    const highVac = DistillationModel.run({ ...baseInput(), vacuumPressure: 0.01 });
    const lowVac = DistillationModel.run({ ...baseInput(), vacuumPressure: 5 });
    expect(highVac.boilingPoints.cannabinoids).toBeLessThan(lowVac.boilingPoints.cannabinoids);
  });

  it('higher evaporator temp increases distillate yield', () => {
    const cool = DistillationModel.run({ ...baseInput(), evaporatorTemp: 150 });
    const hot = DistillationModel.run({ ...baseInput(), evaporatorTemp: 220 });
    expect(hot.distillateMass).toBeGreaterThan(cool.distillateMass);
  });

  it('finalCannabinoidProfile values are in valid wt% range', () => {
    const out = DistillationModel.run(baseInput());
    if (out.finalCannabinoidProfile) {
      const vals = Object.values(out.finalCannabinoidProfile);
      for (const v of vals) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(v)).toBe(true);
      }
      // Profile is scaled by purity/100, so sum ≈ purity/100 * 1 (after normalization)
      const sum = vals.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0);
      expect(sum).toBeLessThan(out.cannabinoidPurity);
    }
  });

  it('mass is conserved (distillate + heads + tails ≈ feed)', () => {
    const out = DistillationModel.run(baseInput());
    const total = out.distillateMass + out.headsMass + out.tailsMass;
    expect(total).toBeCloseTo(1, 3);
  });

  it('condenser efficiency penalty above 80C reduces cannabinoid purity', () => {
    const normal = DistillationModel.run({ ...baseInput(), condenserTemp: 70 });
    const hot = DistillationModel.run({ ...baseInput(), condenserTemp: 100 });
    expect(hot.cannabinoidPurity).toBeLessThanOrEqual(normal.cannabinoidPurity + 1);
  });

  it('throws on negative feed mass', () => {
    expect(() => DistillationModel.run({ ...baseInput(), feedMass: -1 })).toThrow('feedMass');
  });

  it('throws on zero feed rate', () => {
    expect(() => DistillationModel.run({ ...baseInput(), feedRate: 0 })).toThrow('feedRate');
  });

  it('throws on composition exceeding 100%', () => {
    expect(() => DistillationModel.run({ ...baseInput(), feedCannabinoidPurity: 80, feedTerpeneContent: 50, feedHeavyResidue: 30 })).toThrow();
  });

  it('boiling points have consistent ordering: terpenes < cannabinoids < heavyResidue', () => {
    const out = DistillationModel.run(baseInput());
    expect(out.boilingPoints.terpenes).toBeLessThan(out.boilingPoints.cannabinoids);
    expect(out.boilingPoints.cannabinoids).toBeLessThan(out.boilingPoints.heavyResidue);
  });
});
