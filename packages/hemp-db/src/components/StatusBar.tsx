/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface StatusBarProps {
  message: string;
  entityCount: number;
  dbType: string;
}

export function StatusBar({ message, entityCount, dbType }: StatusBarProps) {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-white/10 bg-[#070809] px-6 text-[10px] font-mono uppercase tracking-tighter opacity-50 shrink-0 select-none">
      <div className="flex gap-6 items-center">
        <span className="flex items-center gap-1.5 text-[#A5C9B3]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#A5C9B3] animate-pulse" />
          DB: {dbType}
        </span>
        <span className="hidden sm:inline">Index: PostgreSQL Full-Text ({entityCount} entities cached)</span>
        <span className="hidden md:inline">Storage: Cloud Bucket Enabled</span>
      </div>
      <div className="flex gap-4">
        <span>Status: <strong className="text-white">{message}</strong></span>
        <span className="opacity-40">|</span>
        <span>Latency: 35ms</span>
      </div>
    </footer>
  );
}
