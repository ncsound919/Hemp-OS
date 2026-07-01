
import React from 'react';
import { Award, Download, Share2, Globe, FileDown, FolderCheck, ShieldCheck, BookOpen } from 'lucide-react';
import { DiscoveredPaper, DiscoveredFlyer } from './types.ts';

interface DiscoveryReadoutsProps {
  discoveredPaper: DiscoveredPaper | null;
  discoveredFlyer: DiscoveredFlyer | null;
  uploadedFolderId: string | null;
  downloadFile: (name: string, text: string) => void;
}

export const DiscoveryReadouts: React.FC<DiscoveryReadoutsProps> = ({
  discoveredPaper,
  discoveredFlyer,
  uploadedFolderId,
  downloadFile
}) => {
  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3">
        <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Award className="w-4 h-4 text-emerald-400" /> Layer 8.2: Ultimate Readouts
        </h3>
        <span className="px-2 py-0.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono rounded">
          {uploadedFolderId ? 'PUBLISHED OK' : 'LOCAL ONLY'}
        </span>
      </div>

      {discoveredPaper ? (
        <div className="space-y-4 font-mono">
          <div className="p-4 bg-[#0d0d0f] border border-[#1f1f21] rounded-xl space-y-2">
            <span className="text-[8.5px] font-bold text-purple-400 uppercase tracking-widest block font-bold">
              [HEMP OS SCIENTIFIC ACADEMIC PREPRINT]
            </span>
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wide">
              {discoveredPaper.title}
            </h4>
            <p className="text-[9px] text-[#888] leading-relaxed">
              <strong>Abstract</strong>: {discoveredPaper.chapters[0].content}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadFile(`${discoveredPaper.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.txt`, discoveredPaper.chapters[0].content)}
                className="px-2.5 py-1 bg-[#1a1a1c] hover:bg-[#222] border border-[#2d2d30] text-[8px] font-bold uppercase tracking-wider rounded text-gray-300 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" /> Download Preprint
              </button>
            </div>
          </div>

          {discoveredFlyer && (
            <div className="p-4 bg-gradient-to-br from-[#0d0d10] to-[#0a0a0c] border border-emerald-500/30 rounded-xl space-y-2.5">
              <span className="text-[8.5px] font-bold text-emerald-400 uppercase tracking-widest block flex items-center gap-1 font-bold">
                <Share2 className="w-3.5 h-3.5 text-emerald-400" /> PUBLIC OUTREACH SOCIAL MARKETING FLYER
              </span>
              <h4 className="text-[11px] font-bold text-emerald-300 tracking-wide uppercase">
                {discoveredFlyer.title}
              </h4>
              <p className="text-[9.5px] text-white leading-relaxed">
                {discoveredFlyer.headline}
              </p>
              <div className="bg-[#050506] border border-[#1f1f21] rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[7.5px] text-gray-500 uppercase block font-bold">Atom Lattice Grid Calibration</span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-widest">{discoveredFlyer.slogan}</span>
                </div>
                <div className="w-12 h-12 rounded border border-emerald-500/20 bg-emerald-950/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadFile(`social_flyer_${Date.now()}.txt`, `${discoveredFlyer.title}\n\n${discoveredFlyer.headline}\n\n${discoveredFlyer.details}`)}
                className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold uppercase tracking-wider rounded flex items-center gap-1"
              >
                <FileDown className="w-3 h-3" /> Save Flyer
              </button>
            </div>
          )}

          {uploadedFolderId ? (
            <div className="p-3 bg-emerald-950/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[9px]">
              <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-white font-bold block">SAVED TO CLOUD DISK</span>
                <span className="text-gray-400">All discovery outputs persisted securely in Google Drive folder "Hemp OS".</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-950/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[9px]">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-white font-bold block">LOCAL DISCOVERY MODE</span>
                <span className="text-gray-400">Outputs are buffered in local memory. Connect your Google Drive to publish live.</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-600 font-mono text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-2">
          <BookOpen className="w-8 h-8 text-gray-700" />
          No discovery generated yet. Run the ultimate pipeline to synthesize publications and flyers.
        </div>
      )}
    </div>
  );
};
