/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Biomass } from '../core/types.ts';
import { ExtractionModel } from '../models/extractionModel.ts';
import { DecarboxylationModel } from '../models/decarboxylationModel.ts';
import { WinterizationModel } from '../models/winterizationModel.ts';
import { DistillationModel } from '../models/distillationModel.ts';
import { validateDistillationInput } from '../core/validation.ts';

export interface ValidationTestResult {
  name: string;
  category: 'mass_balance' | 'thermodynamics' | 'kinetics' | 'boundaries';
  status: 'passed' | 'failed';
  details: string;
  expected: any;
  actual: any;
}

export interface VerificationReport {
  timestamp: string;
  kernelVersion: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    integrityScore: number; // % of tests passed
  };
  results: ValidationTestResult[];
}

export class KernelValidationRunner {
  static runIntegrityVerification(): VerificationReport {
    const results: ValidationTestResult[] = [];

    // Setup mock biomass for testing
    const testBiomass: Biomass = {
      id: 'test_biomass_001',
      name: 'Verification Standard Flower',
      mass: 10.0, // 10 kg
      moisture: 10.0, // 10% moisture (1 kg water, 9 kg dry matter)
      waxContent: 5.0, // 5% wax (0.5 kg waxes)
      potency: {
        thca: 15.0, // 1.5 kg THCA (1500 g)
        thc: 0.5,   // 0.05 kg THC (50 g)
        cbda: 0.0,
        cbd: 0.0,
        cbga: 0.0,
        cbg: 0.0,
        other: 0.0,
      },
    };

    // --- TEST 1: Extraction Conservation of Mass ---
    try {
      const extOutput = ExtractionModel.run({
        biomass: testBiomass,
        solvent: { type: 'Ethanol', purity: 99.5, temperature: -40 },
        solventRatio: 8.0, // 80 L ethanol (63.12 kg at density 0.789)
        temperature: -40,
        duration: 30,
        agitationSpeed: 300,
      });

      // Total input mass = biomass + solvent = 10 + 63.12 = 73.12 kg
      // Total output mass = miscella + spentBiomass = extOutput.miscellaMass + extOutput.spentBiomassMass (not counting volatile loss)
      const inputMass = 10.0 + (80 * 0.789 * (1 - 0.001 * (-40 - 20))); // approx 77.2 kg adjusted density
      const outputMass = extOutput.miscellaMass + extOutput.spentBiomassMass;
      const difference = Math.abs(inputMass - outputMass);
      
      // We expect mass to be conserved within 1% (accounting for vapor loss)
      const isConserved = difference < 0.5; // less than 0.5kg mismatch

      results.push({
        name: 'Extraction Mass Conservation',
        category: 'mass_balance',
        status: isConserved ? 'passed' : 'failed',
        details: `Input Mass: ${inputMass.toFixed(3)} kg. Combined Output Mass: ${outputMass.toFixed(3)} kg. Difference (losses): ${difference.toFixed(3)} kg.`,
        expected: '< 0.5 kg loss deviation',
        actual: `${difference.toFixed(3)} kg loss`,
      });
    } catch (e: any) {
      results.push({
        name: 'Extraction Mass Conservation',
        category: 'mass_balance',
        status: 'failed',
        details: `Execution threw an error: ${e.message}`,
        expected: 'Successful execution',
        actual: 'Error',
      });
    }

    // --- TEST 2: Decarboxylation Conversion Limits ---
    try {
      // High temperature decarb should achieve near-complete conversion
      const decarbOutput = DecarboxylationModel.run({
        initialCannabinoidProfile: testBiomass.potency,
        totalMass: 1.0, // 1 kg oil
        temperature: 140, // 140C
        duration: 120, // 2 hours
      });

      const highConversion = decarbOutput.conversionRateTHCA > 95;
      results.push({
        name: 'High Temperature Decarb Yield',
        category: 'kinetics',
        status: highConversion ? 'passed' : 'failed',
        details: `Decarb at 140C for 120 min achieved ${decarbOutput.conversionRateTHCA.toFixed(2)}% THCA conversion.`,
        expected: '> 95% THCA conversion',
        actual: `${decarbOutput.conversionRateTHCA.toFixed(2)}%`,
      });

      // Low temperature decarb should achieve very low conversion
      const decarbOutputCold = DecarboxylationModel.run({
        initialCannabinoidProfile: testBiomass.potency,
        totalMass: 1.0,
        temperature: 80, // 80C
        duration: 15, // 15 min
      });

      const lowConversion = decarbOutputCold.conversionRateTHCA < 10;
      results.push({
        name: 'Low Temperature Decarb Kinetic Lag',
        category: 'kinetics',
        status: lowConversion ? 'passed' : 'failed',
        details: `Decarb at 80C for 15 min achieved ${decarbOutputCold.conversionRateTHCA.toFixed(2)}% THCA conversion.`,
        expected: '< 10% conversion',
        actual: `${decarbOutputCold.conversionRateTHCA.toFixed(2)}%`,
      });
    } catch (e: any) {
      results.push({
        name: 'Decarb Kinetics Test',
        category: 'kinetics',
        status: 'failed',
        details: `Execution error: ${e.message}`,
        expected: 'Successful run',
        actual: 'Error',
      });
    }

    // --- TEST 3: Winterization Wax Solubilization Boundaries ---
    try {
      // Warm winterization (e.g. +10C) should precipitate very little wax
      const winterWarm = WinterizationModel.run({
        crudeOilMass: 1.0,
        cannabinoidPurity: 70.0,
        waxContent: 15.0,
        solventRatio: 5.0,
        coolingTemp: 10, // 10C (warm)
        coolingTime: 24,
        filtrationPasses: 1,
      });

      // Cold winterization (e.g. -40C) should precipitate significant wax
      const winterCold = WinterizationModel.run({
        crudeOilMass: 1.0,
        cannabinoidPurity: 70.0,
        waxContent: 15.0,
        solventRatio: 5.0,
        coolingTemp: -40, // -40C (cold)
        coolingTime: 24,
        filtrationPasses: 1,
      });

      const correctThermodynamics = winterWarm.precipitatedWaxMass < winterCold.precipitatedWaxMass;
      results.push({
        name: 'Winterization Wax Precipitation vs Temperature',
        category: 'thermodynamics',
        status: correctThermodynamics ? 'passed' : 'failed',
        details: `Precipitated wax at 10C: ${winterWarm.precipitatedWaxMass.toFixed(3)} kg. Precipitated wax at -40C: ${winterCold.precipitatedWaxMass.toFixed(3)} kg.`,
        expected: 'Precipitation at -40C > Precipitation at 10C',
        actual: `10C: ${winterWarm.precipitatedWaxMass.toFixed(3)} kg vs -40C: ${winterCold.precipitatedWaxMass.toFixed(3)} kg`,
      });
    } catch (e: any) {
      results.push({
        name: 'Winterization Thermodynamics Test',
        category: 'thermodynamics',
        status: 'failed',
        details: `Execution error: ${e.message}`,
        expected: 'Successful run',
        actual: 'Error',
      });
    }

    // --- TEST 4: Distillation Vacuum Pressure and Boiling Points ---
    try {
      // Lower vacuum pressure (more vacuum) should lower the boiling point of cannabinoids
      const distHighVacuum = DistillationModel.run({
        feedMass: 1.0,
        feedCannabinoidPurity: 80,
        feedTerpeneContent: 2,
        feedHeavyResidue: 18,
        evaporatorTemp: 180,
        condenserTemp: 70,
        vacuumPressure: 0.05, // high vacuum
        feedRate: 1.5,
      });

      const distLowVacuum = DistillationModel.run({
        feedMass: 1.0,
        feedCannabinoidPurity: 80,
        feedTerpeneContent: 2,
        feedHeavyResidue: 18,
        evaporatorTemp: 180,
        condenserTemp: 70,
        vacuumPressure: 5.0, // lower vacuum (higher pressure)
        feedRate: 1.5,
      });

      const correctBoilingShift = distHighVacuum.boilingPoints.cannabinoids < distLowVacuum.boilingPoints.cannabinoids;
      results.push({
        name: 'Distillation Boiling Point Pressure Shift',
        category: 'boundaries',
        status: correctBoilingShift ? 'passed' : 'failed',
        details: `BP of Cannabinoids at 0.05 mbar: ${distHighVacuum.boilingPoints.cannabinoids.toFixed(1)}°C. BP at 5.0 mbar: ${distLowVacuum.boilingPoints.cannabinoids.toFixed(1)}°C.`,
        expected: 'BP at 0.05 mbar < BP at 5.0 mbar',
        actual: `0.05 mbar: ${distHighVacuum.boilingPoints.cannabinoids.toFixed(1)}°C vs 5.0 mbar: ${distLowVacuum.boilingPoints.cannabinoids.toFixed(1)}°C`,
      });
    } catch (e: any) {
      results.push({
        name: 'Distillation Pressure Shift Test',
        category: 'boundaries',
        status: 'failed',
        details: `Execution error: ${e.message}`,
        expected: 'Successful run',
        actual: 'Error',
      });
    }

    // --- TEST 5: Distillation Validation Gate ---
    try {
      const invalidInput = {
        feedMass: -10, // Invalid: negative mass
        feedCannabinoidPurity: 50,
        feedTerpeneContent: 50,
        feedHeavyResidue: 10,
        evaporatorTemp: 200,
        condenserTemp: 50,
        vacuumPressure: 0.1,
        feedRate: 1,
      };

      const errors = validateDistillationInput(invalidInput as any);
      const hasErrors = errors.length > 0;

      results.push({
        name: 'Distillation Validation Gate',
        category: 'boundaries',
        status: hasErrors ? 'passed' : 'failed',
        details: `Validation of invalid input (negative mass) returned ${errors.length} errors.`,
        expected: 'Errors detected',
        actual: hasErrors ? 'Errors detected' : 'No errors',
      });
    } catch (e: any) {
      results.push({
        name: 'Distillation Validation Gate',
        category: 'boundaries',
        status: 'failed',
        details: `Execution error: ${e.message}`,
        expected: 'Successful validation',
        actual: 'Error',
      });
    }

    // Generate summary
    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = totalTests - passed;
    const integrityScore = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      kernelVersion: 'v2.1.0-Deterministic',
      summary: {
        totalTests,
        passed,
        failed,
        integrityScore,
      },
      results,
    };
  }
}
