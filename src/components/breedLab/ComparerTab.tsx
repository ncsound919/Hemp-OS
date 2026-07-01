import React from 'react';
import { Scale } from 'lucide-react';
import { Strain } from './types';

interface ComparerTabProps {
  strains: Strain[];
  compareIds: string[];
  toggleCompare: (id: string) => void;
}

export const ComparerTab: React.FC<ComparerTabProps> = ({ strains, compareIds, toggleCompare }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-amber-400" /> SeedFinder Comparison Matrix
        </h3>
        <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Select up to 3 cultivars to construct breeder and morphological side-by-side matrices</p>
      </div>

      <div className="flex flex-wrap gap-2 bg-[#121214] p-3 rounded-xl border border-[#1f1f21]">
        {strains.map(strain => {
          const isChecked = compareIds.includes(strain.id);
          return (
            <button
              key={strain.id}
              type="button"
              onClick={() => toggleCompare(strain.id)}
              className={`px-3 py-1.5 rounded-lg text-[9.5px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                isChecked
                  ? 'bg-amber-950/20 border-amber-500 text-amber-300'
                  : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                readOnly
                className="accent-amber-500 pointer-events-none w-3 h-3"
              />
              {strain.name}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto bg-[#121214] border border-[#1f1f21] rounded-2xl">
        <table className="w-full text-[10px] font-mono text-gray-300 border-collapse">
          <thead>
            <tr className="border-b border-[#1f1f21] bg-[#0d0d0f] text-[8.5px] text-gray-400 uppercase font-black text-left">
              <th className="p-3">Attribute</th>
              {compareIds.map(id => {
                const s = strains.find(x => x.id === id);
                return <th key={id} className="p-3 text-amber-400 border-l border-[#1f1f21]">{s?.name || 'N/A'}</th>;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1c1f]">
            <tr>
              <td className="p-3 font-bold text-gray-400">Classification</td>
              {compareIds.map(id => {
                const s = strains.find(x => x.id === id);
                return <td key={id} className="p-3 border-l border-[#1f1f21] text-white">{s?.classification}</td>;
              })}
            </tr>
            <tr className="bg-[#0c0c0e]/30">
              <td className="p-3 font-bold text-gray-400">Breeder Origin</td>
              {compareIds.map(id => {
                const s = strains.find(x => x.id === id);
                return <td key={id} className="p-3 border-l border-[#1f1f21]">{s?.seedFinderInfo.breeder}</td>;
              })}
            </tr>
            <tr>
              <td className="p-3 font-bold text-gray-400">Flowering Period</td>
              {compareIds.map(id => {
                const s = strains.find(x => x.id === id);
                return <td key={id} className="p-3 border-l border-[#1f1f21] text-amber-400 font-bold">{s?.seedFinderInfo.floweringTimeDays} Days</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
