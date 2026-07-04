import React, { useState } from "react";
import {
  Dna,
  Filter,
  ExternalLink,
  Activity,
  AlertCircle,
  Microscope,
} from "lucide-react";
import type { DeterministicExecutionTrace, Study, OmicsSignature } from "../types";

type OrchestratorMode =
  | "clinical"
  | "mechanistic"
  | "hypothesis"
  | "cultivator"
  | "notebook";

interface OmicsPanelProps {
  omicsData: OmicsSignature[];
  studiesData: Study[];
  onQueryOrchestrator: (
    query: string,
    mode?: OrchestratorMode
  ) => Promise<DeterministicExecutionTrace>;
  onGenerateDesign: (targetSystem: string, cannabinoid: string) => void;
}

export function OmicsPanel({
  omicsData,
  studiesData,
  onQueryOrchestrator,
  onGenerateDesign,
}: OmicsPanelProps) {
  const [filterTissue, setFilterTissue] = useState<string>("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTraceSummary, setLastTraceSummary] = useState<string | null>(null);

  const tissues = ["All", ...Array.from(new Set(omicsData.map((o) => o.tissue)))];

  const filtered =
    filterTissue === "All"
      ? omicsData
      : omicsData.filter((o) => o.tissue === filterTissue);

  const handleOmicsClick = async (o: OmicsSignature) => {
    setLoadingId(o.id);
    setError(null);
    setLastTraceSummary(null);

    try {
      const trace = await onQueryOrchestrator(
        `Explain the molecular mechanism of ${o.cannabinoid} in ${o.tissue}, focusing on pathways: ${o.pathwayEnrichment}.`,
        "mechanistic"
      );

      if (trace?.summary) {
        setLastTraceSummary(trace.summary);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to run mechanistic query.";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-black/40 border border-[#1a2e1a] rounded-xl overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white">
          <Dna className="w-5 h-5 text-fuchsia-500" />
          <h2 className="text-xl font-light">Omics & Pathways Console</h2>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterTissue}
            onChange={(e) => setFilterTissue(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-sm rounded px-2 py-1 text-slate-300"
          >
            {tissues.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-500/50 p-4 rounded text-red-200 mb-4 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {lastTraceSummary && (
        <div className="bg-slate-900/60 border border-slate-700 p-3 rounded mb-4 text-xs text-slate-200">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">
            Last Mechanistic Orchestrator Summary
          </div>
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap">
            {lastTraceSummary}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((o) => (
          <div
            key={o.id}
            className="bg-slate-950 border border-slate-800 rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono font-bold text-fuchsia-400">
                {o.id} - {o.cannabinoid}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  o.direction === "Upregulated"
                    ? "bg-emerald-900 text-emerald-400"
                    : "bg-rose-900 text-rose-400"
                }`}
              >
                {o.direction}
              </span>
            </div>

            <div className="text-sm text-slate-300 mb-1">
              <span className="text-slate-500">Tissue:</span> {o.tissue} (
              {o.species})
            </div>

            <div className="text-sm text-slate-300 mb-3">
              <span className="text-slate-500">Gene Set:</span>{" "}
              <span className="font-mono text-xs">
                {Array.isArray(o.geneset) ? o.geneset.join(", ") : o.geneset}
              </span>
            </div>

            <button
              type="button"
              className="w-full bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-400 mb-3 cursor-pointer hover:bg-slate-800 transition-colors text-left"
              onClick={() => handleOmicsClick(o)}
            >
              <Activity
                className={`w-3.5 h-3.5 inline mr-1 text-blue-400 ${
                  loadingId === o.id ? "animate-spin" : ""
                }`}
              />
              {loadingId === o.id
                ? "Analyzing Pathway..."
                : o.pathwayEnrichment}
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onGenerateDesign(o.tissue, o.cannabinoid)}
                className="text-[10px] bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 px-2 py-1 rounded flex items-center gap-1 cursor-pointer hover:bg-indigo-800/50"
              >
                <Microscope className="w-3 h-3" /> Design Study
              </button>

              {studiesData
                .filter(
                  (s) =>
                    s.cannabinoid === o.cannabinoid &&
                    s.brainregion &&
                    s.brainregion.toLowerCase().includes(o.tissue.toLowerCase())
                )
                .map((st) => (
                  <span
                    key={st.id}
                    className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> {st.id}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
