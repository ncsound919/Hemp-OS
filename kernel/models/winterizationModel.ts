/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WinterizationRunInput, WinterizationRunOutput, ModelMetadata } from '../core/types.ts';

export const winterizationModelMetadata: ModelMetadata = {
  id: 'winterization.v1.0.0',
  name: 'Solubility & Crystallization Filtration Winterization Model',
  description: 'Models wax and lipid precipitation as a thermodynamic crystallization process governed by low temperatures and duration, followed by mechanical filter cake retention and washing loss.',
  source: 'Derived from multi-phase solid-liquid equilibrium tables of saturated lipids in denatured ethanol.',
  version: '1.0.0',
};

export class WinterizationModel {
  static meta = winterizationModelMetadata;

  static run(input: WinterizationRunInput): WinterizationRunOutput {
    const { crudeOilMass, cannabinoidPurity, waxContent, solventRatio, coolingTemp, coolingTime, filtrationPasses } = input;

    // 1. Initial constituent masses (kg)
    const initialCannabinoids = crudeOilMass * (cannabinoidPurity / 100);
    const initialWaxes = crudeOilMass * (waxContent / 100);
    const initialOther = crudeOilMass - initialCannabinoids - initialWaxes;

    // 2. Thermodynamic Crystallization Kinetics
    // Lipids precipitate at cold temperatures.
    // Crystallization ceiling f_max increases as temperature drops from 0C to -80C
    let f_max = 0;
    if (coolingTemp < 0) {
      // Linear-exponential solubility drop model
      f_max = 0.98 * (1 - Math.exp(0.045 * coolingTemp));
    }
    f_max = Math.max(0, Math.min(0.98, f_max));

    // Kinetics: rate of crystallization over time (reaches equilibrium over 12-24 hours)
    // Solvent ratio (ethanol concentration) slightly buffers precipitation kinetics
    const crystallizationConstant = 0.16 * (1 - 0.02 * Math.min(10, solventRatio)); 
    const crystallizationFraction = 1 - Math.exp(-crystallizationConstant * coolingTime);

    const precipitationFraction = f_max * crystallizationFraction;
    const precipitatedWaxQuantity = initialWaxes * precipitationFraction; // kg

    // 3. Mechanical Filtration Recovery
    // Each filtration pass retains a percentage of precipitated wax.
    // 1st pass: 93% capture. Subsequent passes catch remaining.
    const filterEfficiencyPerPass = 0.94;
    const overallFilterCaptureFraction = 1 - Math.pow(1 - filterEfficiencyPerPass, filtrationPasses);
    const removedWaxMass = precipitatedWaxQuantity * overallFilterCaptureFraction;

    const finalWaxRemaining = initialWaxes - removedWaxMass;

    // 4. Filter Cake Solute Retention (Cannabinoid Loss)
    // Wax precipitate forms a filter cake that absorbs/retains valuable cannabinoid oil.
    // Higher solvent ratio (more ethanol) dilutes the oil, reducing the mass of active cannabinoids lost in the cake (cake washing effect).
    const cakeRetentionCoefficient = 0.14; // kg of oil retained per kg of wax
    const washingEfficiencyFactor = 1 / (1 + 0.15 * (solventRatio - 1)); // more solvent = cleaner wash
    const oilLostInCakeMass = removedWaxMass * cakeRetentionCoefficient * washingEfficiencyFactor;

    // Distribute lost oil proportionally across constituents
    const oilLossRatio = crudeOilMass > 0 ? oilLostInCakeMass / crudeOilMass : 0;
    const cannabinoidLossMass = Math.min(initialCannabinoids * 0.9, initialCannabinoids * oilLossRatio);
    const otherLossMass = Math.min(initialOther * 0.9, initialOther * oilLossRatio);
    const actualTotalLossMass = cannabinoidLossMass + otherLossMass;

    // 5. Output Balance
    const dewaxedCrudeMass = Math.max(0.001, crudeOilMass - removedWaxMass - actualTotalLossMass);
    const finalCannabinoids = Math.max(0, initialCannabinoids - cannabinoidLossMass);
    const finalOther = Math.max(0, initialOther - otherLossMass);

    const recoveryRate = initialCannabinoids > 0 ? (finalCannabinoids / initialCannabinoids) * 100 : 0;
    const finalPurity = (finalCannabinoids / dewaxedCrudeMass) * 100;
    const finalWaxContent = (finalWaxRemaining / dewaxedCrudeMass) * 100;

    return {
      dewaxedCrudeMass,
      precipitatedWaxMass: removedWaxMass,
      cannabinoidRecoveryRate: recoveryRate,
      finalPurity,
      finalWaxContent,
    };
  }
}
