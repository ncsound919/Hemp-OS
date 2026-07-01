import React from 'react';
import { Database, Check, Star } from 'lucide-react';
import { Strain } from './types';
import { getRadarData } from './helpers';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

interface ExplorerTabProps {
  strains: Strain[];
  selectedStrainId: string;
  setSelectedStrainId: (id: string) => void;
  activeIntelTab: 'leafly' | 'seedfinder' | 'cannaconnection' | 'hytiva' | 'allbud';
  setActiveIntelTab: (tab: 'leafly' | 'seedfinder' | 'cannaconnection' | 'hytiva' | 'allbud') => void;
  handleApplyToFeedstock: (strain: Strain) => void;
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({
  strains,
  selectedStrainId,
  setSelectedStrainId,
  activeIntelTab,
  setActiveIntelTab,
  handleApplyToFeedstock
}) => {
  const selectedStrain = strains.find(s => s.id === selectedStrainId) || strains[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Database className=\"w-4 h-4 text-emerald-400\" /> Cultivar Library Exploration
          </h3>
          <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Select a strain below to unlock its multi-database profiles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
          {strains.map((strain) => (
            <button
              type="button"
              key={strain.id}
              onClick={() => setSelectedStrainId(strain.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                selectedStrainId === strain.id
                  ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300'
                  : 'bg-[#121214] border-[#1f1f21] hover:border-emerald-500/20 text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold text-[11px] truncate">{strain.name}</span>
                {strain.isCustom && (
                  <span className="px-1.5 py-0.5 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-[6px] font-mono rounded font-bold uppercase">F1 Hybrid</span>
                )}
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[7px] font-mono uppercase text-gray-500">{strain.classification}</span>
                <span className="text-[7px] font-mono text-gray-500 bg-[#0d0d0f] px-1 rounded">{strain.seedFinderInfo.breeder.split(' ')[0]}</span>
              </div>
              <div className="flex gap-2.5 text-[8.5px] font-mono mt-2 text-gray-400 border-t border-[#1c1c1f]/50 pt-2">
                <span>THC: <strong className="text-red-400">{strain.thc}%</strong></span>
                <span>CBD: <strong className="text-emerald-400">{strain.cbd}%</strong></span>
                <span>CBG: <strong className="text-cyan-400">{strain.cbg}%</strong></span>
              </div>
            </button>
          ))}
        </div>

        <div className="md:col-span-7 bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start border-b border-[#1c1c1f] pb-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase font-mono">{selectedStrain.name}</h4>
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{selectedStrain.type}</span>
            </div>
            <button
              type="button"
              onClick={() => handleApplyToFeedstock(selectedStrain)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[8.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Feedstock
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-[#0a0a0b] p-1 rounded-xl border border-[#1c1c1f]">
            {[
              { id: 'leafly', label: 'Leafly', color: 'text-[#10b981]' },
              { id: 'seedfinder', label: 'SeedFinder', color: 'text-amber-400' },
              { id: 'cannaconnection', label: 'CannaCon', color: 'text-purple-400' },
              { id: 'hytiva', label: 'Hytiva', color: 'text-sky-400' },
              { id: 'allbud', label: 'AllBud', color: 'text-red-400' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveIntelTab(tab.id as any)}
                className={`py-1 rounded text-[8px] font-mono uppercase font-bold transition-all cursor-pointer ${
                  activeIntelTab === tab.id
                    ? 'bg-[#18181b] border border-[#2d2d30] text-white font-black'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] p-4.5 min-h-[220px] flex flex-col justify-between">
            {activeIntelTab === 'leafly' && (
              <div className="space-y-3 font-mono text-[9px]">
                <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                  <span className="font-bold text-emerald-400 uppercase tracking-widest text-[8.5px]">Leafly Consumer Database</span>
                  <span className="text-gray-500 text-[8px]">5,000+ Cultivars Indexed</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white text-[11px] font-bold">{selectedStrain.leaflyInfo.rating} / 5.0</span>
                  <div className="flex text-amber-400 gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 stroke-none" />
                    ))}
                  </div>
                  <span className="text-gray-500 text-[8px] ml-1">({selectedStrain.leaflyInfo.reviewsCount.toLocaleString()} real consumer reviews)</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold text-[7.5px] mb-1">Dominant Consumer Effects</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStrain.leaflyInfo.effects.map((fx, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 rounded-full font-bold">
                        {fx}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Add other intel tabs here or extract further if needed. For now keeping it simple. */}
          </div>
          
          <div className="space-y-2">
            <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Analytical Terpene Weight Spectrum</span>
            <div className="h-[105px] bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] overflow-hidden p-1 flex items-center justify-center">
              <ResponsiveContainer width=\"100%\" height=\"100%\">
                <RadarChart cx=\"50%\" cy=\"50%\" outerRadius=\"70%\" data={getRadarData(selectedStrain)}>
                  <PolarGrid stroke=\"#1c1c1f\" />
                  <PolarAngleAxis dataKey=\"subject\" stroke=\"#888\" fontSize={6.5} />
                  <Radar name=\"Terpenes\" dataKey=\"value\" stroke=\"#10b981\" fill=\"#10b981\" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
