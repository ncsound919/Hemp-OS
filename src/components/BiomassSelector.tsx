/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Biomass, CannabinoidProfile } from '../../kernel/core/types.ts';
import { BIOMASS_PROFILES } from '../../kernel/calibration/profiles.ts';
import { Leaf, Sliders, Droplet, Layers } from 'lucide-react';

interface BiomassSelectorProps {
  biomass: Biomass;
  onBiomassChange: (updated: Biomass) => void;
}

export const BiomassSelector: React.FC<BiomassSelectorProps> = ({
  biomass,
  onBiomassChange,
}) => {
  const handleProfileSelect = (key: string) => {
    const selected = BIOMASS_PROFILES[key];
    if (selected) {
      onBiomassChange({
        ...biomass,
        name: selected.biomassTemplate.name,
        moisture: selected.biomassTemplate.moisture,
        waxContent: selected.biomassTemplate.waxContent,
        potency: { ...selected.biomassTemplate.potency },
      });
    }
  };

  const handlePotencySliderChange = (key: keyof CannabinoidProfile, val: number) => {
    const updatedPotency = { ...biomass.potency, [key]: val };
    
    // Ensure sum doesn't exceed 100%
    const sum = Object.keys(updatedPotency).reduce((acc, k) => acc + (k === key ? 0 : updatedPotency[k as keyof CannabinoidProfile]), 0);
    if (sum + val > 100) {
      return;
    }

    onBiomassChange({
      ...biomass,
      potency: updatedPotency,
    });
  };

  return (
    <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#1f1f21]">
        <Leaf className="w-5 h-5 text-blue-500" />
        <h3 className="font-bold text-white text-xs tracking-wider uppercase">1. FEEDSTOCK & BIOMASS PROFILER</h3>
      </div>

      {/* Preset Strains Grid */}
      <div>
        <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2">Preset Strain Templates</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(BIOMASS_PROFILES).map(([key, profile]) => {
            const isSelected = biomass.name === profile.biomassTemplate.name;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleProfileSelect(key)}
                className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-[#1b1b1e] text-blue-400 font-medium'
                    : 'border-[#1f1f21] hover:bg-[#1b1b1e] hover:border-[#2d2d30] text-[#888] bg-[#0d0d0f]'
                }`}
              >
                <div className="font-semibold text-xs truncate text-white">{profile.name}</div>
                <div className="text-[10px] text-[#555] mt-1 line-clamp-1">{profile.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Weight Input */}
        <div>
          <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-blue-500" />
            Batch Weight (kg)
          </label>
          <input
            type="number"
            min="0.1"
            max="1000"
            step="0.1"
            value={biomass.mass}
            onChange={(e) => onBiomassChange({ ...biomass, mass: parseFloat(e.target.value) || 1 })}
            className="w-full px-3 py-1.5 bg-[#1a1a1c] border border-[#2d2d30] rounded-lg text-xs font-mono font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Moisture Sliders */}
        <div>
          <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5 text-sky-500" />
              Moisture
            </span>
            <span className="font-mono text-sky-400 font-bold">{biomass.moisture.toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="25"
            step="0.1"
            value={biomass.moisture}
            onChange={(e) => onBiomassChange({ ...biomass, moisture: parseFloat(e.target.value) })}
            className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Wax Content Slider */}
        <div>
          <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Wax Content
            </span>
            <span className="font-mono text-amber-500 font-bold">{biomass.waxContent.toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="15"
            step="0.1"
            value={biomass.waxContent}
            onChange={(e) => onBiomassChange({ ...biomass, waxContent: parseFloat(e.target.value) })}
            className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Informational total cannabinoid marker */}
        <div>
          <div className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1">
            Total Potency: <span className="font-mono text-emerald-400">{(Object.values(biomass.potency) as number[]).reduce((a, b) => a + b, 0).toFixed(2)}%</span>
          </div>
          <div className="h-2 w-full bg-[#1b1b1e] rounded-full overflow-hidden mt-2 flex">
            <div className="bg-emerald-500" style={{ width: `${biomass.potency.thca + biomass.potency.thc}%` }}></div>
            <div className="bg-blue-500" style={{ width: `${biomass.potency.cbda + biomass.potency.cbd}%` }}></div>
            <div className="bg-purple-500" style={{ width: `${biomass.potency.cbga + biomass.potency.cbg}%` }}></div>
            <div className="bg-amber-400" style={{ width: `${biomass.potency.other}%` }}></div>
          </div>
        </div>
      </div>

      {/* Potency Profiles Sliders */}
      <div className="bg-[#0d0d0f] rounded-xl p-3.5 border border-[#1f1f21]">
        <label className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3">Detailed Phytocannabinoid Profile (wt%)</label>
        
        <div className="flex flex-col gap-2.5">
          {/* THCA */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#888]">THCA (Tetrahydrocannabinolic Acid)</span>
              <span className="font-mono text-emerald-400 font-bold">{biomass.potency.thca.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              step="0.05"
              value={biomass.potency.thca}
              onChange={(e) => handlePotencySliderChange('thca', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* THC */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#888]">Δ9-THC (Active Tetrahydrocannabinol)</span>
              <span className="font-mono text-emerald-400 font-bold">{biomass.potency.thc.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.01"
              value={biomass.potency.thc}
              onChange={(e) => handlePotencySliderChange('thc', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* CBDA */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#888]">CBDA (Cannabidiolic Acid)</span>
              <span className="font-mono text-sky-400 font-bold">{biomass.potency.cbda.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="0.05"
              value={biomass.potency.cbda}
              onChange={(e) => handlePotencySliderChange('cbda', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* CBD */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#888]">CBD (Active Cannabidiol)</span>
              <span className="font-mono text-sky-400 font-bold">{biomass.potency.cbd.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.01"
              value={biomass.potency.cbd}
              onChange={(e) => handlePotencySliderChange('cbd', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* CBGA */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#888]">CBGA (Cannabigerolic Acid)</span>
              <span className="font-mono text-purple-400 font-bold">{biomass.potency.cbga.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.05"
              value={biomass.potency.cbga}
              onChange={(e) => handlePotencySliderChange('cbga', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Other */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#888]">Other Cannabinoids / Minors</span>
              <span className="font-mono text-amber-500 font-bold">{biomass.potency.other.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.05"
              value={biomass.potency.other}
              onChange={(e) => handlePotencySliderChange('other', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
