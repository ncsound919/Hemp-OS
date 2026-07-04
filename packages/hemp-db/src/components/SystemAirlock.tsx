/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  RefreshCw, 
  Cpu, 
  Layers, 
  FlaskConical, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  ArrowRight,
  TrendingUp,
  FileCode
} from 'lucide-react';

interface QueueItem {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  entityType: string | null;
  errorMessage: string | null;
  createdAt: string;
  processingCompletedAt: string | null;
}

interface LogItem {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface ExperimentItem {
  id: number;
  name: string;
  hypothesis: string | null;
  methodology: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  results: any;
  createdAt: string;
}

interface SimulationItem {
  id: number;
  name: string;
  parameters: any;
  status: 'queued' | 'running' | 'completed' | 'failed';
  results: any;
  createdAt: string;
}

export function SystemAirlock() {
  // Ingestion status & log states
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [watchPath, setWatchPath] = useState('');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  // Custom file upload states
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadType, setUploadType] = useState<'strain' | 'study'>('strain');
  const [isUploading, setIsUploading] = useState(false);

  // Target database scraper states
  const [targetSource, setTargetSource] = useState('leafly');
  const [scrapeStrainName, setScrapeStrainName] = useState('Sour Diesel');
  const [isScraping, setIsScraping] = useState(false);

  // Experiments & simulations states
  const [experimentsList, setExperimentsList] = useState<ExperimentItem[]>([]);
  const [simulationsList, setSimulationsList] = useState<SimulationItem[]>([]);
  
  // New modal/form states
  const [expName, setExpName] = useState('');
  const [expHypothesis, setExpHypothesis] = useState('');
  
  const [simName, setSimName] = useState('');
  const [simDosage, setSimDosage] = useState('15');
  const [simRoute, setSimRoute] = useState('Sublingual');

  // Loading states
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load Status and Logs
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ingestion/status');
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.status.isRunning);
        setIsPaused(data.status.isPaused);
        setWatchPath(data.status.watchPath);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }, []);

  // Load File Queue
  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/ingestion/queue');
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  }, []);

  // Load Experiments & Simulations
  const loadTasks = useCallback(async () => {
    try {
      const [resExp, resSim] = await Promise.all([
        fetch('/api/experiments'),
        fetch('/api/simulations')
      ]);
      
      if (resExp.ok) {
        const dataExp = await resExp.json();
        setExperimentsList(dataExp.experiments || []);
      }
      
      if (resSim.ok) {
        const dataSim = await resSim.json();
        setSimulationsList(dataSim.simulations || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadStatus(), loadQueue(), loadTasks()]);
    setIsRefreshing(false);
  }, [loadStatus, loadQueue, loadTasks]);

  // Handle engine controls
  const controlEngine = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      const res = await fetch(`/api/ingestion/${action}`, { method: 'POST' });
      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error(`Failed to trigger ${action}:`, err);
    }
  };

  // Generate simulated file
  const triggerMockFile = async (type: 'strain' | 'study' | 'pharmacology') => {
    try {
      const res = await fetch('/api/ingestion/trigger-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error('Failed to trigger mock file:', err);
    }
  };

  // Submit actual uploaded file content
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadContent) return;

    try {
      setIsUploading(true);
      const suffix = uploadType === 'strain' ? '.json' : '.txt';
      const fullName = uploadName.endsWith(suffix) ? uploadName : `${uploadName}${suffix}`;
      
      const res = await fetch('/api/ingestion/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fullName,
          content: uploadContent,
        }),
      });

      if (res.ok) {
        setUploadName('');
        setUploadContent('');
        await refreshAll();
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Submit request to scrape target database
  const handleScrapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeStrainName) return;

    try {
      setIsScraping(true);
      const res = await fetch('/api/ingestion/scrape-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceKey: targetSource,
          strainName: scrapeStrainName,
        }),
      });

      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error('Target ingestion failed:', err);
    } finally {
      setIsScraping(false);
    }
  };

  // Queue a new experiment
  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName) return;

    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: expName,
          hypothesis: expHypothesis,
          methodology: 'In-Silico Bio-assay & receptor profiling',
        }),
      });

      if (res.ok) {
        setExpName('');
        setExpHypothesis('');
        await refreshAll();
      }
    } catch (err) {
      console.error('Failed to create experiment:', err);
    }
  };

  // Queue a new bio-simulation
  const handleCreateSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName) return;

    try {
      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: simName,
          parameters: {
            dosage: simDosage,
            route: simRoute,
          },
        }),
      });

      if (res.ok) {
        setSimName('');
        await refreshAll();
      }
    } catch (err) {
      console.error('Failed to create simulation:', err);
    }
  };

  // Auto-refresh stats on 3-second intervals
  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      loadStatus();
      loadQueue();
      loadTasks();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0B0C0E]">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A5C9B3] uppercase tracking-wider font-mono">
            <Cpu size={14} />
            <span>HEMP-OS INGESTION & CYBERNETIC CO-PROCESSOR</span>
          </div>
          <h2 className="text-3xl font-serif text-white italic mt-1">Autonomous Knowledge Airlock</h2>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            Connected directory: <span className="text-[#A5C9B3]">{watchPath || 'loading watch path...'}</span>
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded bg-[#131518] text-xs hover:bg-white/5 text-[#E0E2E5] disabled:opacity-50 cursor-pointer font-mono"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Control Panel & Simulated Generators */}
        <div className="space-y-6">
          
          {/* Engine Controls */}
          <div className="border border-white/10 rounded-lg p-5 bg-[#0F1113] relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isRunning ? (isPaused ? 'bg-amber-400' : 'bg-[#A5C9B3]') : 'bg-red-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isRunning ? (isPaused ? 'bg-amber-400' : 'bg-[#A5C9B3]') : 'bg-red-400'
                }`}></span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-gray-400">
                {isRunning ? (isPaused ? 'PAUSED' : 'ACTIVE') : 'STOPPED'}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-mono">
              Engine Operations
            </h3>

            {/* Controls Row */}
            <div className="flex flex-wrap gap-2 mb-5">
              {!isRunning ? (
                <button
                  onClick={() => controlEngine('start')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#A5C9B3] text-[#0F1113] rounded font-bold text-xs hover:bg-[#b8dbca] transition-all cursor-pointer font-mono"
                >
                  <Play size={14} fill="currentColor" />
                  START 24/7 WATCH
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={() => controlEngine('resume')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded font-bold text-xs hover:bg-emerald-500/30 transition-all cursor-pointer font-mono"
                    >
                      <Play size={14} fill="currentColor" />
                      RESUME
                    </button>
                  ) : (
                    <button
                      onClick={() => controlEngine('pause')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-bold text-xs hover:bg-amber-500/30 transition-all cursor-pointer font-mono"
                    >
                      <Pause size={14} fill="currentColor" />
                      PAUSE
                    </button>
                  )}
                  <button
                    onClick={() => controlEngine('stop')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded font-bold text-xs hover:bg-red-500/30 transition-all cursor-pointer font-mono"
                  >
                    <Square size={14} fill="currentColor" />
                    STOP
                  </button>
                </>
              )}
            </div>

            {/* Simulated file triggers */}
            <div className="border-t border-white/5 pt-4">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block mb-2">
                Simulated Ingestion Airlock
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => triggerMockFile('strain')}
                  className="w-full flex items-center justify-between text-left p-2.5 rounded bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer text-xs"
                >
                  <span className="text-white font-medium">Generate Lab Report COA</span>
                  <span className="text-[10px] bg-[#A5C9B3]/10 text-[#A5C9B3] px-2 py-0.5 rounded font-mono">JSON</span>
                </button>
                <button
                  onClick={() => triggerMockFile('study')}
                  className="w-full flex items-center justify-between text-left p-2.5 rounded bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer text-xs"
                >
                  <span className="text-white font-medium">Generate Preclinical Study</span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">TXT</span>
                </button>
                <button
                  onClick={() => triggerMockFile('pharmacology')}
                  className="w-full flex items-center justify-between text-left p-2.5 rounded bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer text-xs"
                >
                  <span className="text-white font-medium">Generate Pharmacology Paper</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-mono">TXT</span>
                </button>
              </div>
            </div>
          </div>

          {/* Target Web Ingester */}
          <div className="border border-[#A5C9B3]/20 rounded-lg p-5 bg-[#0F1113] relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#A5C9B3]/5 rounded-full blur-xl pointer-events-none"></div>
            
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2.5 font-mono flex items-center gap-1.5">
              <RefreshCw size={13} className={`text-[#A5C9B3] ${isScraping ? 'animate-spin' : ''}`} />
              <span>Target Web Ingester</span>
            </h3>
            
            <p className="text-[11px] text-gray-400 mb-3.5 font-sans leading-relaxed">
              Query, scrape, and download high-fidelity strain profiles and clinical papers directly from target registries to your monitored folder.
            </p>

            <form onSubmit={handleScrapeSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Select Target Registry</label>
                <select
                  value={targetSource}
                  onChange={e => {
                    setTargetSource(e.target.value);
                    // Autofill popular strains for convenience
                    const presets: Record<string, string> = {
                      cannaconnection: 'Amnesia Haze',
                      leafly: 'Gelato',
                      straindataproject: 'Jack Herer'
                    };
                    setScrapeStrainName(presets[e.target.value] || 'Sour Diesel');
                  }}
                  className="w-full bg-[#181a1d] border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-[#A5C9B3] font-mono cursor-pointer"
                >
                  <option value="leafly">Leafly (leafly.com/strains)</option>
                  <option value="cannaconnection">CannaConnection (cannaconnection.com/strains)</option>
                  <option value="straindataproject">Strain Data Project (straindataproject.org)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Strain Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Sour Diesel, Jack Herer"
                  value={scrapeStrainName}
                  onChange={e => setScrapeStrainName(e.target.value)}
                  className="w-full bg-[#181a1d] border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-[#A5C9B3] font-mono"
                  required
                />
              </div>

              {/* Presets Row */}
              <div>
                <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1.5">Database Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { source: 'leafly', label: 'Gelato', strain: 'Gelato' },
                    { source: 'cannaconnection', label: 'Amnesia', strain: 'Amnesia Haze' },
                    { source: 'straindataproject', label: 'Jack Herer', strain: 'Jack Herer' }
                  ].map(p => (
                    <button
                      key={p.source}
                      type="button"
                      onClick={() => {
                        setTargetSource(p.source);
                        setScrapeStrainName(p.strain);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                        targetSource === p.source
                          ? 'bg-[#A5C9B3]/10 border-[#A5C9B3] text-[#A5C9B3]'
                          : 'border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isScraping || !scrapeStrainName}
                className="w-full py-2 bg-[#A5C9B3] text-[#0F1113] rounded font-bold text-xs hover:bg-[#b8dbca] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 font-mono"
              >
                <RefreshCw size={12} className={isScraping ? 'animate-spin' : ''} />
                {isScraping ? 'EXTRACTING FROM URL...' : 'RUN WEB INGEST & SCRAPE'}
              </button>
            </form>
          </div>

          {/* Actual Manual Airlock Upload */}
          <div className="border border-white/10 rounded-lg p-5 bg-[#0F1113]">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 font-mono">
              Manual File Ingest
            </h3>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase">Document/Strain Name</label>
                <input
                  type="text"
                  placeholder="e.g. strain_og_kush_details"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-[#A5C9B3] font-mono mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Airlock Extraction Template</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadType('strain');
                      setUploadContent(JSON.stringify({
                        name: uploadName || "Local Strain",
                        type: "indica",
                        thc: "18.5%",
                        cbd: "0.2%",
                        terpenes: "Myrcene: 0.75%, Limonene: 0.35%",
                        effects: "Deep relaxation, sleepiness",
                        medicalUses: "Severe insomnia, spinal spasms"
                      }, null, 2));
                    }}
                    className={`flex-1 py-1 text-[11px] font-mono rounded border transition-all ${
                      uploadType === 'strain' 
                        ? 'bg-[#A5C9B3]/10 border-[#A5C9B3] text-[#A5C9B3]' 
                        : 'border-white/5 hover:bg-white/5 text-gray-400'
                    }`}
                  >
                    Strain COA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadType('study');
                      setUploadContent(
`TITLE: Clinical Trial on ${uploadName || "Cannabinoid Action"}
AUTHORS: Lead Researcher, Ph.D.
YEAR: 2026
JOURNAL: Phytotherapy Quarterly
DOI: 10.5555/local.${Math.floor(Math.random() * 10000)}
ABSTRACT: Provide abstract text.
POPULATION: 30 subjects
DOSE: 20mg sublingual
ROUTE: Sublingual
OUTCOMES: Clinical biomarkers improved by 34%.`
                      );
                    }}
                    className={`flex-1 py-1 text-[11px] font-mono rounded border transition-all ${
                      uploadType === 'study' 
                        ? 'bg-[#A5C9B3]/10 border-[#A5C9B3] text-[#A5C9B3]' 
                        : 'border-white/5 hover:bg-white/5 text-gray-400'
                    }`}
                  >
                    Clinical Paper
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase">File Raw Contents</label>
                <textarea
                  rows={4}
                  placeholder={uploadType === 'strain' ? 'JSON schema data...' : 'Full academic text content...'}
                  value={uploadContent}
                  onChange={e => setUploadContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-[#A5C9B3] font-mono mt-1 h-28 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isUploading || !uploadName || !uploadContent}
                className="w-full py-2 bg-white/5 border border-white/10 text-white rounded font-bold text-xs hover:bg-[#A5C9B3] hover:text-[#0F1113] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 font-mono"
              >
                <Upload size={12} />
                {isUploading ? 'INGESTING...' : 'INGEST FILE'}
              </button>
            </form>
          </div>

        </div>

        {/* Column 2: Ingestion Queue Monitor & File Logs */}
        <div className="space-y-6">
          
          {/* File Processing Queue */}
          <div className="border border-white/10 rounded-lg p-5 bg-[#0F1113] flex flex-col h-[340px]">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 font-mono flex items-center justify-between">
              <span>Ingestion Queue</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 font-normal">
                {queue.length} Total
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {queue.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                  No queue history
                </div>
              ) : (
                queue.map(item => (
                  <div key={item.id} className="p-3 bg-white/5 rounded border border-white/5 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white font-mono line-clamp-1 flex-1 pr-2">
                        {item.fileName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        item.status === 'completed' ? 'bg-[#A5C9B3]/10 text-[#A5C9B3]' :
                        item.status === 'processing' ? 'bg-amber-500/10 text-amber-400' :
                        item.status === 'pending' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>Type: {item.fileType.toUpperCase()} • {item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : 'N/A'}</span>
                      <span className="text-gray-600">ID: {item.id}</span>
                    </div>

                    {item.errorMessage && (
                      <p className="text-[10px] text-red-400 font-mono bg-red-950/20 p-1 rounded mt-1 border border-red-500/10">
                        Error: {item.errorMessage}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cybernetic Experiments & Bio-Simulations */}
          <div className="border border-white/10 rounded-lg p-5 bg-[#0F1113] flex flex-col h-[340px]">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 font-mono">
              Dynamic Lab Simulator
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              
              {/* Form to queue experiment */}
              <form onSubmit={handleCreateExperiment} className="p-3 bg-white/5 rounded border border-white/10 space-y-2">
                <span className="text-[10px] text-gray-400 font-mono uppercase block font-semibold text-[#A5C9B3]">
                  Queue In-Silico Experiment
                </span>
                <input
                  type="text"
                  placeholder="Experiment Title (e.g., CB1 Receptor Synapse)"
                  value={expName}
                  onChange={e => setExpName(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded p-1.5 text-xs text-white focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Hypothesis Statement"
                  value={expHypothesis}
                  onChange={e => setExpHypothesis(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded p-1.5 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-1 bg-[#A5C9B3] text-[#0F1113] font-bold text-[10px] rounded hover:opacity-90 font-mono transition-all cursor-pointer"
                >
                  RUN EXPERIMENT
                </button>
              </form>

              {/* Form to queue bio-simulation */}
              <form onSubmit={handleCreateSimulation} className="p-3 bg-white/5 rounded border border-white/10 space-y-2">
                <span className="text-[10px] text-gray-400 font-mono uppercase block font-semibold text-blue-400">
                  Queue Bio-Kinetic Simulation
                </span>
                <input
                  type="text"
                  placeholder="Simulation Name (e.g., CYP2C9 Ingestion Rate)"
                  value={simName}
                  onChange={e => setSimName(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded p-1.5 text-xs text-white focus:outline-none"
                  required
                />
                <div className="flex gap-2 text-xs">
                  <div className="flex-1">
                    <span className="text-[9px] text-gray-500 font-mono block">Dose (mg)</span>
                    <input
                      type="number"
                      value={simDosage}
                      onChange={e => setSimDosage(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded p-1 text-white text-center focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] text-gray-500 font-mono block">Delivery Route</span>
                    <select
                      value={simRoute}
                      onChange={e => setSimRoute(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded p-1 text-white text-center focus:outline-none font-mono text-[10px]"
                    >
                      <option value="Sublingual">Sublingual</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Oral">Oral</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1 bg-blue-500 text-white font-bold text-[10px] rounded hover:opacity-90 font-mono transition-all cursor-pointer"
                >
                  RUN SIMULATION
                </button>
              </form>

            </div>
          </div>

        </div>

        {/* Column 3: Cybernetic Terminal Logger & Run Outputs */}
        <div className="space-y-6">
          
          {/* Terminal Logs */}
          <div className="border border-white/10 rounded-lg p-5 bg-[#0A0B0D] flex flex-col h-[340px] font-mono">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 font-sans flex items-center gap-2">
              <Terminal size={14} className="text-[#A5C9B3]" />
              <span>Cybernetic Terminal logs</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600">
                  Awaiting operational signals...
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border-b border-white/5 pb-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold ${
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-amber-400' :
                        'text-blue-400'
                      }`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-gray-600 text-[9px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 mt-0.5">{log.message}</p>
                    {log.details && (
                      <p className="text-gray-500 text-[10px] mt-0.5 pl-2 border-l border-white/10">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Lab Runs, Experiments, and Simulations Viewer */}
          <div className="border border-white/10 rounded-lg p-5 bg-[#0F1113] flex flex-col h-[340px]">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 font-mono flex items-center gap-1.5">
              <FlaskConical size={14} className="text-purple-400" />
              <span>Co-Processor Lab Results</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              
              {/* Experiments list output */}
              {experimentsList.length === 0 && simulationsList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                  No simulations or experiments logged
                </div>
              ) : (
                <>
                  {experimentsList.map(exp => (
                    <div key={`exp-${exp.id}`} className="p-3 bg-white/5 rounded border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white font-mono flex items-center gap-1">
                          <FlaskConical size={11} className="text-[#A5C9B3]" />
                          {exp.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                          exp.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                          exp.status === 'running' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-blue-500/15 text-blue-400'
                        }`}>
                          {exp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans italic">
                        "Hypothesis: {exp.hypothesis || 'None'}"
                      </p>
                      {exp.status === 'completed' && exp.results && (
                        <div className="bg-black/40 p-2 rounded text-[10px] font-mono text-gray-400 space-y-1 border border-white/5">
                          <div className="flex justify-between">
                            <span>Sample Size:</span>
                            <span className="text-white">{exp.results.sampleSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>p-value:</span>
                            <span className={exp.results.pValue < 0.05 ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                              {exp.results.pValue}
                            </span>
                          </div>
                          <div className="text-[9px] text-[#A5C9B3] mt-1 border-t border-white/5 pt-1">
                            {exp.results.clinicalOutcome}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {simulationsList.map(sim => (
                    <div key={`sim-${sim.id}`} className="p-3 bg-white/5 rounded border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white font-mono flex items-center gap-1">
                          <TrendingUp size={11} className="text-blue-400" />
                          {sim.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                          sim.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                          sim.status === 'running' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-blue-500/15 text-blue-400'
                        }`}>
                          {sim.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono">
                        Route: {sim.parameters?.route || 'Oral'} ({sim.parameters?.dosage || '15'}mg)
                      </p>
                      {sim.status === 'completed' && sim.results && (
                        <div className="bg-black/40 p-2 rounded text-[10px] font-mono text-gray-400 space-y-1 border border-white/5">
                          <div className="flex justify-between">
                            <span>Bioavailability:</span>
                            <span className="text-white">{sim.results.bioavailability}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cmax (Plasma):</span>
                            <span className="text-white">{sim.results.plasmaKineticCurves?.cMaxUgL} ug/L</span>
                          </div>
                          <div className="flex justify-between text-[#A5C9B3] font-semibold mt-1 border-t border-white/5 pt-1">
                            <span>CB1 Affinity:</span>
                            <span>{sim.results.cb1Affinity}nM</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
