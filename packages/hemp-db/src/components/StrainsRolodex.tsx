import React, { useEffect, useState } from 'react';
import { Search, Info, Activity, Database, History, TrendingUp, Layers } from 'lucide-react';

interface Strain {
  id: number;
  name: string;
  type: string | null;
  thcMin: number | null;
  thcMax: number | null;
  cbdMin: number | null;
  cbdMax: number | null;
  terpeneProfile: string | null;
  effects: string | null;
  medicalUses: string | null;
  lineage: string | null;
  history: string | null;
  createdAt: string;
}

export function StrainsRolodex({ onSelect }: { onSelect: (id: number) => void }) {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/strains')
      .then(res => res.json())
      .then(data => {
        setStrains(data.strains || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load rolodex strains', err);
        setLoading(false);
      });
  }, []);

  const filtered = strains.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.type && s.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-8 bg-[#0B0C0E]">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A5C9B3] uppercase tracking-wider font-mono mb-2">
            <Database size={14} />
            <span>HEMP-OS GLOBAL DIRECTORY</span>
          </div>
          <h2 className="text-4xl font-serif text-white italic">Strain Rolodex</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl font-sans">
            A continuously updating catalog of botanical variants, analyzing thousands of profiles in real-time. Contains historical context, clinical data, and pharmacological statistics.
          </p>
        </div>
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search thousands of strains..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#131518] border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#A5C9B3] transition-all font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#A5C9B3] font-mono animate-pulse">
            Compiling Rolodex Data...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-600 font-mono">
            No strains found in the registry matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(strain => (
              <div 
                key={strain.id}
                onClick={() => onSelect(strain.id)}
                className="bg-[#131518] border border-white/5 hover:border-[#A5C9B3]/50 p-5 rounded-xl cursor-pointer transition-all hover:bg-[#181a1d] group relative overflow-hidden flex flex-col h-full"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all text-[#A5C9B3]">
                  <Layers size={64} />
                </div>
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <h3 className="font-serif text-xl text-white group-hover:text-[#A5C9B3] transition-colors line-clamp-1">{strain.name}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    strain.type === 'indica' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' :
                    strain.type === 'sativa' ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' :
                    'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  }`}>
                    {strain.type || 'Hybrid'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">THC %</div>
                    <div className="text-sm text-white font-mono">
                      {strain.thcMin ? (strain.thcMin / 100).toFixed(1) : '?'} - {strain.thcMax ? (strain.thcMax / 100).toFixed(1) : '?'}
                    </div>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">CBD %</div>
                    <div className="text-sm text-white font-mono">
                      {strain.cbdMax ? (strain.cbdMax / 100).toFixed(1) : '<1'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 relative z-10">
                  {strain.terpeneProfile && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#A5C9B3] uppercase font-bold mb-1">
                        <Activity size={12} /> Terpenes
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {strain.terpeneProfile}
                      </p>
                    </div>
                  )}
                  
                  {true && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-400 uppercase font-bold mb-1">
                        <History size={12} /> Medical / Historical context
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {strain.medicalUses || "Historical data gathering in progress."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 uppercase font-mono relative z-10">
                  <span className="flex items-center gap-1"><Info size={10} /> View Scientific Profile</span>
                  <span>ID: {strain.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
