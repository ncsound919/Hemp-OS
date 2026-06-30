import React, { useState } from 'react';
import { Biomass, ProcessGraph, ProcessStage } from '../../kernel/core/types.ts';
import { KernelExecutor } from '../../kernel/workflow/executor.ts';
import { 
  Play, Sliders, Layers, RefreshCw, BarChart2, CheckCircle2, ChevronRight, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

interface ExperimentOrchestratorProps {
  graph: ProcessGraph;
  biomass: Biomass;
  onApplyConfig: (updatedGraph: ProcessGraph) => void;
  onRecordProvenance: (runName: string, inputs: any, outputs: any) => void;
}

export function ExperimentOrchestrator({ 
  graph, 
  biomass, 
  onApplyConfig,
  onRecordProvenance 
}: ExperimentOrchestratorProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>(graph.stages[0]?.id || '');
  const [selectedParam, setSelectedParam] = useState<string>('');
  const [startVal, setStartVal] = useState<number>(0);
  const [endVal, setEndVal] = useState<number>(0);
  const [steps, setSteps] = useState<number>(5);
  
  const [scheduledRuns, setScheduledRuns] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [sweepResults, setSweepResults] = useState<any[]>([]);
  const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);

  // Derive parameters for the selected stage
  const selectedStage = graph.stages.find(s => s.id === selectedStageId);
  
  const getStageParams = (stageType: string) => {
    switch (stageType) {
      case 'extraction':
        return [
          { name: 'Solvent Ratio (L/kg)', key: 'solventRatio', min: 2, max: 15, default: 8.0 },
          { name: 'Extraction Temperature (°C)', key: 'extractionTemp', min: -60, max: 30, default: -40 },
          { name: 'Duration (min)', key: 'duration', min: 10, max: 120, default: 30 },
          { name: 'Agitation Speed (RPM)', key: 'agitationSpeed', min: 50, max: 800, default: 300 },
        ];
      case 'winterization':
        return [
          { name: 'Solvent Ratio (L/kg)', key: 'solventRatio', min: 1, max: 10, default: 5.0 },
          { name: 'Cooling Temperature (°C)', key: 'coolingTemp', min: -50, max: 0, default: -40 },
          { name: 'Cooling Time (hours)', key: 'coolingTime', min: 4, max: 72, default: 24 },
          { name: 'Filtration Passes', key: 'filtrationPasses', min: 1, max: 3, default: 1 },
        ];
      case 'decarboxylation':
        return [
          { name: 'Reaction Temperature (°C)', key: 'temperature', min: 90, max: 160, default: 120 },
          { name: 'Duration (min)', key: 'duration', min: 15, max: 180, default: 60 },
        ];
      case 'distillation':
        return [
          { name: 'Evaporator Temperature (°C)', key: 'evaporatorTemp', min: 140, max: 240, default: 185 },
          { name: 'Condenser Temperature (°C)', key: 'condenserTemp', min: 40, max: 100, default: 70 },
          { name: 'Vacuum Pressure (mbar)', key: 'vacuumPressure', min: 0.001, max: 0.5, default: 0.05 },
          { name: 'Feed Rate (kg/hr)', key: 'feedRate', min: 0.5, max: 5.0, default: 1.5 },
        ];
      default:
        return [];
    }
  };

  const params = selectedStage ? getStageParams(selectedStage.type) : [];

  // Update selection if stage changes or if param is empty
  React.useEffect(() => {
    if (params.length > 0 && (!selectedParam || !params.find(p => p.key === selectedParam))) {
      const first = params[0];
      setSelectedParam(first.key);
      setStartVal(first.min);
      setEndVal(first.max);
    }
  }, [selectedStageId, selectedParam]);

  const handleParamChange = (paramKey: string) => {
    setSelectedParam(paramKey);
    const p = params.find(item => item.key === paramKey);
    if (p) {
      setStartVal(p.min);
      setEndVal(p.max);
    }
  };

  const generateSchedule = () => {
    if (!selectedStage || !selectedParam) return;
    const runList = [];
    const stepSize = steps > 1 ? (endVal - startVal) / (steps - 1) : 0;

    for (let i = 0; i < steps; i++) {
      const val = startVal + (stepSize * i);
      const roundedVal = parseFloat(val.toFixed(3));
      
      // Clone process graph and modify config for the run
      const runGraph: ProcessGraph = {
        stages: graph.stages.map(s => {
          if (s.id === selectedStageId) {
            return {
              ...s,
              config: {
                ...s.config,
                [selectedParam]: roundedVal
              }
            };
          }
          return s;
        }),
        connections: [...graph.connections]
      };

      runList.push({
        id: `run_${i + 1}`,
        name: `Sweep Run #${i + 1} (${selectedParam} = ${roundedVal})`,
        variableValue: roundedVal,
        graph: runGraph,
        status: 'scheduled'
      });
    }

    setScheduledRuns(runList);
    setSweepResults([]);
    setSelectedRunIndex(null);
  };

  const runCampaign = async () => {
    if (scheduledRuns.length === 0) return;
    setIsRunning(true);
    setProgress(0);
    const resultsList: any[] = [];

    for (let i = 0; i < scheduledRuns.length; i++) {
      const run = scheduledRuns[i];
      // Update run status in UI list
      setScheduledRuns(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r));
      
      // Artificial delay to make sweep feel sequential and orchestrated
      await new Promise(resolve => setTimeout(resolve, 150));

      try {
        // Execute physically inside deterministic in-memory kernel
        const out = KernelExecutor.runProcess(run.graph, biomass);
        
        // Find main target values to plot
        let finalMass = out.massBalanceReport.finalMassKg;
        let recoveryRate = 0;
        let purity = 0;
        let co2 = 0;

        // Try to read recovery from extraction
        const extractionStage = run.graph.stages.find(s => s.type === 'extraction');
        if (extractionStage && out.stagesResults[extractionStage.id]) {
          recoveryRate = out.stagesResults[extractionStage.id].output.recoveryRate;
        }

        // Try to read purity from distillation
        const distStage = run.graph.stages.find(s => s.type === 'distillation');
        if (distStage && out.stagesResults[distStage.id]) {
          purity = out.stagesResults[distStage.id].output.cannabinoidPurity;
        } else if (extractionStage && out.stagesResults[extractionStage.id]) {
          purity = out.stagesResults[extractionStage.id].output.purity;
        }

        const runResult = {
          ...run,
          status: 'completed',
          output: out,
          plotData: {
            parameter: run.variableValue,
            'Product Out (kg)': parseFloat(finalMass.toFixed(3)),
            'Cannabinoid Recovery (%)': parseFloat(recoveryRate.toFixed(1)),
            'Extract Purity (wt%)': parseFloat(purity.toFixed(1)),
          }
        };

        resultsList.push(runResult);
        setSweepResults([...resultsList].map(r => r.plotData));

        // Record in Data Provenance layer
        onRecordProvenance(
          `Campaign Sweep: ${selectedStage.name} ${selectedParam} = ${run.variableValue}`,
          { biomass, graph: run.graph },
          out
        );

      } catch (err) {
        setScheduledRuns(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'failed' } : r));
      }

      setProgress(Math.round(((i + 1) / scheduledRuns.length) * 100));
    }

    setScheduledRuns(resultsList);
    setIsRunning(false);
  };

  const loadRunConfig = (index: number) => {
    setSelectedRunIndex(index);
    const selectedRun = scheduledRuns[index];
    if (selectedRun && selectedRun.status === 'completed') {
      onApplyConfig(selectedRun.graph);
    }
  };

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1f1f21]">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#aaa]">
              Experiment Orchestration Layer
            </h2>
            <p className="text-[10px] text-[#555] font-mono mt-0.5">
              Protocol Sequencing, Sweep Campaigns & Dependencies
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono font-bold bg-[#1a1a1c] text-blue-400 border border-[#2d2d30] px-2.5 py-0.5 rounded-full tracking-wider uppercase">
          SEQUENCER ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Board (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] flex flex-col gap-3.5">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#666]">Sweep Configurator</span>
            
            {/* Target Stage */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#555]">Target Stage</label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {graph.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name} ({stage.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Sweep Parameter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#555]">Sweep Parameter</label>
              <select
                value={selectedParam}
                onChange={(e) => handleParamChange(e.target.value)}
                className="bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {params.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Range Controls */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-[#555]">Start</label>
                <input
                  type="number"
                  value={startVal}
                  onChange={(e) => setStartVal(parseFloat(e.target.value) || 0)}
                  className="bg-[#121214] border border-[#1f1f21] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-[#555]">End</label>
                <input
                  type="number"
                  value={endVal}
                  onChange={(e) => setEndVal(parseFloat(e.target.value) || 0)}
                  className="bg-[#121214] border border-[#1f1f21] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-[#555]">Steps</label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={steps}
                  onChange={(e) => setSteps(Math.min(20, Math.max(3, parseInt(e.target.value) || 5)))}
                  className="bg-[#121214] border border-[#1f1f21] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={generateSchedule}
                className="flex-1 px-3 py-2 bg-[#1b1b1e] hover:bg-[#252528] border border-[#2d2d30] text-[10px] font-bold uppercase tracking-wider rounded text-[#aaa] transition-all"
              >
                Generate Protocol
              </button>
              <button
                type="button"
                onClick={runCampaign}
                disabled={scheduledRuns.length === 0 || isRunning}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1b1b1e] disabled:text-[#444] text-white text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 fill-white" />
                Execute Sweep
              </button>
            </div>
          </div>

          {/* Scheduled Protocols / Queue */}
          <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#666]">Campaign Sequence Queue</span>
            {scheduledRuns.length === 0 ? (
              <p className="text-[10px] text-[#555] font-mono py-4 text-center">No runs generated yet. Set bounds and click Generate.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {scheduledRuns.map((run, idx) => (
                  <button
                    key={run.id}
                    onClick={() => loadRunConfig(idx)}
                    disabled={isRunning || run.status !== 'completed'}
                    className={`text-left p-2 rounded border text-[10px] font-mono flex items-center justify-between transition-all ${
                      selectedRunIndex === idx
                        ? 'bg-blue-950/20 border-blue-500 text-blue-400'
                        : run.status === 'completed'
                        ? 'bg-[#121214] border-[#1f1f21] text-[#aaa] hover:bg-[#1b1b1e] cursor-pointer'
                        : run.status === 'running'
                        ? 'bg-yellow-950/10 border-yellow-700/50 text-yellow-500 animate-pulse'
                        : 'bg-[#121214]/50 border-[#1f1f21]/50 text-[#555]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <ChevronRight className="w-3 h-3 shrink-0" />
                      <span className="truncate">{run.name}</span>
                    </div>
                    <span className="text-[9px] font-bold">
                      {run.status === 'completed' && 'LOAD CFG'}
                      {run.status === 'running' && 'RUNNING'}
                      {run.status === 'scheduled' && 'PENDING'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Output Dashboard (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Progress Bar */}
          {isRunning && (
            <div className="bg-[#0d0d0f] rounded-xl p-3.5 border border-[#1f1f21] flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between text-[10px] text-blue-400 font-bold">
                <span>ORCHESTRATING RUNS...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-[#1b1b1e] h-2 rounded-full overflow-hidden border border-[#2d2d30]">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Graph Visualization */}
          <div className="bg-[#0d0d0f] rounded-xl p-4 border border-[#1f1f21] min-h-[300px] flex flex-col gap-4">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#666]">Sweep Performance Response Curve</span>
            
            {sweepResults.length > 0 ? (
              <div className="h-[250px] w-full text-[10px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sweepResults} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f21" />
                    <XAxis dataKey="parameter" stroke="#555" tickLine={false} />
                    <YAxis stroke="#555" tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121214', border: '1px solid #1f1f21', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      formatter={(value) => <span className="text-[#888] font-bold text-[9px] uppercase tracking-widest">{value}</span>}
                    />
                    <Line type="monotone" dataKey="Product Out (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Cannabinoid Recovery (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Extract Purity (wt%)" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#555] p-6 rounded-xl border border-dashed border-[#1f1f21] min-h-[220px]">
                <BarChart2 className="w-8 h-8 text-[#2d2d30] mb-2 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                  Orchestrated Sweep results plot empty. Configure your sweep variable, then hit "Execute Sweep" to visualize thermodynamic response.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
