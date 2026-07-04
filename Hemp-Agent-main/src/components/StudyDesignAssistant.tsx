import React, { useState } from "react";
import { Microscope, Loader2, Save, Link as LinkIcon, AlertCircle } from "lucide-react";
import type { SimulationResult } from "../../types";

export function StudyDesignAssistant({ studiesData, onSaveEpisode, initialTargetSystem, initialCannabinoid }: { studiesData: any[], onSaveEpisode: (ep: any) => void, initialTargetSystem?: string, initialCannabinoid?: string }) {
  const [targetSystem, setTargetSystem] = useState(initialTargetSystem || "Microglial activation");
  const [cannabinoid, setCannabinoid] = useState(initialCannabinoid || "THC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [design, setDesign] = useState<any>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  React.useEffect(() => {
    if (initialTargetSystem) setTargetSystem(initialTargetSystem);
  }, [initialTargetSystem]);

  React.useEffect(() => {
    if (initialCannabinoid) setCannabinoid(initialCannabinoid);
  }, [initialCannabinoid]);

  const generateDesign = async () => {
    setLoading(true);
    setError(null);
    setSimulation(null);
    setDesign(null);

    try {
        // Generate design (simulated)
        const designData = {
            title: `Investigation of ${targetSystem} under Cannabinoid Influence`,
            protocolTemplate: "Double-blind, placebo-controlled in vivo study",
            doseRanges: "Low: 2mg/kg, High: 10mg/kg (THC/CBD 1:1)",
            sampleSize: "n=32 (16 per arm) to achieve 0.8 power for effect size 0.5",
            canonicalStudies: studiesData.filter(s => s.outcome.toLowerCase().includes(targetSystem.toLowerCase().split(' ')[0]) || s.brain_region.toLowerCase().includes("microglia")).map(s => s.id).slice(0, 3),
            cannabinoid,
            targetSystem
        };
        setDesign(designData);

        // Call the new simulation endpoint
        const res = await fetch("/api/lab/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(designData)
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: "Simulation failed" }));
            throw new Error(errData.error || "Simulation failed");
        }
        
        const simResult: SimulationResult = await res.json();
        setSimulation(simResult);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const saveEpisode = () => {
    if (design) {
      onSaveEpisode({
        id: `EXP-${Date.now()}`,
        hypothesis: design.title,
        status: "designed",
        design: { ...design, simulation }
      });
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-black/40 border border-[#1a2e1a] rounded-xl overflow-y-auto">
      <div className="flex items-center gap-2 text-white mb-6">
        <Microscope className="w-5 h-5 text-indigo-500" />
        <h2 className="text-xl font-light">Experimental Design Assistant</h2>
      </div>

      <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 mb-6">
        <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Parameters</label>
        <div className="flex gap-2 mb-3">
          <input 
            type="text" 
            value={targetSystem}
            onChange={e => setTargetSystem(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="Target System"
          />
          <input 
            type="text" 
            value={cannabinoid}
            onChange={e => setCannabinoid(e.target.value)}
            className="w-32 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="Cannabinoid"
          />
        </div>
        <button 
          onClick={generateDesign}
          disabled={loading || !targetSystem}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
          GENERATE DESIGN & SIMULATE
        </button>
      </div>

      {error && (
          <div className="bg-red-950/30 border border-red-500/50 p-4 rounded text-red-200 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5"/>
            {error}
          </div>
      )}

      {design && (
        <div className="bg-slate-900 p-6 rounded-lg border border-indigo-900/50 flex-1 flex flex-col">
          <h3 className="text-lg text-indigo-300 font-light mb-4">{design.title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase mb-1">Protocol Template</div>
                <div className="text-sm text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 font-mono">{design.protocolTemplate}</div>
              </div>
              {simulation && (
                <div className="bg-emerald-950/20 p-3 rounded border border-emerald-900/50">
                    <div className="text-[10px] text-emerald-500 uppercase mb-1">Simulation Result</div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-emerald-200">
                        <div>Effect Size: <span className="font-mono font-bold">{simulation.effectSize}</span></div>
                        <div>P-Value: <span className="font-mono font-bold">{simulation.pValue}</span></div>
                    </div>
                </div>
              )}
            </div>
            
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-2">Canonical Reference Studies</div>
              <div className="space-y-2">
                {design.canonicalStudies.length > 0 ? design.canonicalStudies.map((st: string) => (
                  <div key={st} className="flex items-center gap-2 text-sm bg-slate-950 p-2 rounded border border-slate-800">
                    <LinkIcon className="w-4 h-4 text-indigo-500" />
                    <span className="text-indigo-400 font-mono">{st}</span>
                  </div>
                )) : <div className="text-sm text-slate-500 italic">No direct canonical studies found.</div>}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={saveEpisode} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
              <Save className="w-4 h-4 text-[#00ff66]" />
              SAVE AS EXPERIMENT EPISODE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
