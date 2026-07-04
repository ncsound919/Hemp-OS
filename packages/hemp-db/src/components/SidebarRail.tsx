/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Compass, FileText, Cpu, Brain } from 'lucide-react';

interface SidebarRailProps {
  activeView: 'strain' | 'study' | 'system' | 'insights';
  onViewChange: (view: 'strain' | 'study' | 'system' | 'insights') => void;
  entityCount: number;
}

export function SidebarRail({ activeView, onViewChange, entityCount }: SidebarRailProps) {
  return (
    <nav className="flex w-20 flex-col items-center border-r border-white/10 bg-[#0F1113] py-6 shrink-0 justify-between">
      <div className="flex flex-col gap-8 w-full">
        <button
          onClick={() => {
            onViewChange('strain');
            window.dispatchEvent(new CustomEvent('clearSelection'));
          }}
          title="Strains"
          className={`flex flex-col items-center gap-1 w-full py-2 border-l-2 transition-all cursor-pointer ${
            activeView === 'strain'
              ? 'border-[#A5C9B3] text-[#A5C9B3] opacity-100 bg-[#A5C9B3]/5'
              : 'border-transparent opacity-40 hover:opacity-100 text-[#E0E2E5]'
          }`}
        >
          <Compass size={22} strokeWidth={activeView === 'strain' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tighter text-center font-mono">
            Strains
          </span>
        </button>

        <button
          onClick={() => onViewChange('study')}
          title="Studies"
          className={`flex flex-col items-center gap-1 w-full py-2 border-l-2 transition-all cursor-pointer ${
            activeView === 'study'
              ? 'border-[#A5C9B3] text-[#A5C9B3] opacity-100 bg-[#A5C9B3]/5'
              : 'border-transparent opacity-40 hover:opacity-100 text-[#E0E2E5]'
          }`}
        >
          <FileText size={22} strokeWidth={activeView === 'study' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tighter text-center font-mono">
            Studies
          </span>
        </button>

        <button
          onClick={() => onViewChange('insights')}
          title="Insights"
          className={`flex flex-col items-center gap-1 w-full py-2 border-l-2 transition-all cursor-pointer ${
            activeView === 'insights'
              ? 'border-[#A5C9B3] text-[#A5C9B3] opacity-100 bg-[#A5C9B3]/5'
              : 'border-transparent opacity-40 hover:opacity-100 text-[#E0E2E5]'
          }`}
        >
          <Brain size={22} strokeWidth={activeView === 'insights' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tighter text-center font-mono">
            Insights
          </span>
        </button>

        <button
          onClick={() => onViewChange('system')}
          title="System Airlock"
          className={`flex flex-col items-center gap-1 w-full py-2 border-l-2 transition-all cursor-pointer ${
            activeView === 'system'
              ? 'border-[#A5C9B3] text-[#A5C9B3] opacity-100 bg-[#A5C9B3]/5'
              : 'border-transparent opacity-40 hover:opacity-100 text-[#E0E2E5]'
          }`}
        >
          <Cpu size={22} strokeWidth={activeView === 'system' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tighter text-center font-mono">
            System
          </span>
        </button>
      </div>

      <div className="flex flex-col items-center text-center opacity-30">
        <span className="font-mono text-[10px] text-white">{entityCount}</span>
        <span className="text-[8px] uppercase tracking-widest font-mono">Count</span>
      </div>
    </nav>
  );
}
