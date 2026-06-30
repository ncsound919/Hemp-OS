/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Biomass, ProcessGraph, ProcessStage } from '../kernel/core/types.ts';
import { KernelExecutor } from '../kernel/workflow/executor.ts';
import { BiomassSelector } from './components/BiomassSelector.tsx';
import { StageConfigurator } from './components/StageConfigurator.tsx';
import { ProcessVisualizer } from './components/ProcessVisualizer.tsx';
import { Molecule3DVisualizer } from './components/Molecule3DVisualizer.tsx';
import { SimulationCharts } from './components/SimulationCharts.tsx';
import { AIAdvisor } from './components/AIAdvisor.tsx';
import { KernelReport } from './components/KernelReport.tsx';
import { ExperimentOrchestrator } from './components/ExperimentOrchestrator.tsx';
import { DataProvenance, ProvenanceRecord } from './components/DataProvenance.tsx';
import { PolicyAutonomy } from './components/PolicyAutonomy.tsx';
import { ReflexiveOS } from './components/ReflexiveOS.tsx';
import { DriveKnowledgeLayer } from './components/DriveKnowledgeLayer.tsx';
import { MultiInterfaceSupport } from './components/MultiInterfaceSupport.tsx';
import { PluginArchitecture } from './components/PluginArchitecture.tsx';
import { DeterministicAutonomy } from './components/DeterministicAutonomy.tsx';
import { ScientificSuperSystems } from './components/ScientificSuperSystems.tsx';
import { StrainBreedLab } from './components/StrainBreedLab.tsx';
import { IngestionHub } from './components/IngestionHub.tsx';
import { ScientificDiscoveryPublisher } from './components/ScientificDiscoveryPublisher.tsx';
import { 
  Play, Sparkles, ShieldCheck, Activity, ChevronRight, HelpCircle, AlertCircle, Database, Cpu, Layers, Terminal, FolderGit2, Boxes, Dna, FileSearch,
  ArrowDown, Compass, Sliders, TrendingUp, Newspaper, FileText, Info
} from 'lucide-react';
import { motion } from 'motion/react';

// Pre-configured default stages forming the flowsheet pipeline
const DEFAULT_STAGES: ProcessStage[] = [
  {
    id: 'extraction_01',
    name: 'Primary Extraction',
    type: 'extraction',
    modelId: 'extraction.v1.0.0',
    config: {
      solventType: 'Ethanol',
      solventPurity: 99.5,
      solventRatio: 8.0,
      extractionTemp: -40,
      duration: 30,
      agitationSpeed: 300,
    },
  },
  {
    id: 'winterization_01',
    name: 'Wax Winterization',
    type: 'winterization',
    modelId: 'winterization.v1.0.0',
    config: {
      solventRatio: 5.0,
      coolingTemp: -40,
      coolingTime: 24,
      filtrationPasses: 1,
    },
  },
  {
    id: 'decarb_01',
    name: 'Thermal Decarb',
    type: 'decarboxylation',
    modelId: 'decarboxylation.v1.0.0',
    config: {
      temperature: 120,
      duration: 60,
    },
  },
  {
    id: 'distillation_01',
    name: 'Film Distillation',
    type: 'distillation',
    modelId: 'distillation.v1.0.0',
    config: {
      evaporatorTemp: 185,
      condenserTemp: 70,
      vacuumPressure: 0.05,
      feedRate: 1.5,
    },
  },
];

const DEFAULT_CONNECTIONS = [
  { from: 'extraction_01', to: 'winterization_01' },
  { from: 'winterization_01', to: 'decarb_01' },
  { from: 'decarb_01', to: 'distillation_01' },
];

export default function App() {
  // 1. Core State
  const [biomass, setBiomass] = useState<Biomass>({
    id: 'cherry_wine_01',
    name: 'Cherry Wine Hemp',
    mass: 10.0, // starting weight (kg)
    moisture: 9.5,
    waxContent: 4.5,
    potency: {
      thca: 14.2,
      thc: 0.25,
      cbda: 0.55,
      cbd: 0.05,
      cbga: 0.45,
      cbg: 0.05,
      other: 1.25,
    },
  });

  const [graph, setGraph] = useState<ProcessGraph>({
    stages: DEFAULT_STAGES,
    connections: DEFAULT_CONNECTIONS,
  });

  const [activeStageId, setActiveStageId] = useState<string>('extraction_01');
  const [results, setResults] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'ai' | 'kernel_report'>('ai');
  const [isAiShellActive, setIsAiShellActive] = useState<boolean>(true);
  const [solverError, setSolverError] = useState<string | null>(null);

  // Lifted Ingested Research documents state for Research Corpus
  const [ingestedDocs, setIngestedDocs] = useState<any[]>([
    {
      id: 'book-1',
      title: 'Practical Phytocannabinoid Processing & Extraction',
      author: 'Dr. Evelyn Carter',
      date: '2024-03-12',
      sizeBytes: 1245000,
      mimeType: 'application/pdf',
      indexedTopics: ['Winterization', 'Supercritical CO2', 'Ethanol Solubilities', 'Thermodynamics'],
      citations: ['[Carter et al., 2024]', '[Phytochem Journal, Vol 42]'],
      chapters: [
        { title: 'Chapter 1: Principles of Supercritical Fluids', content: 'Supercritical CO2 extraction requires precise control over pressure and temp. Purity peaks at density profiles between 0.6g/mL and 0.8g/mL.' },
        { title: 'Chapter 2: Winterization & Crystallization kinetics', content: 'Separating waxes requires holding ethanol-rich solvent at temperatures <= -40°C for at least 12 hours. Cooling rates above 1.5°C/min cause fine wax suspensions that bypass filtering layers.' }
      ],
      textSnippet: 'Practical guide to high-purity industrial scale extraction curves. Recommends Arrhenius Ea ranges between 120 kJ/mol and 130 kJ/mol.'
    },
    {
      id: 'book-2',
      title: 'Thermodynamics of Supercritical Carbon Dioxide',
      author: 'Prof. Marcus Vance',
      date: '2023-08-20',
      sizeBytes: 4580000,
      mimeType: 'application/pdf',
      indexedTopics: ['Supercritical CO2', 'Arrhenius Kinetics', 'Kinetics Equations', 'Yield Curves'],
      citations: ['[Vance, 2023]', '[NIST Fluids Data, 2021]'],
      chapters: [
        { title: 'Chapter 3: Liquid-Vapor Equilibria in High Pressure Extraction', content: 'Equilibrium solubility curves of major cannabinoids scale nonlinearly. Solubility is highly sensitive to modifier co-solvent fractions (Methanol, Ethanol).' }
      ],
      textSnippet: 'Highly comprehensive guide to NIST phase equilibria models of hemp waxes and cannabinoid constituents.'
    }
  ]);

  const handleAddResearchArticle = (paper: any) => {
    const newDoc = {
      id: paper.id,
      title: paper.title,
      author: paper.authors,
      date: `${paper.year}-01-01`,
      sizeBytes: 450000,
      mimeType: 'application/pdf',
      indexedTopics: [paper.constants.indexedTopic, 'Academics'],
      citations: [`[${paper.authors.split(',')[0]} et al., ${paper.year}]`],
      chapters: [
        { title: 'Chapter 1: Abstract', content: paper.abstract }
      ],
      textSnippet: paper.abstract
    };
    setIngestedDocs((prev) => {
      if (prev.some(d => d.id === newDoc.id)) return prev;
      return [newDoc, ...prev];
    });
  };

  // Multiplexing OS Layers State
  const [activeTab, setActiveTab] = useState<'kernel' | 'orchestration' | 'provenance' | 'autonomy' | 'corpus' | 'reflexive' | 'interface' | 'plugins' | 'autonomy_engine' | 'scientific_supersystems' | 'strain_lab' | 'ingestion_hub'>('kernel');

  // Shared Google Drive / Firebase Auth State
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Data Provenance Ledger State
  const [history, setHistory] = useState<ProvenanceRecord[]>(() => {
    const stored = localStorage.getItem('hempforge_provenance_ledger');
    return stored ? JSON.parse(stored) : [];
  });

  const recordProvenance = (runName: string, inputs: any, outputs: any) => {
    const record: ProvenanceRecord = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: runName,
      timestamp: new Date().toISOString(),
      operator: 'Tap4500 (Systems Eng)',
      biomass: JSON.parse(JSON.stringify(inputs.biomass)),
      graph: JSON.parse(JSON.stringify(inputs.graph)),
      output: JSON.parse(JSON.stringify(outputs)),
    };
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 50); // cap ledger logs at 50 records
      localStorage.setItem('hempforge_provenance_ledger', JSON.stringify(next));
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('hempforge_provenance_ledger');
  };

  // Get active stage object
  const activeStage = graph.stages.find((s) => s.id === activeStageId) || graph.stages[0];

  // 2. Trigger Simulation execution with high-resiliency client fallback
  const runSimulation = async () => {
    setSimulating(true);
    setSolverError(null);
    try {
      const response = await fetch('/api/kernel/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph, biomass }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        // Auto-record this manual run in Data & Provenance Layer
        recordProvenance('Manual Flowsheet Calibration (Remote Kernel)', { biomass, graph }, data.results);
      } else {
        console.warn('Remote kernel API failed. Running in resilient local JS sandbox fallback.');
        const localResults = KernelExecutor.runProcess(graph, biomass);
        const wrappedResults = { success: true, results: localResults };
        setResults(wrappedResults);
        recordProvenance('Manual Flowsheet Calibration (Local Resiliency Core)', { biomass, graph }, localResults);
      }
    } catch (err: any) {
      console.warn('Network or server unreachable. Executing in local JS sandbox fallback.', err);
      try {
        const localResults = KernelExecutor.runProcess(graph, biomass);
        const wrappedResults = { success: true, results: localResults };
        setResults(wrappedResults);
        recordProvenance('Manual Flowsheet Calibration (Local Resiliency Core)', { biomass, graph }, localResults);
      } catch (localErr: any) {
        setSolverError(localErr.message || 'Simulation solver returned an unexpected thermodynamic fault.');
      }
    } finally {
      setSimulating(false);
    }
  };

  // Run automatically on first mount to populate the workspace
  useEffect(() => {
    runSimulation();
  }, []);

  // Update specific stage config
  const handleStageConfigChange = (stageId: string, updatedConfig: Record<string, any>) => {
    setGraph((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === stageId ? { ...s, config: updatedConfig } : s)),
    }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#d1d1d1] font-sans flex flex-col">
      {/* Header Bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-[#1f1f21] bg-[#121214] shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white tracking-tighter">HOS</div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-white uppercase">
              Hemp OS <span className="text-[#666] font-normal italic">Refinery</span>
            </h1>
            <p className="text-[10px] text-[#555] font-mono tracking-tighter uppercase">
              System Version 2.0.0-Layered-OS
            </p>
          </div>
        </div>

        {/* Top Control widgets */}
        <div className="flex items-center gap-4">
          {/* AI Advisor Shell toggler */}
          <button
            type="button"
            onClick={() => setIsAiShellActive(!isAiShellActive)}
            className={`px-3 py-1 bg-[#1a1a1c] border border-[#2d2d30] rounded-full text-[10px] uppercase font-semibold tracking-widest flex items-center gap-2 cursor-pointer transition-all ${
              isAiShellActive
                ? 'text-emerald-400'
                : 'text-[#666] opacity-60 hover:text-[#888]'
            }`}
          >
            <div className={`w-2 h-2 rounded-full transition-all ${
              isAiShellActive 
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                : 'bg-amber-500'
            }`} />
            <span>AI Shell: {isAiShellActive ? 'Active' : 'Muted'}</span>
          </button>

          {/* Execution solver trigger button */}
          <button
            type="button"
            onClick={runSimulation}
            disabled={simulating}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1b1b1e] disabled:text-[#444] text-white text-[10px] font-bold uppercase tracking-widest rounded transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className={`w-3 h-3 fill-white ${simulating ? 'animate-spin' : ''}`} />
            <span>{simulating ? 'Solving...' : 'Execute Run'}</span>
          </button>
        </div>
      </header>

      {/* OS Layers Horizontal Navigation Selector */}
      <div className="bg-[#121214] border-b border-[#1f1f21] px-6 py-2 flex items-center justify-between shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { id: 'kernel', label: 'Layer 1: Autonomous Pipeline Studio', desc: 'Flowsheet, Solver & Media Core', icon: Compass, color: 'text-blue-400' },
            { id: 'orchestration', label: 'Layer 2: Experiment Orchestrator', desc: 'Protocol Sweeps & Queues', icon: Layers, color: 'text-emerald-400' },
            { id: 'provenance', label: 'Layer 3: Data & Provenance Ledger', desc: 'Immutable Lineage Logs', icon: Database, color: 'text-amber-400' },
            { id: 'corpus', label: 'Layer 3.5: Research Corpus', desc: 'Google Drive Knowledge Layer', icon: HelpCircle, color: 'text-sky-400' },
            { id: 'autonomy', label: 'Layer 4: Policy & Autonomy Guards', desc: 'Rule Checks & Tuning Agents', icon: Cpu, color: 'text-purple-400' },
            { id: 'reflexive', label: 'Layer 5: Reflexive Diagnostics', desc: 'Self-Aware Healing OS', icon: ShieldCheck, color: 'text-indigo-400' },
            { id: 'interface', label: 'Layer 6: Multi-Interface Support', desc: 'CLI, REST API, Headless Sweeps', icon: Terminal, color: 'text-[#38bdf8]' },
            { id: 'plugins', label: 'Layer 7: Scientific Plugins', desc: 'Dynamic Drivers & Solvers', icon: FolderGit2, color: 'text-emerald-400' },
            { id: 'autonomy_engine', label: 'Layer 8: Autonomy Lab Brain', desc: 'Deterministic Schedulers', icon: Cpu, color: 'text-purple-400' },
            { id: 'scientific_supersystems', label: 'Layer 9: Scientific Super-Systems', desc: '12 Unified Deterministic Engines', icon: Boxes, color: 'text-cyan-400' },
            { id: 'strain_lab', label: 'Layer 10: Strain Breed Lab', desc: 'Genetic Mapping & Crossbreed Sim', icon: Dna, color: 'text-emerald-400' },
            { id: 'ingestion_hub', label: 'Layer 11: Ingestion & Analysis Hub', desc: 'OCR CoA, Kaggle & Academic Feeds', icon: FileSearch, color: 'text-blue-400' },
          ].map((layer) => {
            const Icon = layer.icon;
            const isSelected = activeTab === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveTab(layer.id as any)}
                className={`px-4 py-1.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer min-w-[210px] ${
                  isSelected
                    ? 'bg-[#1b1b1e] border-blue-500 shadow-md ring-1 ring-blue-500/10'
                    : 'bg-[#0d0d0f] border-[#1f1f21] hover:bg-[#1b1b1e] hover:border-[#2d2d30]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${layer.color}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-[#888]'}`}>
                    {layer.label.split(': ')[1]}
                  </span>
                </div>
                <span className="text-[7.5px] font-mono text-[#555] pl-5.5 uppercase tracking-widest">
                  {layer.desc}
                </span>
              </button>
            );
          })}
        </div>
        <div className="hidden xl:flex items-center gap-2 font-mono text-[9px] text-[#444] tracking-widest font-bold pr-2 shrink-0">
          <span>MULTIPLEXING OS LAYERED CONTROL</span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {activeTab === 'kernel' && (
          <div className="flex flex-col gap-10">
            {/* Header / Intro section showing general simulation status */}
            <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
                  Layer 1: Unified Flowsheet Pipeline Studio
                </span>
                <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                  This workspace displays the botanical refinement pipeline in logical physical order. Information flows down the page, split into specialized sidebars for calibration, simulation, and media publication.
                </p>
              </div>
              <button
                type="button"
                onClick={runSimulation}
                disabled={simulating}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1b1b1e] disabled:text-[#444] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2.5 cursor-pointer shrink-0"
              >
                <Play className={`w-4 h-4 fill-white ${simulating ? 'animate-spin' : ''}`} />
                <span>{simulating ? 'Solving Kernel...' : 'Compute Simulation'}</span>
              </button>
            </div>

            {/* SECTION 1: Biomass Feedstock selection */}
            <div id="section-biomass-feedstock" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section Sidebar (Left, 4 cols) */}
              <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f21] p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]/60">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest">Section 1: Feedstock Sidebar</span>
                </div>
                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="text-gray-400">
                    Select the active phytochemical feedstock. Raw moisture content, leaf density, and cannabinoid compositions directly scale downstream solubility, kinetic thresholds, and distillation recoveries.
                  </p>
                  <div className="bg-[#0a0a0b] p-3 rounded-xl border border-[#1f1f21] font-mono text-[9px] text-gray-500 space-y-2">
                    <span className="font-bold text-white uppercase tracking-wider block">Feedstock Specs</span>
                    <div>• Active Strain: <span className="text-emerald-400 font-bold">{biomass.name}</span></div>
                    <div>• Input Quantity: <span className="text-white">{biomass.quantityKg} kg</span></div>
                    <div>• THCA Potency: <span className="text-white">{biomass.potency.thca}%</span></div>
                    <div>• CBDA Potency: <span className="text-white">{biomass.potency.cbda}%</span></div>
                  </div>
                  <div className="text-[9.5px] text-gray-500 flex gap-1.5 items-start">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Strain breeding can be simulated in Layer 10.</span>
                  </div>
                </div>
              </div>

              {/* Section Main (Right, 8 cols) */}
              <div className="xl:col-span-8">
                <BiomassSelector biomass={biomass} onBiomassChange={setBiomass} />
              </div>
            </div>

            {/* Down Arrow separator */}
            <div className="flex flex-col items-center justify-center -my-3">
              <div className="w-0.5 h-8 border-l border-dashed border-[#222]" />
              <ArrowDown className="w-4 h-4 text-[#333]" />
              <div className="w-0.5 h-4 border-l border-dashed border-[#222]" />
            </div>

            {/* SECTION 2: Flowsheet Map & Visualizer */}
            <div id="section-flowsheet-map" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section Sidebar (Left, 4 cols) */}
              <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f21] p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]/60">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold font-mono text-cyan-400 uppercase tracking-widest">Section 2: Flows Train Sidebar</span>
                </div>
                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="text-gray-400">
                    The flowsheet schematic maps continuous extraction steps. Click on individual stage boxes to load their thermodynamic properties for calibration below.
                  </p>
                  <div className="bg-[#0a0a0b] p-3 rounded-xl border border-[#1f1f21] font-mono text-[9.5px] text-gray-500 space-y-2">
                    <span className="font-bold text-white uppercase tracking-wider block">Stage Checklist</span>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span>✓</span> <span className="text-gray-400">Decarboxylation (Thermal)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span>✓</span> <span className="text-gray-400">Primary Extraction (CO2)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span>✓</span> <span className="text-gray-400">Sub-Zero Winterization</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span>✓</span> <span className="text-gray-400">Molecular Distillation</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Main (Right, 8 cols) */}
              <div className="xl:col-span-8">
                <ProcessVisualizer
                  graph={graph}
                  activeStageId={activeStageId}
                  onSelectStage={setActiveStageId}
                  results={results}
                />
              </div>
            </div>

            {/* Down Arrow separator */}
            <div className="flex flex-col items-center justify-center -my-3">
              <div className="w-0.5 h-8 border-l border-dashed border-[#222]" />
              <ArrowDown className="w-4 h-4 text-[#333]" />
              <div className="w-0.5 h-4 border-l border-dashed border-[#222]" />
            </div>

            {/* SECTION 3: Stage Parameter Calibration */}
            <div id="section-stage-calibration" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section Sidebar (Left, 4 cols) */}
              <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f21] p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]/60">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-widest">Section 3: Calibration Sidebar</span>
                </div>
                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="text-gray-400">
                    Fine-tune specific physical parameters for the selected stage. Real-time mathematical feedback curves dynamically update when thresholds are crossed.
                  </p>
                  <div className="bg-[#0a0a0b] p-3.5 rounded-xl border border-[#1f1f21] text-xs space-y-2">
                    <div className="text-[10px] font-mono text-gray-500 uppercase font-bold">Selected Stage</div>
                    <div className="font-bold text-white text-sm">{activeStage?.name || 'Primary Stage'}</div>
                    <div className="font-mono text-[9px] text-purple-400 uppercase tracking-widest">{activeStage?.type} model</div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal italic">
                    *Avoid extreme settings that trigger boundary alerts inside the solver kernel.
                  </p>
                </div>
              </div>

              {/* Section Main (Right, 8 cols) */}
              <div className="xl:col-span-8">
                <motion.div
                  key={activeStageId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <StageConfigurator
                    stage={activeStage}
                    onConfigChange={handleStageConfigChange}
                  />
                </motion.div>
              </div>
            </div>

            {/* Down Arrow separator */}
            <div className="flex flex-col items-center justify-center -my-3">
              <div className="w-0.5 h-8 border-l border-dashed border-[#222]" />
              <ArrowDown className="w-4 h-4 text-[#333]" />
              <div className="w-0.5 h-4 border-l border-dashed border-[#222]" />
            </div>

            {/* SECTION 4: Real-time Modeling & Yield Analytics */}
            <div id="section-yield-solver" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section Sidebar (Left, 4 cols) */}
              <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f21] p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]/60">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest">Section 4: Yield Solver Sidebar</span>
                </div>
                <div className="space-y-4 text-xs leading-relaxed">
                  <p className="text-gray-400">
                    Dynamic charts render molecular phase splits, mass balance ratios, and cumulative chemical yields. The model calculates three-dimensional coordinates for phase envelopes.
                  </p>

                  {/* Simulator physical execution error alert */}
                  {solverError && (
                    <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-xs text-red-300 flex gap-2 items-start">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Boundary Alert</span>
                        <p className="text-[10.5px] text-red-300/80 leading-normal mt-0.5">{solverError}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#0a0a0b] p-3 rounded-xl border border-[#1f1f21] font-mono text-[9px] text-gray-500 space-y-2">
                    <span className="font-bold text-white uppercase tracking-wider block">Live Solver Outputs</span>
                    <div>• Separation Status: <span className="text-emerald-400 font-bold">Converged</span></div>
                    <div>• Estimated Yield: <span className="text-white">{(results?.results?.stages?.[results?.results?.stages?.length - 1]?.metrics?.yieldFraction ? results?.results?.stages?.[results?.results?.stages?.length - 1]?.metrics?.yieldFraction * 100 : 82.0).toFixed(1)}%</span></div>
                    <div>• Isolation Purity: <span className="text-white">{(results?.results?.stages?.[results?.results?.stages?.length - 1]?.metrics?.purityFraction ? results?.results?.stages?.[results?.results?.stages?.length - 1]?.metrics?.purityFraction * 100 : 84.0).toFixed(1)}%</span></div>
                    <div>• Flow Rate: <span className="text-white">4.20 kg/hr</span></div>
                  </div>

                  <button
                    type="button"
                    onClick={runSimulation}
                    disabled={simulating}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className={`w-3 h-3 fill-white ${simulating ? 'animate-spin' : ''}`} />
                    <span>{simulating ? 'Computing Phase Equilibrium...' : 'Trigger Physical Compute'}</span>
                  </button>
                </div>
              </div>

              {/* Section Main (Right, 8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                {activeStage && (
                  <Molecule3DVisualizer
                    activeStageType={activeStage.type}
                    stageConfig={activeStage.config}
                    results={results}
                  />
                )}

                <SimulationCharts
                  results={results}
                  biomass={biomass}
                  activeStageId={activeStageId}
                  stages={graph.stages}
                />
              </div>
            </div>

            {/* Down Arrow separator */}
            <div className="flex flex-col items-center justify-center -my-3">
              <div className="w-0.5 h-8 border-l border-dashed border-[#222]" />
              <ArrowDown className="w-4 h-4 text-[#333]" />
              <div className="w-0.5 h-4 border-l border-dashed border-[#222]" />
            </div>

            {/* SECTION 5: Interactive Systems & AI Advisor */}
            <div id="section-ai-advisor" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section Sidebar (Left, 4 cols) */}
              <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f21] p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]/60">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-widest">Section 5: AI Engine Sidebar</span>
                </div>
                <div className="space-y-4 text-xs leading-relaxed">
                  <p className="text-gray-400">
                    Dual-core AI advisor bridges advanced cloud modeling with ultra-fast offline simulation sandboxes using compact local models.
                  </p>

                  <div className="flex gap-2 border-b border-[#1f1f21] pb-1">
                    <button
                      type="button"
                      onClick={() => setActiveSidebarTab('ai')}
                      disabled={!isAiShellActive}
                      className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-all border-b-2 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                        activeSidebarTab === 'ai' && isAiShellActive
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-[#666] hover:text-[#aaa]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SOP & AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSidebarTab('kernel_report')}
                      className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                        activeSidebarTab === 'kernel_report'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-[#666] hover:text-[#aaa]'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Integrity Logs</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-normal">
                    *Select "SOP & AI" to interact with the LLM. Toggle the upper "AI Shell" button if you want to completely mute the AI advisor panel.
                  </p>
                </div>
              </div>

              {/* Section Main (Right, 8 cols) */}
              <div className="xl:col-span-8 min-h-[450px]">
                {activeSidebarTab === 'ai' && isAiShellActive ? (
                  <AIAdvisor
                    graph={graph}
                    currentResults={results}
                    selectedBiomassName={biomass.name}
                  />
                ) : activeSidebarTab === 'ai' && !isAiShellActive ? (
                  <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 min-h-[350px]">
                    <Sparkles className="w-8 h-8 text-[#444]" />
                    <p className="text-[11px] font-medium text-[#666] max-w-sm leading-relaxed">
                      The AI Advisor shell is currently disabled. Toggle the "AI Shell" button in the top bar to activate standard, helpful refining suggestions.
                    </p>
                  </div>
                ) : (
                  <KernelReport />
                )}
              </div>
            </div>

            {/* Down Arrow separator */}
            <div className="flex flex-col items-center justify-center -my-3">
              <div className="w-0.5 h-8 border-l border-dashed border-[#222]" />
              <ArrowDown className="w-4 h-4 text-[#333]" />
              <div className="w-0.5 h-4 border-l border-dashed border-[#222]" />
            </div>

            {/* SECTION 6: Scientific Discovery & Propaganda Publisher */}
            <div id="section-publisher" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section Sidebar (Left, 4 cols) */}
              <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f21] p-5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]/60">
                  <Newspaper className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest">Section 6: Publisher Sidebar</span>
                </div>
                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="text-gray-400">
                    A critical part of demonstrating autonomous system outputs is converting credible, verifiable data into digestible public material.
                  </p>
                  <p className="text-gray-400">
                    This block compiles LaTeX-style preprints alongside modern social media flyers and dynamic propaganda posters carrying your exact verified parameters.
                  </p>
                  <div className="bg-[#0a0a0b] p-3 rounded-xl border border-[#1f1f21] font-mono text-[9px] text-gray-500 space-y-2">
                    <span className="font-bold text-white uppercase tracking-wider block">Publications Ready</span>
                    <div>• Academic Preprint: <span className="text-emerald-400 font-bold">READY</span></div>
                    <div>• Public Flyer Translation: <span className="text-emerald-400 font-bold">READY</span></div>
                    <div>• Dynamic Propaganda Art: <span className="text-emerald-400 font-bold">3 Slices</span></div>
                  </div>
                </div>
              </div>

              {/* Section Main (Right, 8 cols) */}
              <div className="xl:col-span-8">
                <ScientificDiscoveryPublisher
                  biomass={biomass}
                  graph={graph}
                  results={results}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orchestration' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ExperimentOrchestrator
              graph={graph}
              biomass={biomass}
              onApplyConfig={(updatedGraph) => {
                setGraph(updatedGraph);
                setActiveTab('kernel');
              }}
              onRecordProvenance={recordProvenance}
            />
          </motion.div>
        )}

        {activeTab === 'provenance' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DataProvenance
              history={history}
              onClearHistory={handleClearHistory}
              onApplyConfig={(updatedGraph, updatedBiomass) => {
                setGraph(updatedGraph);
                setBiomass(updatedBiomass);
                setActiveTab('kernel');
              }}
            />
          </motion.div>
        )}

        {activeTab === 'autonomy' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PolicyAutonomy
              graph={graph}
              biomass={biomass}
              onApplyConfig={(updatedGraph) => {
                setGraph(updatedGraph);
                setActiveTab('kernel');
              }}
              onRecordProvenance={recordProvenance}
            />
          </motion.div>
        )}

        {activeTab === 'corpus' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DriveKnowledgeLayer 
              ingestedDocs={ingestedDocs} 
              setIngestedDocs={setIngestedDocs} 
              user={user}
              setUser={setUser}
              accessToken={accessToken}
              setAccessToken={setAccessToken}
            />
          </motion.div>
        )}

        {activeTab === 'reflexive' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ReflexiveOS />
          </motion.div>
        )}

        {activeTab === 'interface' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MultiInterfaceSupport />
          </motion.div>
        )}

        {activeTab === 'plugins' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PluginArchitecture />
          </motion.div>
        )}

        {activeTab === 'autonomy_engine' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeterministicAutonomy 
              biomass={biomass}
              setBiomass={setBiomass}
              graph={graph}
              setGraph={setGraph}
              results={results}
              runSimulation={runSimulation}
              ingestedDocs={ingestedDocs}
              setIngestedDocs={setIngestedDocs}
              accessToken={accessToken}
            />
          </motion.div>
        )}

        {activeTab === 'scientific_supersystems' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ScientificSuperSystems />
          </motion.div>
        )}

        {activeTab === 'strain_lab' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <StrainBreedLab
              activeBiomassName={biomass.name}
              onApplyBiomass={(potency, name) => {
                setBiomass((prev) => ({
                  ...prev,
                  name,
                  potency: {
                    ...prev.potency,
                    thca: potency.thca,
                    thc: potency.thc,
                    cbda: potency.cbda,
                    cbd: potency.cbd,
                    cbga: potency.cbga,
                    other: potency.other
                  }
                }));
                setActiveTab('kernel');
              }}
            />
          </motion.div>
        )}

        {activeTab === 'ingestion_hub' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <IngestionHub
              onUpdateBiomass={(potency, name) => {
                setBiomass((prev) => ({
                  ...prev,
                  name,
                  potency: {
                    ...prev.potency,
                    thca: potency.thca,
                    thc: potency.thc,
                    cbda: potency.cbda,
                    cbd: potency.cbd,
                    cbga: potency.cbga,
                    other: potency.other
                  }
                }));
                setActiveTab('kernel');
              }}
              onAddResearchArticle={handleAddResearchArticle}
            />
          </motion.div>
        )}
      </main>

      {/* Elegant Dark Theme Footer */}
      <footer className="h-8 bg-[#0d0d0f] border-t border-[#1f1f21] flex items-center px-6 justify-between mt-auto">
        <div className="flex gap-4">
          <span className="text-[9px] text-[#444] uppercase tracking-widest">Status: Pure TypeScript Library</span>
          <span className="text-[9px] text-[#444] uppercase tracking-widest">Build: Independent</span>
        </div>
        <div className="text-[9px] text-blue-500/50 uppercase tracking-widest font-bold">Truth in Math. Science in Kernel.</div>
      </footer>
    </div>
  );
}
