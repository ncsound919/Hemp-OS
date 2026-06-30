/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtractionRunInput, ExtractionRunOutput, ModelMetadata } from '../core/types.ts';

export const extractionModelMetadata: ModelMetadata = {
  id: 'extraction.v1.0.0',
  name: 'Thermodynamic & Kinematic Solid-Liquid Extraction Model',
  description: 'Calculates cannabinoid solubilization, diffusion kinetics, and co-extraction of plant waxes as a function of temperature, solvent ratio, duration, and agitation.',
  source: 'Derived from classical solid-liquid mass transport theory and empirical cannabinoid solubility tables in cold/warm ethanol.',
  version: '1.0.0',
};

export class ExtractionModel {
  static meta = extractionModelMetadata;

  static run(input: ExtractionRunInput): ExtractionRunOutput {
    const { biomass, solvent, solventRatio, temperature, duration, agitationSpeed } = input;

    // 1. Calculate Feed Quantities
    const moistureMass = biomass.mass * (biomass.moisture / 100);
    const dryBiomassMass = biomass.mass - moistureMass;
    
    // Convert cannabinoid potencies (wt%) to dry-basis gram masses
    const cannabinoidsInGrams: Record<string, number> = {
      thca: biomass.mass * (biomass.potency.thca / 100) * 1000,
      thc: biomass.mass * (biomass.potency.thc / 100) * 1000,
      cbda: biomass.mass * (biomass.potency.cbda / 100) * 1000,
      cbd: biomass.mass * (biomass.potency.cbd / 100) * 1000,
      cbga: biomass.mass * (biomass.potency.cbga / 100) * 1000,
      cbg: biomass.mass * (biomass.potency.cbg / 100) * 1000,
      other: biomass.mass * (biomass.potency.other / 100) * 1000,
    };

    const totalAvailableWaxes = biomass.mass * (biomass.waxContent / 100); // kg

    // 2. Solvent Density Configuration (Ethanol as standard, but handles CO2/Butane conceptually)
    let solventDensity = 0.789; // kg/L at 20C (Ethanol)
    if (solvent.type === 'CO2') solventDensity = 0.93; // supercritical liquid
    if (solvent.type === 'Butane') solventDensity = 0.573;

    // Adjust solvent density slightly with temperature
    solventDensity = solventDensity * (1 - 0.001 * (temperature - 20));

    const solventVolumeInput = biomass.mass * solventRatio; // L
    const solventMassInput = solventVolumeInput * solventDensity; // kg

    // 3. Equilibrium & Kinetics Modeling
    // Equilibrium recovery limit R_max depends on solvent-to-biomass ratio (diminishing returns)
    const R_max = 0.99 * (1 - Math.exp(-0.35 * solventRatio));

    // Temperature multiplier for diffusion rate (Arrhenius-like effect)
    // Warm extraction = fast diffusion, cold extraction = slower diffusion
    const T_kelvin = temperature + 273.15;
    const Ea = 25000; // J/mol (activation energy for solute diffusion)
    const R_constant = 8.314;
    const k_ref = 0.08; // reference rate constant at 20C (293.15K)
    const rateConstant = k_ref * Math.exp(-(Ea / R_constant) * (1 / T_kelvin - 1 / 293.15));

    // Agitation speed enhancement factor (improves boundary layer mass transport)
    const agitationFactor = 1 + (agitationSpeed / 600);

    // Effective kinetic rate
    const beta = rateConstant * agitationFactor;
    
    // Overall Cannabinoid Recovery Fraction
    let recoveryRateFraction = R_max * (1 - Math.exp(-beta * duration));
    if (recoveryRateFraction > 0.985) recoveryRateFraction = 0.985; // practical ceiling
    if (recoveryRateFraction < 0) recoveryRateFraction = 0;

    // Calculate recovered grams for each cannabinoid
    const cannabinoidRecovery: Record<string, number> = {};
    let totalRecoveredGrams = 0;
    let totalPotencyGrams = 0;
    for (const key of Object.keys(cannabinoidsInGrams)) {
      cannabinoidRecovery[key] = cannabinoidsInGrams[key] * recoveryRateFraction;
      totalRecoveredGrams += cannabinoidRecovery[key];
      totalPotencyGrams += cannabinoidsInGrams[key];
    }

    // 4. Wax/Lipid Co-extraction Modeling
    // Waxes are highly soluble at warm temps, very insoluble at cold temps ($-40C)
    // waxContent is wt% in biomass
    const waxSolubilityFactor = Math.exp(0.065 * temperature); // Exponential relationship with Temp
    let waxExtractionFraction = 0.85 * (1 - Math.exp(-0.04 * duration)) * waxSolubilityFactor;
    if (waxExtractionFraction > 1.0) waxExtractionFraction = 1.0;
    if (waxExtractionFraction < 0.01) waxExtractionFraction = 0.01; // minimum background solubilization

    const waxExtracted = totalAvailableWaxes * waxExtractionFraction; // kg

    // 5. Mass Balance and Physical Retention (absorption)
    // Plant material absorbs about 1.25 to 1.75 L of solvent per kg of dry biomass
    const specificRetention = 1.45; // L/kg
    const absorbedSolventVolume = Math.min(solventVolumeInput * 0.9, dryBiomassMass * specificRetention);
    const absorbedSolventMass = absorbedSolventVolume * solventDensity;

    // Volatilization/vapor loss during handling (temperature-dependent)
    const volatileLossVolume = solventVolumeInput * (0.005 * Math.exp(0.04 * Math.max(0, temperature)));
    const volatileLossMass = volatileLossVolume * solventDensity;

    const solventLossVolume = absorbedSolventVolume + volatileLossVolume;
    const solventLossMass = solventLossVolume * solventDensity;

    // Mass Balance outputs
    const spentBiomassMass = dryBiomassMass + moistureMass + absorbedSolventMass - (totalRecoveredGrams / 1000) - waxExtracted;
    const miscellaMass = Math.max(0, (biomass.mass + solventMassInput) - spentBiomassMass - volatileLossMass);

    // Calculate purity of the dry extract (cannabinoids wt% relative to total extracted solids: cannabinoids + wax)
    const dryExtractSolidsMassKg = (totalRecoveredGrams / 1000) + waxExtracted;
    const purity = dryExtractSolidsMassKg > 0 ? (totalRecoveredGrams / 1000 / dryExtractSolidsMassKg) * 100 : 0;

    return {
      miscellaMass,
      spentBiomassMass,
      cannabinoidRecovery,
      waxExtracted,
      solventLoss: solventLossVolume,
      recoveryRate: recoveryRateFraction * 100,
      purity,
    };
  }
}
