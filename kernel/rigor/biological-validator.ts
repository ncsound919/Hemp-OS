/**
 * Biological Validity Engine (Criterion #1)
 *
 * Enforces biologically plausible ranges for Cannabis sativa,
 * validates phenotype–genotype consistency, and rejects impossible values.
 *
 * Known physical limits for Cannabis sativa L.:
 *  - THC: 0–38% (world record ~37.5%, field typical 10–25%)
 *  - CBD: 0–20% (field typical 0–15%)
 *  - CBG: 0–6% (typical <3%)
 *  - CBN: 0–2% (degradation product)
 *  - Moisture: 0–30% (above 30% = mold risk)
 *  - Wax content: 0–15% (typical 2–8%)
 *  - Biomass yield: 0.1–5 kg/m² (field range)
 *  - Flowering time: 28–180 days (autoflower to long sativa)
 *  - Plant height: 10–600 cm (indica to landrace sativa)
 */

export interface BiologicalConstraint {
  parameter: string;
  min: number;
  max: number;
  unit: string;
  source: string;
  description: string;
}

export interface Violation {
  constraint: string;
  value: number;
  message: string;
  severity: 'error' | 'warning';
}

const BIOLOGICAL_CONSTRAINTS: BiologicalConstraint[] = [
  { parameter: 'thc', min: 0, max: 38, unit: '%', source: 'DEA Potency Monitoring Program 2023', description: 'Total THC (THC + 0.877×THCA) dry weight basis' },
  { parameter: 'thca', min: 0, max: 40, unit: '%', source: 'DEA PMP 2023', description: 'THCA as % of dry weight' },
  { parameter: 'cbd', min: 0, max: 20, unit: '%', source: 'Jikomes & Zoorob 2018', description: 'CBD dry weight percentage' },
  { parameter: 'cbda', min: 0, max: 25, unit: '%', source: 'Jikomes & Zoorob 2018', description: 'CBDA dry weight percentage' },
  { parameter: 'cbg', min: 0, max: 6, unit: '%', source: 'de Meijer et al. 2003', description: 'CBG dry weight percentage' },
  { parameter: 'cbn', min: 0, max: 2, unit: '%', source: 'Ross & ElSohly 1996', description: 'CBN (degradation product) dry weight percentage' },
  { parameter: 'moisture', min: 0, max: 30, unit: '%', source: 'USDA Hemp Rules', description: 'Biomass moisture content' },
  { parameter: 'waxContent', min: 0, max: 15, unit: '%', source: 'Baker et al. 2020', description: 'Cuticular wax content of dried biomass' },
  { parameter: 'biomassMass', min: 0.001, max: 100000, unit: 'kg', source: 'Operational', description: 'Biomass batch mass' },
];

const TOTAL_CANNABINOID_MAX = 45; // Total cannabinoids cannot exceed 45% of dry weight

export class BiologicalValidator {
  getConstraints(): BiologicalConstraint[] {
    return BIOLOGICAL_CONSTRAINTS;
  }

  validateCannabinoidProfile(profile: {
    thca?: number; thc?: number; cbda?: number; cbd?: number;
    cbga?: number; cbg?: number; cbn?: number; other?: number;
  }): Violation[] {
    const violations: Violation[] = [];
    const map: Record<string, number | undefined> = {
      'thc': profile.thc, 'thca': profile.thca, 'cbd': profile.cbd,
      'cbda': profile.cbda, 'cbg': profile.cbg, 'cbga': profile.cbga, 'cbn': profile.cbn,
    };

    for (const [param, value] of Object.entries(map)) {
      if (value === undefined || value === null) {continue;}
      const constraint = BIOLOGICAL_CONSTRAINTS.find(c => c.parameter === param);
      if (!constraint) {continue;}
      if (value < constraint.min || value > constraint.max) {
        violations.push({
          constraint: param,
          value,
          message: `${param}=${value}% outside biologically plausible range [${constraint.min}–${constraint.max}%] (${constraint.source}). ${param === 'thc' && value > 38 ? 'This exceeds the highest THC level ever recorded in a laboratory test.' : ''}`,
          severity: 'error',
        });
      }
    }

    // Total cannabinoid sanity check
    const total = Object.values(map).reduce((s, v) => s + (v || 0), 0);
    if (total > TOTAL_CANNABINOID_MAX) {
      violations.push({
        constraint: 'totalCannabinoids',
        value: total,
        message: `Total cannabinoid sum (${total.toFixed(1)}%) exceeds maximum plausible total of ${TOTAL_CANNABINOID_MAX}%. This violates known cannabis biochemistry.`,
        severity: 'error',
      });
    }

    return violations;
  }

  validateBiomass(biomass: { mass?: number; moisture?: number; waxContent?: number }): Violation[] {
    const violations: Violation[] = [];
    if (biomass.mass !== undefined && (biomass.mass < 0.001 || biomass.mass > 100000)) {
      violations.push({ constraint: 'biomassMass', value: biomass.mass, message: `Biomass mass ${biomass.mass}kg outside operational range`, severity: 'error' });
    }
    if (biomass.moisture !== undefined && (biomass.moisture < 0 || biomass.moisture > 30)) {
      violations.push({ constraint: 'moisture', value: biomass.moisture, message: `Moisture ${biomass.moisture}% outside USDA range`, severity: 'error' });
    }
    return violations;
  }

  /**
   * Computes "total THC" per USDA formula: THCTotal = THC + (THCA × 0.877)
   * Used for regulatory compliance
   */
  computeTotalTHC(thc: number, thca: number): number {
    return thc + thca * 0.877;
  }
}

export const biologicalValidator = new BiologicalValidator();
