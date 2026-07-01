
import React, { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface PipelineTerminalProps {
  pipelineLogs: string[];
}

export const PipelineTerminal: React.FC<PipelineTerminalProps> = ({ pipelineLogs }) => {
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pipelineLogs]);

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-5 space-y-1.5">
      <span className="text-[9px] font-mono uppercase font-bold text-gray-400 block flex items-center gap-1.5">
        <Terminal className="w-3.5 h-3.5 text-purple-400" /> Pipeline Operations Output Terminal
      </span>
      <div className="h-[210px] bg-[#070708] border border-[#1c1c1f] rounded-xl p-4.5 overflow-y-auto font-mono text-[9.5px] text-[#818cf8] space-y-1.5">
        {pipelineLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 uppercase tracking-wider text-[8.5px]">
            Pipeline idle.
          </div>
        ) : (
          pipelineLogs.map((log, idx) => {
            let color = 'text-[#818cf8]';
            if (log.includes('✔️')) color = 'text-emerald-400 font-semibold';
            if (log.includes('🔧')) color = 'text-amber-400';
            if (log.includes('🧪') || log.includes('🚀')) color = 'text-purple-400 font-bold';
            if (log.includes('❌')) color = 'text-red-400 font-semibold';
            if (log.includes('🔍')) color = 'text-sky-400';
            return (
              <div key={idx} className={color}>
                {log}
              </div>
            );
          })
        )}
        <div ref={terminalBottomRef} />
      </div>
    </div>
  );
};
