import React, { useState } from 'react';
import { Biomass, ProcessGraph } from '../../kernel/core/types.ts';
import { KernelExecutor } from '../../kernel/workflow/executor.ts';
import { 
  ShieldAlert, Target, Award, RefreshCw, Play, CheckCircle2, AlertOctagon, TrendingUp, Cpu, ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { ScientificAuditFramework } from './ScientificAuditFramework.tsx';

interface PolicyAutonomyProps {
  graph: ProcessGraph;
  biomass: Biomass;
  onApplyConfig: (updatedGraph: ProcessGraph) => void;
  onRecordProvenance: (runName: string, inputs: any, outputs: any) => void;
}

export function PolicyAutonomy({ 
  graph, 
  biomass, 
  onApplyConfig,
  onRecordProvenance 
}: PolicyAutonomyProps) {
  const [subTab, setSubTab] = useState<'rules' | 'audit'>('audit');
  // 1. Policy Settings (Constraints)
  const [minSolventRatio, setMinSolventRatio] = useState<number>(5.0);
  const [maxDecarbTemp, setMaxDecarbTemp] = useState<number>(150.0);
  const [maxTHCPct, setMaxTHCPct] = useState<number>(0.30); // 0.30% farm bill compliance limit
  const [enableRegulatoryBlock, setEnableRegulatoryBlock] = useState<boolean>(true);

  // 2. Optimization Agent Settings
  const [objective, setObjective] = useState<'yield' | 'purity'>('yield');
  const [searchParam, setSearchParam] = useState<'extractionTemp' | 'evaporatorTemp'>('extractionTemp');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchSteps, setSearchSteps] = useState<any[]>([]);
  const [optimalConfig, setOptimalConfig] = useState<ProcessGraph | null>(null);
  const [optimalMetrics, setOptimalMetrics] = useState<any>(null);

  // Runs a single deterministic optimization step inside the client-side kernel
  const evaluateConfig = (paramVal: number): { results: any; compliant: boolean; violations: string[] } => {
    // Clone and edit
    const candidateGraph: ProcessGraph = {
      stages: graph.stages.map(s => {
        if (searchParam === 'extractionTemp' && s.type === 'extraction') {
          return { ...s, config: { ...s.config, extractionTemp: paramVal } };
        }
        if (searchParam === 'evaporatorTemp' && s.type === 'distillation') {
          return { ...s, config: { ...s.config, evaporatorTemp: paramVal } };
        }
        return s;
      }),
      connections: [...graph.connections]
    };

    const runOut = KernelExecutor.runProcess(candidateGraph, biomass);
    const violations: string[] = [];

    // Check policies
    // Policy A: Solvent ratio dryout limit
    const extractionStage = candidateGraph.stages.find(s => s.type === 'extraction');
    if (extractionStage && extractionStage.config.solventRatio < minSolventRatio) {
      violations.push(`Solvent ratio ${extractionStage.config.solventRatio} L/kg violates dryout policy (min ${minSolventRatio} L/kg)`);
    }

    // Policy B: Thermal Decarb crystallization limit
    const decarbStage = candidateGraph.stages.find(s => s.type === 'decarboxylation');
    if (decarbStage && decarbStage.config.temperature > maxDecarbTemp) {
      violations.push(`Decarb temperature ${decarbStage.config.temperature}°C violates thermal runaway policy (max ${maxDecarbTemp}°C)`);
    }

    // Policy C: Farm Bill THC regulatory compliance limit in final distillate
    const distStage = candidateGraph.stages.find(s => s.type === 'distillation');
    if (distStage && runOut.stagesResults[distStage.id] && enableRegulatoryBlock) {
      const distillateOut = runOut.stagesResults[distStage.id].output;
      // Estimate THC concentration in distillate
      const thcMassGrams = runOut.stagesResults[distStage.id].input.feedMass * 1000 * (runOut.stagesResults[distStage.id].input.feedCannabinoidPurity / 100) * 0.015; // approximate THC ratio
      const distillateThcPurity = (thcMassGrams / 1000 / distillateOut.distillateMass) * 100;
      
      if (distillateThcPurity > maxTHCPct) {
        violations.push(`Distillate THC concentration (${distillateThcPurity.toFixed(3)}%) violates regulatory compliance limit (max ${maxTHCPct}%)`);
      }
    }

    return {
      results: runOut,
      compliant: violations.length === 0,
      violations
    };
  };

  // Implements a deterministic Hill-Climbing / Binary Gradient Search Optimizer (No AI)
  const runOptimization = async () => {
    setIsSearching(true);
    setSearchSteps([]);
    setOptimalConfig(null);
    setOptimalMetrics(null);

    // Bounds for search parameters
    const bounds = searchParam === 'extractionTemp' 
      ? { min: -60, max: 20, initial: -40, stepSize: 8 } 
      : { min: 140, max: 230, initial: 185, stepSize: 10 };

    let currentVal = bounds.initial;
    let stepSize = bounds.stepSize;
    let bestObjectiveVal = -1;
    let bestParamVal = currentVal;
    let bestGraph: ProcessGraph | null = null;
    let bestMetrics: any = null;

    const historyList: any[] = [];

    // Run up to 8 optimization iterations deterministically
    for (let iter = 1; iter <= 8; iter++) {
      await new Promise(resolve => setTimeout(resolve, 350)); // animation pacing

      // Evaluate candidate at current parameter value
      const evaluation = evaluateConfig(currentVal);
      const out = evaluation.results;

      // Calculate cost metrics
      let objVal = 0;
      let distillatePurity = 0;
      let finalMass = out.massBalanceReport.finalMassKg;

      const distStage = graph.stages.find(s => s.type === 'distillation');
      if (distStage && out.stagesResults[distStage.id]) {
        distillatePurity = out.stagesResults[distStage.id].output.cannabinoidPurity;
      }

      if (objective === 'yield') {
        objVal = finalMass; // focus on maximizing kg out
      } else {
        objVal = distillatePurity; // focus on maximizing wt% cannabinoid purity
      }

      const isCompliant = evaluation.compliant;
      let decision = '';

      if (isCompliant) {
        if (objVal > bestObjectiveVal) {
          bestObjectiveVal = objVal;
          bestParamVal = currentVal;
          bestMetrics = {
            finalMass,
            purity: distillatePurity,
            paramVal: currentVal
          };
          // Clone the graph with the current best parameter
          bestGraph = {
            stages: graph.stages.map(s => {
              if (searchParam === 'extractionTemp' && s.type === 'extraction') {
                return { ...s, config: { ...s.config, extractionTemp: currentVal } };
              }
              if (searchParam === 'evaporatorTemp' && s.type === 'distillation') {
                return { ...s, config: { ...s.config, evaporatorTemp: currentVal } };
              }
              return s;
            }),
            connections: [...graph.connections]
          };
          decision = 'ACCEPT & IMPROVE';
          // Move parameter in positive direction to seek peak
          currentVal = Math.min(bounds.max, currentVal + stepSize);
        } else {
          decision = 'REJECT (Lower objective value)';
          // Shrink step size and reverse search direction
          stepSize *= 0.5;
          currentVal = Math.max(bounds.min, bestParamVal - stepSize);
        }
      } else {
        decision = `REJECT (${evaluation.violations[0]?.split('violates')[0] || 'Violation'})`;
        // Back off from non-compliant zone
        stepSize *= 0.5;
        currentVal = Math.max(bounds.min, bestParamVal - stepSize);
      }

      const stepRecord = {
        iteration: iter,
        parameterValue: currentVal,
        objectiveValue: parseFloat(objVal.toFixed(3)),
        purity: parseFloat(distillatePurity.toFixed(1)),
        compliant: isCompliant,
        decision,
        violations: evaluation.violations,
        plotData: {
          iteration: `Iter ${iter}`,
          'Parameter Value': parseFloat(currentVal.toFixed(2)),
          'Objective Metric': parseFloat(objVal.toFixed(3)),
          'Purity (wt%)': parseFloat(distillatePurity.toFixed(1))
        }
      };

      historyList.push(stepRecord);
      setSearchSteps([...historyList]);
    }

    if (bestGraph && bestMetrics) {
      setOptimalConfig(bestGraph);
      setOptimalMetrics(bestMetrics);
      onRecordProvenance(
        `Autonomous Optimization: Target ${objective === 'yield' ? 'Yield' : 'Purity'} tuned via ${searchParam}`,
        { biomass, graph: bestGraph },
        KernelExecutor.runProcess(bestGraph, biomass)
      );
    }
    setIsSearching(false);
  };

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1f1f21]">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-500" />
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#aaa]">
              Security, Policy & Audit Layer
            </h2>
            <p className="text-[10px] text-[#555] font-mono mt-0.5">
              Deterministic Rules Engine, Boundary Guards & Scientific Validation Audit
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('rules')}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all border ${
              subTab === 'rules' 
                ? 'bg-purple-950/40 border-purple-500/30 text-purple-300' 
                : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
            }`}
          >
            Policy Rules Guard
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
              subTab === 'audit' 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Full Audit Framework
          </button>
        </div>
      </div>

      {subTab === 'audit' ? (
        <ScientificAuditFramework />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Rule Guard Engine + Tuner Setup (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Rules Guard Config */}
          <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] flex flex-col gap-3">
            <div className="flex items-center gap-1.5 border-b border-[#1f1f21] pb-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#aaa]">Policy Guard Constrains</span>
            </div>

            {/* Constraint 1 */}
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-[#666] font-bold">MIN SOLVENT RATIO</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  value={minSolventRatio}
                  onChange={(e) => setMinSolventRatio(Math.max(1.0, parseFloat(e.target.value) || 5.0))}
                  className="bg-[#121214] border border-[#1f1f21] rounded px-1.5 py-0.5 w-12 text-center text-white font-bold"
                />
                <span className="text-[#555] text-[9px]">L/kg</span>
              </div>
            </div>

            {/* Constraint 2 */}
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-[#666] font-bold">MAX DECARB TEMPERATURE</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={maxDecarbTemp}
                  onChange={(e) => setMaxDecarbTemp(Math.max(80, parseFloat(e.target.value) || 150.0))}
                  className="bg-[#121214] border border-[#1f1f21] rounded px-1.5 py-0.5 w-12 text-center text-white font-bold"
                />
                <span className="text-[#555] text-[9px]">°C</span>
              </div>
            </div>

            {/* Constraint 3 */}
            <div className="flex items-center justify-between font-mono text-[10px] border-t border-[#1f1f21]/40 pt-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[#666] font-bold">THC COMPLIANCE LIMIT</span>
                <span className="text-[8px] text-[#444] font-sans">Farm Bill Maximum (default 0.3%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.05"
                  value={maxTHCPct}
                  onChange={(e) => setMaxTHCPct(Math.max(0.01, parseFloat(e.target.value) || 0.30))}
                  className="bg-[#121214] border border-[#1f1f21] rounded px-1.5 py-0.5 w-12 text-center text-white font-bold"
                />
                <span className="text-[#555] text-[9px]">%</span>
              </div>
            </div>

            {/* Enable block check */}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-[#1f1f21]/30">
              <input
                type="checkbox"
                id="regBlock"
                checked={enableRegulatoryBlock}
                onChange={(e) => setEnableRegulatoryBlock(e.target.checked)}
                className="rounded border-[#1f1f21] bg-[#121214] text-blue-600 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="regBlock" className="text-[9px] font-mono text-[#aaa] font-bold uppercase cursor-pointer">
                Strict Regulatory Shut-down block
              </label>
            </div>
          </div>

          {/* Autonomy Search Board */}
          <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] flex flex-col gap-3">
            <div className="flex items-center gap-1.5 border-b border-[#1f1f21] pb-2 mb-1">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#aaa]">Feedback Tuning Agent</span>
            </div>

            {/* Goal */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold tracking-wider text-[#555]">Target Optimization Goal</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setObjective('yield')}
                  className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                    objective === 'yield'
                      ? 'bg-blue-950/20 border-blue-500 text-blue-400'
                      : 'bg-[#121214] border-[#1f1f21] text-[#666] hover:text-[#aaa]'
                  }`}
                >
                  Max Distillate Yield
                </button>
                <button
                  type="button"
                  onClick={() => setObjective('purity')}
                  className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                    objective === 'purity'
                      ? 'bg-blue-950/20 border-blue-500 text-blue-400'
                      : 'bg-[#121214] border-[#1f1f21] text-[#666] hover:text-[#aaa]'
                  }`}
                >
                  Max Distillate Purity
                </button>
              </div>
            </div>

            {/* Sweep selection */}
            <div className="flex flex-col gap-1 mt-1.5">
              <label className="text-[9px] uppercase font-bold tracking-wider text-[#555]">Tuning Control Parameter</label>
              <select
                value={searchParam}
                onChange={(e) => setSearchParam(e.target.value as any)}
                className="bg-[#121214] border border-[#1f1f21] rounded-lg px-2.5 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="extractionTemp">Extraction Temperature (Extraction stage)</option>
                <option value="evaporatorTemp">Evaporator Temperature (Distillation stage)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={runOptimization}
              disabled={isSearching}
              className="mt-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1b1b1e] text-white text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Searching optimal zone...' : 'Launch Optimization Agent'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Execution trace log (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {optimalMetrics && (
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 flex flex-col gap-2 font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>OPTIMAL FEEDBACK COEFFICIENTS RESOLVED!</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-[#aaa] mt-1 pt-1.5 border-t border-emerald-900/20">
                <div>
                  <span className="text-[#555] font-bold block uppercase text-[8px]">Tuning Param</span>
                  <span className="text-white font-bold">{optimalMetrics.paramVal.toFixed(2)} °C</span>
                </div>
                <div>
                  <span className="text-[#555] font-bold block uppercase text-[8px]">Yield (Distillate)</span>
                  <span className="text-blue-400 font-bold">{optimalMetrics.finalMass.toFixed(3)} kg</span>
                </div>
                <div>
                  <span className="text-[#555] font-bold block uppercase text-[8px]">Enrichment Purity</span>
                  <span className="text-purple-400 font-bold">{optimalMetrics.purity.toFixed(2)} wt%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => optimalConfig && onApplyConfig(optimalConfig)}
                className="mt-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
              >
                Apply Optimal Parameters to flowsheet Workspace
              </button>
            </div>
          )}

          {/* Trace Log and Convergence chart */}
          <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] min-h-[280px] flex flex-col gap-4">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#666]">Deterministic Optimization agent trace log</span>
            
            {searchSteps.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Search Path Grid/List */}
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto font-mono text-[9px]">
                  {searchSteps.map((step) => (
                    <div 
                      key={step.iteration} 
                      className={`p-2 rounded border flex items-center justify-between ${
                        step.compliant 
                          ? 'bg-[#121214] border-[#1f1f21] text-[#aaa]' 
                          : 'bg-red-950/10 border-red-900/30 text-red-400'
                      }`}
                    >
                      <div className="flex gap-2.5 truncate max-w-[340px]">
                        <span className="font-bold text-blue-400">#{step.iteration}</span>
                        <span className="text-white">Param: {step.parameterValue.toFixed(1)}°C</span>
                        <span className="text-[#666]">|</span>
                        <span>Obj: {step.objectiveValue} {objective === 'yield' ? 'kg' : 'wt%'}</span>
                      </div>
                      <span className={`font-bold uppercase text-[8px] px-1.5 py-0.5 rounded ${
                        step.compliant ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'
                      }`}>
                        {step.decision}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Convergence plot */}
                <div className="h-[120px] w-full text-[8px] font-mono border-t border-[#1f1f21]/50 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={searchSteps.map(s => s.plotData)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f21" />
                      <XAxis dataKey="iteration" stroke="#444" tickLine={false} />
                      <YAxis stroke="#444" tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#121214', border: '1px solid #1f1f21', color: '#fff' }} />
                      <Line type="monotone" dataKey="Objective Metric" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Purity (wt%)" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#555] p-6 rounded-xl border border-dashed border-[#1f1f21] min-h-[220px]">
                <TrendingUp className="w-8 h-8 text-[#2d2d30] mb-2 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                  Tuning Agent idle. Choose objective goal, select controller input, and click "Launch Optimization Agent" to calculate optimal zone parameters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
