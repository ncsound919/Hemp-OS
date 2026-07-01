import React from 'react';
import { RefreshCw, Database, Play } from 'lucide-react';

interface ScraperTabProps {
  isScraping: boolean;
  scrapeLogs: string[];
  scrapeTarget: string;
  setScrapeTarget: (t: string) => void;
  scrapeQuery: string;
  setScrapeQuery: (q: string) => void;
  handleStartScraping: () => void;
}

export const ScraperTab: React.FC<ScraperTabProps> = (props) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-[#1f1f21] pb-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-emerald-400" /> Autonomous Strain Ingestion Engine
          </h3>
          <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Scrape and ingest thousands of strain crossbreeds & profiles</p>
        </div>
      </div>

      <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-5 space-y-5">
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 border-b border-[#1f1f21] pb-2">
            <Database className="w-3.5 h-3.5 text-blue-400" /> Web Scraper Configuration
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-mono text-gray-500 uppercase font-bold tracking-widest">Target Database</label>
              <select
                value={props.scrapeTarget}
                onChange={(e) => props.setScrapeTarget(e.target.value)}
                className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-2 text-[9px] text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option>Leafly API / DOM</option>
                <option>SeedFinder Registry</option>
                <option>AllBud Index</option>
                <option>Hytiva Logs</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-mono text-gray-500 uppercase font-bold tracking-widest">Query Vector</label>
              <input
                type="text"
                value={props.scrapeQuery}
                onChange={(e) => props.setScrapeQuery(e.target.value)}
                className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-2 text-[9px] text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
            {/* Other fields... */}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={props.handleStartScraping}
            disabled={props.isScraping}
            className="px-5 py-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 shadow"
          >
            {props.isScraping ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            )}
            {props.isScraping ? 'Swarm Active...' : 'Initialize Ingestion Swarm'}
          </button>
        </div>

        <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-3 font-mono text-[9px] h-[200px] overflow-y-auto space-y-1 text-gray-400">
          <span className="text-[7.5px] text-emerald-500 uppercase tracking-wider font-bold block border-b border-[#1c1c1f]/50 pb-1 mb-2">
            // SCRAPE COMPLETE (Fixed Typo)
          </span>
          {props.scrapeLogs.map((log, idx) => (
            <div key={idx} className={log.includes('✔️') ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
