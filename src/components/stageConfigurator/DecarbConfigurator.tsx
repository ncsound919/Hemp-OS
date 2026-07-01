
import React from 'react';
import { Thermometer, Clock, Sparkles } from 'lucide-react';
import { DecarbConfig, DECARB_PRESETS } from './types.ts';
import { RangeField } from './Controls.tsx';

interface Props {
  config: DecarbConfig;
  onUpdate: (newConfig: DecarbConfig) => void;
}

export const DecarbConfigurator: React.FC<Props> = ({ config, onUpdate }) => {
  const sectionTitleStyle = "text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2 pb-2 border-b border-[#1f1f21]";
  
  return (
    <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
      <div className={sectionTitleStyle}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-purple-400 flex items-center justify-center font-bold text-[10px]">D</span>
          DECARBOXYLATION KINETICS CONFIG
        </div>
        <button
          onClick={() => onUpdate(DECARB_PRESETS.autoTune)}
          className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          COPILOT AUTO-TUNE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RangeField
            label={<><Thermometer className="w-3.5 h-3.5 text-purple-400" />Reaction Temp</>}
            value={config.temperature}
            min={80}
            max={180}
            step={5}
            onChange={(val) => onUpdate({ ...config, temperature: val })}
            accentColor="accent-purple-500"
        />
        <RangeField
            label={<><Clock className="w-3.5 h-3.5 text-amber-500" />Duration</>}
            value={config.duration}
            min={10}
            max={240}
            step={5}
            onChange={(val) => onUpdate({ ...config, duration: val })}
            accentColor="accent-purple-500"
        />
      </div>
    </div>
  );
};
