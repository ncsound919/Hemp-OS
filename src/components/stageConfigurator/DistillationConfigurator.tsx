
import React from 'react';
import { Thermometer, Clock, Wind, Sparkles } from 'lucide-react';
import { DistillationConfig, DISTILLATION_PRESETS } from './types.ts';
import { RangeField } from './Controls.tsx';

interface Props {
  config: DistillationConfig;
  onUpdate: (newConfig: DistillationConfig) => void;
}

export const DistillationConfigurator: React.FC<Props> = ({ config, onUpdate }) => {
  const sectionTitleStyle = "text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2 pb-2 border-b border-[#1f1f21]";
  
  return (
    <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
      <div className={sectionTitleStyle}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-amber-400 flex items-center justify-center font-bold text-[10px]">M</span>
          DISTILLATION (WIPED-FILM MOLECULAR)
        </div>
        <button
          onClick={() => onUpdate(DISTILLATION_PRESETS.autoTune)}
          className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          COPILOT AUTO-TUNE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RangeField
            label={<><Thermometer className="w-3.5 h-3.5 text-red-500" />Evaporator Temp</>}
            value={config.evaporatorTemp}
            min={120}
            max={240}
            step={5}
            onChange={(val) => onUpdate({ ...config, evaporatorTemp: val })}
            accentColor="accent-amber-500"
        />
        <RangeField
            label={<><Thermometer className="w-3.5 h-3.5 text-amber-500" />Condenser Temp</>}
            value={config.condenserTemp}
            min={40}
            max={100}
            step={5}
            onChange={(val) => onUpdate({ ...config, condenserTemp: val })}
            accentColor="accent-amber-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RangeField
            label={<><Wind className="w-3.5 h-3.5 text-indigo-400" />Vacuum Pressure</>}
            value={config.vacuumPressure}
            min={0.001}
            max={0.500}
            step={0.005}
            onChange={(val) => onUpdate({ ...config, vacuumPressure: val })}
            accentColor="accent-amber-500"
        />
        <RangeField
            label={<><Clock className="w-3.5 h-3.5 text-indigo-400" />Wiper Feed Rate</>}
            value={config.feedRate}
            min={0.2}
            max={5.0}
            step={0.1}
            onChange={(val) => onUpdate({ ...config, feedRate: val })}
            accentColor="accent-amber-500"
        />
      </div>
    </div>
  );
};
