import React from "react";
import { Sparkles, Loader2, Send, Compass, Network, ArrowRight, AlertTriangle, Brain, ShieldAlert } from "lucide-react";
import type { DeterministicExecutionTrace } from "../types";

interface OrchestratorPanelProps {
  isQuerying: boolean;
  orchestrationResult: DeterministicExecutionTrace | null;
  presetQueries: { label: string; query: string }[];
  triggerPreset: (query: string) => void;
  orchestratorQuery: string;
  setOrchestratorQuery: (val: string) => void;
  handleOrchestratorSubmit: (query: string) => void;
}

export function OrchestratorPanel({
  isQuerying,
  orchestrationResult,
  presetQueries,
  triggerPreset,
  orchestratorQuery,
  setOrchestratorQuery,
  handleOrchestratorSubmit,
}: OrchestratorPanelProps) {
  return (
    <div className="relative z-10 flex flex-col h-full flex-1">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_ORCHESTRATOR_AGENT_STAGE</div>
          <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00ff66]" />
            Cannabinoid Cognitive Synthesis Console
          </h3>
        </div>
        {orchestrationResult && (
          <div className="text-right">
            <div className="text-[10px] font-mono text-[#7a8c7a] uppercase">Orchestration Confidence</div>
            <div className="text-2xl font-mono text-[#00ff66] font-bold">
              {orchestrationResult.confidence}%
            </div>
          </div>
        )}
      </div>

      {/* Sub-agent Selector Presets */}
      <div className="mb-4">
        <div className="text-[10px] font-mono text-slate-400 mb-1.5">PRE-LOADED RESEARCH QUERIES (HEMP PLAYBOOKS)</div>
        <div className="flex flex-col md:flex-row gap-2">
          {presetQueries.map((item, index) => (
            <button
              key={index}
              onClick={() => triggerPreset(item.query)}
              disabled={isQuerying}
              className="text-left md:text-center text-[10px] px-3 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-[#00ff66]/40 hover:bg-slate-800 text-slate-300 transition duration-150 flex-1 truncate cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main query bar */}
      <div className="bg-black/40 border border-[#1a2e1a] rounded-lg p-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={orchestratorQuery}
              onChange={(e) => setOrchestratorQuery(e.target.value)}
              placeholder="Interrogate the cannabinoid core... e.g. How does high dose THC affect spatial memory?"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#00ff66] text-white"
              onKeyDown={(e) => e.key === "Enter" && handleOrchestratorSubmit(orchestratorQuery)}
            />
          </div>
          <button
            onClick={() => handleOrchestratorSubmit(orchestratorQuery)}
            disabled={isQuerying || !orchestratorQuery.trim()}
            className="bg-[#00ff66] text-black hover:bg-[#33ff88] disabled:bg-slate-800 disabled:text-slate-500 transition px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isQuerying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>RUN COGNITIVE ANALYZER</span>
          </button>
        </div>
      </div>

      {/* Result Block */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isQuerying ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <Loader2 className="w-10 h-10 text-[#00ff66] animate-spin mb-4" />
            <div className="text-sm font-mono text-[#00ff66] animate-pulse">10-AGENT DET_BRAIN KERNEL IN ACTIVE PIPELINE...</div>
            <div className="text-xs text-[#7a8c7a] mt-2 max-w-md font-mono">
              Executing Online Control Loop: Plan ➜ Retrieve ➜ Structure ➜ Verify ➜ Simulate ➜ Translate ➜ Evaluate ➜ Ephemeral cache bind.
            </div>
          </div>
        ) : orchestrationResult ? (
          <div className="flex-1 flex flex-col overflow-y-auto pr-1 gap-4">
            
            {/* Grid for Goal Decomposition & Meta-Eval */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Goal Decomposition */}
              <div className="md:col-span-2 bg-slate-950 border border-[#1a2e1a] p-3 rounded-lg font-mono text-[11px]">
                <div className="text-[#00ff66] uppercase font-bold text-[10px] mb-2 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>GOAL DECOMPOSITION LIST</span>
                </div>
                <ul className="space-y-1 text-slate-300">
                  {orchestrationResult.goalDecomposition?.map((g, idx) => (
                    <li key={idx} className="flex gap-2 items-start leading-normal">
                      <span className="text-[#00ff66]">[{idx + 1}]</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meta Evaluation Score */}
              <div className="bg-slate-950 border border-[#1a2e1a] p-3 rounded-lg flex flex-col items-center justify-center text-center font-mono">
                <div className="text-slate-400 uppercase font-bold text-[9px] mb-1">META_EVAL_SCORE</div>
                <div className="text-3xl font-bold text-[#00e5ff] tracking-tight">
                  {orchestrationResult.metaEvaluationScore}/10
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#00e5ff]" style={{ width: `${(orchestrationResult.metaEvaluationScore || 7.5) * 10}%` }}></div>
                </div>
                <div className="text-[9px] text-[#7a8c7a] mt-1.5 leading-tight">
                  Deterministic reliability graded by Meta-Evaluator
                </div>
              </div>
            </div>

            {/* Planned Workflow Chain */}
            <div className="bg-slate-950/60 border border-[#1a2e1a] p-3 rounded-lg font-mono text-[10px]">
              <div className="text-slate-400 uppercase font-bold mb-2 flex items-center gap-1">
                <Network className="w-3.5 h-3.5" />
                <span>SYNAPSED PIPELINE WORKFLOW PATHWAYS</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                {orchestrationResult.plannedWorkflow?.map((wf, idx) => (
                  <React.Fragment key={idx}>
                    <span className="px-2 py-0.5 bg-slate-900 rounded border border-[#1a2e1a] text-[#00ff66]">
                      {wf}
                    </span>
                    {idx < (orchestrationResult.plannedWorkflow?.length || 0) - 1 && (
                      <ArrowRight className="w-3 h-3 text-[#7a8c7a]" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Safety and Contradiction Alerts */}
            {(orchestrationResult.contradictionsFound && orchestrationResult.contradictionsFound.length > 0) || !orchestrationResult.safetyClearance ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contradictions */}
                {orchestrationResult.contradictionsFound && orchestrationResult.contradictionsFound.length > 0 && (
                  <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg font-mono text-[11px]">
                    <div className="text-rose-400 uppercase font-bold text-[10px] mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>CAUSAL CONTRADICTIONS DETECTED</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-rose-200">
                      {orchestrationResult.contradictionsFound.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Safety Clearance */}
                {!orchestrationResult.safetyClearance && (
                  <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-lg font-mono text-[11px]">
                    <div className="text-amber-400 uppercase font-bold text-[10px] mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>CONSTRAINT & SAFETY LIMITATION WARN</span>
                    </div>
                    <p className="text-amber-200 leading-normal">
                      High THC concentrations violate pediatric neurodevelopmental guidelines. Patient demographic constraints enforced.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Synthesized Output */}
            <div className="bg-[#00ff66]/5 border border-[#00ff66]/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-[#00ff66]" />
                <span className="text-[10px] font-mono text-[#00ff66] tracking-wider uppercase">SYNTHESIZED CLINICAL INFERENCE</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed font-light whitespace-pre-wrap">
                {orchestrationResult.summary}
              </p>
              {orchestrationResult.suggestedAction && (
                <div className="mt-3 pt-3 border-t border-[#1a2e1a] text-xs font-mono text-slate-400">
                  <span className="text-[#00ff66]">PLAYBOOK COMMAND SUGGESTED:</span> {orchestrationResult.suggestedAction}
                </div>
              )}
            </div>

            {/* Detailed Agent Breakdown Log */}
            <div>
              <div className="text-[10px] font-mono text-[#7a8c7a] uppercase mb-2">10-AGENT STEP-BY-STEP REPLAY MATRIX</div>
              <div className="space-y-3">
                {orchestrationResult.steps?.map((step: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-[#1a2e1a] rounded p-3 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-[#1a2e1a] pb-1.5 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#00ff66] font-bold">[{idx + 1}] {step.agentName}</span>
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1 py-0.2 rounded uppercase">
                          Duration: {step.durationMs}ms
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        step.status === "Success" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/20" : "bg-slate-900 text-slate-400"
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                      <div>
                        <span className="text-[#7a8c7a]">Query:</span> <span className="text-slate-100">{step.query}</span>
                      </div>
                      {step.toolUsed && (
                        <div>
                          <span className="text-[#00e5ff]">Tool Call:</span> <code className="bg-black/40 text-[#00e5ff] px-1 py-0.5 rounded text-[10px]">{step.toolUsed}</code>
                        </div>
                      )}
                      <div>
                        <span className="text-[#7a8c7a]">Output / Analysis:</span>
                        <p className="text-[11px] text-slate-300 bg-black/20 p-2 rounded mt-1 border border-slate-900 leading-normal font-sans">
                          {step.output}
                        </p>
                      </div>
                      {step.findings && step.findings.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[#7a8c7a] text-[10px] self-center">Matched Index:</span>
                          {step.findings.map((f: any, k: number) => (
                            <span key={k} className="text-[9px] bg-slate-900 text-[#00ff66] px-1.5 py-0.5 rounded border border-slate-800">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Agent Policy & Live Approvals Matrix */}
            <div className="mt-5 border-t border-slate-800/80 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Safety Agent Policy & Live Approvals Matrix</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active Rules List */}
                <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2 font-bold">Policy Matrix Rules</span>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-slate-900">
                      <span className="text-slate-300">RULE_DEMO_AGE_21</span>
                      <span className="text-red-400 font-bold bg-red-950/40 border border-red-900/40 px-1 py-0.2 rounded text-[9px]">ENFORCED</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-slate-900">
                      <span className="text-slate-300">RULE_THC_DOSAGE_LIMIT_30MG</span>
                      <span className="text-red-400 font-bold bg-red-950/40 border border-red-900/40 px-1 py-0.2 rounded text-[9px]">ENFORCED</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-slate-900">
                      <span className="text-slate-300">RULE_RESTRICTED_SYNTHESIS</span>
                      <span className="text-red-400 font-bold bg-red-950/40 border border-red-900/40 px-1 py-0.2 rounded text-[9px]">ENFORCED</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-slate-900">
                      <span className="text-slate-300">RULE_LETHAL_DOSAGE_INQUIRY</span>
                      <span className="text-red-400 font-bold bg-red-950/40 border border-red-900/40 px-1 py-0.2 rounded text-[9px]">ENFORCED</span>
                    </div>
                  </div>
                </div>

                {/* Live Clearance Approval State */}
                <div className={`border rounded-lg p-3 flex flex-col justify-between ${
                  orchestrationResult.safetyClearance
                    ? "bg-emerald-950/10 border-emerald-900/40 text-emerald-300"
                    : "bg-red-950/10 border-red-900/40 text-red-300"
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5 font-bold">Live Run Clearance Verdict</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-mono font-bold ${
                        orchestrationResult.safetyClearance ? "text-[#00ff66]" : "text-red-400"
                      }`}>
                        {orchestrationResult.safetyClearance ? "RUN_APPROVED_CLEARED" : "RUN_BLOCKED_VIOLATION"}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-sans text-slate-400 mt-2 leading-relaxed">
                      {orchestrationResult.safetyClearance
                        ? "All parsed queries, variables, and clinical parameters matched the permitted safe threshold matrices. No demographic blockages triggered."
                        : "The Safety Agent evaluated the active research parameters and triggered an override. Pediatric neurodevelopment protection active or chemical synthesis restriction violated."}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 text-[9px] font-mono text-slate-500 flex justify-between">
                    <span>Checked: {new Date(orchestrationResult.timestamp).toLocaleTimeString()}</span>
                    <span>Policy V1.2.5</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <Brain className="w-12 h-12 text-[#1a2e1a] mb-3" />
            <div className="text-sm font-semibold text-slate-400">THC Brain Informatics Core Standby</div>
            <div className="text-xs text-slate-500 max-w-sm mt-1">
              Select a pre-loaded query above or type a custom question to execute real-time neurobiological analysis.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
