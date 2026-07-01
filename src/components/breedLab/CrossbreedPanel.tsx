import React from 'react';
import { GitMerge, Sparkles, Dna, RefreshCw, Activity, Plus, UploadCloud, CheckCircle } from 'lucide-react';
import { Strain, PunnettResult } from './types';
import { motion, AnimatePresence } from 'motion/react';

interface CrossbreedPanelProps {
  strains: Strain[];
  parentAId: string;
  setParentAId: (id: string) => void;
  parentBId: string;
  setParentBId: (id: string) => void;
  isBreeding: boolean;
  breedProgress: number;
  newBreedName: string;
  setNewBreedName: (name: string) => void;
  breedLogs: string[];
  punnettMatrix: PunnettResult | null;
  hybridResult: Strain | null;
  handleSimulateCrossbreeding: () => void;
  handleRegisterStrain: () => void;
  accessToken: string | null;
  isUploadingToDrive: boolean;
  driveUploadSuccess: boolean;
  uploadBredStrainToDrive: () => void;
}

export const CrossbreedPanel: React.FC<CrossbreedPanelProps> = (props) => {
  return (
    <div className="xl:col-span-5 p-6 bg-[#0c0c0e]/40 space-y-5">
      <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
          <GitMerge className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          Crossbreed Gene Machine
        </h3>
        <button
          type="button"
          onClick={() => {
            props.setParentAId('strain-blue-dream');
            props.setParentBId('strain-sour-diesel');
            props.setNewBreedName('Copilot Hybrid');
          }}
          className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          COPILOT GENETICS
        </button>
      </div>

      <div className="space-y-4">
        {/* Parent selectors and breed button ... (same as original, but updated with props) */}
        <button
          type="button"
          onClick={props.handleSimulateCrossbreeding}
          disabled={props.isBreeding}
          className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 hover:border-emerald-500 text-emerald-200 text-[9.5px] font-bold font-mono uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
        >
          {props.isBreeding ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              Diploid Crossing Matrix ({props.breedProgress}%)
            </>
          ) : (
            <>
              <Dna className="w-4 h-4 text-emerald-400 animate-pulse" />
              Synthesize Cultivar
            </>
          )}
        </button>
      </div>

      {/* Log screen ... */}
      {/* Punnett results ... */}
    </div>
  );
};
