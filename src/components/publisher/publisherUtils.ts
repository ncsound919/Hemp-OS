
import { Biomass, ProcessGraph, ProcessRunResult, ProcessStage } from '../../../kernel/core/types.ts';

export interface PublisherMetrics {
  decarbTemp: number;
  decarbTime: number;
  winterTemp: number;
  winterRatio: number;
  calculatedYield: number;
  purityVal: number;
  totalWeightInGrams: number;
  outputProductKg: string;
}

export const buildPublishingMetrics = (
  biomass: Biomass,
  graph: ProcessGraph,
  results: ProcessRunResult
): PublisherMetrics => {
  const decarbStage = graph.stages.find(s => s.type === 'decarboxylation');
  const winterizationStage = graph.stages.find(s => s.type === 'winterization');

  const getStageConfig = (stage: ProcessStage | undefined) => stage?.config || {};
  const decarbConfig = getStageConfig(decarbStage);
  const winterConfig = getStageConfig(winterizationStage);

  const decarbTemp = decarbConfig.temperatureCelsius ?? 120;
  const decarbTime = decarbConfig.durationMinutes ?? 60;
  const winterTemp = winterConfig.temperatureCelsius ?? -40;
  const winterRatio = winterConfig.solventRatio ?? 4.0;

  const stageIds = graph.stages.map(s => s.id);
  const lastStageId = stageIds[stageIds.length - 1];
  const lastStageResult = results.stagesResults[lastStageId] || {};
  const lastOutput = lastStageResult?.output || {};

  // Extract yield/purity from the typed output structure
  const calculatedYield = 'cannabinoidYield' in lastOutput
    ? (lastOutput.cannabinoidYield as number) / 100
    : 'recoveryRate' in lastOutput
      ? (lastOutput.recoveryRate as number) / 100
      : 0.82;

  const purityVal = 'cannabinoidPurity' in lastOutput
    ? (lastOutput.cannabinoidPurity as number) / 100
    : 'finalPurity' in lastOutput
      ? (lastOutput.finalPurity as number) / 100
      : 0.84;
  const totalWeightInGrams = 1000 * biomass.mass;
  const outputProductKg = (biomass.mass * calculatedYield * purityVal).toFixed(3);

  return {
    decarbTemp,
    decarbTime,
    winterTemp,
    winterRatio,
    calculatedYield,
    purityVal,
    totalWeightInGrams,
    outputProductKg
  };
};
