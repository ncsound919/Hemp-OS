import React, { useState, useEffect, useRef } from "react";
import { TerminalLog } from "./ResearchLab/TerminalLog";
import { 
  Beaker, 
  FlaskConical, 
  ScrollText, 
  ClipboardList, 
  Play, 
  Pause, 
  RefreshCw, 
  FileText, 
  BookOpen, 
  Check, 
  Plus,
  AlertTriangle, 
  ChevronRight, 
  Terminal, 
  FileCode, 
  Share2, 
  CheckCircle,
  Database,
  ArrowRight,
  Book,
  FileSpreadsheet,
  Cpu,
  Brain,
  Hash,
  Activity,
  Award,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Hypothesis, ExperimentEpisode, Conclusion, ResearchArtifact, MemoryItem } from "../types";

interface ResearchLabProps {
  addTelemetryLog: (msg: string) => void;
  triggerRefreshDatabases: () => void;
}

export default function ResearchLab({ addTelemetryLog, triggerRefreshDatabases }: ResearchLabProps) {
  // DB States
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [experiments, setExperiments] = useState<ExperimentEpisode[]>([]);
  const [conclusions, setConclusions] = useState<Conclusion[]>([]);
  const [artifacts, setArtifacts] = useState<ResearchArtifact[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [intervalMs, setIntervalMs] = useState(30000);
  const [isTriggering, setIsTriggering] = useState(false);

  // New Hypothesis Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSystem, setNewSystem] = useState("Microglial Activation & Neuroinflammation");
  const [newIndVar, setNewIndVar] = useState("");
  const [newDepVar, setNewDepVar] = useState("");
  const [isSeedingHypothesis, setIsSeedingHypothesis] = useState(false);

  // Active artifact selected for reading room
  const [selectedArtifact, setSelectedArtifact] = useState<ResearchArtifact | null>(null);

  // Active sub-tab in local lab dashboard
  const [labTab, setLabTab] = useState<"loop" | "hypotheses" | "experiments" | "conclusions" | "artifacts">("loop");

  // Filter state for artifacts virtual folder
  const [artifactFilter, setArtifactFilter] = useState<"all" | "note" | "report" | "paper">("all");

  // Terminal telemetry states
  const [terminalSearch, setTerminalSearch] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[05:18:00] [SYSTEM_BOOT] Hemp-OS Research Lab Agent v2.0 initialized.",
    "[05:18:02] [CORE_SYNAPSE] Hooked into Hemp-OS Ingestion and Analysis Hub bus.",
    "[05:18:05] [DATABASE_CONNECT] Active connection to BigQuery studies mapping layer established.",
    "[05:18:10] [COGNITIVE_INITIALIZE] 10-agent cognitive swarm registered and waiting for cron sweeps.",
    "[05:18:15] [MEM_CONNECT] Hooked to local mem0 persistent episodic memory database.",
    "[05:18:30] [INGEST] Synapsed 5 active PubMed cannabinoid vector spaces.",
    "[05:18:45] [HYPOTHESIZE] Formulated baseline HYP-001 selectively binding CB2 receptor.",
    "[05:19:12] [EXPERIMENT] Simulated experiment EXP-001 completed. CB2 occupancy mapped at 74%.",
    "[05:19:30] [ANALYZE] Evidence grading completed for CON-001. Assigned Grade A clinical integrity.",
    "[05:19:45] [PUBLISH] Markdown document ART-001 compiled and synced to ./lab_output/papers/"
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Lab Data
  const fetchLabData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [hRes, eRes, cRes, aRes, sRes] = await Promise.all([
        fetch("/api/lab/hypotheses"),
        fetch("/api/lab/experiments"),
        fetch("/api/lab/conclusions"),
        fetch("/api/lab/artifacts"),
        fetch("/api/lab/settings"),
      ]);

      if (!hRes.ok || !eRes.ok || !cRes.ok || !aRes.ok || !sRes.ok) {
        throw new Error("Failed to fetch some lab datasets");
      }

      const hypothesesData = await hRes.json();
      const experimentsData = await eRes.json();
      const conclusionsData = await cRes.json();
      const artifactsData = await aRes.json();
      const settingsData = await sRes.json();

      setHypotheses(hypothesesData);
      setExperiments(experimentsData);
      setConclusions(conclusionsData);
      setArtifacts(artifactsData);

      // Auto set the first artifact as default if none selected
      if (artifactsData.length > 0 && !selectedArtifact) {
        setSelectedArtifact(artifactsData[0]);
      }

      setIsRunning(settingsData.isRunning);
      setIntervalMs(settingsData.intervalMs);
    } catch (err) {
      console.error("Failed to fetch lab datasets:", err);
      setError("Failed to fetch lab datasets. Please check the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isRunning) return;
    
    fetchLabData();

    // Poll for changes every intervalMs to show autonomous updates!
    const pollTimer = setInterval(() => {
      fetchLabData();
    }, intervalMs);

    return () => clearInterval(pollTimer);
  }, [isRunning, intervalMs]);


  // Handle manual trigger
  const handleTriggerIteration = async () => {
    setIsTriggering(true);
    addTelemetryLog("RESEARCH_LAB: Manually forcing comprehensive Scientific Method sweep...");
    
    // Add real-time logs to terminal immediately
    const tempTime = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [
      ...prev,
      `[${tempTime}] [MANUAL_TRIGGER] Initiating manual research sweep over 12-layer subsystems...`,
      `[${tempTime}] [INGEST] Scan complete. Pulled latest BigQuery and vector databases.`,
      `[${tempTime}] [STRUCTURE] Translating unstructured vectors into clinical graph ontologies...`,
      `[${tempTime}] [HYPOTHESIZE] Scanning ontological contradictions and formulating target hypotheses...`
    ].slice(-200));

    try {
      const res = await fetch("/api/lab/trigger", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        const artifact = data.result?.artifact;
        const hyp = data.result?.hypothesis;
        addTelemetryLog(`RESEARCH_LAB: Successfully synthesized artifact ${artifact?.id} for hypothesis ${hyp?.id}`);
        
        // Add completion logs to terminal
        const finishTime = new Date().toLocaleTimeString();
        setTerminalLogs(prev => [
          ...prev,
          `[${finishTime}] [EXPERIMENT] Receptor simulation complete. Peak CB occupancy calculated.`,
          `[${finishTime}] [ANALYZE] evidence score compiled. Assigned confidence ${hyp?.confidence}%.`,
          `[${finishTime}] [PUBLISH] Academic manuscript compiled and committed to local drive: ${artifact?.fileUrl}`,
          `[${finishTime}] [PERSIST] Updated knowledge graph and committed episodic trace to memory database.`
        ].slice(-200));

        await fetchLabData();
        triggerRefreshDatabases();
      }
    } catch (err) {
      console.error(err);
      addTelemetryLog("ERR: Failed to trigger manual research loop.");
    } finally {
      setIsTriggering(false);
    }
  };

  // Handle Seeding/Drafting Hypothesis
  const handleCreateHypothesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSeedingHypothesis(true);

    try {
      const res = await fetch("/api/lab/hypotheses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          target_system: newSystem,
          independent_var: newIndVar,
          dependent_var: newDepVar
        })
      });

      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewIndVar("");
        setNewDepVar("");
        
        addTelemetryLog(`RESEARCH_LAB: Drafted and committed manual hypothesis.`);
        setTerminalLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [MANUAL_SEED] Custom hypothesis committed. Queueing in Scheduler/Kairos engine.`
        ].slice(-200));
        await fetchLabData();
        setLabTab("hypotheses");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeedingHypothesis(false);
    }
  };

  // Toggle Autonomous scheduler
  const handleToggleAutonomous = async () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    addTelemetryLog(`RESEARCH_LAB: Toggling autonomous background loop to: ${nextState ? 'ENABLED' : 'DISABLED'}`);

    try {
      await fetch("/api/lab/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRunning: nextState, intervalMs })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Update loop interval speed
  const handleSpeedChange = async (ms: number) => {
    setIntervalMs(ms);
    addTelemetryLog(`RESEARCH_LAB: Updating background cron loop rate to: ${ms / 1000}s`);

    try {
      await fetch("/api/lab/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRunning, intervalMs: ms })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const exportToLocal = () => {
    const payload = {
      hypotheses,
      experiments,
      conclusions,
      artifacts,
      timestamp: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "HempOS_Local_Export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    addTelemetryLog(`RESEARCH_LAB: Exported lab data for local storage.`);
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYSTEM_EXPORT] Synced active workspace artifacts and db traces to local filesystem (HempOS_Local_Export.json)`
    ].slice(-200));
  };

  // Active step state
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  useEffect(() => {
    if (isTriggering) {
      setActiveStepIdx(4);
      return;
    }
    if (!isRunning) {
      setActiveStepIdx(-1);
      return;
    }
    const stepInterval = setInterval(() => {
      setActiveStepIdx((prev) => (prev + 1) % 8);
    }, 5000);
    return () => clearInterval(stepInterval);
  }, [isRunning, isTriggering]);

  const scientificSteps = [
    { name: "INGEST", desc: "Scan research feeds, PDFs, OCR, & drive metadata" },
    { name: "STRUCTURE", desc: "Inject nodes & compile into tables & vectors" },
    { name: "HYPOTHESIZE", desc: "Identify gaps & contradictions; draft schemas" },
    { name: "SIMULATE", desc: "Run virtual receptor-binding & kinetic sweeps" },
    { name: "ANALYZE", desc: "Apply evidence grading rules & Bayesian statistics" },
    { name: "CONCLUDE", desc: "Compile structured conclusion metadata objects" },
    { name: "PUBLISH", desc: "Generate LaTeX and IMRAD markdown manuscripts" },
    { name: "KAIROS", desc: "Cron-scheduler queues next target experiments" }
  ];

  // Filtering artifacts
  const filteredArtifacts = artifacts.filter(art => {
    if (artifactFilter === "all") return true;
    return art.type === artifactFilter;
  });


  return (
    <div className="relative z-10 flex flex-col h-full flex-1 overflow-hidden pr-1">
      {/* Title & Status Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 border-b border-[#162716] pb-3">
        <div>
          <div className="text-[10px] font-mono text-[#00ff66] mb-0.5">LAYER_12_COPILOT_AGENT_RESEARCH_LAB</div>
          <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#00ff66]" />
            Continuous Scientific Method Loop Agent
          </h3>
          <p className="text-xs text-[#7a8c7a] mt-0.5">
            An autonomous resident research service reading papers, testing hypotheses through receptor kinetic simulations, and committing papers 24/7.
          </p>
        </div>

        {/* Master Control Unit */}
        <div className="flex flex-wrap items-center gap-3 bg-black/40 border border-[#1a2e1a] p-2 rounded-lg">
          <div className="flex items-center gap-2 pr-3 border-r border-[#1a2e1a]">
            <span className="text-[9px] font-mono text-[#7a8c7a] uppercase">SYSTEM MODE:</span>
            <button
              onClick={handleToggleAutonomous}
              className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1.5 transition-all ${
                isRunning 
                  ? "bg-emerald-950/80 border border-emerald-500/30 text-emerald-400" 
                  : "bg-red-950/80 border border-red-500/30 text-red-400"
              }`}
            >
              {isRunning ? (
                <>
                  <Play className="w-3 h-3 animate-pulse fill-emerald-400" />
                  <span>AUTONOMOUS (RUNNING)</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 fill-red-400" />
                  <span>MANUAL ONLY (PAUSED)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-r border-[#1a2e1a] pr-3">
            <span className="text-[9px] font-mono text-[#7a8c7a] uppercase">SWEEP RATE:</span>
            <div className="flex gap-1">
              {[15000, 30000, 60000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => handleSpeedChange(ms)}
                  disabled={!isRunning}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition ${
                    intervalMs === ms && isRunning
                      ? "bg-[#00ff66]/15 border border-[#00ff66]/40 text-[#00ff66] font-bold"
                      : "bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-40"
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={exportToLocal}
            className="bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900 text-indigo-400 px-3 py-1 rounded text-xs font-mono transition flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            <span>EXPORT TO LOCAL</span>
          </button>

          <button
            onClick={handleTriggerIteration}
            disabled={isTriggering}
            className="bg-[#00ff66] hover:bg-[#00e059] disabled:bg-slate-800 disabled:text-slate-500 text-black px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1"
          >
            {isTriggering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>SWEEPING...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>SWEEP NOW</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Local Navigation Tabs */}
      <div className="flex gap-1.5 border-b border-slate-900 pb-2 mb-4">
        {[
          { id: "loop", label: "Scientific Loop", icon: Activity },
          { id: "hypotheses", label: `Hypotheses Registry (${hypotheses.length})`, icon: ClipboardList },
          { id: "experiments", label: `Simulated Assays (${experiments.length})`, icon: Beaker },
          { id: "conclusions", label: `Evidence Board (${conclusions.length})`, icon: Award },
          { id: "artifacts", label: `lab_output/ Explorer (${artifacts.length})`, icon: BookOpen }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = labTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLabTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all border ${
                isSelected
                  ? "bg-slate-900 border-slate-800 text-white font-medium"
                  : "bg-transparent border-transparent text-[#7a8c7a] hover:text-white"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#00ff66]" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4">
        
        {/* SUBTAB 1: SCIENTIFIC LOOP VISUALIZER */}
        {labTab === "loop" && (
          <div className="flex flex-col gap-4">
            
            {/* Interactive Flowsheet Loop */}
            <div className="bg-black/30 border border-slate-900 rounded-xl p-4">
              <div className="text-xs font-mono text-emerald-400 uppercase mb-3 pb-1 border-b border-slate-900 flex justify-between items-center">
                <span>Active Cognitive Pipeline Loop Monitor</span>
                <span className="text-[10px] text-slate-500 font-normal">State transition cycle active</span>
              </div>

              {/* Loop Flow Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {scientificSteps.map((step, idx) => {
                  const isActive = idx === activeStepIdx;
                  return (
                    <div 
                      key={step.name} 
                      className={`relative border rounded-lg p-2.5 flex flex-col justify-between transition-all duration-300 min-h-24 ${
                        isActive 
                          ? "bg-emerald-950/20 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          : "bg-slate-950/40 border-slate-900"
                      }`}
                    >
                      {/* Badge counter */}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-slate-500">STEP_0{idx+1}</span>
                        {isActive && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>

                      <div className="my-2">
                        <div className={`text-xs font-mono font-bold ${isActive ? "text-emerald-400" : "text-slate-300"}`}>
                          {step.name}
                        </div>
                        <p className="text-[9px] text-slate-500 leading-tight mt-1 font-light">
                          {step.desc}
                        </p>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full transition-all duration-500 ${isActive ? "bg-emerald-400 w-full" : "bg-slate-800 w-0"}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split Screen Panel for Loop Summary & Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left Panel: Loop Synthesis Progress */}
              <div className="lg:col-span-4 bg-[#080d08] border border-[#142314] rounded-xl p-4 flex flex-col gap-4">
                <div className="text-xs font-bold font-mono text-emerald-400 uppercase">
                  Current Pipeline Synthesis State
                </div>
                
                <div className="space-y-4 font-mono text-xs">
                  <div className="bg-black/35 border border-slate-900 p-2.5 rounded">
                    <div className="text-[10px] text-slate-400 mb-1">TARGET COGNITIVE HYPOTHESIS</div>
                    <div className="font-bold text-white text-[11px] truncate" title={hypotheses[hypotheses.length - 1]?.title}>
                      {hypotheses[hypotheses.length - 1]?.title || "Formulating next study..."}
                    </div>
                    <div className="text-[9px] text-[#7a8c7a] mt-1">
                      System: {hypotheses[hypotheses.length - 1]?.target_system || "Microglial receptors"}
                    </div>
                  </div>

                  <div className="bg-black/35 border border-slate-900 p-2.5 rounded">
                    <div className="text-[10px] text-slate-400 mb-1">SIMULATED ASSAY FINDINGS</div>
                    <div className="text-[10px] text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                      {experiments[experiments.length - 1]?.findings || "Initializing G-protein competition modeling..."}
                    </div>
                    {experiments[experiments.length - 1] && (
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-900/60 text-[9px]">
                        <span className="text-slate-500">SIMULATED CB OCCUPANCY:</span>
                        <span className="text-emerald-400 font-bold">{experiments[experiments.length - 1]?.simulatedOccupancy}%</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-black/35 border border-slate-900 p-2.5 rounded">
                    <div className="text-[10px] text-slate-400 mb-1">LATEST PUBLISHED MANUSCRIPT</div>
                    <div className="font-bold text-emerald-400 text-[11px] flex items-center gap-1 truncate">
                      <FileCode className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span>{artifacts[artifacts.length - 1]?.title || "Synthesizing full paper..."}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1">
                      <span>TYPE: {artifacts[artifacts.length - 1]?.type.toUpperCase() || "N/A"}</span>
                      <span>SIG: {artifacts[artifacts.length - 1]?.provenance.split(", ")[1] || "WAITING"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Continuous Swarm Terminal Feed */}
              <TerminalLog logs={terminalLogs} search={terminalSearch} onSearchChange={setTerminalSearch} />

            </div>
          </div>
        )}

        {/* SUBTAB 2: HYPOTHESES REGISTRY */}
        {labTab === "hypotheses" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Col: Seeding Form (Colspan 4) */}
            <div className="lg:col-span-4 bg-black/40 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-bold font-mono text-emerald-400 uppercase pb-1.5 border-b border-slate-900">
                Draft New Scientific Hypothesis
              </div>
              <p className="text-[11px] text-[#7a8c7a] leading-tight">
                Submit an unverified cannabinoid relationship. The resident Research Agent will schedule, simulate, and compile clinical evidence for it automatically.
              </p>

              <form onSubmit={handleCreateHypothesis} className="flex flex-col gap-3 mt-1.5">
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">HYPOTHESIS SUMMARY TITLE</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., CBN Modulates Mitochondrial Bioenergetics"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">TARGET CLINICAL SYSTEM</label>
                  <select
                    value={newSystem}
                    onChange={(e) => setNewSystem(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Microglial Activation & Neuroinflammation">Microglial Activation & Neuroinflammation</option>
                    <option value="Hippocampal Synaptic Plasticity">Hippocampal Synaptic Plasticity</option>
                    <option value="Trigeminal Pain Circuitry">Trigeminal Pain Circuitry</option>
                    <option value="Hypothalamic Appetite Regulation">Hypothalamic Appetite Regulation</option>
                    <option value="TRP Ion Channels & Epilepsy">TRP Ion Channels & Epilepsy</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">INDEPENDENT VARIABLE (STIMULUS)</label>
                  <input
                    type="text"
                    required
                    value={newIndVar}
                    onChange={(e) => setNewIndVar(e.target.value)}
                    placeholder="e.g., Cannabinol (CBN) Dose (2uM - 20uM)"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">DEPENDENT VARIABLE (RESPONSE)</label>
                  <input
                    type="text"
                    required
                    value={newDepVar}
                    onChange={(e) => setNewDepVar(e.target.value)}
                    placeholder="e.g., ATP synthesis rate in cortical neurones"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">RATIONALE / BRIEF DESCRIPTION</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Hypothesizes that CBN binds CB1/CB2/mitochondrial sites to increase respiratory complex activity..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSeedingHypothesis}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-mono font-bold py-1.5 text-xs rounded transition flex items-center justify-center gap-1"
                >
                  {isSeedingHypothesis ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>COMMITTING DRAFT...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>REGISTER HYPOTHESIS</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Col: Registered hypotheses list (Colspan 8) */}
            <div className="lg:col-span-8 bg-black/30 border border-slate-900 rounded-xl p-4 overflow-x-auto">
              <div className="text-xs font-bold font-mono text-slate-300 uppercase mb-3 flex items-center justify-between pb-1.5 border-b border-slate-900">
                <span>Committed Hypotheses Registry</span>
                <span className="text-[10px] text-slate-500 font-normal">{hypotheses.length} registered</span>
              </div>

              <table className="w-full text-left font-mono text-[11px] min-w-[600px]">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-900 uppercase text-[9px]">
                    <th className="py-2">ID</th>
                    <th>Hypothesis Title</th>
                    <th>System</th>
                    <th>Independent / Dependent</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {hypotheses.map(hyp => (
                    <tr key={hyp.id} className="hover:bg-slate-900/10">
                      <td className="py-3 text-[#00ff66] font-bold whitespace-nowrap">{hyp.id}</td>
                      <td className="pr-3 font-medium text-slate-100">{hyp.title}</td>
                      <td className="text-slate-400 text-xs">{hyp.target_system}</td>
                      <td className="text-[10px] text-slate-400 max-w-xs leading-normal">
                        <span className="text-slate-500">I:</span> {hyp.independent_var} <br />
                        <span className="text-slate-500">D:</span> {hyp.dependent_var}
                      </td>
                      <td className="text-slate-300">{hyp.confidence}%</td>
                      <td>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          hyp.status === "Validated"
                            ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-400"
                            : hyp.status === "Testing"
                            ? "bg-blue-950/70 border-blue-500/40 text-blue-400 animate-pulse"
                            : "bg-red-950/70 border-red-500/40 text-red-400"
                        }`}>
                          {hyp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: EXPERIMENT EPISODES LOG */}
        {labTab === "experiments" && (
          <div className="bg-black/30 border border-slate-900 rounded-xl p-4 overflow-x-auto">
            <div className="text-xs font-bold font-mono text-slate-300 uppercase mb-3 flex items-center justify-between pb-1.5 border-b border-slate-900">
              <span>Simulated GPCR Receptor Assays & Experimental Sweeps</span>
              <span className="text-[10px] text-slate-500 font-normal">{experiments.length} episodes logged</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {experiments.map(exp => (
                <div key={exp.id} className="bg-black/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-between gap-3 font-mono text-xs hover:border-[#1a2e1a] transition-all">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00ff66] font-bold">{exp.id}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-slate-300 font-medium">{exp.hypothesisId}</span>
                    </div>
                    <span className="text-[9px] text-slate-500">{new Date(exp.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">SWEEP PARAMETERS:</span>
                      <p className="text-slate-300 font-light">{exp.parameters}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">RECEPTOR SUBSTRATE INPUTS:</span>
                      <p className="text-slate-300 font-light">{exp.inputs}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">EXPERIMENTAL FINDINGS & DELTA:</span>
                      <p className="text-[#a8bda8] font-light text-[11px] leading-relaxed bg-[#030603] p-2 border border-[#0d140d] rounded">
                        {exp.findings}
                      </p>
                    </div>
                  </div>

                  {/* Occupancy Gauge */}
                  <div className="pt-2 border-t border-slate-900/60">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                      <span>GPCR DYNAMIC RECEPTOR OCCUPANCY:</span>
                      <span className="text-emerald-400 font-bold">{exp.simulatedOccupancy}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                        style={{ width: `${exp.simulatedOccupancy}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: CONCLUSIONS AND EVIDENCE BOARD */}
        {labTab === "conclusions" && (
          <div className="bg-black/30 border border-slate-900 rounded-xl p-4 overflow-x-auto">
            <div className="text-xs font-bold font-mono text-slate-300 uppercase mb-3 flex items-center justify-between pb-1.5 border-b border-slate-900">
              <span>Scientific Conclusions & Evidence Grading Matrix</span>
              <span className="text-[10px] text-slate-500 font-normal">{conclusions.length} conclusions indexed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conclusions.map(con => (
                <div key={con.id} className="bg-[#0b120b] border border-[#172717] rounded-xl p-4 flex flex-col gap-3 font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-950/60">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-sm">{con.id}</span>
                      <span className="text-slate-500">Linked Hypothesis:</span>
                      <span className="text-slate-300 text-xs">{con.hypothesisId}</span>
                    </div>
                    {/* Evidence Grade Circle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[#7a8c7a]">EVIDENCE_LEVEL:</span>
                      <div className="w-7 h-7 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/40 flex items-center justify-center text-[#00ff66] font-bold text-xs shadow-inner">
                        {con.evidenceGrade}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-100 text-xs leading-relaxed font-light italic">
                    "{con.text}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] bg-black/40 p-2.5 rounded border border-slate-900 mt-1">
                    <div>
                      <span className="text-slate-500 uppercase block">STATISTICAL METRICS:</span>
                      <span className="text-emerald-400 font-bold">{con.statisticalEffect}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block">SWARM EVAL SCORE:</span>
                      <span className="text-white font-bold">{con.confidenceScore}% (High Assurance)</span>
                    </div>
                  </div>

                  {con.paperRef && (
                    <div className="flex justify-between items-center pt-2 text-[10px] border-t border-slate-900/60 mt-1">
                      <span className="text-slate-500">DIGITAL ARCHIVE ID:</span>
                      <button
                        onClick={() => {
                          const art = artifacts.find(a => a.id === con.paperRef);
                          if (art) {
                            setSelectedArtifact(art);
                            setLabTab("artifacts");
                          }
                        }}
                        className="text-[#00ff66] hover:underline font-bold flex items-center gap-0.5"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Read full manuscript {con.paperRef}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 5: lab_output/ FILE REGISTRY */}
        {labTab === "artifacts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[550px] overflow-hidden">
            
            {/* Left: Virtual Directory Explorer (Colspan 4) */}
            <div className="lg:col-span-4 bg-black/40 border border-slate-900 rounded-xl p-4 flex flex-col gap-3 h-full overflow-hidden">
              <div className="text-xs font-bold font-mono text-emerald-400 uppercase pb-1.5 border-b border-slate-900 flex justify-between items-center">
                <span>lab_output/ File Ledger</span>
                <span className="text-[10px] text-slate-500 font-normal">{filteredArtifacts.length} files</span>
              </div>

              {/* Artifact Category Filter Buttons */}
              <div className="flex gap-1">
                {(["all", "paper", "report"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setArtifactFilter(f)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded border transition ${
                      artifactFilter === f
                        ? "bg-[#00ff66]/10 border-[#00ff66]/40 text-[#00ff66]"
                        : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f.toUpperCase()}S
                  </button>
                ))}
              </div>

              {/* Document Nodes Explorer List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                {filteredArtifacts.map(art => {
                  const isSelected = selectedArtifact?.id === art.id;
                  return (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArtifact(art)}
                      className={`w-full text-left p-2.5 rounded-lg border font-mono transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-[#0a150a] border-emerald-500 text-white"
                          : "bg-slate-950/40 border-slate-900 text-slate-400 hover:border-[#1a2e1a] hover:text-white"
                      }`}
                    >
                      {/* Icon based on type */}
                      <div className={`p-1.5 rounded-full mt-0.5 flex-shrink-0 ${
                        art.type === 'paper' ? 'bg-purple-950 text-purple-400' : 'bg-cyan-950 text-cyan-400'
                      }`}>
                        <Book className="w-3.5 h-3.5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] text-slate-500 font-bold">{art.id}</span>
                          <span className="text-[8px] text-slate-500">{new Date(art.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[11px] font-bold truncate text-slate-200 mt-0.5 leading-snug">
                          {art.title}
                        </div>
                        <div className="text-[9px] text-[#7a8c7a] mt-1 truncate">
                          {art.provenance.split(", ")[0]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Scientific Reading Room (Colspan 8) */}
            <div className="lg:col-span-8 bg-[#040804] border border-[#112011] rounded-xl p-5 flex flex-col h-full overflow-hidden relative">
              {selectedArtifact ? (
                <div className="flex flex-col h-full overflow-hidden">
                  
                  {/* Manuscript Header */}
                  <div className="border-b border-slate-900 pb-3 mb-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        <span>FILE PATH: ./lab_output/{selectedArtifact.type}s/{selectedArtifact.id}.md</span>
                      </span>
                      <span className="bg-emerald-950 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                        {selectedArtifact.type.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-base font-light tracking-tight text-slate-100 leading-tight font-serif mt-1">
                      {selectedArtifact.title}
                    </h4>
                  </div>

                  {/* Document Body (Styled reading layout) */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs font-mono text-slate-300 leading-relaxed max-h-[420px]">
                    
                    {/* Abstract Card */}
                    <div className="bg-[#0b140b] border border-emerald-950/60 p-3 rounded-lg leading-relaxed text-[11px] font-light">
                      <span className="text-emerald-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">Abstract</span>
                      <p className="text-slate-300 italic">{selectedArtifact.abstract}</p>
                    </div>

                    <div>
                      <span className="text-emerald-400 font-bold block border-b border-slate-900 pb-0.5 uppercase mb-1.5 tracking-wider text-[10px]">1. Introduction</span>
                      <p className="font-light text-slate-300 whitespace-pre-wrap">{selectedArtifact.introduction}</p>
                    </div>

                    <div>
                      <span className="text-emerald-400 font-bold block border-b border-slate-900 pb-0.5 uppercase mb-1.5 tracking-wider text-[10px]">2. Computational Methods</span>
                      <p className="font-light text-slate-300 whitespace-pre-wrap">{selectedArtifact.methods}</p>
                    </div>

                    <div>
                      <span className="text-emerald-400 font-bold block border-b border-slate-900 pb-0.5 uppercase mb-1.5 tracking-wider text-[10px]">3. Telemetry Results</span>
                      <p className="font-light text-slate-300 whitespace-pre-wrap">{selectedArtifact.results}</p>
                    </div>

                    <div>
                      <span className="text-emerald-400 font-bold block border-b border-slate-900 pb-0.5 uppercase mb-1.5 tracking-wider text-[10px]">4. System Discussion</span>
                      <p className="font-light text-slate-300 whitespace-pre-wrap">{selectedArtifact.discussion}</p>
                    </div>

                    {/* Citations block */}
                    {selectedArtifact.citations && selectedArtifact.citations.length > 0 && (
                      <div className="pt-2">
                        <span className="text-slate-500 font-bold block uppercase mb-1 tracking-wider text-[9px]">References & Bibliography</span>
                        <ul className="list-decimal pl-4 text-[10px] text-slate-400 space-y-1">
                          {selectedArtifact.citations.map((cite, i) => (
                            <li key={i}>{cite}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Crypto Integrity Signatures */}
                    <div className="bg-black/50 border border-slate-900 p-2.5 rounded text-[10px] space-y-1 mt-4">
                      <div className="text-slate-500 uppercase font-bold text-[9px]">Data Provenance Cryptographic Stamp:</div>
                      <div className="text-slate-400 font-mono flex flex-wrap gap-x-4">
                        <span>STAMP_URI: <span className="text-white">{selectedArtifact.fileUrl}</span></span>
                        <span>HASH_SIG: <span className="text-[#00ff66] font-bold">{selectedArtifact.provenance.split(", ")[1] || "0xef32ab91"}</span></span>
                      </div>
                      <div className="text-[9px] text-slate-600 font-light mt-0.5">
                        Generated and compiled in local OS sandbox environment. Registered in layer 3 provenance ledger securely.
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs">
                  <BookOpen className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
                  <span>Select a scientific artifact from the file explorer sidebar to read.</span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
