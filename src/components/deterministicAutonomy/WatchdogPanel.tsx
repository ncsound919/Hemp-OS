
import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface WatchdogPanelProps {
  watchdogLogs: string[];
  isStressTesting: boolean;
  handleTriggerRunawaySimulation: () => void;
}

export const WatchdogPanel: React.FC<WatchdogPanelProps> = ({
  watchdogLogs,
  isStressTesting,
  handleTriggerRunawaySimulation
}) => {
  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Watchdog & Self-Healing
          </h4>
          <p className="text-[9.5px] text-gray-500 font-mono leading-relaxed">
            Monitors the active reactor simulation run for thermal anomalies or kinetic deviations. Automatically rolls back parameters outside physical bounds.
          </p>
          <button
            type="button"
            onClick={handleTriggerRunawaySimulation}
            disabled={isStressTesting}
            className="w-full px-4 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 hover:border-red-500 text-red-400 font-bold font-mono text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Stress Test Watchdog: Trigger Thermal Runaway
          </button>
        </div>

        <div className="lg:col-span-8 space-y-1.5">
          <span className="text-[8.5px] font-mono uppercase font-bold text-gray-500 block">Watchdog Activity Logs</span>
          <div className="bg-[#070708] border border-[#1a1a1c] rounded-xl p-4 font-mono text-[9.5px] text-emerald-400 h-[110px] overflow-y-auto space-y-1">
            {watchdogLogs.map((log, index) => {
              let color = 'text-emerald-400';
              if (log.includes('[ALERT]')) color = 'text-red-400 animate-pulse font-bold';
              if (log.includes('[WATCHDOG]')) color = 'text-amber-400 font-bold';
              return (
                <div key={index} className={color}>
                  &gt; {log}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
