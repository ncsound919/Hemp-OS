
import React from 'react';
import { Thermometer, Clock, Repeat, Sparkles } from 'lucide-react';
import { WinterizationConfig, WINTERIZATION_PRESETS } from './types.ts';
import { RangeField, SelectField } from './Controls.tsx';

interface Props {
  config: WinterizationConfig;
  onUpdate: (newConfig: WinterizationConfig) => void;
}

export const WinterizationConfigurator: React.FC<Props> = ({ config, onUpdate }) => {
  const sectionTitleStyle = "text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2 pb-2 border-b border-[#1f1f21]";
  
  return (
    <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
      <div className={sectionTitleStyle}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-sky-400 flex items-center justify-center font-bold text-[10px]">W</span>
          WINTERIZATION CONFIGURATION
        </div>
        <button
          onClick={() => onUpdate(WINTERIZATION_PRESETS.autoTune)}
          className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          COPILOT AUTO-TUNE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RangeField
            label={<><span>Ethanol dilution ratio</span> <span className="font-mono text-sky-400 font-bold">{config.solventRatio.toFixed(1)} L/kg</span></>}
            value={config.solventRatio}
            min={1.0}
            max={15.0}
            step={0.5}
            onChange={(val) => onUpdate({ ...config, solventRatio: val })}
            accentColor="accent-sky-500"
        />
        <SelectField 
            label={<><Repeat className="w-3.5 h-3.5 text-teal-500" />Filter Passes</>}
            value={config.filtrationPasses}
            options={[
                { label: 'Single-stage (94% retention)', value: 1 },
                { label: 'Double-stage (99.6% retention)', value: 2 },
                { label: 'Triple-stage polish (99.9% retention)', value: 3 },
            ]}
            onChange={(val) => onUpdate({ ...config, filtrationPasses: Number(val) })}
            accentColorRing="focus:ring-sky-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RangeField
            label={<><Thermometer className="w-3.5 h-3.5 text-blue-500" />Chilling Temp</>}
            value={config.coolingTemp}
            min={-80}
            max={0}
            step={5}
            onChange={(val) => onUpdate({ ...config, coolingTemp: val })}
            accentColor="accent-sky-500"
        />
        <RangeField
            label={<><Clock className="w-3.5 h-3.5 text-amber-500" />Chilling Time</>}
            value={config.coolingTime}
            min={4}
            max={72}
            step={4}
            onChange={(val) => onUpdate({ ...config, coolingTime: val })}
            accentColor="accent-sky-500"
        />
      </div>
    </div>
  );
};
