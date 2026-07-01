/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecarboxylationRunInput, DecarboxylationRunOutput, ModelMetadata, CannabinoidProfile } from '../core/types.ts';

export const decarboxylationModelMetadata: ModelMetadata = {
  id: 'decarboxylation.v1.2.0',
  name: 'First-Order Arrhenius Reaction Kinetics Decarboxylation Model',
  description: 'Models thermal conversion of acidic cannabinoids (THCA → THC, CBDA → CBD, CBGA → CBG) with CO₂ loss and controlled thermal degradation. Maintains strict mass balance.',
  source: 'Arrhenius kinetics calibrated from hemp extract literature (Ea, A factors for each cannabinoid).',
  version: '1.2.0',
};

export class DecarboxylationModel {
  static meta = decarboxylationModelMetadata;

  private static readonly CONFIG = {
    // Pre-exponential factors (min⁻¹)
    A_thca: 1.2e13,
    A_cbda: 1.0e13,
    A_cbga: 1.1e13,
    A_degradation: 8.0e11,

    // Activation energies (J/mol)
    Ea_thca: 110000,
    Ea_cbda: 108000,
    Ea_cbga: 109000,
    Ea_degradation: 105000,

    // Degradation is slower on acids
    acidDegradationFactor: 0.3,
  };

  static run(input: DecarboxylationRunInput): DecarboxylationRunOutput {
    const { initialCannabinoidProfile, totalMass, temperature = 120, duration = 60 } = input;

    if (totalMass <= 0) throw new Error('DecarboxylationModel: totalMass must be > 0');
    if (temperature < 80 || temperature > 160) console.warn(`DecarboxylationModel: temperature ${temperature}°C is outside typical safe range.`);

    const R = 8.314; // J/(mol·K)
    const T = temperature + 273.15;

    // Rate constants
    const k_thca = this.CONFIG.A_thca * Math.exp(-this.CONFIG.Ea_thca / (R * T));
    const k_cbda = this.CONFIG.A_cbda * Math.exp(-this.CONFIG.Ea_cbda / (R * T));
    const k_cbga = this.CONFIG.A_cbga * Math.exp(-this.CONFIG.Ea_cbga / (R * T));
    const k_deg = this.CONFIG.A_degradation * Math.exp(-this.CONFIG.Ea_degradation / (R * T));

    // Conversion fractions
    const f_thca = Math.exp(-k_thca * duration);
    const f_cbda = Math.exp(-k_cbda * duration);
    const f_cbga = Math.exp(-k_cbga * duration);
    const f_deg = Math.exp(-k_deg * duration);

    const convTHCA = 1 - f_thca;
    const convCBDA = 1 - f_cbda;
    const convCBGA = 1 - f_cbga;

    // Initial masses in grams
    const initialGrams = {
      thca: totalMass * (initialCannabinoidProfile.thca / 100) * 1000,
      thc: totalMass * (initialCannabinoidProfile.thc / 100) * 1000,
      cbda: totalMass * (initialCannabinoidProfile.cbda / 100) * 1000,
      cbd: totalMass * (initialCannabinoidProfile.cbd / 100) * 1000,
      cbga: totalMass * (initialCannabinoidProfile.cbga / 100) * 1000,
      cbg: totalMass * (initialCannabinoidProfile.cbg / 100) * 1000,
      other: totalMass * ((initialCannabinoidProfile.other ?? 0) / 100) * 1000,
    };

    // Converted masses
    const thcaConverted = initialGrams.thca * convTHCA;
    const cbdaConverted = initialGrams.cbda * convCBDA;
    const cbgaConverted = initialGrams.cbga * convCBGA;

    // CO₂ loss (g)
    const co2EvolvedGrams = 
      thcaConverted * (1 - 0.8772) +
      cbdaConverted * (1 - 0.8772) +
      cbgaConverted * (1 - 0.8779);

    // Raw final grams before degradation
    const finalGramsRaw = {
      thca: initialGrams.thca * f_thca,
      thc: initialGrams.thc + thcaConverted * 0.8772,
      cbda: initialGrams.cbda * f_cbda,
      cbd: initialGrams.cbd + cbdaConverted * 0.8772,
      cbga: initialGrams.cbga * f_cbga,
      cbg: initialGrams.cbg + cbgaConverted * 0.8779,
      other: initialGrams.other,
    };

    // Apply thermal degradation (neutral forms degrade faster)
    const finalGrams: Record<keyof CannabinoidProfile, number> = {} as any;
    let degradedGrams = 0;

    for (const key of Object.keys(finalGramsRaw) as Array<keyof CannabinoidProfile>) {
      const isNeutral = ['thc', 'cbd', 'cbg'].includes(key);
      const degFactor = isNeutral ? f_deg : (1 - (1 - f_deg) * this.CONFIG.acidDegradationFactor);
      finalGrams[key] = finalGramsRaw[key] * degFactor;
      degradedGrams += finalGramsRaw[key] - finalGrams[key];
    }

    finalGrams.other += degradedGrams;

    // Final oil mass after CO₂ loss
    const finalMassOilKg = Math.max(0.001, totalMass - co2EvolvedGrams / 1000);

    // Convert to wt%
    const finalProfile: CannabinoidProfile = {
      thca: (finalGrams.thca / 1000 / finalMassOilKg) * 100,
      thc: (finalGrams.thc / 1000 / finalMassOilKg) * 100,
      cbda: (finalGrams.cbda / 1000 / finalMassOilKg) * 100,
      cbd: (finalGrams.cbd / 1000 / finalMassOilKg) * 100,
      cbga: (finalGrams.cbga / 1000 / finalMassOilKg) * 100,
      cbg: (finalGrams.cbg / 1000 / finalMassOilKg) * 100,
      other: (finalGrams.other / 1000 / finalMassOilKg) * 100,
    };

    return {
      finalCannabinoidProfile: finalProfile,
      co2Evolved: co2EvolvedGrams / 1000,
      finalMass: finalMassOilKg,
      conversionRateTHCA: convTHCA * 100,
      conversionRateCBDA: convCBDA * 100,
      conversionRateCBGA: convCBGA * 100,
      lossToThermalDegradation: (1 - f_deg) * 100,
    };
  }
}
