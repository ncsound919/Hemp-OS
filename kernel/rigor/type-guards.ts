/**
 * Runtime Type Guards (Criterion 7b)
 *
 * Enforces type safety for biological, chemical, and numerical data
 * at runtime — catches data integrity issues before they propagate
 * through the analysis pipeline.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class TypeGuards {
  isPositiveNumber(val: any, name: string): ValidationResult {
    const errors: string[] = [];
    if (typeof val !== 'number' || isNaN(val)) {errors.push(`${name}: must be a number, got ${typeof val}`);}
    else if (val < 0) {errors.push(`${name}: must be positive, got ${val}`);}
    return { valid: errors.length === 0, errors };
  }

  isPercentage(val: any, name: string): ValidationResult {
    const errors: string[] = [];
    if (typeof val !== 'number' || isNaN(val)) {errors.push(`${name}: must be a number, got ${typeof val}`);}
    else if (val < 0 || val > 100) {errors.push(`${name}: must be 0-100%, got ${val}`);}
    return { valid: errors.length === 0, errors };
  }

  isCannabinoidProfile(val: any): ValidationResult {
    const errors: string[] = [];
    if (!val || typeof val !== 'object') {return { valid: false, errors: ['CannabinoidProfile must be an object'] };}
    for (const key of ['thca', 'thc', 'cbda', 'cbd', 'cbga', 'cbg']) {
      if (val[key] === undefined) {errors.push(`Missing required cannabinoid: ${key}`);}
      else {
        const pct = this.isPercentage(val[key], key);
        errors.push(...pct.errors);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  isBiomass(val: any): ValidationResult {
    const errors: string[] = [];
    if (!val || typeof val !== 'object') {return { valid: false, errors: ['Biomass must be an object'] };}
    if (!val.id || typeof val.id !== 'string') {errors.push('Biomass must have a string id');}
    if (!val.name || typeof val.name !== 'string') {errors.push('Biomass must have a string name');}
    errors.push(...this.isPositiveNumber(val.mass, 'mass').errors);
    errors.push(...this.isPercentage(val.moisture, 'moisture').errors);
    if (val.potency) {errors.push(...this.isCannabinoidProfile(val.potency).errors);}
    return { valid: errors.length === 0, errors };
  }

  isProcessStage(val: any): ValidationResult {
    const errors: string[] = [];
    if (!val || typeof val !== 'object') {return { valid: false, errors: ['ProcessStage must be an object'] };}
    if (!val.id || typeof val.id !== 'string') {errors.push('Stage must have a string id');}
    if (!['extraction', 'decarboxylation', 'winterization', 'distillation'].includes(val.type)) {
      errors.push(`Invalid stage type: ${val.type}. Must be extraction, decarboxylation, winterization, or distillation`);
    }
    if (val.config && typeof val.config !== 'object') {errors.push('Stage config must be an object');}
    return { valid: errors.length === 0, errors };
  }
}

export const typeGuards = new TypeGuards();
