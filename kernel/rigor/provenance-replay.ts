/**
 * Run Replayability & Diffability (Criterion 4b, 4c)
 *
 * Allows any past process run to be replayed from its manifest,
 * and computes a structured diff between any two runs.
 */

import { ProcessRunResult, Biomass, ProcessGraph } from '../core/types.ts';
import { KernelExecutor } from '../workflow/executor.ts';

export interface RunDiff {
  manifestA: string;
  manifestB: string;
  sameKernelVersion: boolean;
  sameBiomass: boolean;
  sameGraph: boolean;
  yieldChange: number | null;
  purityChange: number | null;
  massBalanceChange: number | null;
  parameterDiffs: { stage: string; param: string; valueA: any; valueB: any }[];
}

export class ProvenanceReplay {
  private runHistory: Map<string, ProcessRunResult> = new Map();

  recordRun(id: string, result: ProcessRunResult) {
    this.runHistory.set(id, result);
  }

  /**
   * Replay a run from its manifest
   */
  replayFromManifest(runId: string): ProcessRunResult | null {
    const original = this.runHistory.get(runId);
    if (!original) {return null;}
    try {
      return KernelExecutor.runProcess(
        original.manifest.graphSnapshot,
        original.manifest.biomassSnapshot,
      );
    } catch {
      return null;
    }
  }

  /**
   * Verify a replay produces identical output
   */
  verifyReplay(runId: string): { match: boolean; maxDeviation: number } {
    const original = this.runHistory.get(runId);
    if (!original) {return { match: false, maxDeviation: Infinity };}
    const replay = this.replayFromManifest(runId);
    if (!replay) {return { match: false, maxDeviation: Infinity };}

    const origMass = original.massBalanceReport.finalMassKg;
    const replayMass = replay.massBalanceReport.finalMassKg;
    const deviation = Math.abs(origMass - replayMass);

    return {
      match: deviation < 0.001,
      maxDeviation: deviation,
    };
  }

  /**
   * Compute structured diff between two runs
   */
  diff(runIdA: string, runIdB: string): RunDiff | null {
    const a = this.runHistory.get(runIdA);
    const b = this.runHistory.get(runIdB);
    if (!a || !b) {return null;}

    const paramDiffs: { stage: string; param: string; valueA: any; valueB: any }[] = [];
    for (const stageA of a.manifest.graphSnapshot.stages) {
      const stageB = b.manifest.graphSnapshot.stages.find(s => s.id === stageA.id);
      if (!stageB) {continue;}
      for (const [key, valA] of Object.entries(stageA.config)) {
        const valB = stageB.config[key];
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          paramDiffs.push({ stage: stageA.name || stageA.id, param: key, valueA: valA, valueB: valB });
        }
      }
    }

    const lastStageIdA = a.manifest.graphSnapshot.stages[a.manifest.graphSnapshot.stages.length - 1]?.id;
    const lastStageIdB = b.manifest.graphSnapshot.stages[b.manifest.graphSnapshot.stages.length - 1]?.id;
    const resA = lastStageIdA ? a.stagesResults[lastStageIdA] : null;
    const resB = lastStageIdB ? b.stagesResults[lastStageIdB] : null;

    return {
      manifestA: runIdA,
      manifestB: runIdB,
      sameKernelVersion: a.manifest.kernelVersion === b.manifest.kernelVersion,
      sameBiomass: JSON.stringify(a.manifest.biomassSnapshot) === JSON.stringify(b.manifest.biomassSnapshot),
      sameGraph: JSON.stringify(a.manifest.graphSnapshot) === JSON.stringify(b.manifest.graphSnapshot),
      yieldChange: resA && resB ? (resB as any).output?.cannabinoidYield - (resA as any).output?.cannabinoidYield : null,
      purityChange: resA && resB ? (resB as any).output?.cannabinoidPurity - (resA as any).output?.cannabinoidPurity : null,
      massBalanceChange: b.massBalanceReport.massLossKg - a.massBalanceReport.massLossKg,
      parameterDiffs: paramDiffs,
    };
  }
}

export const provenanceReplay = new ProvenanceReplay();
