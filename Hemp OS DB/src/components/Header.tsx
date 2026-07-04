/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface KnowledgeItem {
  id: number;
  name: string;
  type: 'strain' | 'study';
  subtitle: string;
  createdAt: string;
}

interface HeaderProps {
  activeEntity: KnowledgeItem | null;
  activeView: 'strain' | 'study' | 'system' | 'insights';
  onViewChange: (view: 'strain' | 'study' | 'system' | 'insights') => void;
}

export function Header({ activeEntity, activeView, onViewChange }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 px-6 bg-[#0A0B0C] shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#2D5A47] font-serif text-xl font-bold text-[#A5C9B3]">Ψ</div>
        <h1 className="font-serif text-xl tracking-tight flex items-center gap-2 text-white">
          HEMP_OS <span className="text-xs font-mono opacity-40">v.2.4.1</span>
        </h1>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => onViewChange('strain')}
          className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeView === 'strain'
              ? 'bg-[#2D5A47] text-white'
              : 'border border-white/10 text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Strain View
        </button>
        <button
          onClick={() => onViewChange('study')}
          className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeView === 'study'
              ? 'bg-[#2D5A47] text-white'
              : 'border border-white/10 text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Study View
        </button>
        <button
          onClick={() => onViewChange('insights')}
          className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeView === 'insights'
              ? 'bg-[#2D5A47] text-white'
              : 'border border-white/10 text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Insights
        </button>
        <button
          onClick={() => onViewChange('system')}
          className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeView === 'system'
              ? 'bg-[#2D5A47] text-white'
              : 'border border-white/10 text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          System Airlock
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-widest opacity-60">
        {activeEntity && (
          <span className="hidden md:inline text-xs text-[#A5C9B3] font-mono">
            Active: {activeEntity.name}
          </span>
        )}
        <span className="hidden sm:inline">Dr. Aris</span>
      </div>
    </header>
  );
}
