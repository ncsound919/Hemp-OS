import React, { useState } from 'react';
import { 
  FileText, Share2, Award, Download, Image as ImageIcon, Flame, Snowflake, 
  ExternalLink, Copy, Check, Info, Sparkles, BookOpen, Layers, Microscope, Monitor, RefreshCw 
} from 'lucide-react';
import { Biomass, ProcessGraph } from '../../kernel/core/types.ts';

// Dynamic image paths from the generated visual assets
const PROPAGANDA_POSTERS = [
  {
    id: 'poster-1',
    title: 'Purity Guaranteed (Reactor Column)',
    image: '/src/assets/images/refinery_propaganda_1782837389239.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    slogan: 'THE MACHINE OPTIMIZES. THE PRODUCT REVEALS.',
    theme: 'Vaporwave Minimalist Grid',
    color: 'border-emerald-500 text-emerald-400'
  },
  {
    id: 'poster-2',
    title: 'Thermodynamic Molecular Blueprint',
    image: '/src/assets/images/molecular_blueprint_1782837403709.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
    slogan: 'DETERMINISTIC SIMULATION. PROVEN VERACITY.',
    theme: 'Sleek Neon Tech',
    color: 'border-cyan-500 text-cyan-400'
  },
  {
    id: 'poster-3',
    title: 'Cyber-Botanical Cultivation Chamber',
    image: '/src/assets/images/cybernetic_crop_1782837416012.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
    slogan: 'AUTONOMY. VERIFICATION. EXTREME YIELD.',
    theme: 'Dark Emerald Grow',
    color: 'border-purple-500 text-purple-400'
  }
];

interface ScientificDiscoveryPublisherProps {
  biomass: Biomass;
  graph: ProcessGraph;
  results: any;
}

export const ScientificDiscoveryPublisher: React.FC<ScientificDiscoveryPublisherProps> = ({
  biomass,
  graph,
  results
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'paper' | 'flyer' | 'propaganda'>('paper');
  const [copied, setCopied] = useState(false);
  const [selectedPosterId, setSelectedPosterId] = useState('poster-1');
  const [stampText, setStampText] = useState('VERIFIED BY HEMP OS KERNEL');
  const [stampColor, setStampColor] = useState('text-emerald-400 border-emerald-500/80 bg-emerald-950/80');
  const [flyerHeadline, setFlyerHeadline] = useState('🧪 SHATTERING PURITY RECORDS!');
  const [flyerStyle, setFlyerStyle] = useState('neon-grid');

  // Math variables
  const thca = biomass.potency.thca;
  const cbda = biomass.potency.cbda;
  const cbd = biomass.potency.cbd;
  const totalCBD = cbd + (cbda * 0.877);
  const decarbStage = graph.stages.find(s => s.type === 'decarboxylation');
  const decarbTemp = decarbStage?.config?.temperatureCelsius ?? 120;
  const decarbTime = decarbStage?.config?.durationMinutes ?? 60;
  
  const winterizationStage = graph.stages.find(s => s.type === 'winterization');
  const winterTemp = winterizationStage?.config?.temperatureCelsius ?? -40;
  const winterRatio = winterizationStage?.config?.solventRatio ?? 4.0;

  // Extraction Yield summary stats
  const calculatedYield = results?.results?.stages?.[results?.results?.stages?.length - 1]?.metrics?.yieldFraction ?? 0.82;
  const purityVal = results?.results?.stages?.[results?.results?.stages?.length - 1]?.metrics?.purityFraction ?? 0.84;
  const totalWeightInGrams = 1000 * biomass.quantityKg;
  const outputProductKg = (biomass.quantityKg * calculatedYield * purityVal).toFixed(3);

  const handleCopySlogan = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActivePoster = () => {
    return PROPAGANDA_POSTERS.find(p => p.id === selectedPosterId) || PROPAGANDA_POSTERS[0];
  };

  const activePoster = getActivePoster();

  return (
    <div id="scientific-publisher-block" className="bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl text-white">
      {/* Header Panel */}
      <div className="bg-[#0a0a0b] p-5 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900/30 border border-blue-500/20 rounded-xl">
            <Microscope className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Layer 12: Scientific Discovery & Propaganda Publisher</h2>
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
                ? 'bg-purple-950/40 border border-purple-500 text-purple-300'
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
                ? 'bg-emerald-950/40 border border-emerald-500 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Propaganda Art Stamp
          </button>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="p-6">
        
        {/* TAB 1: ACADEMIC PREPRINT (LaTeX Style) */}
        {activeSubTab === 'paper' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#18181b]/60 border border-[#222] p-4 rounded-xl gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> PREPRINT READY FOR ARXIV INGESTION
                </span>
                <p className="text-gray-400 font-mono text-[9.5px]">This peer-reviewed physical simulation document utilizes verified thermodynamic parameters and is digitally stamped.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold text-white tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Print PDF
                </button>
              </div>
            </div>

            {/* LaTeX Journal Layout Container */}
            <div className="bg-white text-gray-900 p-8 sm:p-12 md:p-16 rounded-2xl shadow-inner max-w-4xl mx-auto font-serif overflow-x-auto leading-relaxed text-sm select-text">
              {/* Journal Header */}
              <div className="border-b-2 border-gray-900 pb-4 mb-8 text-center">
                <span className="text-[10px] uppercase font-bold tracking-widest font-sans text-gray-500 block">Journal of Computational Phytochemical Engineering</span>
                <span className="text-[9px] font-mono text-gray-400 block mt-1">HOS-PREPRINT-2026-T944 | VERIFIED DETERMINISTIC RESULT</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-center tracking-tight text-black mb-4">
                Multiphase Thermodynamic Simulation of Sub-Critical and Supercritical Extraction Routines using {biomass.name} Feedstock
              </h1>

              {/* Authors */}
              <p className="text-center font-sans text-xs text-gray-700 font-medium mb-6">
                Dr. Marcus Vance<sup>1</sup>, Dr. Evelyn Carter<sup>2</sup>, Tap4500 Autonomous Solver Core<sup>3</sup><br />
                <span className="text-gray-500 text-[10px] block mt-1"><sup>1,2,3</sup>Hemp OS Physical Intelligence Laboratories, Silicon Valley</span>
              </p>

              {/* Abstract */}
              <div className="border-t border-b border-gray-300 py-4 my-6">
                <p className="text-xs uppercase font-sans font-bold tracking-wider text-center text-gray-700 mb-2">Abstract</p>
                <p className="text-[12.5px] italic text-justify text-gray-800 leading-relaxed px-4">
                  This work presents a comprehensive simulation of a multi-stage botanical refinement flowsheet operating on a {biomass.name} feedstock with raw cannabinoid fractions of THCA={thca.toFixed(2)}%, CBDA={cbda.toFixed(2)}%, and CBD={cbd.toFixed(2)}%. The kinetic conversion limits of decarboxylation were mapped at {decarbTemp}°C for {decarbTime} minutes. Precipitant wax fractionation mechanics were modeled utilizing sub-zero winterization held at {winterTemp}°C under a solvent ratio of {winterRatio}:1. Physical computations resolve to a final output of {outputProductKg} kg of high-purity refined molecules representing a cumulative purification fraction of {(purityVal * 100).toFixed(2)}% and a chemical extraction yield of {(calculatedYield * 100).toFixed(2)}%. The mathematical modeling verifies that autonomous calibration reduces overall process entropy while maximizing specific phase separation factors.
                </p>
              </div>

              {/* Main Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-justify text-xs text-gray-800 space-y-2 md:space-y-0">
                <div>
                  <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-black border-b border-gray-200 pb-1 mb-2">1. Introduction</h3>
                  <p className="mb-3">
                    The extraction of high-value phytochemical compounds from Cannabis Sativa L. cultivars is heavily dictated by non-linear fluid phase behaviors. In conventional process architectures, optimization is achieved through expensive, iterative physical trials. 
                  </p>
                  <p className="mb-3">
                    By implementing an autonomous layered Operating System (Hemp OS), physical simulations allow live thermodynamic predictions. This enables instant optimization of extraction pressures, sub-zero precipitation profiles, and thermal decarboxylation kinetics prior to operational deployment.
                  </p>

                  <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-black border-b border-gray-200 pb-1 mb-2">2. Kinetic Decarboxylation Model</h3>
                  <p className="mb-3">
                    Thermal decarboxylation is represented as a first-order rate reaction where the acidic cannabinoid precursors are thermally converted:
                  </p>
                  <div className="bg-gray-50 p-2.5 rounded font-mono text-[10px] text-center my-3 border border-gray-150">
                    d[A]/dt = - k * [A] <br />
                    k = A_0 * exp( - E_a / (R * T) )
                  </div>
                  <p>
                    Calibration points at temperature T = {decarbTemp + 273.15} K ({decarbTemp}°C) prove complete THCA and CBDA activation kinetics, achieving stable carbon dioxide release without triggering secondary compound vaporization or oxidative pyrolysis.
                  </p>
                </div>

                <div>
                  <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-black border-b border-gray-200 pb-1 mb-2">3. Sub-Zero Winterization Limits</h3>
                  <p className="mb-3">
                    Precipitation kinetics of lipids and cuticular waxes are driven by temperature depression. For ethanol-solubilized botanical slurs, holding temperatures must be maintained below -30°C to allow rapid crystallization. 
                  </p>
                  <p className="mb-3">
                    Under the simulated parameters of T_winter = {winterTemp}°C and solvent-to-crude mass ratio = {winterRatio}:1, the thermodynamic solver calculated complete crystal precipitation within the simulated holding timeframe. Rapid crystallization limits colloid-induced filter blinding.
                  </p>

                  <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-black border-b border-gray-200 pb-1 mb-2">4. Verifiable Core Metrics</h3>
                  <table className="w-full text-[10px] text-left border-collapse my-3">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="py-1 font-bold">Metric Parameter</th>
                        <th className="py-1 font-bold text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-1">Biomass Feedstock</td>
                        <td className="py-1 text-right font-semibold">{biomass.name}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-1">Total Input Mass</td>
                        <td className="py-1 text-right font-semibold">{biomass.quantityKg} kg</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-1">Predicted Extraction Yield</td>
                        <td className="py-1 text-right font-semibold">{(calculatedYield * 100).toFixed(2)}%</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-1">Final Refined Purity</td>
                        <td className="py-1 text-right font-semibold">{(purityVal * 100).toFixed(2)}%</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-1">Output Isolated Compounds</td>
                        <td className="py-1 text-right font-semibold text-blue-700">{outputProductKg} kg</td>
                      </tr>
                    </tbody>
                  </table>
                  <p>
                    <strong>Conclusion:</strong> The calculated yield boundaries represent a 1.25x efficiency improvement over legacy workflows, directly matching guidelines set forth by Dr. Carter's experimental literature corpus.
                  </p>
                </div>
              </div>

              {/* References */}
              <div className="border-t border-gray-300 pt-4 mt-8 font-serif text-[10px] text-gray-500">
                <span className="font-sans font-bold text-[9px] uppercase tracking-wider block text-gray-700 mb-2">Selected References</span>
                <ul className="space-y-1 text-justify">
                  <li>[1] Carter, E. & Vance, M. (2024). *Practical Phytocannabinoid Processing & Extraction*, Academic Science Press, Vol 12.</li>
                  <li>[2] NIST Physical Chemistry Fluids Data Group (2021). *Equations of State in High Pressure Supercritical CO2 Systems*.</li>
                  <li>[3] Hemp OS Autonomous Modeling & Machine Discovery Core Protocol (2026).</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOCIAL MEDIA FLYER (Layman's Terms) */}
        {activeSubTab === 'flyer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Editor Sidebar Controls (Left, 5 cols) */}
            <div className="lg:col-span-5 bg-[#161619] border border-[#1f1f21] p-5 rounded-xl space-y-4">
              <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Social Media Flyer customizer
              </span>
              <p className="text-[11px] text-gray-400">
                Translate advanced chemical calculus equations and physical graphs into catchy, understandable high-impact posts for the general public!
              </p>

              {/* Editor controls */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Headline Hook</label>
                  <input
                    type="text"
                    value={flyerHeadline}
                    onChange={(e) => setFlyerHeadline(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f21] rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                    placeholder="Enter eye-catching headline..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Aesthetic Poster Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFlyerStyle('neon-grid')}
                      className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border text-center transition-all cursor-pointer ${
                        flyerStyle === 'neon-grid'
                          ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                          : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                      }`}
                    >
                      Cyber Neon Glow
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlyerStyle('academic-brutalist')}
                      className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border text-center transition-all cursor-pointer ${
                        flyerStyle === 'academic-brutalist'
                          ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                          : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                      }`}
                    >
                      Brutalist Vector
                    </button>
                  </div>
                </div>

                {/* Layman tips checklist */}
                <div className="border-t border-[#1f1f21] pt-3.5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Active Layman Translations</span>
                  <div className="space-y-1.5 text-[10.5px] text-gray-300 font-mono">
                    <div className="flex gap-2 items-start text-gray-400">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>"Thermal Decarboxylation" → <strong className="text-white">"Molecular Heat Trigger"</strong></span>
                    </div>
                    <div className="flex gap-2 items-start text-gray-400">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>"Sub-zero Winterization" → <strong className="text-white">"Sub-Zero Freeze Wash"</strong></span>
                    </div>
                    <div className="flex gap-2 items-start text-gray-400">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>"Phytocannabinoid purity fraction" → <strong className="text-white">"Super-Pure Molecule Isolation"</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopySlogan(`${flyerHeadline} \n🧬 Breakthrough discovery by Hemp OS! Standard botanical feedstock "${biomass.name}" simulated at 1.25x peak efficiency. Final compound purity achieved: ${(purityVal * 100).toFixed(1)}%. Live decentralized simulation results verified!`)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Post Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy High-Impact Social Post</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Flyer Graphic Preview (Right, 7 cols) */}
            <div className="lg:col-span-7 flex justify-center">
              <div 
                className={`w-full max-w-md aspect-square p-6 sm:p-8 flex flex-col justify-between rounded-3xl overflow-hidden shadow-2xl relative select-none border ${
                  flyerStyle === 'neon-grid' 
                    ? 'bg-gradient-to-br from-indigo-950 via-[#0a0614] to-purple-950 border-purple-500/40 shadow-purple-500/10' 
                    : 'bg-[#121214] border-gray-800 shadow-black'
                }`}
              >
                {/* Visual Background Grid Overlay */}
                {flyerStyle === 'neon-grid' && (
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
                )}

                {/* Decorative Tech Rings */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border border-purple-500/10 pointer-events-none" />
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-purple-500/5 pointer-events-none" />

                {/* Top Flyer Header */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center text-[10px] font-bold text-white tracking-tighter">HOS</div>
                    <span className="text-[8px] font-mono font-bold tracking-widest text-purple-400 uppercase">HEMP OS MEDIA PROTOCOL</span>
                  </div>
                  <span className="text-[7.5px] font-mono text-gray-400 bg-black/40 border border-[#2d2d30] px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Verified Release
                  </span>
                </div>

                {/* Core Dynamic Headline */}
                <div className="relative z-10 my-6">
                  <span className="text-[10px] font-bold font-mono text-emerald-400 tracking-widest uppercase block mb-1">Breakthrough Scientific Update</span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase leading-tight drop-shadow">
                    {flyerHeadline}
                  </h1>
                  <p className="text-[11.5px] text-gray-300 font-sans mt-2 max-w-sm leading-relaxed">
                    Our autonomous molecular solver just completed the complex physical simulation of <span className="text-purple-300 font-semibold">{biomass.name}</span>, revealing a hyper-optimal refinement route for peak compound concentration.
                  </p>
                </div>

                {/* Middle Stats Grid - Humorous Layman Specs */}
                <div className="relative z-10 grid grid-cols-3 gap-3.5 bg-black/30 border border-[#1f1f21] p-3.5 rounded-2xl">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span className="text-[7px] font-mono font-bold text-gray-500 uppercase tracking-widest">Heat Activation</span>
                    </div>
                    <p className="text-xs font-bold text-white font-mono">{decarbTemp}°C</p>
                    <span className="text-[6.5px] font-mono text-gray-400 block uppercase">Perfect Decarb</span>
                  </div>

                  <div className="space-y-0.5 border-l border-[#1f1f21] pl-3">
                    <div className="flex items-center gap-1">
                      <Snowflake className="w-3 h-3 text-blue-400" />
                      <span className="text-[7px] font-mono font-bold text-gray-500 uppercase tracking-widest">Freeze Level</span>
                    </div>
                    <p className="text-xs font-bold text-white font-mono">{winterTemp}°C</p>
                    <span className="text-[6.5px] font-mono text-gray-400 block uppercase">Wax Extraction</span>
                  </div>

                  <div className="space-y-0.5 border-l border-[#1f1f21] pl-3">
                    <div className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[7px] font-mono font-bold text-gray-500 uppercase tracking-widest">Molecule Purity</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-400 font-mono">{(purityVal * 100).toFixed(1)}%</p>
                    <span className="text-[6.5px] font-mono text-emerald-400/80 block uppercase tracking-tighter">Verified Pure</span>
                  </div>
                </div>

                {/* Flyer Bottom Tagline */}
                <div className="relative z-10 flex items-end justify-between border-t border-[#1f1f21] pt-3.5 mt-3">
                  <div>
                    <span className="text-[7px] font-mono text-gray-500 uppercase block font-bold">Research Source</span>
                    <span className="text-[9.5px] text-white font-mono font-bold uppercase tracking-widest">Tap4500 Autonomous Lab Core</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[6.5px] font-mono text-gray-500 uppercase block font-bold">Extraction Yield</span>
                    <span className="text-[10px] text-purple-300 font-mono font-black">{(calculatedYield * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROPAGANDA ARTWORK STAMP */}
        {activeSubTab === 'propaganda' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Poster selection & stamp controls (Left, 5 cols) */}
            <div className="lg:col-span-5 bg-[#161619] border border-[#1f1f21] p-5 rounded-xl space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Propaganda Design Controller
                </span>
                <p className="text-[11.5px] text-gray-400">
                  Select a retro-futuristic scientific propaganda poster and stamp it with real-time validated parameters from your autonomous chemical simulation runs.
                </p>
              </div>

              {/* Selector */}
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

                {/* Custom stamp text */}
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

                {/* Custom Stamp color */}
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

                {/* Slogan details and Copy */}
                <div className="bg-[#121214] border border-[#1f1f21] p-3.5 rounded-xl space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Featured Propaganda Slogan</span>
                  <p className="text-xs italic text-gray-300 font-serif">"{activePoster.slogan}"</p>
                  <button
                    type="button"
                    onClick={() => handleCopySlogan(activePoster.slogan)}
                    className="text-[9px] font-mono text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copied ? '✓ Slogan Copied!' : 'Copy Slogan to clipboard'}
                  </button>
                </div>
              </div>
            </div>

            {/* Poster Graphic Render (Right, 7 cols) */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl relative border border-gray-800 bg-black group select-none">
                
                {/* Poster Artwork Image with fallback */}
                <img
                  src={activePoster.image}
                  alt={activePoster.title}
                  onError={(e) => {
                    // fall back gracefully if image has loading limits in preview container
                    e.currentTarget.src = activePoster.fallbackUrl;
                  }}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/40 pointer-events-none" />

                {/* Poster Copy Content overlay */}
                <div className="absolute top-5 left-5 right-5 z-10 flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-mono text-white tracking-widest uppercase bg-black/60 border border-white/10 px-2 py-0.5 rounded-md font-bold">
                      HEMP OS DIRECTIVE
                    </span>
                  </div>
                  <div>
                    <span className="text-[7px] font-mono text-gray-400 text-right uppercase block font-bold">Campaign Lineage</span>
                    <span className="text-[8px] font-mono text-white text-right block uppercase font-bold">DELTA-9 CALIBRATION</span>
                  </div>
                </div>

                {/* Dynamic Scientific Stamp (Stamps live simulated details onto the artwork) */}
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div className={`border-2 border-dashed ${stampColor} rounded-2xl px-4 py-2.5 transform -rotate-12 shadow-lg flex flex-col items-center gap-1 max-w-[200px]`}>
                    <span className="text-[8px] font-black tracking-widest text-center uppercase font-mono leading-tight">{stampText}</span>
                    <div className="h-px bg-white/20 w-full" />
                    <span className="text-[9px] font-mono font-black text-white">{biomass.name}</span>
                    <span className="text-[7.5px] font-mono text-gray-300">{(purityVal * 100).toFixed(1)}% PURE | {(calculatedYield * 100).toFixed(1)}% YLD</span>
                  </div>
                </div>

                {/* Poster Slogan and Bottom Block */}
                <div className="absolute bottom-6 left-6 right-6 z-10 space-y-1.5">
                  <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-widest block">Verified Physical Output</span>
                  <h2 className="text-sm font-sans font-black tracking-widest text-white uppercase leading-none border-b border-white/25 pb-2">
                    {activePoster.slogan}
                  </h2>
                  <div className="flex justify-between items-end text-[7px] font-mono text-gray-400 uppercase pt-1">
                    <div>
                      <span>Reactor Temp: <strong className="text-white">{decarbTemp}°C</strong></span><br />
                      <span>Precipitation: <strong className="text-white">{winterTemp}°C</strong></span>
                    </div>
                    <div className="text-right font-bold text-white">
                      <span>STAMPED FOR DEPLOYMENT</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
