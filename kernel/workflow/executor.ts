import {
  ProcessGraph, ProcessStage, ProcessRunResult, Biomass, CannabinoidProfile,
  ExtractionRunOutput, DecarboxylationRunOutput, WinterizationRunOutput, DistillationRunOutput,
} from '../core/types.ts';
import { EXTRACTION, WINTERIZATION, DECARB, DISTILLATION, KERNEL } from '../core/constants.ts';
import { ExtractionModel } from '../models/extractionModel.ts';
import { DecarboxylationModel } from '../models/decarboxylationModel.ts';
import { WinterizationModel } from '../models/winterizationModel.ts';
import { DistillationModel } from '../models/distillationModel.ts';
import { topologicalSort } from './processGraph.ts';
import {
  validateExtractionInput,
  validateDecarboxylationInput,
  validateWinterizationInput,
  validateDistillationInput,
  assertValid,
} from '../core/validation.ts';

export type StageResult =
  | { stageType: 'extraction'; config: Record<string, unknown>; output: ExtractionRunOutput; massIn: number; massOut: number }
  | { stageType: 'decarboxylation'; config: Record<string, unknown>; output: DecarboxylationRunOutput; massIn: number; massOut: number }
  | { stageType: 'winterization'; config: Record<string, unknown>; output: WinterizationRunOutput; massIn: number; massOut: number }
  | { stageType: 'distillation'; config: Record<string, unknown>; output: DistillationRunOutput; massIn: number; massOut: number };

interface KernelConfig {
  terpeneFractionOfOther: number;
  energyPerStageKWh: number;
  thermalFraction: number;
}

const DEFAULT_CONFIG: KernelConfig = {
  terpeneFractionOfOther: KERNEL.TERPENE_FRACTION_OF_OTHER,
  energyPerStageKWh: KERNEL.ENERGY_PER_STAGE_KWH,
  thermalFraction: KERNEL.THERMAL_FRACTION,
};

interface ProcessState {
  oilMass: number;
  profile: CannabinoidProfile;
  waxContent: number;
  otherContent: number;
}

const PHYSICAL_PROCESS_ORDER = ['extraction', 'winterization', 'decarboxylation', 'distillation'];

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

    let state: ProcessState = {
      oilMass: 0,
      profile: { thca: 0, thc: 0, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
      waxContent: initialBiomass.waxContent ?? 0,
      otherContent: 0,
    };

    const stagesResults: Record<string, StageResult> = {};
    const initialMassKg = initialBiomass.mass;

    console.debug(`[KernelExecutor] Starting deterministic simulation on ${initialMassKg.toFixed(3)} kg ${initialBiomass.name}`);

    for (const stage of sortedStages) {
      try {
        const config = stage.config;
        let output: ExtractionRunOutput | DecarboxylationRunOutput | WinterizationRunOutput | DistillationRunOutput;
        let massIn: number;
        let massOut: number;

        if (stage.type === 'extraction') {
          const extractionInput = {
            biomass: initialBiomass,
            solvent: {
              type: config.solventType || EXTRACTION.DEFAULT_SOLVENT_TYPE,
              purity: config.solventPurity ?? EXTRACTION.DEFAULT_SOLVENT_PURITY,
              temperature: config.solventTemp ?? EXTRACTION.DEFAULT_SOLVENT_TEMP,
            },
            solventRatio: config.solventRatio ?? EXTRACTION.DEFAULT_SOLVENT_RATIO,
            temperature: config.extractionTemp ?? EXTRACTION.DEFAULT_TEMPERATURE,
            duration: config.duration ?? EXTRACTION.DEFAULT_DURATION,
            agitationSpeed: config.agitationSpeed ?? EXTRACTION.DEFAULT_AGITATION_SPEED,
          };

          assertValid(validateExtractionInput(extractionInput), 'extraction');

          const extOutput = ExtractionModel.run(extractionInput);
          output = extOutput;

          const totalCannGrams = Object.values(extOutput.cannabinoidRecovery).reduce((a, b) => a + b, 0);
          const dryExtractSolidsMassKg = (totalCannGrams / 1000) + extOutput.waxExtracted;
          state.oilMass = dryExtractSolidsMassKg;

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

          // Mass balance: input = biomass mass, output = miscella + spent biomass
          // Note: solvent mass enters but is not tracked in massIn/massOut for this stage.
          // Full solvent tracking requires a dedicated mass balance framework.
          massIn = initialBiomass.mass;
          massOut = extOutput.miscellaMass + extOutput.spentBiomassMass;

        } else if (stage.type === 'winterization') {
          if (state.oilMass <= 0) {
            throw new Error('Winterization requires crude oil from prior extraction.');
          }

          const winterizationInput = {
            crudeOilMass: state.oilMass,
            cannabinoidPurity: Object.values(state.profile).reduce((a, b) => a + b, 0),
            waxContent: state.waxContent,
            solventRatio: config.solventRatio ?? WINTERIZATION.DEFAULT_SOLVENT_RATIO,
            coolingTemp: config.coolingTemp ?? WINTERIZATION.DEFAULT_COOLING_TEMP,
            coolingTime: config.coolingTime ?? WINTERIZATION.DEFAULT_COOLING_TIME,
            filtrationPasses: config.filtrationPasses ?? WINTERIZATION.DEFAULT_FILTRATION_PASSES,
          };

          assertValid(validateWinterizationInput(winterizationInput), 'winterization');

          const winOutput = WinterizationModel.run(winterizationInput);
          output = winOutput;
          massIn = state.oilMass;
          massOut = winOutput.dewaxedCrudeMass + winOutput.precipitatedWaxMass;
          state.oilMass = winOutput.dewaxedCrudeMass;
          state.waxContent = winOutput.finalWaxContent;

        } else if (stage.type === 'decarboxylation') {
          if (state.oilMass <= 0) {
            throw new Error('Decarboxylation requires oil from prior stage.');
          }

          const decarbInput = {
            initialCannabinoidProfile: state.profile,
            totalMass: state.oilMass,
            temperature: config.temperature ?? 120,
            duration: config.duration ?? 60,
          };

          assertValid(validateDecarboxylationInput(decarbInput), 'decarboxylation');

          const decarbOutput = DecarboxylationModel.run(decarbInput);
          output = decarbOutput;
          massIn = state.oilMass;
          massOut = decarbOutput.finalMass + (decarbOutput.co2Evolved ?? 0);
          state.oilMass = decarbOutput.finalMass;
          state.profile = decarbOutput.finalCannabinoidProfile;

        } else if (stage.type === 'distillation') {
          if (state.oilMass <= 0) {
            throw new Error('Distillation requires oil from prior stage.');
          }

          const totalCann = Object.values(state.profile).reduce((a, b) => a + b, 0);
          const terpenes = state.otherContent * this.config.terpeneFractionOfOther;

          let feedCannabinoidPurity = totalCann;
          let feedTerpeneContent = terpenes;
          let feedHeavyResidue = 100 - totalCann - terpenes;

          if (feedHeavyResidue < 0) {
            const overshoot = totalCann + terpenes;
            const scale = 100 / overshoot;
            feedCannabinoidPurity = totalCann * scale;
            feedTerpeneContent = terpenes * scale;
            feedHeavyResidue = 0;
            console.warn(
              `[KernelExecutor] Distillation feed composition exceeded 100% (cann=${totalCann.toFixed(2)}%, terp=${terpenes.toFixed(2)}%). Rescaled proportionally to fit.`,
            );
          }

          const distillationInput = {
            feedMass: state.oilMass,
            feedCannabinoidPurity,
            feedTerpeneContent,
            feedHeavyResidue,
            feedCannabinoidProfile: state.profile,
            evaporatorTemp: config.evaporatorTemp ?? 185,
            condenserTemp: config.condenserTemp ?? 70,
            vacuumPressure: config.vacuumPressure ?? 0.05,
            feedRate: config.feedRate ?? 1.5,
          };

          assertValid(validateDistillationInput(distillationInput), 'distillation');

          const distOutput = DistillationModel.run(distillationInput);
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
        } else {
          throw new Error(`Unknown stage type: ${(stage as any).type}`);
        }

        state = this.normalizeState(state);

        stagesResults[stage.id] = {
          stageType: stage.type,
          config: { ...config },
          output,
          massIn,
          massOut,
        } as StageResult;

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[KernelExecutor] Failed at stage ${stage.type}:`, msg);
        const error = new Error(`Stage ${stage.type} failed: ${msg}`);
        if (err instanceof Error) {error.cause = err;}
        throw error;
      }
    }

    const finalMassKg = state.oilMass;
    const massLossKg = Math.max(0, initialMassKg - finalMassKg);

    return {
      manifest: {
        runId: `run-${Date.now()}`,
        timestamp: new Date().toISOString(),
        graphSnapshot: graph,
        biomassSnapshot: initialBiomass,
        kernelVersion: 'v2.0.0-LiteratureCalibrated',
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

  private static normalizeState(state: ProcessState): ProcessState {
    const totalCann = Object.values(state.profile).reduce((a, b) => a + b, 0);
    const total = totalCann + state.waxContent;

    if (total > 100) {
      const scale = 100 / total;
      for (const key of Object.keys(state.profile) as Array<keyof CannabinoidProfile>) {
        state.profile[key]! *= scale;
      }
      state.waxContent *= scale;
      const newTotalCann = Object.values(state.profile).reduce((a, b) => a + b, 0);
      state.otherContent = Math.max(0, 100 - newTotalCann - state.waxContent);
    } else {
      state.otherContent = Math.max(0, 100 - totalCann - state.waxContent);
    }

    return state;
  }

  /**
   * Validates stage order. Throws if a stage appears out of logical sequence.
   * Required order: extraction → winterization → decarboxylation → distillation.
   */
  private static validateStageSequence(stages: ProcessStage[]) {
    let lastIndex = -1;
    for (const stage of stages) {
      const idx = PHYSICAL_PROCESS_ORDER.indexOf(stage.type);
      if (idx !== -1 && idx < lastIndex) {
        throw new Error(
          `Stage order violation: "${stage.type}" (${stage.name || stage.id}) appears before expected predecessor. ` +
          `Valid process order is: ${PHYSICAL_PROCESS_ORDER.join(' → ')}`,
        );
      }
      if (idx !== -1) {lastIndex = idx;}
    }
  }

  private static validateMassBalance(stagesResults: Record<string, StageResult>): boolean {
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
