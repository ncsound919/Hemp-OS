import { ProcessGraph } from './core/types.ts';

export interface MinimalStrainProfile {
  name: string;
  type: string;
  thc: number;
  cbd: number;
  cbg: number;
  cbn: number;
  terpenes: Record<string, number>;
}

export class StrainAwareOptimizer {
  /**
   * Optimize the process graph parameters specifically for the given strain profile.
   * Modifies and returns a cloned copy of the ProcessGraph.
   */
  optimizeGraphForStrain(currentGraph: ProcessGraph, strain: MinimalStrainProfile): ProcessGraph {
    const optimized: ProcessGraph = JSON.parse(JSON.stringify(currentGraph));

    // 1. Process Extraction Stage
    const extractionStage = optimized.stages.find(s => s.type === 'extraction');
    if (extractionStage && extractionStage.config) {
      // High CBD/CBDA strains need more solvent volume for thorough solute mass-transfer
      if (strain.cbd > 10) {
        extractionStage.config.solventRatio = 9.5; // Optimize from standard 8.0
        extractionStage.config.extractionTemp = -45.0; // Sub-ambient cooling to lock lipids
      }
      
      // High Terpene profiles require colder extraction temperatures to protect volatile monoterpenes
      const totalTerps = Object.values(strain.terpenes || {}).reduce((a, b) => a + b, 0);
      if (totalTerps > 1.5 || (strain.terpenes && strain.terpenes.limonene > 0.4)) {
        extractionStage.config.extractionTemp = Math.min(extractionStage.config.extractionTemp || -40.0, -48.0);
      }
    }

    // 2. Process Winterization Stage (cooling and wax precipitation)
    const winterizationStage = optimized.stages.find(s => s.type === 'winterization');
    if (winterizationStage && winterizationStage.config) {
      // Strains rich in lipids/wax (often high CBD landraces or Sativa dominant) require colder temperatures
      if (strain.cbd > 8 || strain.type.toLowerCase().includes('cbd')) {
        winterizationStage.config.coolingTemp = -45.0; // Lower than standard -40
        winterizationStage.config.holdTimeHours = 24.0; // Extended crystallization kinetic window
      } else if (strain.thc > 18) {
        winterizationStage.config.coolingTemp = -42.0;
        winterizationStage.config.holdTimeHours = 18.0;
      }
    }

    // 3. Process Decarboxylation Stage (thermal conversion)
    const decarbStage = optimized.stages.find(s => s.type === 'decarboxylation');
    if (decarbStage && decarbStage.config) {
      if (strain.thc > 15) {
        // High THC (THCA conversion) kinetics are optimal around 124°C
        decarbStage.config.temperature = 124.5;
        decarbStage.config.durationMinutes = 55.0;
      } else if (strain.cbd > 10) {
        // High CBD (CBDA conversion) is slower, requiring slightly higher thermal energy
        decarbStage.config.temperature = 128.0;
        decarbStage.config.durationMinutes = 65.0;
      }

      // If Myrcene or Linalool is high, lower decarb temperature to prevent evaporation of volatiles
      if (strain.terpenes && (strain.terpenes.myrcene > 0.6 || strain.terpenes.linalool > 0.3)) {
        decarbStage.config.temperature = Math.max(115.0, decarbStage.config.temperature - 5.0);
        decarbStage.config.durationMinutes += 10.0; // compenstate lower temp with more duration
      }
    }

    // 4. Process Distillation Stage (molecular fractionation)
    const distillationStage = optimized.stages.find(s => s.type === 'distillation');
    if (distillationStage && distillationStage.config) {
      // High THC molecules distil with greater mass transport efficiency at ultra-high vacuums
      if (strain.thc > 18) {
        distillationStage.config.vacuumPressure = 0.035; // Lower vacuum (mbar) to protect cannabinoids from boiling pyrolysis
        distillationStage.config.evaporatorTemp = 165.0;
      } else if (strain.cbd > 12) {
        distillationStage.config.vacuumPressure = 0.045;
        distillationStage.config.evaporatorTemp = 172.0; // CBD has slightly higher boiling point characteristics at vacuum
      }
    }

    return optimized;
  }
}
