
import React from 'react';
import { Thermometer, Clock, Wind, Sparkles } from 'lucide-react';
import { ExtractionConfig, EXTRACTION_PRESETS } from './types.ts';
import { RangeField, SelectField } from './Controls.tsx';

interface Props {
  config: ExtractionConfig;
  onUpdate: (newConfig: ExtractionConfig) => void;
}

export const ExtractionConfigurator: React.FC<Props> = ({ config, onUpdate }) => {
  const sectionTitleStyle = "text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2 pb-2 border-b border-[#1f1f21]";
  
  return (
    <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
      <div className={sectionTitleStyle}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-blue-400 flex items-center justify-center font-bold text-[10px]">E</span>
          EXTRACTION CONFIGURATION
        </div>
        <button
          onClick={() => onUpdate(EXTRACTION_PRESETS.autoTune)}
          className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          COPILOT AUTO-TUNE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField 
            label="Solvent Type"
            value={config.solventType}
            options={[
                { label: 'Ethanol (Cold Wash)', value: 'Ethanol' },
                { label: 'Supercritical CO2', value: 'CO2' },
                { label: 'Hydrocarbon (Butane)', value: 'Butane' },
            ]}
            onChange={(val) => onUpdate({ ...config, solventType: val as any })}
            accentColorRing="focus:ring-blue-500"
        />
        <RangeField
            label={<><span>Solvent-Biomass Ratio</span> <span className="font-mono text-blue-400 font-bold">{config.solventRatio.toFixed(1)} L/kg</span></>}
            value={config.solventRatio}
            min={2.0}
            max={25.0}
            step={0.5}
            onChange={(val) => onUpdate({ ...config, solventRatio: val })}
            accentColor="accent-blue-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <RangeField
            label={<><Thermometer className="w-3.5 h-3.5 text-blue-500" />Temp</>}
            value={config.extractionTemp}
            min={-80}
            max={40}
            step={5}
            onChange={(val) => onUpdate({ ...config, extractionTemp: val })}
            accentColor="accent-blue-500"
        />
        <RangeField
            label={<><Clock className="w-3.5 h-3.5 text-amber-500" />Duration</>}
            value={config.duration}
            min={5}
            max={180}
            step={5}
            onChange={(val) => onUpdate({ ...config, duration: val })}
            accentColor="accent-blue-500"
        />
        <RangeField
            label={<><Wind className="w-3.5 h-3.5 text-purple-500" />Agitation</>}
            value={config.agitationSpeed}
            min={0}
            max={1000}
            step={50}
            onChange={(val) => onUpdate({ ...config, agitationSpeed: val })}
            accentColor="accent-blue-500"
        />
      </div>
    </div>
  );
};
