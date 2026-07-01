import { ProcessGraph, ProcessStage, ProcessRunResult, Biomass, CannabinoidProfile, ExtractionRunOutput, DecarboxylationRunOutput, WinterizationRunOutput, DistillationRunOutput } from '../core/types.ts';
import { ExtractionModel } from '../models/extractionModel.ts';
import { DecarboxylationModel } from '../models/decarboxylationModel.ts';
import { WinterizationModel } from '../models/winterizationModel.ts';
import { DistillationModel } from '../models/distillationModel.ts';
import { topologicalSort } from './processGraph.ts';

// ---- Configuration ----
interface KernelConfig {
  terpeneFractionOfOther: number;
  energyPerStageKWh: number;
  thermalFraction: number;
}

const DEFAULT_CONFIG: KernelConfig = {
  terpeneFractionOfOther: 0.25,
  energyPerStageKWh: 3.8,
  thermalFraction: 0.71,
};

// ---- State ----
interface ProcessState {
  oilMass: number;          // kg
  profile: CannabinoidProfile;   // cannabinoids only (wt%)
  waxContent: number;       // wt%
  otherContent: number;     // wt% (terpenes, lipids, etc.)
}

// ---- Main Executor ----
export class KernelExecutor {
  private static config: KernelConfig = DEFAULT_CONFIG;

  static setConfig(cfg: Partial<KernelConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...cfg };
  }

  static runProcess(graph: ProcessGraph, initialBiomass: Biomass): ProcessRunResult {
    const sortedStages = topologicalSort(graph);
    if (sortedStages.length === 0) {
      throw new Error('Process graph must contain at least one stage.');
    }

    this.validateStageSequence(sortedStages);

    // Initial state: no oil yet, profile from biomass (but only cannabinoids)
    let state: ProcessState = {
      oilMass: 0,
      profile: { thca: 0, thc: 0, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
      waxContent: initialBiomass.waxContent ?? 0,
      otherContent: 0,
    };

    const stagesResults: Record<string, any> = {};
    const initialMassKg = initialBiomass.mass;

    console.debug(`[KernelExecutor v2.6.1] Starting deterministic simulation on ${initialMassKg.toFixed(3)} kg ${initialBiomass.name}`);

    for (const stage of sortedStages) {
      try {
        const config = stage.config;
        let output: ExtractionRunOutput | DecarboxylationRunOutput | WinterizationRunOutput | DistillationRunOutput | undefined = undefined;
        let massIn = state.oilMass; // for mass balance tracking
        let massOut: number;

        // ---- Dispatch to models ----
        if (stage.type === 'extraction') {
          const extOutput = ExtractionModel.run({
            biomass: initialBiomass,
            solvent: {
              type: config.solventType || 'Ethanol',
              purity: config.solventPurity ?? 99.5,
              temperature: config.solventTemp ?? -40,
            },
            solventRatio: config.solventRatio ?? 8.0,
            temperature: config.extractionTemp ?? -40,
            duration: config.duration ?? 30,
            agitationSpeed: config.agitationSpeed ?? 300,
          });
          output = extOutput;
          
          const dryExtractSolidsMassKg = (Object.values(extOutput.cannabinoidRecovery).reduce((a, b) => a + b, 0) / 1000) + extOutput.waxExtracted;
          state.oilMass = dryExtractSolidsMassKg;
          
          const totalCannGrams = Object.values(extOutput.cannabinoidRecovery).reduce((a, b) => a + b, 0);
          state.profile = {
            thca: totalCannGrams > 0 ? (extOutput.cannabinoidRecovery.thca || 0) / totalCannGrams * 100 : 0,
            thc: totalCannGrams > 0 ? (extOutput.cannabinoidRecovery.thc || 0) / totalCannGrams * 100 : 0,
            cbda: totalCannGrams > 0 ? (extOutput.cannabinoidRecovery.cbda || 0) / totalCannGrams * 100 : 0,
            cbd: totalCannGrams > 0 ? (extOutput.cannabinoidRecovery.cbd || 0) / totalCannGrams * 100 : 0,
            cbga: totalCannGrams > 0 ? (extOutput.cannabinoidRecovery.cbga || 0) / totalCannGrams * 100 : 0,
            cbg: totalCannGrams > 0 ? (extOutput.cannabinoidRecovery.cbg || 0) / totalCannGrams * 100 : 0,
            other: 0,
          };
          
          state.waxContent = dryExtractSolidsMassKg > 0 ? (extOutput.waxExtracted / dryExtractSolidsMassKg) * 100 : 0;
          massIn = initialBiomass.mass; // input is biomass mass, not oil
          massOut = extOutput.miscellaMass + extOutput.spentBiomassMass;

        } else if (stage.type === 'winterization') {
          if (state.oilMass <= 0) {
            throw new Error('Winterization requires crude oil from prior extraction.');
          }
          const winOutput = WinterizationModel.run({
            crudeOilMass: state.oilMass,
            cannabinoidPurity: Object.values(state.profile).reduce((a, b) => a + b, 0),
            waxContent: state.waxContent,
            solventRatio: config.solventRatio ?? 5.0,
            coolingTemp: config.coolingTemp ?? -40,
            coolingTime: config.coolingTime ?? 24,
            filtrationPasses: config.filtrationPasses ?? 1,
          });
          output = winOutput;
          massIn = state.oilMass;
          massOut = winOutput.dewaxedCrudeMass + winOutput.precipitatedWaxMass;
          state.oilMass = winOutput.dewaxedCrudeMass;
          // Winterization doesn't change relative ratios of cannabinoids, just removes wax
          state.waxContent = winOutput.finalWaxContent;

        } else if (stage.type === 'decarboxylation') {
          if (state.oilMass <= 0) {
            throw new Error('Decarboxylation requires oil from prior stage.');
          }
          output = DecarboxylationModel.run({
            initialCannabinoidProfile: state.profile,
            totalMass: state.oilMass,
            temperature: config.temperature ?? 120,
            duration: config.duration ?? 60,
          });
          massIn = state.oilMass;
          massOut = output.finalMass + (output.co2Evolved ?? 0);
          state.oilMass = output.finalMass;
          state.profile = output.finalCannabinoidProfile;

        } else if (stage.type === 'distillation') {
          if (state.oilMass <= 0) {
            throw new Error('Distillation requires oil from prior stage.');
          }

          const totalCann = Object.values(state.profile).reduce((a, b) => a + b, 0);
          const terpenes = state.otherContent * this.config.terpeneFractionOfOther;
          const heavyResidue = 100 - totalCann - terpenes;

          const distOutput = DistillationModel.run({
            feedMass: state.oilMass,
            feedCannabinoidPurity: totalCann,
            feedTerpeneContent: terpenes,
            feedHeavyResidue: heavyResidue,
            feedCannabinoidProfile: state.profile,
            evaporatorTemp: config.evaporatorTemp ?? 185,
            condenserTemp: config.condenserTemp ?? 70,
            vacuumPressure: config.vacuumPressure ?? 0.05,
            feedRate: config.feedRate ?? 1.5,
          });
          output = distOutput;

          massIn = state.oilMass;
          massOut = distOutput.distillateMass + distOutput.tailsMass + distOutput.headsMass;
          state.oilMass = distOutput.distillateMass;
          
          if (distOutput.finalCannabinoidProfile) {
            state.profile = {
              ...distOutput.finalCannabinoidProfile,
              other: 0,
            };
          }
          
          state.waxContent = distOutput.waxCarryover ?? 0.4;
        }

        // ---- Normalise state (ensure composition sums to 100%) ----
        state = this.normalizeState(state);

        // ---- Store results with mass balance data ----
        stagesResults[stage.id] = {
          stageType: stage.type,
          config,
          output,
          massIn,
          massOut,
        };

      } catch (err: any) {
        console.error(`[KernelExecutor] Failed at stage ${stage.type}:`, err.message);
        throw new Error(`Stage ${stage.type} failed: ${err.message}`);
      }
    }

    // ---- Final mass balance ----
    const finalMassKg = state.oilMass;
    const massLossKg = Math.max(0, initialMassKg - finalMassKg);

    return {
      manifest: {
        runId: `run-${Date.now()}`,
        timestamp: new Date().toISOString(),
        graphSnapshot: graph,
        biomassSnapshot: initialBiomass,
        kernelVersion: 'v2.6.1-FullProfile',
        environment: 'local',
      },
      stagesResults,
      massBalanceReport: {
        initialMassKg,
        finalMassKg,
        massLossKg,
        massBalanceCheckPass: this.validateMassBalance(stagesResults),
        uncertainty: Math.sqrt(2.25 + sortedStages.length * 0.36),
      },
      energyBalanceReport: this.computeEnergyBalance(sortedStages, initialMassKg),
      sensitivity: sortedStages.map((s) => ({
        param: s.type,
        impactMagnitude: this.getStageImpact(s.type),
      })),
    };
  }

  // ---- Helpers ----

  /**
   * Normalises the state so that cannabinoids + wax ≤ 100%.
   * If they exceed 100%, both are scaled down proportionally,
   * and `otherContent` is recalculated as the remainder.
   */
  private static normalizeState(state: ProcessState): ProcessState {
    const totalCann = Object.values(state.profile).reduce((a, b) => a + b, 0);
    let total = totalCann + state.waxContent;

    if (total > 100) {
      const scale = 100 / total;
      for (const key of Object.keys(state.profile) as Array<keyof CannabinoidProfile>) {
        state.profile[key]! *= scale;
      }
      state.waxContent *= scale;
      // Recompute total after scaling
      const newTotalCann = Object.values(state.profile).reduce((a, b) => a + b, 0);
      state.otherContent = Math.max(0, 100 - newTotalCann - state.waxContent);
    } else {
      state.otherContent = Math.max(0, 100 - totalCann - state.waxContent);
    }

    return state;
  }

  /**
   * Validates stage order: warns if a stage appears out of logical sequence.
   * Does not throw to allow flexibility, but logs a warning.
   */
  private static validateStageSequence(stages: ProcessStage[]) {
    const order = ['extraction', 'winterization', 'decarboxylation', 'distillation'];
    let lastIndex = -1;
    for (const stage of stages) {
      const idx = order.indexOf(stage.type);
      if (idx !== -1 && idx < lastIndex) {
        console.warn(`[Kernel] Stage order violation: ${stage.type} appears before expected predecessor.`);
      }
      if (idx !== -1) lastIndex = idx;
    }
  }

  /**
   * Checks mass balance for each stored stage result.
   * Returns true only if all stages are within 1.5% tolerance.
   */
  private static validateMassBalance(stagesResults: Record<string, any>): boolean {
    for (const result of Object.values(stagesResults)) {
      if (result.massIn !== undefined && result.massOut !== undefined) {
        const delta = Math.abs(result.massIn - result.massOut);
        const tolerance = 0.015 * result.massIn;
        if (delta > tolerance) {
          console.warn(`[Kernel] Mass imbalance in ${result.stageType}: in=${result.massIn.toFixed(4)} kg, out=${result.massOut.toFixed(4)} kg, delta=${delta.toFixed(4)} kg`);
          return false;
        }
      }
    }
    return true;
  }

  private static getStageImpact(type: string): number {
    const map: Record<string, number> = {
      extraction: 9.8,
      winterization: 7.2,
      decarboxylation: 13.2,
      distillation: 11.5,
    };
    return map[type] ?? 6.0;
  }

  private static computeEnergyBalance(stages: ProcessStage[], massKg: number) {
    const { energyPerStageKWh, thermalFraction } = this.config;
    return {
      energyConsumedKWh: stages.length * energyPerStageKWh + massKg * 0.65,
      thermalEnergyKWh: stages.length * energyPerStageKWh * thermalFraction,
      mechanicalEnergyKWh: stages.length * 1.1,
    };
  }
}