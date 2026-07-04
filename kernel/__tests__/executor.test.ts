import { describe, it, expect, beforeAll } from 'vitest';
import { KernelExecutor } from '../workflow/executor.ts';
import type { Biomass, ProcessGraph, ProcessStage } from '../core/types.ts';

const testBiomass: Biomass = {
  id: 'executor_test',
  name: 'Executor Test Flower',
  mass: 10,
  moisture: 10,
  waxContent: 5,
  potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 },
};

const makeStage = (id: string, type: ProcessStage['type'], config: Record<string, any> = {}): ProcessStage => ({
  id,
  name: id,
  type,
  modelId: `${type}.v1`,
  config,
});

describe('KernelExecutor', () => {
  it('produces deterministic output for same graph', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('ext', 'extraction', { solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 })],
      connections: [],
    };
    const a = KernelExecutor.runProcess(graph, testBiomass);
    const b = KernelExecutor.runProcess(graph, testBiomass);
    expect(a.manifest.runId).not.toBe(b.manifest.runId); // different timestamps
    expect(a.massBalanceReport.initialMassKg).toBe(b.massBalanceReport.initialMassKg);
    expect(a.massBalanceReport.finalMassKg).toBe(b.massBalanceReport.finalMassKg);
  });

  it('single extraction stage produces oil', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('ext', 'extraction', { solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 })],
      connections: [],
    };
    const result = KernelExecutor.runProcess(graph, testBiomass);
    expect(result.stagesResults).toHaveProperty('ext');
    expect(result.stagesResults.ext.stageType).toBe('extraction');
    expect(result.massBalanceReport.initialMassKg).toBe(10);
    expect(result.massBalanceReport.finalMassKg).toBeGreaterThan(0);
    expect(result.energyBalanceReport.energyConsumedKWh).toBeGreaterThan(0);
  });

  it('full 4-stage pipeline runs without error', () => {
    const graph: ProcessGraph = {
      stages: [
        makeStage('extraction', 'extraction', { solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 }),
        makeStage('winterization', 'winterization', { solventRatio: 5, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 }),
        makeStage('decarboxylation', 'decarboxylation', { temperature: 120, duration: 60 }),
        makeStage('distillation', 'distillation', { evaporatorTemp: 185, condenserTemp: 70, vacuumPressure: 0.05, feedRate: 1.5 }),
      ],
      connections: [
        { from: 'extraction', to: 'winterization' },
        { from: 'winterization', to: 'decarboxylation' },
        { from: 'decarboxylation', to: 'distillation' },
      ],
    };
    const result = KernelExecutor.runProcess(graph, testBiomass);
    expect(result.stagesResults).toHaveProperty('extraction');
    expect(result.stagesResults).toHaveProperty('winterization');
    expect(result.stagesResults).toHaveProperty('decarboxylation');
    expect(result.stagesResults).toHaveProperty('distillation');
    expect(result.massBalanceReport.finalMassKg).toBeGreaterThan(0);
    expect(result.massBalanceReport.finalMassKg).toBeLessThan(10);
    // All stages should have mass balance data
    for (const [id, s] of Object.entries(result.stagesResults)) {
      expect(s).toHaveProperty('output');
      expect(s).toHaveProperty('massIn');
      expect(s).toHaveProperty('massOut');
    }
    expect(result.manifest.kernelVersion).toContain('LiteratureCalibrated');
    expect(result.sensitivity).toHaveLength(4);
  });

  it('mass decreases through the pipeline', () => {
    const graph: ProcessGraph = {
      stages: [
        makeStage('ext', 'extraction', { solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 }),
        makeStage('win', 'winterization', { solventRatio: 5, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 }),
      ],
      connections: [{ from: 'ext', to: 'win' }],
    };
    const result = KernelExecutor.runProcess(graph, testBiomass);
    const extOut = result.stagesResults.ext.output;
    const winOut = result.stagesResults.win.output;
    // Winterization output mass should be less than extraction output
    expect(winOut.dewaxedCrudeMass).toBeLessThan(extOut.waxExtracted + Object.values(extOut.cannabinoidRecovery).reduce((a: number, b: number) => a + b, 0) / 1000);
  });

  it('throws on empty graph', () => {
    const graph: ProcessGraph = { stages: [], connections: [] };
    expect(() => KernelExecutor.runProcess(graph, testBiomass)).toThrow('at least one stage');
  });

  it('throws on winterization without prior extraction', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('win', 'winterization')],
      connections: [],
    };
    expect(() => KernelExecutor.runProcess(graph, testBiomass)).toThrow();
  });

  it('setConfig changes energy balance', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('ext', 'extraction')],
      connections: [],
    };
    KernelExecutor.setConfig({ energyPerStageKWh: 10 });
    const result = KernelExecutor.runProcess(graph, testBiomass);
    expect(result.energyBalanceReport.energyConsumedKWh).toBeGreaterThan(5);
    KernelExecutor.setConfig({}); // reset
  });

  it('graph with 2 disconnected stages still processes them in order', () => {
    const graph: ProcessGraph = {
      stages: [
        makeStage('ext1', 'extraction', { solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 }),
        makeStage('ext2', 'extraction', { solventRatio: 8, extractionTemp: -40, duration: 30, agitationSpeed: 300 }),
      ],
      connections: [],
    };
    const result = KernelExecutor.runProcess(graph, testBiomass);
    expect(result.stagesResults).toHaveProperty('ext1');
    expect(result.stagesResults).toHaveProperty('ext2');
  });
});
