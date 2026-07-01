import React, { useState } from 'react';
import { FileText, Share2, ImageIcon, Sparkles, Microscope } from 'lucide-react';
import { Biomass, ProcessGraph, ProcessRunResult } from '../../kernel/core/types.ts';
import { buildPublishingMetrics } from './publisher/publisherUtils.ts';
import { AcademicPaperTab } from './publisher/AcademicPaperTab.tsx';
import { SocialFlyerTab } from './publisher/SocialFlyerTab.tsx';
import { CampaignPosterTab } from './publisher/CampaignPosterTab.tsx';

interface ScientificDiscoveryPublisherProps {
  biomass: Biomass;
  graph: ProcessGraph;
  results: ProcessRunResult;
}

export const ScientificDiscoveryPublisher: React.FC<ScientificDiscoveryPublisherProps> = ({
  biomass,
  graph,
  results
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'paper' | 'flyer' | 'propaganda'>('paper');
  
  const metrics = buildPublishingMetrics(biomass, graph, results);

  return (
    <div id="scientific-publisher-block" className="bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl text-white">
      {/* Header Panel */}
      <div className="bg-[#0a0a0b] p-5 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900/30 border border-blue-500/20 rounded-xl">
            <Microscope className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Layer 12: Scientific Discovery & Propaganda Publisher</h2>
              <button className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors">
                <Sparkles className="w-3 h-3" />
                COPILOT DRAFT
              </button>
            </div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter mt-0.5">
              Translating autonomous chemical simulation outputs into verified academic papers and public media flyers
            </p>
          </div>
        </div>

        {/* Action Tabs Selector */}
        <div className="flex bg-[#161619] p-1 rounded-xl border border-[#222]">
          <button
            type="button"
            onClick={() => setActiveSubTab('paper')}
            className={`px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'paper'
                ? 'bg-blue-950/40 border border-blue-500 text-blue-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Academic Paper
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('flyer')}
            className={`px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'flyer'
                ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Social Media Flyer
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('propaganda')}
            className={`px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'propaganda'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Poster Art
          </button>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="p-6">
        {activeSubTab === 'paper' && <AcademicPaperTab biomass={biomass} metrics={metrics} />}
        {activeSubTab === 'flyer' && <SocialFlyerTab biomass={biomass} metrics={metrics} />}
        {activeSubTab === 'propaganda' && <CampaignPosterTab biomass={biomass} metrics={metrics} />}
      </div>
    </div>
  );
};
