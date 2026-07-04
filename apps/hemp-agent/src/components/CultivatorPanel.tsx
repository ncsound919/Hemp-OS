import React, { useState } from "react";
import { Leaf, TestTube, AlertTriangle, ShieldCheck, Loader2, Save } from "lucide-react";
import type { DeterministicExecutionTrace, ChemotypeProfile } from "../types";

type OrchestratorMode = "clinical" | "mechanistic" | "hypothesis" | "cultivator" | "notebook";

interface CultivatorPanelProps {
  onQueryOrchestrator: (query: string, mode?: OrchestratorMode) => Promise<DeterministicExecutionTrace>;
  onGenerateDesign: (targetSystem: string, cannabinoid: string) => void;
  onSaveChemotype: (profile: ChemotypeProfile) => Promise<void>;
}

export function CultivatorPanel({ onQueryOrchestrator, onGenerateDesign, onSaveChemotype }: CultivatorPanelProps) {
  const [thc, setThc] = useState<number>(20);
  const [cbd, setCbd] = useState<number>(5);
  const [terpenes, setTerpenes] = useState("Myrcene, Pinene");
  const [minor, setMinor] = useState("CBG, CBN");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  const simulate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cultivator/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thc, cbd, terpenes, minorCannabinoids: minor })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
      setSaving(true);
      try {
          await onSaveChemotype({
              thc,
              cbd,
              simulation: {
                  confidence: result?.confidence || 70,
                  riskScore: result?.risk_score,
                  notes: result?.clinical_summary
              }
          });
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-black/40 border border-[#1a2e1a] rounded-xl overflow-y-auto">
      <div className="flex items-center gap-2 text-white mb-6">
        <Leaf className="w-5 h-5 text-emerald-500" />
        <h2 className="text-xl font-light">Cultivator Chemotype Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Profile Definition</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">THC (%)</label>
              <input type="range" min="0" max="40" value={thc} onChange={e => setThc(Number(e.target.value))} className="w-full accent-emerald-500" />
              <div className="text-right text-emerald-400 font-mono text-sm">{thc}%</div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">CBD (%)</label>
              <input type="range" min="0" max="40" value={cbd} onChange={e => setCbd(Number(e.target.value))} className="w-full accent-blue-500" />
              <div className="text-right text-blue-400 font-mono text-sm">{cbd}%</div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Terpenes</label>
              <input type="text" value={terpenes} onChange={e => setTerpenes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Minor Cannabinoids</label>
              <input type="text" value={minor} onChange={e => setMinor(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" />
            </div>
            <button onClick={simulate} disabled={loading} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded text-sm font-bold tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              SIMULATE BINDING & RISK
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Predicted Pharmacodynamics</h3>
            
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-900 p-3 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">CB1 Occupancy</div>
                  <div className="text-2xl font-mono text-fuchsia-400">{result.cb1_occupancy}%</div>
                </div>
                <div className="flex-1 bg-slate-900 p-3 rounded border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">CB2 Occupancy</div>
                  <div className="text-2xl font-mono text-blue-400">{result.cb2_occupancy}%</div>
                </div>
              </div>

              <div className={`p-4 rounded border ${result.risk_score > 50 ? 'bg-red-900/20 border-red-900/50' : 'bg-emerald-900/20 border-emerald-900/50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    {result.risk_score > 50 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    Neurodevelopmental Risk Score
                  </div>
                  <div className={`text-xl font-mono font-bold ${result.risk_score > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {result.risk_score}/100
                  </div>
                </div>
                <p className="text-xs text-slate-300">{result.clinical_summary}</p>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded text-xs font-bold tracking-wider flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                  SAVE CHEMOTYPE TO GRAPH
              </button>

              {result.protective_factors && result.protective_factors.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Protective Factors Identified</div>
                  <ul className="text-xs text-blue-300 list-disc pl-4 space-y-1">
                    {result.protective_factors.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
