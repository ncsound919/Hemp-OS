
import React from 'react';
import { Clock } from 'lucide-react';
import { CronJob } from './types.ts';

interface CronDaemonPanelProps {
  cronJobs: CronJob[];
  isCronEnabled: boolean;
  cronCountdown: number;
  setIsCronEnabled: (enabled: boolean) => void;
  handleToggleJob: (id: string) => void;
  handleRunJobNow: (name: string) => void;
}

export const CronDaemonPanel: React.FC<CronDaemonPanelProps> = ({
  cronJobs,
  isCronEnabled,
  cronCountdown,
  setIsCronEnabled,
  handleToggleJob,
  handleRunJobNow
}) => {
  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Registered Cron Daemons</h3>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter mt-1">
            Deterministic schedules regulating process graph boundaries and backtesting coefficients
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCronEnabled(!isCronEnabled)}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 ${
            isCronEnabled
              ? 'bg-purple-950/40 border border-purple-500 text-purple-300'
              : 'text-gray-500 hover:text-white bg-[#0d0d0f]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Cron: {isCronEnabled ? `ON (${cronCountdown}s)` : 'OFF'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cronJobs.map((job) => (
          <div 
            key={job.id} 
            className={`p-4 bg-[#0d0d0f] border rounded-xl flex flex-col justify-between transition-all ${
              job.status === 'active' ? 'border-purple-500/20' : 'border-[#1f1f21] opacity-60'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold text-white uppercase tracking-wide truncate max-w-[170px]">{job.name}</span>
                <span className={`px-2 py-0.5 rounded text-[7.5px] font-mono uppercase font-bold tracking-wider ${
                  job.status === 'active' 
                    ? 'bg-purple-950/40 border border-purple-500/30 text-purple-300' 
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-500'
                }`}>
                  {job.status}
                </span>
              </div>
              <div className="text-[8px] font-mono text-[#555] space-y-0.5 uppercase tracking-wide">
                <p>Schedule: {job.schedule}</p>
                <p>Last Run: {job.lastRun}</p>
                <p>Next Run: {job.nextRun}</p>
                <p className="text-gray-400 mt-1">Action: {job.action}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 border-t border-[#1a1a1c] pt-3">
              <button
                type="button"
                onClick={() => handleToggleJob(job.id)}
                className="flex-1 px-2.5 py-1 bg-[#161619] border border-[#2d2d30] text-gray-400 hover:text-white font-mono text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all"
              >
                {job.status === 'active' ? 'Pause' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => handleRunJobNow(job.name)}
                className="flex-1 px-2.5 py-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/20 text-purple-300 font-mono text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all"
              >
                Run Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
