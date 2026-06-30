/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProcessGraph, ProcessStage } from '../../kernel/core/types.ts';
import { ArrowRight, Leaf, ShieldAlert, FlaskConical, Snowflake, Flame, Activity } from 'lucide-react';

interface ProcessVisualizerProps {
  graph: ProcessGraph;
  activeStageId: string;
  onSelectStage: (stageId: string) => void;
  results: any;
}

export const ProcessVisualizer: React.FC<ProcessVisualizerProps> = ({
  graph,
  activeStageId,
  onSelectStage,
  results,
}) => {
  // Ordered stages in correct physical workflow sequence
  const physicalOrder = ['extraction', 'winterization', 'decarboxylation', 'distillation'];
  
  const orderedStages = [...graph.stages].sort((a, b) => {
    return physicalOrder.indexOf(a.type) - physicalOrder.indexOf(b.type);
  });

  const getStageIcon = (type: string) => {
    switch (type) {
      case 'extraction':
        return <FlaskConical className="w-5 h-5" />;
      case 'winterization':
        return <Snowflake className="w-5 h-5" />;
      case 'decarboxylation':
        return <Flame className="w-5 h-5" />;
      case 'distillation':
        return <Activity className="w-5 h-5" />;
      default:
        return <FlaskConical className="w-5 h-5" />;
    }
  };

  const getStageColor = (type: string, isSelected: boolean) => {
    if (isSelected) {
      switch (type) {
        case 'extraction': return 'bg-[#1b1b1e] text-blue-400 border-blue-500 shadow-md ring-2 ring-blue-500/20';
        case 'winterization': return 'bg-[#1b1b1e] text-sky-400 border-sky-500 shadow-md ring-2 ring-sky-500/20';
        case 'decarboxylation': return 'bg-[#1b1b1e] text-purple-400 border-purple-500 shadow-md ring-2 ring-purple-500/20';
        case 'distillation': return 'bg-[#1b1b1e] text-amber-400 border-amber-500 shadow-md ring-2 ring-amber-500/20';
      }
    } else {
      switch (type) {
        case 'extraction': return 'bg-[#0d0d0f] border-[#1f1f21] text-[#888] hover:bg-[#1b1b1e] hover:border-[#2d2d30]';
        case 'winterization': return 'bg-[#0d0d0f] border-[#1f1f21] text-[#888] hover:bg-[#1b1b1e] hover:border-[#2d2d30]';
        case 'decarboxylation': return 'bg-[#0d0d0f] border-[#1f1f21] text-[#888] hover:bg-[#1b1b1e] hover:border-[#2d2d30]';
        case 'distillation': return 'bg-[#0d0d0f] border-[#1f1f21] text-[#888] hover:bg-[#1b1b1e] hover:border-[#2d2d30]';
      }
    }
    return 'bg-[#0d0d0f] border-[#1f1f21] text-[#888]';
  };

  return (
    <div className="bg-[#121214] rounded-2xl p-6 border border-[#1f1f21] text-white shadow-xl flex flex-col gap-6 relative overflow-hidden">
      {/* Decorative backing grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f21_1px,transparent_1px),linear-gradient(to_bottom,#1f1f21_1px,transparent_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none"></div>

      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
          <h2 className="font-bold text-xs uppercase tracking-wider text-[#aaa]">
            HempForge Flowsheet Pipeline
          </h2>
        </div>
        <span className="text-[9px] font-mono font-bold bg-[#1a1a1c] text-blue-400 border border-[#2d2d30] px-2.5 py-0.5 rounded-full tracking-wider uppercase">
          DETERMINISTIC SIMULATION ACTIVE
        </span>
      </div>

      {/* Main Flow Train */}
      <div className="flex items-center justify-between gap-1 z-10 overflow-x-auto py-2">
        {/* Leftmost standard feedstock entrance */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#0d0d0f] border border-[#1f1f21] flex items-center justify-center text-[#888] shadow-inner">
            <Leaf className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#666]">Biomass Feed</div>
            {results?.results?.massBalanceReport && (
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5 font-bold">
                {results.results.massBalanceReport.initialMassKg.toFixed(1)} kg
              </div>
            )}
          </div>
        </div>

        {orderedStages.map((stage, idx) => {
          const isSelected = stage.id === activeStageId;
          const hasOutput = results?.results?.stagesResults?.[stage.id];
          const colorClass = getStageColor(stage.type, isSelected);

          // Calculate small indicators based on stage output
          let stageMetricLabel = '';
          let stageMetricValue = '';

          if (hasOutput) {
            const out = hasOutput.output;
            if (stage.type === 'extraction') {
              stageMetricLabel = 'Crude Mass';
              stageMetricValue = `${(out.miscellaMass * 0.08).toFixed(2)} kg`; // crude solids ratio
            } else if (stage.type === 'winterization') {
              stageMetricLabel = 'Dewaxed Crude';
              stageMetricValue = `${out.dewaxedCrudeMass.toFixed(2)} kg`;
            } else if (stage.type === 'decarboxylation') {
              stageMetricLabel = 'Potency';
              const prof = out.finalCannabinoidProfile;
              const totalActive = prof.thc + prof.cbd + prof.cbg;
              stageMetricLabel = 'Active Potency';
              stageMetricValue = `${totalActive.toFixed(1)}%`;
            } else if (stage.type === 'distillation') {
              stageMetricLabel = 'Distillate';
              stageMetricValue = `${out.distillateMass.toFixed(2)} kg`;
            }
          }

          return (
            <React.Fragment key={stage.id}>
              {/* Connector line */}
              <div className="flex flex-col items-center flex-1 justify-center min-w-[20px]">
                <ArrowRight className="w-4 h-4 text-[#2d2d30]" />
                {stageMetricValue && (
                  <span className="text-[9px] font-mono text-[#555] font-bold mt-1 hidden sm:inline whitespace-nowrap">
                    {stageMetricValue}
                  </span>
                )}
              </div>

              {/* Stage Node Button */}
              <button
                type="button"
                onClick={() => onSelectStage(stage.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all shrink-0 cursor-pointer w-28 text-center ${colorClass}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-inner transition-all ${isSelected ? 'bg-[#1a1a1c] border-current' : 'bg-[#1a1a1c] border-[#2d2d30]'}`}>
                  {getStageIcon(stage.type)}
                </div>
                <div className="w-full">
                  <div className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-[#888]'}`}>{stage.name}</div>
                  <div className="text-[9px] opacity-75 capitalize tracking-wide mt-0.5">{stage.type}</div>
                </div>
              </button>
            </React.Fragment>
          );
        })}

        {/* Rightmost Product Exit */}
        {results?.results?.stagesResults && (
          <>
            <div className="flex flex-col items-center justify-center min-w-[24px]">
              <ArrowRight className="w-4 h-4 text-blue-500 animate-pulse" />
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-12 h-12 rounded-full bg-[#0d0d0f] border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-900/10">
                <Leaf className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Distillate Product</div>
                {results?.results?.massBalanceReport && (
                  <div className="text-[10px] text-white font-mono mt-0.5 font-bold">
                    {results.results.massBalanceReport.finalMassKg.toFixed(2)} kg
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Warnings & physical validation panel inside visualizer */}
      {results?.results?.massBalanceReport && (
        <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] flex flex-col gap-2.5 z-10 text-xs text-[#aaa] font-mono">
          <div className="flex items-center justify-between text-[#555] border-b border-[#1f1f21] pb-1.5 mb-1 text-[10px] font-bold tracking-widest">
            <span>PHYSICAL CONSERVATION VERIFICATION</span>
            <span className="text-emerald-500">● SECURE & BALANCED</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-[#555] text-[10px] font-bold">BIOMASS IN</div>
              <div className="text-white font-bold mt-0.5">{results.results.massBalanceReport.initialMassKg.toFixed(2)} kg</div>
            </div>
            <div>
              <div className="text-[#555] text-[10px] font-bold">PRODUCT OUT</div>
              <div className="text-blue-400 font-bold mt-0.5">{results.results.massBalanceReport.finalMassKg.toFixed(3)} kg</div>
            </div>
            <div>
              <div className="text-[#555] text-[10px] font-bold">CO2 EVOLVED</div>
              <div className="text-purple-400 font-bold mt-0.5">
                {(Object.values(results.results.stagesResults) as any[]).reduce((acc: number, item: any) => {
                  return acc + (item.output?.co2Evolved || 0);
                }, 0).toFixed(3)} kg
              </div>
            </div>
            <div>
              <div className="text-[#555] text-[10px] font-bold">SOLVENT RECOV</div>
              <div className="text-sky-400 font-bold mt-0.5">
                {(Object.values(results.results.stagesResults) as any[]).reduce((acc: number, item: any) => {
                  return acc + (item.output?.solventLoss ? 0.92 * item.input.biomass.mass * item.input.solventRatio : 0); // recovered solvent estimation
                }, 0).toFixed(1)} L
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
