
import React from 'react';
import { Play } from 'lucide-react';

interface AutonomyPipelinePanelProps {
  isPipelineRunning: boolean;
  pipelineStep: number;
  researchQuery: string;
  setResearchQuery: (query: string) => void;
  triggerUnifiedPipeline: (isAuto: boolean) => Promise<void>;
  discoveredPaper: any;
}

export const AutonomyPipelinePanel: React.FC<AutonomyPipelinePanelProps> = ({
  isPipelineRunning,
  pipelineStep,
  researchQuery,
  setResearchQuery,
  triggerUnifiedPipeline,
  discoveredPaper
}) => {
  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-5 space-y-4">
      <div className="space-y-2">
        <label className="text-[9px] font-mono uppercase font-bold text-gray-400 block">
          Scientific Research Query / Discovery Target
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
            placeholder="e.g. Optimize CBDA isolate winterization cooling profiles..."
            className="flex-1 bg-[#0d0d0f] border border-[#1f1f21] rounded-xl px-3 py-2 text-[10.5px] text-white font-mono focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={() => triggerUnifiedPipeline(false)}
            disabled={isPipelineRunning}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-[#1a1a1c] disabled:text-[#444] text-white font-bold font-mono text-[9px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute Pipeline</span>
          </button>
        </div>
      </div>
      
      {/* Interactive Pipeline Progress indicators */}
      <div className="grid grid-cols-6 gap-2 bg-[#0a0a0b] p-3 rounded-xl border border-[#1f1f21]">
        {[
          { step: 1, label: 'PubMed API', desc: 'Retrieve papers' },
          { step: 2, label: 'Parser', desc: 'Auto-ingest' },
          { step: 3, label: 'Kaggle', desc: 'Calibrate' },
          { step: 4, label: 'Solver', desc: 'Simulate' },
          { step: 5, label: '3D Graph', desc: 'Capture' },
          { step: 6, label: 'G-Drive', desc: 'Upload' }
        ].map((s) => {
          const isActive = pipelineStep === s.step;
          const isDone = pipelineStep > s.step || (pipelineStep === 0 && discoveredPaper !== null);
          return (
            <div key={s.step} className="text-center space-y-1">
              <div className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center border font-mono text-[9.5px] font-bold ${
                isActive 
                  ? 'bg-purple-950/50 border-purple-500 text-purple-400 animate-pulse' 
                  : isDone 
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' 
                    : 'bg-[#121214] border-[#1f1f21] text-gray-600'
              }`}>
                {isDone ? '✓' : s.step}
              </div>
              <div>
                <p className={`text-[7.5px] uppercase font-bold tracking-tight ${isActive ? 'text-purple-400' : isDone ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {s.label}
                </p>
                <p className="text-[6.5px] font-mono text-gray-600 truncate">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
