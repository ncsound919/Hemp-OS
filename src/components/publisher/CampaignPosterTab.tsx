
import React, { useState } from 'react';
import { Award, Copy } from 'lucide-react';
import { Biomass } from '../../../kernel/core/types.ts';
import { PublisherMetrics } from './publisherUtils.ts';
import { PROPAGANDA_POSTERS } from './posterConfig.ts';

interface CampaignPosterTabProps {
  biomass: Biomass;
  metrics: PublisherMetrics;
}

export const CampaignPosterTab: React.FC<CampaignPosterTabProps> = ({ biomass, metrics }) => {
  const [selectedPosterId, setSelectedPosterId] = useState('poster-1');
  const [stampText, setStampText] = useState('VERIFIED BY HEMP OS KERNEL');
  const [stampColor, setStampColor] = useState('text-emerald-400 border-emerald-500/80 bg-emerald-950/80');
  const [copied, setCopied] = useState(false);

  const activePoster = PROPAGANDA_POSTERS.find(p => p.id === selectedPosterId) || PROPAGANDA_POSTERS[0];

  const handleCopySlogan = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-5 bg-[#161619] border border-[#1f1f21] p-5 rounded-xl space-y-5">
        <div className="space-y-1">
          <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> Campaign Poster Controller
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Choose Base Art Canvas</label>
            <div className="flex flex-col gap-2">
              {PROPAGANDA_POSTERS.map((poster) => (
                <button
                  key={poster.id}
                  type="button"
                  onClick={() => setSelectedPosterId(poster.id)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    selectedPosterId === poster.id
                      ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300'
                      : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold font-mono">{poster.title}</p>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">{poster.theme}</span>
                  </div>
                  <span className="text-[15px]">→</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Custom Propaganda Stamp Text</label>
            <input
              type="text"
              value={stampText}
              onChange={(e) => setStampText(e.target.value)}
              className="w-full bg-[#121214] border border-[#1f1f21] rounded px-3 py-1.5 text-xs text-white focus:outline-none"
              placeholder="Enter stamp text..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Stamp Color Scheme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStampColor('text-emerald-400 border-emerald-500/80 bg-emerald-950/80')}
                className={`px-2 py-1.5 rounded text-[8px] font-mono font-bold uppercase border text-center transition-all cursor-pointer ${
                  stampColor.includes('emerald')
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 font-black'
                    : 'bg-[#121214] border-[#1f1f21] text-gray-400'
                }`}
              >
                Neon Green
              </button>
              <button
                type="button"
                onClick={() => setStampColor('text-amber-400 border-amber-500/80 bg-amber-950/80')}
                className={`px-2 py-1.5 rounded text-[8px] font-mono font-bold uppercase border text-center transition-all cursor-pointer ${
                  stampColor.includes('amber')
                    ? 'bg-amber-950/60 border-amber-500 text-amber-400 font-black'
                    : 'bg-[#121214] border-[#1f1f21] text-gray-400'
                }`}
              >
                Gold Crest
              </button>
              <button
                type="button"
                onClick={() => setStampColor('text-cyan-400 border-cyan-500/80 bg-cyan-950/80')}
                className={`px-2 py-1.5 rounded text-[8px] font-mono font-bold uppercase border text-center transition-all cursor-pointer ${
                  stampColor.includes('cyan')
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-400 font-black'
                    : 'bg-[#121214] border-[#1f1f21] text-gray-400'
                }`}
              >
                Laser Blue
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 flex justify-center">
        <div className="w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl relative border border-gray-800 bg-black group select-none">
          <img
            src={activePoster.image}
            alt={activePoster.title}
            onError={(e) => {
              e.currentTarget.src = activePoster.fallbackUrl;
            }}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/40 pointer-events-none" />

          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className={`border-2 border-dashed ${stampColor} rounded-2xl px-4 py-2.5 transform -rotate-12 shadow-lg flex flex-col items-center gap-1 max-w-[200px]`}>
              <span className="text-[8px] font-black tracking-widest text-center uppercase font-mono leading-tight">{stampText}</span>
              <div className="h-px bg-white/20 w-full" />
              <span className="text-[9px] font-mono font-black text-white">{biomass.name}</span>
              <span className="text-[7.5px] font-mono text-gray-300">{(metrics.purityVal * 100).toFixed(1)}% PURE | {(metrics.calculatedYield * 100).toFixed(1)}% YLD</span>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 z-10 space-y-1.5">
            <h2 className="text-sm font-sans font-black tracking-widest text-white uppercase leading-none border-b border-white/25 pb-2">
              {activePoster.slogan}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};
