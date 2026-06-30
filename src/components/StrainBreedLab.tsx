import React, { useState } from 'react';
import { 
  Dna, Award, Play, ShieldCheck, Heart, Sparkles, Plus, Check, Info, 
  GitMerge, HelpCircle, FileText, ChevronRight, RefreshCw, BarChart2,
  TreePine, Calendar, Scale, Thermometer, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export interface Strain {
  id: string;
  name: string;
  type: 'Type I (THC Dominant)' | 'Type II (Mixed Ratio)' | 'Type III (CBD Dominant)' | 'Type IV (CBG Dominant)';
  thc: number; // wt%
  cbd: number; // wt%
  cbg: number; // wt%
  cbn: number; // wt%
  terpenes: {
    myrcene: number;
    limonene: number;
    caryophyllene: number;
    pinene: number;
    linalool: number;
  };
  classification: string;
  lineage: string[];
  origin: string;
  landraceBackground: string;
  isCustom?: boolean;
}

interface StrainBreedLabProps {
  onApplyBiomass: (potency: { thca: number; thc: number; cbda: number; cbd: number; cbga: number; other: number }, name: string) => void;
  activeBiomassName: string;
}

export function StrainBreedLab({ onApplyBiomass, activeBiomassName }: StrainBreedLabProps) {
  // Predefined Strains Database
  const [strains, setStrains] = useState<Strain[]>([
    {
      id: 'strain-1',
      name: "Charlotte's Web",
      type: 'Type III (CBD Dominant)',
      thc: 0.28,
      cbd: 16.4,
      cbg: 0.65,
      cbn: 0.05,
      terpenes: { myrcene: 0.58, limonene: 0.12, caryophyllene: 0.38, pinene: 0.45, linalool: 0.18 },
      classification: 'Medical / Therapeutic Hemp',
      lineage: ['Industrial Hemp', 'ACDC'],
      origin: 'Bred in Colorado by the Stanley Brothers. Cultivated for ultra-low psychoactivity and elevated CBD. Pivotal in early pediatric epilepsy research and US hemp legalization milestones.',
      landraceBackground: 'Derived from cold-hardy European fiber hemp lines crossed with highly selected high-resin resin clones.'
    },
    {
      id: 'strain-2',
      name: 'Cherry Wine',
      type: 'Type III (CBD Dominant)',
      thc: 0.22,
      cbd: 14.8,
      cbg: 0.52,
      cbn: 0.02,
      terpenes: { myrcene: 0.84, limonene: 0.08, caryophyllene: 0.42, pinene: 0.15, linalool: 0.25 },
      classification: 'Industrial Essential Oil Crop',
      lineage: ['The Wife', 'Charlotte’s Cherries'],
      origin: 'Developed in Oregon, USA. Highly popular for outdoor farm operations due to structural mold resistance and high-density terminal inflorescences.',
      landraceBackground: 'Indica-leaning high-CBD hybrids backcrossed with mountain landrace varieties for robustness.'
    },
    {
      id: 'strain-3',
      name: 'White CBG',
      type: 'Type IV (CBG Dominant)',
      thc: 0.08,
      cbd: 0.15,
      cbg: 15.2,
      cbn: 0.01,
      terpenes: { myrcene: 0.12, limonene: 0.32, caryophyllene: 0.24, pinene: 0.52, linalool: 0.05 },
      classification: 'Phytochemical Specialty Cultivar',
      lineage: ['Santhica', 'Oregon CBG Clone'],
      origin: 'Bred specifically to knockout the CBD and THC synthase enzymes, causing CBGA to accumulate as the terminal cannabinoid during development.',
      landraceBackground: 'Sourced from unique French industrial fiber crops (Santhica) showing CBG accumulation, backcrossed with high-yield resin cultivars.'
    },
    {
      id: 'strain-4',
      name: 'Sour Space Candy',
      type: 'Type III (CBD Dominant)',
      thc: 0.29,
      cbd: 17.1,
      cbg: 0.88,
      cbn: 0.04,
      terpenes: { myrcene: 0.65, limonene: 0.24, caryophyllene: 0.54, pinene: 0.28, linalool: 0.12 },
      classification: 'Essential Oil / Floral Hemp',
      lineage: ['Sour Tsunami', 'Early Resin Berry'],
      origin: 'Combines the intense sweet and sour terpene profile of Sour Tsunami with the heavy flower yields of Early Resin Berry.',
      landraceBackground: 'Heavy genetic influence of West-Coast diesel phenotypes backcrossed into high-terpene hemp lines.'
    },
    {
      id: 'strain-5',
      name: 'ACDC',
      type: 'Type III (CBD Dominant)',
      thc: 0.58,
      cbd: 18.5,
      cbg: 0.72,
      cbn: 0.06,
      terpenes: { myrcene: 0.92, limonene: 0.18, caryophyllene: 0.48, pinene: 0.22, linalool: 0.32 },
      classification: 'Therapeutic Hybrid',
      lineage: ['Cannatonic'],
      origin: 'A highly studied phenotype of Cannatonic. Widely used as the industry standard benchmark for therapeutic medical research into cannabinoid-terpene synergy.',
      landraceBackground: 'Complex lineage stemming from Colombian Gold, Jamaican Lambsbread, and G-13 indica components.'
    },
    {
      id: 'strain-6',
      name: 'Finola',
      type: 'Type III (CBD Dominant)',
      thc: 0.12,
      cbd: 4.5,
      cbg: 0.25,
      cbn: 0.01,
      terpenes: { myrcene: 0.32, limonene: 0.15, caryophyllene: 0.18, pinene: 0.64, linalool: 0.02 },
      classification: 'Grain & Fiber Dual-Use Hemp',
      lineage: ['Finnish Landrace Crop'],
      origin: 'Developed in Finland. Exceptionally short cycle crop adapted to Northern latitudes. Extremely high pinene content and distinct grain profiles.',
      landraceBackground: 'Pure Siberian/Nordic landrace ruderalis acclimated to 24-hour summer daylight cycles.'
    }
  ]);

  const [selectedStrainId, setSelectedStrainId] = useState<string>('strain-1');
  const [parentAId, setParentAId] = useState<string>('strain-1');
  const [parentBId, setParentBId] = useState<string>('strain-2');
  const [isBreeding, setIsBreeding] = useState(false);
  const [breedProgress, setBreedProgress] = useState(0);
  const [newBreedName, setNewBreedName] = useState('');
  const [breedLogs, setBreedLogs] = useState<string[]>([]);
  const [punnettMatrix, setPunnettMatrix] = useState<any | null>(null);
  const [hybridResult, setHybridResult] = useState<Strain | null>(null);

  const selectedStrain = strains.find(s => s.id === selectedStrainId) || strains[0];

  // Radar chart data preparation
  const getRadarData = (strain: Strain) => [
    { subject: 'Myrcene (Relax)', value: strain.terpenes.myrcene * 100 },
    { subject: 'Limonene (Citrus)', value: strain.terpenes.limonene * 100 },
    { subject: 'Caryophyllene (Spice)', value: strain.terpenes.caryophyllene * 100 },
    { subject: 'Pinene (Focus)', value: strain.terpenes.pinene * 100 },
    { subject: 'Linalool (Floral)', value: strain.terpenes.linalool * 100 }
  ];

  // Apply strain to core app feedstock
  const handleApplyToFeedstock = (strain: Strain) => {
    // Convert current potencies to active/acid forms.
    // Assuming active cannabinoids (thc, cbd, cbg) correspond to:
    // CBDA = CBD / 0.877, THCA = THC / 0.877
    const thca = parseFloat((strain.thc / 0.12).toFixed(2));
    const cbda = parseFloat((strain.cbd / 0.15).toFixed(2));
    const cbga = parseFloat((strain.cbg / 0.18).toFixed(2));
    
    onApplyBiomass({
      thca,
      thc: strain.thc,
      cbda,
      cbd: strain.cbd,
      cbga,
      other: strain.cbn || 0.1,
    }, strain.name);
  };

  // Run deterministic Punnett-square & biochemical hybrid blending
  const handleSimulateCrossbreeding = () => {
    const parentA = strains.find(s => s.id === parentAId);
    const parentB = strains.find(s => s.id === parentBId);
    if (!parentA || !parentB) return;

    setIsBreeding(true);
    setBreedProgress(0);
    setBreedLogs(['Initializing Genetic Sequencer...', 'Mapping parent chromosome alignments...']);
    setHybridResult(null);

    // Dynamic breed log increments
    setTimeout(() => {
      setBreedProgress(25);
      setBreedLogs(prev => [...prev, `Sequencing Parent A: "${parentA.name}" (${parentA.type})`]);
    }, 400);

    setTimeout(() => {
      setBreedProgress(50);
      setBreedLogs(prev => [...prev, `Sequencing Parent B: "${parentB.name}" (${parentB.type})`]);
    }, 800);

    setTimeout(() => {
      setBreedProgress(75);
      // Punnett calculation
      // Let's define alleles: B_D (CBD synthase dominant), B_T (THC synthase dominant), B_G (CBG-accumulation/knockout marker)
      // Represent genotypes:
      // Charlotte's Web: BD/BD
      // White CBG: BG/BG
      // If parents have similar dominant synthases, offspring maintains it.
      // If they are different (e.g. BD/BD x BG/BG), we get 100% hybrid BD/BG
      const gA = parentA.type.includes('CBD') ? 'BD/BD' : parentA.type.includes('CBG') ? 'BG/BG' : 'BT/BT';
      const gB = parentB.type.includes('CBD') ? 'BD/BD' : parentB.type.includes('CBG') ? 'BG/BG' : 'BT/BT';
      
      const allelesA = gA.split('/');
      const allelesB = gB.split('/');

      const matrix = [
        { alleleA: allelesA[0], alleleB: allelesB[0], result: `${allelesA[0]}/${allelesB[0]}` },
        { alleleA: allelesA[0], alleleB: allelesB[1], result: `${allelesA[0]}/${allelesB[1]}` },
        { alleleA: allelesA[1], alleleB: allelesB[0], result: `${allelesA[1]}/${allelesB[0]}` },
        { alleleA: allelesA[1], alleleB: allelesB[1], result: `${allelesA[1]}/${allelesB[1]}` }
      ];

      setPunnettMatrix({ allelesA, allelesB, matrix });
      setBreedLogs(prev => [...prev, 'Executing Punnett Square recombination matrix... Done.']);
    }, 1200);

    setTimeout(() => {
      setBreedProgress(100);
      
      // Calculate resulting potencies (deterministic mean + slight variation)
      const childThc = parseFloat(((parentA.thc + parentB.thc) / 2 * 1.05).toFixed(2));
      const childCbd = parseFloat(((parentA.cbd + parentB.cbd) / 2 * 0.98).toFixed(2));
      const childCbg = parseFloat(((parentA.cbg + parentB.cbg) / 2 * 1.10).toFixed(2));
      const childCbn = parseFloat(((parentA.cbn + parentB.cbn) / 2).toFixed(2));

      // Recombine terpenes
      const childTerps = {
        myrcene: parseFloat(((parentA.terpenes.myrcene + parentB.terpenes.myrcene) / 2).toFixed(2)),
        limonene: parseFloat(((parentA.terpenes.limonene + parentB.terpenes.limonene) / 2).toFixed(2)),
        caryophyllene: parseFloat(((parentA.terpenes.caryophyllene + parentB.terpenes.caryophyllene) / 2).toFixed(2)),
        pinene: parseFloat(((parentA.terpenes.pinene + parentB.terpenes.pinene) / 2).toFixed(2)),
        linalool: parseFloat(((parentA.terpenes.linalool + parentB.terpenes.linalool) / 2).toFixed(2))
      };

      // Determine type
      let childType: any = 'Type III (CBD Dominant)';
      if (childCbg > childCbd && childCbg > childThc) {
        childType = 'Type IV (CBG Dominant)';
      } else if (childThc > 1.0 && childCbd > 1.0) {
        childType = 'Type II (Mixed Ratio)';
      }

      const generatedName = newBreedName.trim() || `${parentA.name.split(' ')[0]}'s ${parentB.name.split(' ')[0]}`;

      const childStrain: Strain = {
        id: `custom-${Date.now()}`,
        name: generatedName,
        type: childType,
        thc: childThc,
        cbd: childCbd,
        cbg: childCbg,
        cbn: childCbn,
        terpenes: childTerps,
        classification: 'F1 Hybrid - Laboratory Registered',
        lineage: [parentA.name, parentB.name],
        origin: `A state-of-the-art F1 hybrid stabilized inside the Hemp OS Crossbreed Sim Lab on 2026-06-30. Designed for specialized synergistic therapeutic profiles.`,
        landraceBackground: `Synthesized from ancestral pools: ${parentA.name} and ${parentB.name}.`,
        isCustom: true
      };

      setHybridResult(childStrain);
      setBreedLogs(prev => [
        ...prev, 
        `🎉 Successfully stabilized F1 hybrid: "${generatedName}"!`,
        `Genetic configuration: ${childType}`,
        `Calculated potencies: THC = ${childThc}%, CBD = ${childCbd}%, CBG = ${childCbg}%`
      ]);
      setIsBreeding(false);
    }, 2000);
  };

  // Add hybrid offspring to local strains database
  const handleRegisterStrain = () => {
    if (!hybridResult) return;
    setStrains(prev => [...prev, hybridResult]);
    setSelectedStrainId(hybridResult.id);
    setHybridResult(null);
    setNewBreedName('');
    setPunnettMatrix(null);
  };

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
              Hemp OS Strain Breed Lab <span className="text-[#666] font-normal italic">Layer 10</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">
            Cannabinoid Gene Mapping, Genetic Lineage & Hybrid Synthesis Lab
          </p>
        </div>
        <div className="text-[10px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-950/10 px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5">
          <Dna className="w-3.5 h-3.5" />
          Breeding Sandbox Nominal
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-[#1f1f21]">
        
        {/* LEFT PANEL: STRAIN DATABASE & LINEAGE TRACKER (7 cols) */}
        <div className="xl:col-span-7 p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              Cultivar & Strain Library
            </h3>
            
            {/* Active Biomass Warning */}
            <div className="text-[9px] font-mono text-gray-400 bg-[#121214] border border-[#1f1f21] px-2.5 py-1 rounded">
              Active Feedstock: <span className="text-emerald-400 font-bold">{activeBiomassName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Strain list sidebar (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
              {strains.map((strain) => (
                <button
                  type="button"
                  key={strain.id}
                  onClick={() => setSelectedStrainId(strain.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedStrainId === strain.id
                      ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#121214] border-[#1f1f21] hover:border-emerald-500/20 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-[11px] truncate">{strain.name}</span>
                    {strain.isCustom && (
                      <span className="px-1.5 py-0.5 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-[6.5px] font-mono rounded font-bold">F1</span>
                    )}
                  </div>
                  <span className="text-[7.5px] font-mono uppercase text-gray-500 block mt-0.5">{strain.type}</span>
                  
                  <div className="flex gap-2 text-[8px] font-mono mt-2 text-gray-400">
                    <span>T: {strain.thc}%</span>
                    <span>C: {strain.cbd}%</span>
                    <span>G: {strain.cbg}%</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Strain specifications (7 cols) */}
            <div className="md:col-span-7 bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-[#1c1c1f] pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">{selectedStrain.name}</h4>
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{selectedStrain.classification}</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleApplyToFeedstock(selectedStrain)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[8.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Strain
                  </button>
                </div>

                {/* Analytical Numbers Grid */}
                <div className="grid grid-cols-4 gap-2.5 font-mono text-center">
                  <div className="p-2 bg-[#0d0d0f] border border-[#1c1c1f] rounded-lg">
                    <span className="text-[7px] text-gray-500 block uppercase font-bold">THC wt%</span>
                    <span className="text-[11px] text-red-400 font-bold">{selectedStrain.thc}%</span>
                  </div>
                  <div className="p-2 bg-[#0d0d0f] border border-[#1c1c1f] rounded-lg">
                    <span className="text-[7px] text-gray-500 block uppercase font-bold">CBD wt%</span>
                    <span className="text-[11px] text-emerald-400 font-bold">{selectedStrain.cbd}%</span>
                  </div>
                  <div className="p-2 bg-[#0d0d0f] border border-[#1c1c1f] rounded-lg">
                    <span className="text-[7px] text-gray-500 block uppercase font-bold">CBG wt%</span>
                    <span className="text-[11px] text-cyan-400 font-bold">{selectedStrain.cbg}%</span>
                  </div>
                  <div className="p-2 bg-[#0d0d0f] border border-[#1c1c1f] rounded-lg">
                    <span className="text-[7px] text-gray-500 block uppercase font-bold">CBN wt%</span>
                    <span className="text-[11px] text-amber-400 font-bold">{selectedStrain.cbn}%</span>
                  </div>
                </div>

                {/* Radar chart of terpenes */}
                <div className="h-[120px] bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] overflow-hidden p-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData(selectedStrain)}>
                      <PolarGrid stroke="#1c1c1f" />
                      <PolarAngleAxis dataKey="subject" stroke="#666" fontSize={6.5} />
                      <Radar name="Terpenes" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* History Description */}
                <div className="space-y-1">
                  <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Strain History & Background</span>
                  <p className="text-[9.5px] text-gray-400 leading-relaxed font-sans">{selectedStrain.origin}</p>
                </div>
              </div>

              {/* Ancestral lineage tree representation */}
              <div className="mt-4 pt-3 border-t border-[#1f1f21] space-y-2">
                <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Genetics Ancestral Lineage</span>
                <div className="flex items-center gap-2 text-[9px] font-mono text-gray-300 bg-[#0d0d0f] border border-[#1c1c1f] p-2 rounded-lg">
                  <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-gray-500">{selectedStrain.landraceBackground.split(' crossed ')[0]}</span>
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                  <span className="text-emerald-400 font-bold">{selectedStrain.name}</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT PANEL: CROSSBREED SIM LAB (5 cols) */}
        <div className="xl:col-span-5 p-6 bg-[#0c0c0e]/40 space-y-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-[#1f1f21] pb-3">
            <GitMerge className="w-4 h-4 text-emerald-400" />
            Crossbreed Sim Lab
          </h3>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Parent A */}
              <div className="space-y-1">
                <label className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">Parent A (Pollen Donor)</label>
                <select
                  value={parentAId}
                  onChange={(e) => setParentAId(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f21] hover:border-emerald-500/20 rounded-lg p-2 text-xs text-white focus:outline-none transition-all"
                >
                  {strains.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Parent B */}
              <div className="space-y-1">
                <label className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">Parent B (Seed Bearer)</label>
                <select
                  value={parentBId}
                  onChange={(e) => setParentBId(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f21] hover:border-emerald-500/20 rounded-lg p-2 text-xs text-white focus:outline-none transition-all"
                >
                  {strains.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Offspring Name */}
            <div className="space-y-1">
              <label className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">Stablized Hybrid Custom Name (Optional)</label>
              <input
                type="text"
                value={newBreedName}
                onChange={(e) => setNewBreedName(e.target.value)}
                placeholder="e.g. Cherry Web, Sour Finola, CBG Candy"
                className="w-full bg-[#121214] border border-[#1f1f21] focus:border-emerald-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleSimulateCrossbreeding}
              disabled={isBreeding}
              className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 hover:border-emerald-500 text-emerald-200 text-[10px] font-bold font-mono uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
            >
              {isBreeding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Simulating Recombination ({breedProgress}%)
                </>
              ) : (
                <>
                  <Dna className="w-4 h-4 text-emerald-400" />
                  Simulate Hybrid Cross
                </>
              )}
            </button>
          </div>

          {/* breeding output display */}
          <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-3 font-mono text-[9px] h-[140px] overflow-y-auto space-y-1.5 text-gray-400">
            <span className="text-[7.5px] text-emerald-500 uppercase tracking-wider font-bold block border-b border-[#1c1c1f]/50 pb-1">
              // GENETIC CO-RECOMBINATOR LOG
            </span>
            {breedLogs.map((log, idx) => (
              <div key={idx} className={log.includes('🎉') ? 'text-cyan-400 font-bold' : 'text-gray-300'}>
                {log}
              </div>
            ))}
            {breedLogs.length === 0 && (
              <div className="text-gray-600 italic uppercase py-6 text-center text-[8.5px]">Select parents and hit "Simulate Hybrid Cross" to generate genotypes.</div>
            )}
          </div>

          {/* punnett matrix & F1 results display */}
          <AnimatePresence>
            {punnettMatrix && hybridResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 space-y-4"
              >
                {/* Punnett Square UI */}
                <div>
                  <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold mb-2">Allele Combinations Matrix</span>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                    <div className="p-1 text-gray-600">P_A \ P_B</div>
                    <div className="p-1 bg-[#1a1a1c] text-emerald-400 rounded">{punnettMatrix.allelesB[0]}</div>
                    <div className="p-1 bg-[#1a1a1c] text-emerald-400 rounded">{punnettMatrix.allelesB[1]}</div>

                    <div className="p-1 bg-[#1a1a1c] text-emerald-400 rounded flex items-center justify-center">{punnettMatrix.allelesA[0]}</div>
                    {punnettMatrix.matrix.slice(0, 2).map((item: any, i: number) => (
                      <div key={i} className="p-2 bg-[#0d0d0f] border border-emerald-500/10 text-white rounded text-[9px] font-bold">
                        {item.result}
                      </div>
                    ))}

                    <div className="p-1 bg-[#1a1a1c] text-emerald-400 rounded flex items-center justify-center">{punnettMatrix.allelesA[1]}</div>
                    {punnettMatrix.matrix.slice(2, 4).map((item: any, i: number) => (
                      <div key={i} className="p-2 bg-[#0d0d0f] border border-emerald-500/10 text-white rounded text-[9px] font-bold">
                        {item.result}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save offspring option */}
                <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-white block uppercase tracking-wide">{hybridResult.name}</span>
                    <span className="text-[7.5px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">{hybridResult.type}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegisterStrain}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[8.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register Strain
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
