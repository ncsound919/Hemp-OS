/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';

interface KnowledgeItem {
  id: number;
  name: string;
  type: 'strain' | 'study';
  subtitle: string;
  createdAt: string;
}

interface Terpene {
  id: number;
  name: string;
  description: string | null;
}

interface Effect {
  id: number;
  name: string;
  description: string | null;
}

interface KnowledgeListProps {
  items: KnowledgeItem[];
  selectedId?: number;
  onSelect: (item: KnowledgeItem) => void;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSearch: (text: string, terpeneId: string, effectId: string, minConc: number) => void;
}

export function KnowledgeList({
  items,
  selectedId,
  onSelect,
  isLoading,
  error,
  onRefresh,
  onSearch,
}: KnowledgeListProps) {
  const [searchText, setSearchText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Normalized options
  const [allTerpenes, setAllTerpenes] = useState<Terpene[]>([]);
  const [allEffects, setAllEffects] = useState<Effect[]>([]);
  
  // Filter state
  const [selectedTerpene, setSelectedTerpene] = useState('');
  const [selectedEffect, setSelectedEffect] = useState('');
  const [minConc, setMinConc] = useState(0);

  // Fetch unique terpenes and effects for filter options on mount
  useEffect(() => {
    fetch('/api/terpenes')
      .then(res => res.json())
      .then(data => setAllTerpenes(data.terpenes || []))
      .catch(err => console.error('Failed to load terpenes list:', err));

    fetch('/api/effects')
      .then(res => res.json())
      .then(data => setAllEffects(data.effects || []))
      .catch(err => console.error('Failed to load effects list:', err));
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(searchText, selectedTerpene, selectedEffect, minConc);
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedTerpene('');
    setSelectedEffect('');
    setMinConc(0);
    onSearch('', '', '', 0);
  };

  const isFiltered = searchText || selectedTerpene || selectedEffect || minConc > 0;

  return (
    <section className="flex w-80 flex-col border-r border-white/10 shrink-0 bg-[#0A0B0C]">
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-white/10 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-50">
          Knowledge Feed
        </span>
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={clearFilters}
              title="Clear Filters"
              className="text-[10px] text-[#A5C9B3] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X size={10} /> Clear
            </button>
          )}
          <button
            onClick={onRefresh}
            title="Refresh Feed"
            disabled={isLoading}
            className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20 cursor-pointer text-[#E0E2E5]"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Input and Filter Toggle */}
      <div className="p-3 border-b border-white/10 shrink-0 space-y-2">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search strains, studies, abstracts..."
            className="w-full rounded bg-[#141619] border border-white/10 pl-8 pr-8 py-1.5 text-xs text-[#E0E2E5] focus:outline-none focus:border-[#A5C9B3] placeholder-white/30"
          />
          <Search size={12} className="absolute left-2.5 text-white/30" />
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`absolute right-2.5 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer ${
              showAdvanced ? 'text-[#A5C9B3]' : 'text-white/30'
            }`}
            title="Advanced Filters"
          >
            <SlidersHorizontal size={12} />
          </button>
        </form>

        {/* Advanced Filter Panel */}
        {showAdvanced && (
          <div className="rounded border border-white/10 bg-[#0F1113] p-3 space-y-3 animate-fadeIn">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#A5C9B3]">
              Relational Filters
            </div>

            {/* Terpenes Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 block">Filter by Terpene</label>
              <select
                value={selectedTerpene}
                onChange={(e) => setSelectedTerpene(e.target.value)}
                className="w-full text-xs rounded bg-[#141619] border border-white/10 p-1 text-[#E0E2E5] focus:outline-none"
              >
                <option value="">-- All Terpenes --</option>
                {allTerpenes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.charAt(0).toUpperCase() + t.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Terpene concentration slider */}
            {selectedTerpene && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-white/50">
                  <span>Min Concentration</span>
                  <span className="font-mono text-[#A5C9B3]">{minConc.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={minConc}
                  onChange={(e) => setMinConc(parseFloat(e.target.value))}
                  className="w-full accent-[#A5C9B3] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Effects Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 block">Filter by Effect</label>
              <select
                value={selectedEffect}
                onChange={(e) => setSelectedEffect(e.target.value)}
                className="w-full text-xs rounded bg-[#141619] border border-white/10 p-1 text-[#E0E2E5] focus:outline-none"
              >
                <option value="">-- All Effects --</option>
                {allEffects.map((eff) => (
                  <option key={eff.id} value={eff.id}>
                    {eff.name.charAt(0).toUpperCase() + eff.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="flex-1 bg-[#2D5A47] hover:bg-[#346952] text-white rounded text-[10px] uppercase font-bold py-1 transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-2 border border-white/10 hover:bg-white/5 text-white/60 hover:text-white rounded text-[10px] uppercase font-bold py-1 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto bg-[#0F1113]/30">
        {isLoading && items.length === 0 ? (
          <div className="p-8 text-center text-xs opacity-50 font-mono">
            Querying local knowledge bank...
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-xs text-red-400 font-mono mb-2">Error: {error}</p>
            <button
              onClick={onRefresh}
              className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 border border-white/10 rounded hover:bg-white/5 transition-all text-[#A5C9B3]"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs opacity-40 font-mono uppercase tracking-wider">
            No entities match query
          </div>
        ) : (
          items.map((item) => {
            const isActive = selectedId === item.id;
            const isStrain = item.type === 'strain';

            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full text-left border-b border-white/5 p-4 transition-all block cursor-pointer ${
                  isActive 
                    ? 'bg-[#2D5A47]/20 border-l-4 border-l-[#A5C9B3]' 
                    : 'hover:bg-white/5 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-semibold tracking-wider ${
                    isStrain ? 'text-[#A5C9B3]' : 'text-blue-400'
                  }`}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="text-[10px] opacity-30 font-mono">
                    ID: {item.id}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-[#E0E2E5] line-clamp-1">{item.name}</h3>
                <p className="mt-1 text-xs opacity-50 line-clamp-2 leading-relaxed">
                  {item.subtitle}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
