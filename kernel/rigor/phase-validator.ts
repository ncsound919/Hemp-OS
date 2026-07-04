/**
 * Solvent Phase-State Validation (Criterion 2d)
 *
 * Enforces that extraction parameters respect the physical phase diagram
 * of the chosen solvent. For CO₂, this means validating that supercritical
 * conditions (T > 31°C, P > 73.8 bar) are met when supercritical extraction
 * is selected. For ethanol, validates liquid state at operating temperature.
 */

interface PhaseBoundary {
  solvent: string;
  parameter: string;
  condition: string;
  reason: string;
}

const SOLVENT_PHASE_RULES: PhaseBoundary[] = [
  { solvent: 'CO2', parameter: 'temperature', condition: '< 31', reason: 'CO₂ supercritical requires T ≥ 31.1°C (critical temperature). Below this, CO₂ is subcritical liquid or gas.' },
  { solvent: 'CO2', parameter: 'pressure', condition: '< 73.8', reason: 'CO₂ supercritical requires P ≥ 73.8 bar (critical pressure). Below this, CO₂ is gaseous.' },
  { solvent: 'CO2', parameter: 'temperature', condition: '> 100', reason: 'Above 100°C, CO₂ density drops too low for effective solvation of cannabinoids.' },
  { solvent: 'Ethanol', parameter: 'temperature', condition: '> 78', reason: 'Ethanol boils at 78.4°C at atmospheric pressure. Above this, solvent vaporizes.' },
  { solvent: 'Ethanol', parameter: 'temperature', condition: '< -114', reason: 'Ethanol freezes at -114°C. Below this, solvent becomes solid.' },
  { solvent: 'Butane', parameter: 'temperature', condition: '> 0', reason: 'Butane boils at -0.5°C at atmospheric pressure. Above 0°C, pressurized system required.' },
];

export class PhaseValidator {
  getRules(): PhaseBoundary[] { return SOLVENT_PHASE_RULES; }

  /**
   * Validate extraction conditions against solvent phase diagram
   */
  validateExtractionPhase(solventType: string, temperature: number, pressure?: number): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const solvent = solventType.toLowerCase();

    for (const rule of SOLVENT_PHASE_RULES) {
      if (rule.solvent.toLowerCase() !== solvent) {continue;}

      const [op, thresholdStr] = rule.condition.split(' ');
      const threshold = parseFloat(thresholdStr);

      let value: number | undefined;
      if (rule.parameter === 'temperature') {value = temperature;}
      if (rule.parameter === 'pressure') {value = pressure;}

      if (value === undefined) {continue;}

      let violates = false;
      if (op === '>') {violates = value > threshold;}
      if (op === '<') {violates = value < threshold;}

      if (violates) {
        const valStr = rule.parameter === 'temperature' ? `${value}°C` : `${value} bar`;
        warnings.push(`${solventType} ${rule.parameter} = ${valStr} violates phase boundary: ${rule.reason}`);
      }
    }

    // Special check for CO2: if supercritical is intended, both conditions must be met
    if (solvent === 'co2' && temperature > 31 && pressure !== undefined && pressure > 73.8) {
      // Supercritical conditions confirmed
    } else if (solvent === 'co2' && temperature > 20 && temperature < 31) {
      warnings.push('CO₂ at 20-31°C is in liquid phase, not supercritical. Supercritical requires T > 31.1°C and P > 73.8 bar.');
    }

    return { valid: warnings.length === 0, warnings };
  }
}

export const phaseValidator = new PhaseValidator();
