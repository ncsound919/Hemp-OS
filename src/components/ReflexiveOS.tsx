import React, { useState, useEffect } from 'react';
import { 
  Activity, Shield, Cpu, RefreshCw, AlertTriangle, CheckCircle, 
  Settings, Zap, ArrowRight, Play, Eye, RotateCcw, Lock, FileText, Check, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HealthCheck {
  id: string;
  name: string;
  type: 'test' | 'performance' | 'anomaly' | 'workflow';
  status: 'passed' | 'warning' | 'failed';
  value: string;
  expected: string;
  timestamp: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  category: 'model_parameters' | 'winterization_curve' | 'validation_rule' | 'campaign_type';
  status: 'pending_review' | 'applied' | 'rejected';
  confidence: number;
  patchCode: string;
}

interface ChangeLogEntry {
  id: string;
  timestamp: string;
  action: string;
  type: 'heal' | 'improve' | 'rollback';
  details: string;
  target: string;
}

export function ReflexiveOS() {
  // --- STATE ---
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { id: 'hc-1', name: 'Winterization Temp Decay Test', type: 'test', status: 'passed', value: '-39.8°C / s', expected: '-38.0°C / s to -42.0°C / s', timestamp: 'Just now' },
    { id: 'hc-2', name: 'Decarboxylation Kinetics Chi-Squared Fit', type: 'performance', status: 'passed', value: 'r² = 0.994', expected: 'r² >= 0.990', timestamp: '2 mins ago' },
    { id: 'hc-3', name: 'Methanol Solvent Residual Purity Check', type: 'anomaly', status: 'passed', value: '99.98% purity', expected: '>= 99.90%', timestamp: '5 mins ago' },
    { id: 'hc-4', name: 'Extraction Stage Pressure Profile', type: 'workflow', status: 'passed', value: '1.02 atm', expected: '1.00 atm to 1.05 atm', timestamp: '10 mins ago' },
  ]);

  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: 'prop-1',
      title: 'Refine Decarboxylation Arrhenius Frequency Factor',
      description: 'Optimize the frequency factor (A) for strain-specific CBD conversion from 2.4e11 to 2.46e11 based on literature dataset fit discrepancies.',
      impact: 'Medium',
      category: 'model_parameters',
      status: 'pending_review',
      confidence: 96.8,
      patchCode: `// Patch-Code: Arrhenius-Decarb-A\nconst original_A = 2.4e11;\nconst optimized_A = 2.46e11; // calibrated against book research\nexport const getDecarbRate = (T) => optimized_A * Math.exp(-Ea / (R * T));`
    },
    {
      id: 'prop-2',
      title: 'Winterization Lipid Spillover Protection Trigger',
      description: 'Enforce a strict validation rule to halt campaigns if feed lipid concentrations exceed 15% under non-freezing temperatures.',
      impact: 'High',
      category: 'validation_rule',
      status: 'pending_review',
      confidence: 94.2,
      patchCode: `// Patch-Code: SafeGuard-Lipid-Spillover\nif (biomass.lipidConcentration > 0.15 && stage.config.temperature > -20) {\n  throw new Error("Critical Safety violation: Winterization lipid bypass threat.");\n}`
    },
    {
      id: 'prop-3',
      title: 'Tune Carrier Oil Distillation Vacuum Curve Bounds',
      description: 'Narrow acceptable pressure tolerances in multi-stage fractionation to mitigate terpene thermal degradation hazards.',
      impact: 'Low',
      category: 'winterization_curve',
      status: 'applied',
      confidence: 89.1,
      patchCode: `// Patch-Code: Distill-Vacuum-Cap\nconst p_max = 0.005; // Tightened from 0.01 atm`
    }
  ]);

  const [logs, setLogs] = useState<ChangeLogEntry[]>([
    { id: 'log-1', timestamp: '2026-06-30 08:30:12', action: 'Auto-applied strategy tune', type: 'improve', details: 'Upgraded Recursive heuristic search policy from Conservative Bayesian to Adaptive Exploration.', target: 'ImprovementEngine_v1' },
    { id: 'log-2', timestamp: '2026-06-30 08:24:45', action: 'System Self-Heal', type: 'heal', details: 'Auto-resolved fleeting sensor drift on Winterization vessel sensor B by switching to auxiliary sensor grid C.', target: 'SensorIntegrityMonitor' },
  ]);

  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'engine' | 'governance' | 'recursive'>('monitor');
  const [isSimulatingFault, setIsSimulatingFault] = useState(false);
  const [activePolicy, setActivePolicy] = useState<'safe' | 'balanced' | 'autonomous'>('balanced');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [recursiveStrategy, setRecursiveStrategy] = useState<'gradient' | 'genetic' | 'llm_meta'>('llm_meta');

  // --- FAULT SIMULATOR LOGIC ---
  const handleSimulateFault = () => {
    setIsSimulatingFault(true);
    
    // 1. Instantly trigger warning on Methanol Solvent residuals
    setHealthChecks(prev => 
      prev.map(hc => hc.id === 'hc-3' 
        ? { ...hc, status: 'failed', value: '98.42% (Warning: Heavy lipid co-solubility)', timestamp: 'Just now' } 
        : hc
      )
    );

    // 2. Add log of the self-aware detection
    const newLogId = `log-${Date.now()}`;
    const detectionLog: ChangeLogEntry = {
      id: `${newLogId}-det`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'Anomaly Detected',
      type: 'heal',
      details: 'Detected sudden drop in Methanol solvent purity (98.42%). Expected: >=99.90%. Indicated: Solvent carryover with high lipid fraction.',
      target: 'Methanol Solvent Residual Purity Check'
    };
    setLogs(prev => [detectionLog, ...prev]);

    // 3. Trigger autonomic repair sequence in 3 seconds
    setTimeout(() => {
      // Heal the status
      setHealthChecks(prev => 
        prev.map(hc => hc.id === 'hc-3' 
          ? { ...hc, status: 'passed', value: '99.94% (Auto-Re-fractioned & Regenerated)', timestamp: 'Just now' } 
          : hc
        )
      );

      // Add healing logs
      const healingLog1: ChangeLogEntry = {
        id: `${newLogId}-heal1`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Autonomic Self-Healing Triggered',
        type: 'heal',
        details: 'Self-healing triggered. Initiating dynamic solvent re-fractionation task. Quarantined fraction code [M_QUAR_412].',
        target: 'SolventRegenerationSubsystem'
      };
      
      const healingLog2: ChangeLogEntry = {
        id: `${newLogId}-heal2`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Workflow Fully Repaired',
        type: 'heal',
        details: 'Solvent purity restored to 99.94%. No campaign failures occurred. Recovery completed in 2.8s.',
        target: 'SystemIntegrityMonitor'
      };

      setLogs(prev => [healingLog2, healingLog1, ...prev]);
      setIsSimulatingFault(false);
    }, 3500);
  };

  // --- IMPROVEMENT PROPOSAL LOGIC ---
  const handleApplyProposal = (propId: string) => {
    setProposals(prev => 
      prev.map(p => p.id === propId ? { ...p, status: 'applied' } : p)
    );

    const prop = proposals.find(p => p.id === propId);
    if (prop) {
      const newLog: ChangeLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Proposal Manually Applied',
        type: 'improve',
        details: `Successfully deployed improvement patch for "${prop.title}". Verification code generated.`,
        target: prop.id
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const handleRollbackProposal = (propId: string) => {
    setProposals(prev => 
      prev.map(p => p.id === propId ? { ...p, status: 'pending_review' } : p)
    );

    const prop = proposals.find(p => p.id === propId);
    if (prop) {
      const newLog: ChangeLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Patch Rolled Back',
        type: 'rollback',
        details: `Deterministic rollback executed on "${prop.title}". Reverted back to previous stable constants.`,
        target: prop.id
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
              Reflexive Subsystem <span className="text-[#666] font-normal italic">Level 4</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">
            Autonomic Diagnostics & Recursive Model Improvement Suite
          </p>
        </div>

        {/* Diagnostic Tabs */}
        <div className="flex gap-1.5 p-1 bg-[#060607] border border-[#1f1f21] rounded-xl self-start">
          {[
            { id: 'monitor', label: 'Health Monitor', icon: Activity },
            { id: 'engine', label: 'Improvement Engine', icon: Cpu },
            { id: 'governance', label: 'Governance & Rollout', icon: Shield },
            { id: 'recursive', label: 'Recursive Strategies', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  active 
                    ? 'bg-[#1b1b1e] text-indigo-400 border border-indigo-500/20 shadow-md' 
                    : 'text-[#666] hover:text-[#aaa]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          
          {/* ==================== TAB 1: HEALTH MONITOR ==================== */}
          {activeSubTab === 'monitor' && (
            <motion.div
              key="monitor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest font-bold">Autonomic Status</span>
                    <h3 className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      SECURE
                    </h3>
                  </div>
                  <p className="text-[9.5px] text-[#777] font-sans mt-3 leading-relaxed">
                    Zero unresolved failures or structural anomalies detected in the science kernel. Operating under optimal thermodynamic constraints.
                  </p>
                </div>

                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest font-bold">Kinetics Accuracy</span>
                    <h3 className="text-xl font-bold font-mono text-indigo-400 mt-1">
                      99.42% <span className="text-[10px] text-[#555]">avg confidence</span>
                    </h3>
                  </div>
                  <p className="text-[9.5px] text-[#777] font-sans mt-3 leading-relaxed">
                    Arrhenius and mass-balance equations calibrated to historical experiment runs and Google Drive scientific literature corpus.
                  </p>
                </div>

                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest font-bold">Autonomic Healing</span>
                    <button
                      type="button"
                      onClick={handleSimulateFault}
                      disabled={isSimulatingFault}
                      className={`w-full mt-2.5 py-2 px-3 border text-[9px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isSimulatingFault 
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' 
                          : 'bg-[#1b1b1e] border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/20'
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${isSimulatingFault ? 'animate-spin' : ''}`} />
                      {isSimulatingFault ? 'Simulating Fault & Repairing...' : 'Simulate Solvent Fault'}
                    </button>
                  </div>
                  <p className="text-[8px] text-[#555] font-mono mt-2 leading-tight">
                    Simulates solvent carryover contamination. The system will detect, log, quarantine the fraction, and automatically recover.
                  </p>
                </div>
              </div>

              {/* Health Checks List */}
              <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3 mb-4">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                    Real-time Science Kernel Integrity Tests
                  </h3>
                  <span className="text-[8.5px] text-[#555] font-mono uppercase">
                    Continuous monitoring (4 checks)
                  </span>
                </div>
                <div className="space-y-2">
                  {healthChecks.map((hc) => (
                    <div 
                      key={hc.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between transition-all ${
                        hc.status === 'failed' 
                          ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]' 
                          : 'bg-[#0b0b0c] border-[#1d1d20]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          hc.status === 'passed' ? 'bg-emerald-950/20 text-emerald-400' : 'bg-red-950/20 text-red-400 animate-pulse'
                        }`}>
                          {hc.status === 'passed' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider">{hc.name}</p>
                          <p className="text-[8.5px] text-[#555] font-mono mt-0.5">
                            Type: <span className="text-[#888]">{hc.type}</span> &bull; Checked: {hc.timestamp}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[9px]">
                        <p className={`font-bold ${hc.status === 'passed' ? 'text-[#aaa]' : 'text-red-400 font-bold'}`}>
                          Value: {hc.value}
                        </p>
                        <p className="text-[#555] mt-0.5">Expected: {hc.expected}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Autonomic Healing & Upgrade Logs */}
              <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3 mb-4">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                    Deterministic Healing & Rollback Logs
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setLogs([])}
                    className="text-[8px] text-red-400 hover:text-red-300 uppercase tracking-widest font-mono"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px]">
                  {logs.length === 0 ? (
                    <div className="text-center py-6 text-[#555]">
                      No autonomic actions recorded in this session.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="p-2 bg-[#0b0b0c] border border-[#1c1c1f] rounded-lg flex items-start gap-2.5">
                        <span className={`px-1 rounded text-[7px] uppercase font-bold tracking-wider mt-0.5 ${
                          log.type === 'heal' 
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' 
                            : log.type === 'rollback'
                            ? 'bg-red-950/40 text-red-400 border border-red-500/20'
                            : 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {log.type}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#888] font-bold">{log.action}</span>
                            <span className="text-[#444] text-[8px]">{log.timestamp}</span>
                          </div>
                          <p className="text-[#666] mt-1 leading-snug">{log.details}</p>
                          <p className="text-[#444] text-[7.5px] mt-0.5 uppercase tracking-widest">Target: {log.target}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== TAB 2: IMPROVEMENT ENGINE ==================== */}
          {activeSubTab === 'engine' && (
            <motion.div
              key="engine"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Proposals List (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
                  <div className="flex justify-between items-center border-b border-[#1f1f21] pb-3 mb-4">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                      Generated Upgrades & Tuning Proposals
                    </h3>
                    <span className="text-[8px] px-2 py-0.5 bg-indigo-950/30 text-indigo-400 rounded border border-indigo-500/10 font-mono">
                      Refinement Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {proposals.map((prop) => (
                      <div 
                        key={prop.id} 
                        onClick={() => setSelectedProposal(prop)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedProposal?.id === prop.id 
                            ? 'bg-[#1b1b1e] border-indigo-500/50 shadow-md shadow-indigo-500/5' 
                            : 'bg-[#0d0d0f] border-[#1d1d20] hover:bg-[#121214]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                prop.impact === 'High' 
                                  ? 'bg-red-950/40 text-red-400 border-red-500/20' 
                                  : prop.impact === 'Medium'
                                  ? 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-950/40 text-blue-400 border-blue-500/20'
                              }`}>
                                {prop.impact} Impact
                              </span>
                              <span className="text-[7.5px] font-mono uppercase tracking-widest text-gray-500">
                                {prop.category.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="text-[10.5px] font-bold text-white tracking-wide uppercase mt-1">
                              {prop.title}
                            </h4>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-indigo-400">{prop.confidence}%</span>
                            <p className="text-[7.5px] text-[#555] uppercase tracking-wider">Confidence</p>
                          </div>
                        </div>

                        <p className="text-[9px] text-[#777] mt-2.5 leading-relaxed">
                          {prop.description}
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1f1f21] text-[9px] font-mono">
                          <span className={`flex items-center gap-1 ${
                            prop.status === 'applied' ? 'text-emerald-400 font-bold' : 'text-amber-500'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              prop.status === 'applied' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
                            }`} />
                            {prop.status === 'applied' ? 'DEPLOYED / IMMUTABLE' : 'PENDING HUMAN APPROVAL'}
                          </span>
                          <span className="text-[#555] hover:text-white flex items-center gap-1">
                            View Patched Logic <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Proposal Inspector & Sandbox (5 cols) */}
              <div className="lg:col-span-5">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 sticky top-4 min-h-[400px] flex flex-col justify-between">
                  {selectedProposal ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start border-b border-[#1f1f21] pb-3">
                          <div>
                            <span className="text-[7.5px] font-mono text-indigo-400 uppercase tracking-widest">Proposal Inspect</span>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">
                              {selectedProposal.title}
                            </h4>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setSelectedProposal(null)}
                            className="text-[9px] text-[#666] hover:text-white"
                          >
                            Close
                          </button>
                        </div>

                        <div className="mt-3.5 p-3 bg-[#0d0d0f] border border-[#1c1c1f] rounded-xl">
                          <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest">Impact Description</span>
                          <p className="text-[9.5px] text-[#888] mt-1 leading-relaxed">
                            The adaptive calibration layer scanned under-explored chemical regions and generated this optimization. Applying this changes internal parameters with zero workflow disruption.
                          </p>
                        </div>

                        {/* Code Patch Preview */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                              <FileText className="w-3 h-3" /> PROPOSAL_PATCH_DRAFT.TXT
                            </span>
                            <span className="text-[7px] text-[#555] font-mono uppercase">TypeScript Syntax</span>
                          </div>
                          <pre className="p-3 bg-[#070708] border border-[#1d1d20] rounded-xl text-[8.5px] font-mono text-[#a5b4fc] overflow-x-auto leading-relaxed">
                            {selectedProposal.patchCode}
                          </pre>
                        </div>
                      </div>

                      {/* Action buttons with rollout safety policies */}
                      <div className="pt-4 border-t border-[#1f1f21] space-y-2">
                        {selectedProposal.status === 'applied' ? (
                          <button
                            type="button"
                            onClick={() => handleRollbackProposal(selectedProposal.id)}
                            className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-red-300 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Deterministic Rollback to Stable
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyProposal(selectedProposal.id)}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve & Auto-Patch
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProposals(prev => prev.filter(p => p.id !== selectedProposal.id));
                                setSelectedProposal(null);
                              }}
                              className="py-2 px-3 bg-[#1b1b1e] hover:bg-red-950/30 border border-[#2c2c30] hover:border-red-500/20 text-[#666] hover:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        <p className="text-[7.5px] text-[#555] text-center font-mono uppercase tracking-tight">
                          *Bounded by Policy GW-1: Code upgrades require manual review.
                        </p>
                      </div>
                    </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#555]">
                        <Cpu className="w-10 h-10 mb-2 text-[#2a2a2d]" />
                        <p className="text-[10px] font-mono uppercase tracking-widest font-bold">Proposal Inspector</p>
                        <p className="text-[9.5px] text-[#666] mt-1.5 max-w-xs leading-relaxed">
                          Select any generated tuning or parameter proposal to view the scientific code patch, safety validation parameters, and initiate rollout.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== TAB 3: GOVERNANCE & ROLLOUT ==================== */}
          {activeSubTab === 'governance' && (
            <motion.div
              key="governance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Policies panel */}
              <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3 mb-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                      Reflexive OS Safety Policies & Verification Gates
                    </h3>
                    <p className="text-[8.5px] text-gray-500 font-mono">Deterministic boundaries governing automatic adjustments</p>
                  </div>
                  
                  {/* Selector */}
                  <div className="flex gap-1.5 bg-[#060607] border border-[#1c1c1e] p-1 rounded-lg">
                    {[
                      { id: 'safe', label: 'Strict' },
                      { id: 'balanced', label: 'Balanced' },
                      { id: 'autonomous', label: 'Autonomous' }
                    ].map((pol) => (
                      <button
                        key={pol.id}
                        type="button"
                        onClick={() => setActivePolicy(pol.id as any)}
                        className={`px-2 py-1 text-[8.5px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                          activePolicy === pol.id 
                            ? 'bg-[#1b1b1e] text-indigo-400' 
                            : 'text-[#555] hover:text-[#888]'
                        }`}
                      >
                        {pol.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 border rounded-xl transition-all ${activePolicy === 'safe' ? 'bg-indigo-950/10 border-indigo-500/30' : 'bg-[#0b0b0c] border-[#1c1c1f]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold font-mono text-indigo-400">Strict Safety Mode</span>
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <ul className="text-[9.5px] text-gray-400 mt-3 space-y-2 leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span>All proposals require explicit human review. No auto-patches.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span>Aggressive quarantine constraints for any sensor drifts.</span>
                      </li>
                    </ul>
                  </div>

                  <div className={`p-4 border rounded-xl transition-all ${activePolicy === 'balanced' ? 'bg-indigo-950/10 border-indigo-500/30' : 'bg-[#0b0b0c] border-[#1c1c1f]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold font-mono text-emerald-400">Balanced Auto-Heal</span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <ul className="text-[9.5px] text-gray-400 mt-3 space-y-2 leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Auto-healing and sensor restoration enabled.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Kinetics adjustments & code patches require review.</span>
                      </li>
                    </ul>
                  </div>

                  <div className={`p-4 border rounded-xl transition-all ${activePolicy === 'autonomous' ? 'bg-indigo-950/10 border-indigo-500/30' : 'bg-[#0b0b0c] border-[#1c1c1f]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold font-mono text-amber-500 animate-pulse">Recursive Agent-led</span>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <ul className="text-[9.5px] text-gray-400 mt-3 space-y-2 leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span>Fully autonomous optimization. System writes and rolls out patches.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span>Automatic rollback upon detection of any test failures.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Integrity checks state & change history */}
              <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3 mb-4">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                    Deterministic Change Log & Rollback Ledger
                  </h3>
                  <span className="text-[8.5px] text-[#555] font-mono">Verified Immutable Audit Trail</span>
                </div>
                
                <div className="space-y-2 font-mono text-[9px]">
                  <div className="p-3 bg-[#0b0b0c] border border-[#1c1c1f] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold uppercase">[SYS_UPDATE_042] Tune winterization threshold constraints</p>
                      <p className="text-[#555] text-[8.5px] mt-0.5">Committed: 2026-06-30 08:05:14 &bull; Type: Configuration Upgrade</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Rolling back SYS_UPDATE_042 to last known stable...')}
                      className="px-2 py-1 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 rounded-lg text-[8px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Rollback
                    </button>
                  </div>

                  <div className="p-3 bg-[#0b0b0c] border border-[#1c1c1f] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[#888] font-bold uppercase">[SYS_UPDATE_041] Set decarboxylation Ea rate constant limit</p>
                      <p className="text-[#555] text-[8.5px] mt-0.5">Committed: 2026-06-30 07:42:01 &bull; Type: Kinetic Threshold</p>
                    </div>
                    <span className="text-[8.5px] text-[#444] font-bold uppercase mr-2">Core Constant (Locked)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== TAB 4: RECURSIVE STRATEGIES ==================== */}
          {activeSubTab === 'recursive' && (
            <motion.div
              key="recursive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-5">
                <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3 mb-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                      Recursive Meta-Tuning Agent Settings
                    </h3>
                    <p className="text-[8.5px] text-gray-500 font-mono">How the system refines its own self-improvement heuristics</p>
                  </div>
                  <span className="text-[8.5px] text-indigo-400 font-mono uppercase tracking-widest animate-pulse font-bold">
                    [RECURSION_LAYER_ACTIVE]
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'gradient', label: 'Conservative Bayesian', desc: 'Minimizes noise by relying strictly on verified historical calibrations and low-risk gradient updates. Prevents parameter explosions.', speed: 'Slow & Deterministic' },
                    { id: 'genetic', label: 'Genetic Parameter Search', desc: 'Runs multi-run hyperparameter optimization campaigns on secondary sandboxed thread pools to evolve better kinetic heuristics.', speed: 'Medium Iteration' },
                    { id: 'llm_meta', label: 'Adaptive LLM-Guided Heuristics', desc: 'Uses Gemini-led semantic evaluation of scientific textbooks synced from Google Drive to propose high-level chemical logic rewrites.', speed: 'Highly Intelligent & Dynamic' }
                  ].map((strat) => (
                    <div 
                      key={strat.id}
                      onClick={() => setRecursiveStrategy(strat.id as any)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        recursiveStrategy === strat.id 
                          ? 'bg-indigo-950/15 border-indigo-500/50 shadow-md' 
                          : 'bg-[#0b0b0c] border-[#1c1c1f] hover:bg-[#121214]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`text-[10.5px] font-bold uppercase tracking-wider ${
                          recursiveStrategy === strat.id ? 'text-indigo-400' : 'text-white'
                        }`}>
                          {strat.label}
                        </h4>
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      </div>
                      <p className="text-[9.5px] text-gray-400 leading-relaxed mb-4">
                        {strat.desc}
                      </p>
                      <div className="flex justify-between items-center text-[7.5px] font-mono text-[#555] uppercase tracking-widest pt-2.5 border-t border-[#1c1c1f]">
                        <span>Speed Profile</span>
                        <span className={recursiveStrategy === strat.id ? 'text-indigo-400 font-bold' : ''}>{strat.speed}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-xl p-4 mt-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                      Recursion Strategy Applied Successfully
                    </span>
                  </div>
                  <p className="text-[9.5px] text-[#777] font-sans leading-relaxed">
                    By targeting the mechanisms of improvement themselves, HempForge adapts not just the model values, but the speed, temperature, and lipid filtration heuristics dynamically. This ensures that when the chemical model meets complex strains, it automatically discovers superior extraction routes without losing safety or thermodynamic control.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
