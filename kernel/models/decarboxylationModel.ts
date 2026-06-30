/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecarboxylationRunInput, DecarboxylationRunOutput, ModelMetadata, CannabinoidProfile } from '../core/types.ts';

export const decarboxylationModelMetadata: ModelMetadata = {
  id: 'decarboxylation.v1.0.0',
  name: 'First-Order Arrhenius Reaction Kinetics Decarboxylation Model',
  description: 'Calculates the thermal conversion of acid cannabinoids (THCA, CBDA, CBGA) to neutral forms (THC, CBD, CBG) and thermal degradation as a function of temperature and duration.',
  source: 'Derived from Arrhenius reaction rate constants (Ea, A) validated in hemp research literature for decarboxylation kinetics.',
  version: '1.0.0',
};

export class DecarboxylationModel {
  static meta = decarboxylationModelMetadata;

  static run(input: DecarboxylationRunInput): DecarboxylationRunOutput {
    const { initialCannabinoidProfile: init, totalMass, temperature, duration } = input;

    const R_constant = 8.314; // J/(mol*K)
    const T_kelvin = temperature + 273.15;

    // Molecular weight factors (loss of CO2 molecule, MW 44.01 g/mol)
    // THCA (358.47 g/mol) -> THC (314.46 g/mol) + CO2 (44.01 g/mol). Ratio = 314.46 / 358.47 = 0.8772
    // CBDA (358.47 g/mol) -> CBD (314.46 g/mol) + CO2 (44.01 g/mol). Ratio = 0.8772
    // CBGA (360.49 g/mol) -> CBG (316.48 g/mol) + CO2 (44.01 g/mol). Ratio = 316.48 / 360.49 = 0.8779
    const MW_RATIO_THC = 0.8772;
    const MW_RATIO_CBD = 0.8772;
    const MW_RATIO_CBG = 0.8779;

    // 1. Kinetic Rates Calculation using Arrhenius Equations: k = A * exp(-Ea / (R*T))
    // Kinetics for THCA -> THC
    const A_thca = 1.2e13; // min^-1
    const Ea_thca = 110000; // J/mol
    const k_thca = A_thca * Math.exp(-Ea_thca / (R_constant * T_kelvin));

    // Kinetics for CBDA -> CBD
    const A_cbda = 1.0e13; // min^-1
    const Ea_cbda = 108000; // J/mol
    const k_cbda = A_cbda * Math.exp(-Ea_cbda / (R_constant * T_kelvin));

    // Kinetics for CBGA -> CBG
    const A_cbga = 1.1e13; // min^-1
    const Ea_cbga = 109000; // J/mol
    const k_cbga = A_cbga * Math.exp(-Ea_cbga / (R_constant * T_kelvin));

    // Kinetics for general Thermal Degradation (e.g. THC -> CBN, overall cannabinoid breakdown)
    // Highly active at T > 140C
    const A_deg = 8.0e11; // min^-1
    const Ea_deg = 105000; // J/mol
    const k_deg = A_deg * Math.exp(-Ea_deg / (R_constant * T_kelvin));

    // 2. Integration over Duration (t)
    // Acid remaining fraction: f = exp(-k * t)
    const f_thca = Math.exp(-k_thca * duration);
    const f_cbda = Math.exp(-k_cbda * duration);
    const f_cbga = Math.exp(-k_cbga * duration);
    const f_deg = Math.exp(-k_deg * duration); // remaining active fraction after degradation

    const convTHCA = 1 - f_thca;
    const convCBDA = 1 - f_cbda;
    const convCBGA = 1 - f_cbga;
    const degFraction = 1 - f_deg;

    // 3. Profiles Conversion and CO2 evolution
    // Input concentrations are wt% (g of cannabinoid per 100g of oil)
    const initialGrams = {
      thca: totalMass * (init.thca / 100) * 1000,
      thc: totalMass * (init.thc / 100) * 1000,
      cbda: totalMass * (init.cbda / 100) * 1000,
      cbd: totalMass * (init.cbd / 100) * 1000,
      cbga: totalMass * (init.cbga / 100) * 1000,
      cbg: totalMass * (init.cbg / 100) * 1000,
      other: totalMass * (init.other / 100) * 1000,
    };

    // Reacting masses
    const thcaConvertedGrams = initialGrams.thca * convTHCA;
    const cbdaConvertedGrams = initialGrams.cbda * convCBDA;
    const cbgaConvertedGrams = initialGrams.cbga * convCBGA;

    // CO2 mass lost (g)
    const co2EvolvedGrams = 
      (thcaConvertedGrams * (1 - MW_RATIO_THC)) +
      (cbdaConvertedGrams * (1 - MW_RATIO_CBD)) +
      (cbgaConvertedGrams * (1 - MW_RATIO_CBG));

    // Net cannabinoids formed (before degradation)
    const finalGramsRaw = {
      thca: initialGrams.thca * f_thca,
      thc: initialGrams.thc + (thcaConvertedGrams * MW_RATIO_THC),
      cbda: initialGrams.cbda * f_cbda,
      cbd: initialGrams.cbd + (cbdaConvertedGrams * MW_RATIO_CBD),
      cbga: initialGrams.cbga * f_cbga,
      cbg: initialGrams.cbg + (cbgaConvertedGrams * MW_RATIO_CBG),
      other: initialGrams.other,
    };

    // Apply thermal degradation to active/neutral cannabinoids
    const finalGrams: Record<string, number> = {};
    let totalCannabinoidsMass = 0;
    
    // THCA, CBDA, CBGA are relatively stable compared to neutral active species but let's apply partial degradation
    for (const key of Object.keys(finalGramsRaw)) {
      const isNeutral = ['thc', 'cbd', 'cbg'].includes(key);
      const degFactor = isNeutral ? f_deg : (1 - (1 - f_deg) * 0.3); // acids degrade slower
      finalGrams[key] = finalGramsRaw[key as keyof typeof finalGramsRaw] * degFactor;
      totalCannabinoidsMass += finalGrams[key];
    }

    // Capture thermal breakdown products in "other"
    const degradedGrams = Object.keys(finalGramsRaw).reduce((acc, key) => {
      const raw = finalGramsRaw[key as keyof typeof finalGramsRaw];
      const actual = finalGrams[key];
      return acc + (raw - actual);
    }, 0);
    finalGrams.other += degradedGrams;
    totalCannabinoidsMass += degradedGrams; // total solids mass is conserved

    // Calculate final wt% profile
    // Mass of oil decreases slightly due to CO2 gas escape
    const finalMassOilKg = totalMass - (co2EvolvedGrams / 1000);
    const finalCannabinoidProfile: CannabinoidProfile = {
      thca: (finalGrams.thca / 1000) / finalMassOilKg * 100,
      thc: (finalGrams.thc / 1000) / finalMassOilKg * 100,
      cbda: (finalGrams.cbda / 1000) / finalMassOilKg * 100,
      cbd: (finalGrams.cbd / 1000) / finalMassOilKg * 100,
      cbga: (finalGrams.cbga / 1000) / finalMassOilKg * 100,
      cbg: (finalGrams.cbg / 1000) / finalMassOilKg * 100,
      other: (finalGrams.other / 1000) / finalMassOilKg * 100,
    };

    return {
      finalCannabinoidProfile,
      conversionRateTHCA: convTHCA * 100,
      conversionRateCBDA: convCBDA * 100,
      lossToThermalDegradation: degFraction * 100,
      totalCannabinoidsMass,
      co2Evolved: co2EvolvedGrams / 1000,
    };
  }
}
