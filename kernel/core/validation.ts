/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Biomass, 
  Solvent, 
  ExtractionRunInput, 
  DecarboxylationRunInput, 
  WinterizationRunInput, 
  DistillationRunInput 
} from './types.ts';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateBiomass(biomass: Biomass): ValidationError[] {
  const errors: ValidationError[] = [];

  if (biomass.mass <= 0) {
    errors.push({ field: 'mass', message: 'Biomass mass must be greater than 0 kg.', severity: 'error' });
  }
  if (biomass.moisture < 0 || biomass.moisture > 30) {
    errors.push({ field: 'moisture', message: 'Biomass moisture content should be between 0% and 30%.', severity: 'error' });
  }
  if (biomass.moisture > 15) {
    errors.push({ field: 'moisture', message: 'Biomass moisture exceeds 15%. Excessive water may impair extraction yield.', severity: 'warning' });
  }

  const p = biomass.potency;
  const totalPotency = p.thca + p.thc + p.cbda + p.cbd + p.cbga + p.cbg + p.other;
  if (totalPotency < 0 || totalPotency > 100) {
    errors.push({ field: 'potency', message: `Total cannabinoid potency (${totalPotency.toFixed(2)}%) must be between 0% and 100%.`, severity: 'error' });
  }

  if (biomass.waxContent < 0 || biomass.waxContent > 20) {
    errors.push({ field: 'waxContent', message: 'Wax content must be between 0% and 20%.', severity: 'error' });
  }

  return errors;
}

export function validateSolvent(solvent: Solvent): ValidationError[] {
  const errors: ValidationError[] = [];

  if (solvent.purity < 50 || solvent.purity > 100) {
    errors.push({ field: 'purity', message: 'Solvent purity must be between 50% and 100%.', severity: 'error' });
  }
  if (solvent.temperature < -100 || solvent.temperature > 80) {
    errors.push({ field: 'temperature', message: 'Solvent temperature is outside physically reasonable operating limits (-100°C to 80°C).', severity: 'error' });
  }

  return errors;
}

export function validateExtractionInput(input: ExtractionRunInput): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateBiomass(input.biomass));
  errors.push(...validateSolvent(input.solvent));

  if (input.solventRatio <= 0 || input.solventRatio > 50) {
    errors.push({ field: 'solventRatio', message: 'Solvent-to-biomass ratio must be between 1 and 50 L/kg.', severity: 'error' });
  }
  if (input.duration <= 0 || input.duration > 1440) {
    errors.push({ field: 'duration', message: 'Extraction duration must be between 1 minute and 24 hours.', severity: 'error' });
  }
  if (input.temperature < -90 || input.temperature > 80) {
    errors.push({ field: 'temperature', message: 'Extraction temperature must be between -90°C and 80°C.', severity: 'error' });
  }
  if (input.agitationSpeed < 0 || input.agitationSpeed > 2000) {
    errors.push({ field: 'agitationSpeed', message: 'Agitation speed must be between 0 and 2000 RPM.', severity: 'error' });
  }

  return errors;
}

export function validateDecarboxylationInput(input: DecarboxylationRunInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.totalMass <= 0) {
    errors.push({ field: 'totalMass', message: 'Feed oil mass must be greater than 0 kg.', severity: 'error' });
  }
  if (input.temperature < 80 || input.temperature > 200) {
    errors.push({ field: 'temperature', message: 'Decarboxylation temperature should typically be between 80°C and 200°C.', severity: 'error' });
  }
  if (input.temperature > 150) {
    errors.push({ field: 'temperature', message: 'Decarb temperature exceeds 150°C. Risks significant thermal degradation of cannabinoids to CBN or other byproducts.', severity: 'warning' });
  }
  if (input.duration < 5 || input.duration > 480) {
    errors.push({ field: 'duration', message: 'Decarboxylation duration must be between 5 and 480 minutes.', severity: 'error' });
  }

  const p = input.initialCannabinoidProfile;
  const totalPotency = p.thca + p.thc + p.cbda + p.cbd + p.cbga + p.cbg + p.other;
  if (totalPotency <= 0 || totalPotency > 100) {
    errors.push({ field: 'initialCannabinoidProfile', message: 'Initial cannabinoid profile sum must be between 0% and 100%.', severity: 'error' });
  }

  return errors;
}

export function validateWinterizationInput(input: WinterizationRunInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.crudeOilMass <= 0) {
    errors.push({ field: 'crudeOilMass', message: 'Crude oil mass must be greater than 0 kg.', severity: 'error' });
  }
  if (input.cannabinoidPurity <= 0 || input.cannabinoidPurity > 100) {
    errors.push({ field: 'cannabinoidPurity', message: 'Cannabinoid purity must be between 0% and 100%.', severity: 'error' });
  }
  if (input.waxContent < 0 || input.waxContent > 50) {
    errors.push({ field: 'waxContent', message: 'Initial wax content must be between 0% and 50%.', severity: 'error' });
  }
  if (input.solventRatio < 1 || input.solventRatio > 20) {
    errors.push({ field: 'solventRatio', message: 'Solvent ratio must be between 1 and 20 L/kg.', severity: 'error' });
  }
  if (input.coolingTemp > 20 || input.coolingTemp < -100) {
    errors.push({ field: 'coolingTemp', message: 'Chilling temperature must be between -100°C and 20°C.', severity: 'error' });
  }
  if (input.coolingTemp > -15) {
    errors.push({ field: 'coolingTemp', message: 'Chilling temperature is above -15°C. Lipids may remain highly soluble and fail to precipitate.', severity: 'warning' });
  }
  if (input.coolingTime < 1 || input.coolingTime > 168) {
    errors.push({ field: 'coolingTime', message: 'Cooling/winterization time must be between 1 hour and 7 days.', severity: 'error' });
  }

  return errors;
}

export function validateDistillationInput(input: DistillationRunInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.feedMass <= 0) {
    errors.push({ field: 'feedMass', message: 'Distillation feed mass must be greater than 0 kg.', severity: 'error' });
  }
  const totalPct = input.feedCannabinoidPurity + input.feedTerpeneContent + input.feedHeavyResidue;
  if (Math.abs(totalPct - 100) > 1.0) {
    errors.push({ field: 'feedCompositions', message: `Sum of feed components (${totalPct.toFixed(1)}%) must be approximately 100%.`, severity: 'error' });
  }
  if (input.evaporatorTemp < 100 || input.evaporatorTemp > 350) {
    errors.push({ field: 'evaporatorTemp', message: 'Evaporator temperature must be between 100°C and 350°C.', severity: 'error' });
  }
  if (input.condenserTemp < 20 || input.condenserTemp > 120) {
    errors.push({ field: 'condenserTemp', message: 'Condenser temperature must be between 20°C and 120°C.', severity: 'error' });
  }
  if (input.vacuumPressure < 0.0001 || input.vacuumPressure > 10) {
    errors.push({ field: 'vacuumPressure', message: 'Vacuum pressure must be between 0.0001 and 10 mbar.', severity: 'error' });
  }
  if (input.feedRate <= 0 || input.feedRate > 100) {
    errors.push({ field: 'feedRate', message: 'Feed rate must be between 0.1 and 100 kg/hr.', severity: 'error' });
  }

  return errors;
}
