import React, { useRef, useEffect, useMemo } from "react";
import { Terminal } from "lucide-react";

interface TerminalLogProps {
  logs: string[];
  search: string;
  onSearchChange: (value: string) => void;
}

export function TerminalLog({ logs, search, onSearchChange }: TerminalLogProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  // Smart auto‑scroll: only if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 20;
    if (isNearBottom) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="bg-black border border-slate-900 rounded-xl p-4 flex flex-col gap-2 h-96">
      <div className="flex justify-between items-center border-b border-slate-900 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200">
            10-Agent Swarm Real-Time Telemetry Stream
          </span>
        </div>
        <input
          type="text"
          placeholder="Filter terminal logs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Filter terminal logs"
          className="bg-slate-900/60 border border-slate-800 text-[10px] px-2 py-0.5 rounded font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 w-44"
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 bg-[#020502] rounded border border-[#112011] p-3 font-mono text-[10px] text-emerald-400 overflow-y-auto leading-relaxed select-all"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 italic text-center py-10">
            No matching telemetry logs found.
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="hover:bg-emerald-950/20 px-1 py-0.5 rounded">
              <span className="text-slate-500 select-none mr-2">
                {(index + 1).toString().padStart(3, '0')}
              </span>
              <span>{log}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
