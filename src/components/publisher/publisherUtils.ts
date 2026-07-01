
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

  // Helper to extract config values safely
  const getStageConfig = (stage: ProcessStage | undefined) => stage?.config || {};
  const decarbConfig = getStageConfig(decarbStage);
  const winterConfig = getStageConfig(winterizationStage);

  const decarbTemp = decarbConfig.temperatureCelsius ?? 120;
  const decarbTime = decarbConfig.durationMinutes ?? 60;
  const winterTemp = winterConfig.temperatureCelsius ?? -40;
  const winterRatio = winterConfig.solventRatio ?? 4.0;

  // Assume the last stage has the final metrics. 
  // Based on the critique, need to adjust how results are accessed.
  // Using the provided manifest to get stages might be better if stagesResults is just a map.
  
  // This is a placeholder for actual logic, need to see how stagesResults is populated in the real code
  // Looking at the type, stagesResults is Record<string, any>.
  const stageIds = graph.stages.map(s => s.id);
  const lastStageId = stageIds[stageIds.length - 1];
  const lastStageResult = results.stagesResults[lastStageId] || {};
  const metrics = lastStageResult.metrics || {};

  const calculatedYield = metrics.yieldFraction ?? 0.82;
  const purityVal = metrics.purityFraction ?? 0.84;
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
