/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DistillationRunInput, DistillationRunOutput, ModelMetadata } from '../core/types.ts';

export const distillationModelMetadata: ModelMetadata = {
  id: 'distillation.v1.0.0',
  name: 'Vapor-Liquid Equilibrium Wiped-Film Distillation Model',
  description: 'Calculates the fraction cut (Heads, Hearts/Distillate, and Tails/Residue), purity, and yield of cannabinoids during wiped-film short-path molecular distillation using pressure-corrected boiling curves.',
  source: 'Derived from Clausius-Clapeyron and Antoine pressure-temperature equations adjusted for phytocannabinoid vapor pressures.',
  version: '1.0.0',
};

export class DistillationModel {
  static meta = distillationModelMetadata;

  static run(input: DistillationRunInput): DistillationRunOutput {
    const { feedMass, feedCannabinoidPurity, feedTerpeneContent, feedHeavyResidue, evaporatorTemp, condenserTemp, vacuumPressure, feedRate } = input;

    // Convert vacuum pressure from mbar to Torr for classic Antoine equations
    // 1 mbar = 0.750062 Torr
    const P_torr = Math.max(0.0001, vacuumPressure * 0.750062);

    // 1. Calculate pressure-corrected Boiling Points using calibrated Antoine-like parameters
    // log10(P) = A - B / (T + C) => T = B / (A - log10(P)) - C (T in Celsius)
    // Terpenes: highly volatile, lower boiling point
    const terp_A = 7.35;
    const terp_B = 1420;
    const terp_C = 230;
    const bp_terpenes = terp_B / (terp_A - Math.log10(P_torr)) - terp_C;

    // Cannabinoids (THC/CBD): medium-high boiling point, sensitive to vacuum
    const cann_A = 8.10;
    const cann_B = 2450;
    const cann_C = 240;
    const bp_cannabinoids = cann_B / (cann_A - Math.log10(P_torr)) - cann_C;

    // Heavy Residue (Lipids/Tar/Sugars): non-volatile, extremely high boiling point
    const heavy_A = 8.50;
    const heavy_B = 3200;
    const heavy_C = 250;
    const bp_heavy = heavy_B / (heavy_A - Math.log10(P_torr)) - heavy_C;

    // 2. Feed Constituent Masses
    const initialTerpenes = feedMass * (feedTerpeneContent / 100);
    const initialCannabinoids = feedMass * (feedCannabinoidPurity / 100);
    const initialResidue = feedMass * (feedHeavyResidue / 100);

    // 3. Vaporization Rate Modeling (Function of Evaporator Temp vs Boiling Point)
    // Modeled using a smooth logistic curve representing vapor-liquid splitting
    const getVaporFraction = (temp: number, bp: number, sensitivity: number) => {
      return 1 / (1 + Math.exp(-sensitivity * (temp - bp)));
    };

    // Feed rate penalty (high feed rate = thicker film, shorter residence time = lower evaporation efficiency)
    const filmThicknessFactor = Math.max(0.5, 1 - 0.03 * Math.max(0, feedRate - 1.0));

    const f_evap_terp = getVaporFraction(evaporatorTemp, bp_terpenes, 0.12) * filmThicknessFactor;
    const f_evap_cann = getVaporFraction(evaporatorTemp, bp_cannabinoids, 0.08) * filmThicknessFactor;
    const f_evap_heavy = getVaporFraction(evaporatorTemp, bp_heavy, 0.05) * filmThicknessFactor;

    const vaporizedTerp = initialTerpenes * f_evap_terp;
    const vaporizedCann = initialCannabinoids * f_evap_cann;
    const vaporizedHeavy = initialResidue * f_evap_heavy;

    // 4. Condensation / Collection Efficiency (Function of Condenser Temp)
    // Condenser must be warm enough for cannabinoids to flow (not solidify: 55-80C) but cold enough to condense vapors
    let cann_condense_eff = 0.99;
    if (condenserTemp < 55) {
      // Solidification/extreme viscosity warning but captures vapors
      cann_condense_eff = 0.99;
    } else if (condenserTemp > 80) {
      // Too hot, cannabinoids bypass condenser to vacuum cold trap
      cann_condense_eff = Math.max(0.1, 0.99 - 0.015 * (condenserTemp - 80));
    }

    // Terpenes need a very cold condenser to condense; usually captured in separate light trap
    // If condenser is 70C, terpenes mostly stay as vapor and bypass to vacuum trap (heads loss)
    let terp_condense_eff = Math.max(0.01, 1 - 0.012 * condenserTemp);

    const heavy_condense_eff = 0.995; // heavy waxes condense very easily

    // 5. Fraction Splits Calculations
    // Heads Cut: primarily volatile terpenes and solvent traces that vaporized and condensed
    const headsMass = (vaporizedTerp * terp_condense_eff) + (vaporizedCann * (1 - cann_condense_eff) * 0.2);

    // Distillate (Hearts) Cut: primarily vaporized and condensed cannabinoids
    const distillateCann = vaporizedCann * cann_condense_eff;
    const distillateTerp = vaporizedTerp * (1 - terp_condense_eff) * 0.1; // terpene cross-contamination
    const distillateHeavy = vaporizedHeavy * heavy_condense_eff;
    const distillateMass = distillateCann + distillateTerp + distillateHeavy;

    // Tails (Residue) Cut: heavy bottom residue that did NOT vaporize + unvaporized cannabinoids
    const tailsCann = initialCannabinoids - vaporizedCann;
    const tailsTerp = initialTerpenes - vaporizedTerp;
    const tailsHeavy = initialResidue - vaporizedHeavy;
    const tailsMass = tailsCann + tailsTerp + tailsHeavy;

    // 6. Outputs Calculations
    const finalPurity = distillateMass > 0 ? (distillateCann / distillateMass) * 100 : 0;
    const cannabinoidYield = initialCannabinoids > 0 ? (distillateCann / initialCannabinoids) * 100 : 0;

    return {
      distillateMass,
      headsMass,
      tailsMass,
      cannabinoidPurity: finalPurity,
      cannabinoidYield,
      boilingPoints: {
        terpenes: bp_terpenes,
        cannabinoids: bp_cannabinoids,
        heavyResidue: bp_heavy,
      },
    };
  }
}
