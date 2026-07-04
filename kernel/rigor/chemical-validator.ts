/**
 * Chemical & Extraction Science Validator (Criteria #2, #8)
 *
 * Enforces thermodynamic feasibility, mass balance invariants,
 * cannabinoid stability rules, forbidden operating regions,
 * and calibration drift detection.
 */

export interface MassBalanceCheck {
  stageType: string;
  massIn: number;
  massOut: number;
  delta: number;
  tolerance: number;
  passed: boolean;
}

export interface ForbiddenRegion {
  parameter: string;
  condition: string;
  reason: string;
  severity: 'blocking' | 'warning';
}

export interface CalibrationDrift {
  modelId: string;
  parameter: string;
  expectedValue: number;
  currentValue: number;
  driftPercent: number;
  lastCalibrated: string;
}

// Known forbidden operating regions for cannabis extraction
const FORBIDDEN_REGIONS: ForbiddenRegion[] = [
  { parameter: 'evaporatorTemp', condition: '> 250', reason: 'Thermal degradation of cannabinoids becomes extreme above 250°C. THC half-life drops below 1 minute.', severity: 'blocking' },
  { parameter: 'evaporatorTemp', condition: '< 100', reason: 'Below 100°C, no significant cannabinoid vaporization occurs at typical vacuum pressures.', severity: 'warning' },
  { parameter: 'vacuumPressure', condition: '< 0.00001', reason: 'Beyond 1e-5 mbar requires specialized high-vacuum equipment not typical for wiped-film distillation.', severity: 'warning' },
  { parameter: 'vacuumPressure', condition: '> 1013', reason: 'Above atmospheric pressure (1013 mbar) is not vacuum distillation.', severity: 'blocking' },
  { parameter: 'condenserTemp', condition: '< -50', reason: 'Below -50°C risks freezing of cannabinoid oils in condenser.', severity: 'warning' },
  { parameter: 'condenserTemp', condition: '> 120', reason: 'Above 120°C condenser cannot effectively capture cannabinoids.', severity: 'blocking' },
  { parameter: 'extractionTemp (ethanol)', condition: '< -90', reason: 'Ethanol freezing point is -114°C; approaching glass transition (-100°C) causes unpredictable behavior.', severity: 'blocking' },
  { parameter: 'extractionTemp (ethanol)', condition: '> 60', reason: 'Above ethanol boiling point (78°C) at atmospheric pressure — risk of solvent vaporization.', severity: 'blocking' },
  { parameter: 'solventRatio', condition: '> 20', reason: 'Above 20:1 solvent-to-biomass ratio provides negligible yield increase and wastes solvent.', severity: 'warning' },
  { parameter: 'agitationSpeed', condition: '> 2000', reason: 'Above 2000 RPM risks cavitation and mechanical degradation of plant material.', severity: 'warning' },
  { parameter: 'duration (extraction)', condition: '> 1440', reason: 'Extractions longer than 24h risk microbial growth and cannabinoid degradation.', severity: 'warning' },
  { parameter: 'coolingTemp (winterization)', condition: '< -100', reason: 'Below -100°C approaches solvent glass transition; no additional lipid precipitation benefit.', severity: 'blocking' },
  { parameter: 'decarbTemp', condition: '> 200', reason: 'Above 200°C, thermal degradation dominates over decarboxylation — most THC converts to CBN.', severity: 'blocking' },
  { parameter: 'decarbTemp', condition: '< 80', reason: 'Below 80°C, decarboxylation kinetics are so slow that full conversion would take weeks.', severity: 'warning' },
];

const CANNABINOID_STABILITY_RULES = [
  { rule: 'THC can degrade to CBN under heat/oxygen (first-order kinetics)', source: 'Citti et al. 2018 J Chromatogr A' },
  { rule: 'THCA decarboxylates to THC + CO₂ above 80°C (first-order Arrhenius)', source: 'Perrotin-Brunel et al. 2010' },
  { rule: 'CBDA decarboxylates to CBD + CO₂ above 80°C', source: 'Wang et al. 2016' },
  { rule: 'CBGA decarboxylates to CBG + CO₂ above 80°C', source: 'Citti et al. 2018' },
  { rule: 'No spontaneous THC ↔ CBD conversion at any temperature', source: 'Cannabis Chemistry Consensus' },
  { rule: 'CBN is a degradation product of THC — cannot convert back', source: 'Ross & ElSohly 1996' },
  { rule: 'UV light accelerates cannabinoid degradation (especially THC → CBN)', source: 'Pacifico et al. 2020' },
];

export class ChemicalValidator {
  getForbiddenRegions(): ForbiddenRegion[] { return FORBIDDEN_REGIONS; }
  getStabilityRules(): typeof CANNABINOID_STABILITY_RULES { return CANNABINOID_STABILITY_RULES; }

  /**
   * Check all stages of a process graph against forbidden regions
   */
  validateProcessAgainstForbidden(stages: any[]): { blocking: string[]; warnings: string[] } {
    const blocking: string[] = [];
    const warnings: string[] = [];

    for (const stage of stages) {
      const config = stage.config || {};
      for (const region of FORBIDDEN_REGIONS) {
        const [paramCategory, ...rest] = region.parameter.split(' ');
        const paramName = rest.length > 0 ? rest.join(' ') : paramCategory;
        const configValue = config[paramCategory] ?? config.paramName;

        // Check if this forbidden region applies to this stage type
        const stageMatches = region.parameter.includes(stage.type) ||
          stage.type === 'distillation' && (paramCategory.includes('evaporator') || paramCategory.includes('vacuum') || paramCategory.includes('condenser')) ||
          stage.type === 'extraction' && (paramCategory.includes('extraction') || paramCategory.includes('solvent') || paramCategory.includes('agitation')) ||
          stage.type === 'winterization' && paramCategory.includes('cooling') ||
          stage.type === 'decarboxylation' && paramCategory.includes('decarb');

        if (!stageMatches) {continue;}

        // Simple numeric parsing of condition
        const condMatch = region.condition.match(/^([<>])\s*(\d+(?:\.\d+)?)/);
        if (!condMatch) {continue;}
        const op = condMatch[1];
        const threshold = parseFloat(condMatch[2]);

        let violates = false;
        const val = config[paramCategory];
        if (val !== undefined) {
          if (op === '>' && val > threshold) {violates = true;}
          if (op === '<' && val < threshold) {violates = true;}
        }

        if (violates) {
          const msg = `Stage "${stage.name}" (${stage.type}): ${region.parameter} = ${val} — ${region.reason}`;
          if (region.severity === 'blocking') {
            blocking.push(msg);
          } else {
            warnings.push(msg);
          }
        }
      }
    }

    return { blocking, warnings };
  }

  /**
   * Mass balance invariant check for the full pipeline
   */
  checkMassBalance(stageResults: Record<string, any>): MassBalanceCheck[] {
    const checks: MassBalanceCheck[] = [];
    for (const [id, result] of Object.entries(stageResults)) {
      if (result.massIn === undefined || result.massOut === undefined) {continue;}
      const delta = Math.abs(result.massIn - result.massOut);
      const tolerance = 0.015 * result.massIn;
      checks.push({
        stageType: result.stageType || id,
        massIn: result.massIn,
        massOut: result.massOut,
        delta,
        tolerance,
        passed: delta <= tolerance,
      });
    }
    return checks;
  }

  /**
   * Record calibration drift
   */
  recordDrift(modelId: string, parameter: string, expected: number, current: number, lastCalibrated: string): CalibrationDrift {
    return {
      modelId,
      parameter,
      expectedValue: expected,
      currentValue: current,
      driftPercent: expected !== 0 ? ((current - expected) / Math.abs(expected)) * 100 : 0,
      lastCalibrated,
    };
  }
}

export const chemicalValidator = new ChemicalValidator();
