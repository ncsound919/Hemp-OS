/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProcessStage } from '../../kernel/core/types.ts';
import { Sliders, Thermometer, Clock, HelpCircle, Wind, Repeat } from 'lucide-react';

interface StageConfiguratorProps {
  stage: ProcessStage;
  onConfigChange: (stageId: string, updatedConfig: Record<string, any>) => void;
}

export const StageConfigurator: React.FC<StageConfiguratorProps> = ({
  stage,
  onConfigChange,
}) => {
  const { id, type, config } = stage;

  const updateField = (field: string, val: any) => {
    onConfigChange(id, { ...config, [field]: val });
  };

  const labelStyle = "block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 flex items-center justify-between";
  const sectionTitleStyle = "text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2 pb-2 border-b border-[#1f1f21]";

  switch (type) {
    case 'extraction':
      return (
        <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
          <div className={sectionTitleStyle}>
            <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-blue-400 flex items-center justify-center font-bold text-[10px]">E</span>
            EXTRACTION CONFIGURATION
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Solvent Type */}
            <div>
              <label className={labelStyle}>Solvent Solvent</label>
              <select
                value={config.solventType || 'Ethanol'}
                onChange={(e) => updateField('solventType', e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1c] border border-[#2d2d30] rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Ethanol" className="bg-[#121214]">Ethanol (Cold Wash)</option>
                <option value="CO2" className="bg-[#121214]">Supercritical CO2</option>
                <option value="Butane" className="bg-[#121214]">Hydrocarbon (Butane)</option>
              </select>
            </div>

            {/* Solvent Ratio */}
            <div>
              <label className={labelStyle}>
                <span>Solvent-Biomass Ratio</span>
                <span className="font-mono text-blue-400 font-bold">{(config.solventRatio || 8.0).toFixed(1)} L/kg</span>
              </label>
              <input
                type="range"
                min="2.0"
                max="25.0"
                step="0.5"
                value={config.solventRatio || 8.0}
                onChange={(e) => updateField('solventRatio', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Temp */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Thermometer className="w-3.5 h-3.5 text-blue-500" />Temp</span>
                <span className="font-mono text-white font-medium">{config.extractionTemp !== undefined ? config.extractionTemp : -40}°C</span>
              </label>
              <input
                type="range"
                min="-80"
                max="40"
                step="5"
                value={config.extractionTemp !== undefined ? config.extractionTemp : -40}
                onChange={(e) => updateField('extractionTemp', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-amber-500" />Duration</span>
                <span className="font-mono text-white font-medium">{config.duration || 30} min</span>
              </label>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={config.duration || 30}
                onChange={(e) => updateField('duration', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Agitation Speed */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Wind className="w-3.5 h-3.5 text-purple-500" />Agitation</span>
                <span className="font-mono text-white font-medium">{config.agitationSpeed || 300} RPM</span>
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={config.agitationSpeed || 300}
                onChange={(e) => updateField('agitationSpeed', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>
      );

    case 'winterization':
      return (
        <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
          <div className={sectionTitleStyle}>
            <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-sky-400 flex items-center justify-center font-bold text-[10px]">W</span>
            WINTERIZATION CONFIGURATION
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Solvent Ratio */}
            <div>
              <label className={labelStyle}>
                <span>Ethanol dilution ratio</span>
                <span className="font-mono text-sky-400 font-bold">{(config.solventRatio || 5.0).toFixed(1)} L/kg</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={config.solventRatio || 5.0}
                onChange={(e) => updateField('solventRatio', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Filtration Passes */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Repeat className="w-3.5 h-3.5 text-teal-500" />Filter Passes</span>
                <span className="font-mono text-teal-400 font-medium">{config.filtrationPasses || 1} pass</span>
              </label>
              <select
                value={config.filtrationPasses || 1}
                onChange={(e) => updateField('filtrationPasses', parseInt(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#1a1a1c] border border-[#2d2d30] rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value={1} className="bg-[#121214]">Single-stage (94% retention)</option>
                <option value={2} className="bg-[#121214]">Double-stage (99.6% retention)</option>
                <option value={3} className="bg-[#121214]">Triple-stage polish (99.9% retention)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Chilling Temp */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Thermometer className="w-3.5 h-3.5 text-blue-500" />Chilling Temp</span>
                <span className="font-mono text-white font-medium">{config.coolingTemp !== undefined ? config.coolingTemp : -40}°C</span>
              </label>
              <input
                type="range"
                min="-80"
                max="0"
                step="5"
                value={config.coolingTemp !== undefined ? config.coolingTemp : -40}
                onChange={(e) => updateField('coolingTemp', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Duration (Hours) */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-amber-500" />Chilling Time</span>
                <span className="font-mono text-white font-medium">{config.coolingTime || 24} hours</span>
              </label>
              <input
                type="range"
                min="4"
                max="72"
                step="4"
                value={config.coolingTime || 24}
                onChange={(e) => updateField('coolingTime', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>
        </div>
      );

    case 'decarboxylation':
      return (
        <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
          <div className={sectionTitleStyle}>
            <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-purple-400 flex items-center justify-center font-bold text-[10px]">D</span>
            DECARBOXYLATION KINETICS CONFIG
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Thermal Temp */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Thermometer className="w-3.5 h-3.5 text-purple-400" />Reaction Temp</span>
                <span className="font-mono text-purple-400 font-bold">{config.temperature !== undefined ? config.temperature : 120}°C</span>
              </label>
              <input
                type="range"
                min="80"
                max="180"
                step="5"
                value={config.temperature !== undefined ? config.temperature : 120}
                onChange={(e) => updateField('temperature', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Reaction Duration */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-amber-500" />Duration</span>
                <span className="font-mono text-purple-400 font-bold">{config.duration || 60} min</span>
              </label>
              <input
                type="range"
                min="10"
                max="240"
                step="5"
                value={config.duration || 60}
                onChange={(e) => updateField('duration', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>
      );

    case 'distillation':
      return (
        <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
          <div className={sectionTitleStyle}>
            <span className="w-5 h-5 rounded bg-[#1a1a1c] border border-[#2d2d30] text-amber-400 flex items-center justify-center font-bold text-[10px]">M</span>
            DISTILLATION (WIPED-FILM MOLECULAR)
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Evaporator Temp */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Thermometer className="w-3.5 h-3.5 text-red-500" />Evaporator Temp</span>
                <span className="font-mono text-amber-400 font-bold">{config.evaporatorTemp !== undefined ? config.evaporatorTemp : 185}°C</span>
              </label>
              <input
                type="range"
                min="120"
                max="240"
                step="5"
                value={config.evaporatorTemp !== undefined ? config.evaporatorTemp : 185}
                onChange={(e) => updateField('evaporatorTemp', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Condenser Temp */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Thermometer className="w-3.5 h-3.5 text-amber-500" />Condenser Temp</span>
                <span className="font-mono text-amber-400 font-bold">{config.condenserTemp !== undefined ? config.condenserTemp : 70}°C</span>
              </label>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={config.condenserTemp !== undefined ? config.condenserTemp : 70}
                onChange={(e) => updateField('condenserTemp', parseInt(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Vacuum pressure */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Wind className="w-3.5 h-3.5 text-indigo-400" />Vacuum Pressure</span>
                <span className="font-mono text-amber-400 font-bold">{(config.vacuumPressure !== undefined ? config.vacuumPressure : 0.05).toFixed(3)} mbar</span>
              </label>
              <input
                type="range"
                min="0.001"
                max="0.500"
                step="0.005"
                value={config.vacuumPressure !== undefined ? config.vacuumPressure : 0.05}
                onChange={(e) => updateField('vacuumPressure', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Feed Rate */}
            <div>
              <label className={labelStyle}>
                <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-indigo-400" />Wiper Feed Rate</span>
                <span className="font-mono text-amber-400 font-bold">{(config.feedRate || 1.5).toFixed(1)} kg/hr</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={config.feedRate || 1.5}
                onChange={(e) => updateField('feedRate', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
