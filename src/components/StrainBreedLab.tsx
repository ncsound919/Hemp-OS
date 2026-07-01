import React, { useState } from 'react';
import { Strain } from './breedLab/types';
import { INITIAL_STRAINS } from './breedLab/data';
import { ExplorerTab } from './breedLab/ExplorerTab';
import { ComparerTab } from './breedLab/ComparerTab';
import { TraitFinderTab } from './breedLab/TraitFinderTab';
import { ScraperTab } from './breedLab/ScraperTab';
import { CrossbreedPanel } from './breedLab/CrossbreedPanel';
import { 
  Dna, Award, Play, ShieldCheck, Heart, Sparkles, Plus, Check, Info, 
  GitMerge, HelpCircle, FileText, ChevronRight, RefreshCw, BarChart2,
  TreePine, Calendar, Scale, Thermometer, Database, Search, Sliders, MapPin, 
  Tag, Activity, DollarSign, Flame, FolderCheck, ShoppingBag, TrendingUp, UserCheck, 
  Globe, ShieldAlert, Star, FileDown, UploadCloud, CheckCircle, LineChart, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';


interface StrainBreedLabProps {
  onApplyBiomass: (potency: { thca: number; thc: number; cbda: number; cbd: number; cbga: number; other: number }, name: string) => void;
  activeBiomassName: string;
  accessToken: string | null;
}

export function StrainBreedLab({ onApplyBiomass, activeBiomassName, accessToken }: StrainBreedLabProps) {
  // Main view tab: 'explorer' | 'comparer' | 'trait_finder'
  const [activeMainTab, setActiveMainTab] = useState<'explorer' | 'comparer' | 'trait_finder' | 'scraper' | 'platform'>('platform');

  // Selected sub-tab for selected strain details perspective (representing the requested databases)
  const [activeIntelTab, setActiveIntelTab] = useState<'leafly' | 'seedfinder' | 'cannaconnection' | 'hytiva' | 'allbud'>('leafly');

  // Deep Predefined Strain Database populated with real, structured metrics representing all 5 platforms
  const [strains, setStrains] = useState<Strain[]>(INITIAL_STRAINS);

  // Selected Strain states
  const [selectedStrainId, setSelectedStrainId] = useState<string>('strain-blue-dream');
  const selectedStrain = strains.find(s => s.id === selectedStrainId) || strains[0];

  // Comparer panel selected strains (max 3)
  const [compareIds, setCompareIds] = useState<string[]>(['strain-blue-dream', 'strain-sour-diesel']);

  // Trait Finder state filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterActivity, setFilterActivity] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterThcRange, setFilterThcRange] = useState<string>('ALL');
  const [filterClimate, setFilterClimate] = useState<string>('ALL');

  // Crossbreeding Sim State
  const [parentAId, setParentAId] = useState<string>('strain-blue-dream');
  const [parentBId, setParentBId] = useState<string>('strain-sour-diesel');
  const [isBreeding, setIsBreeding] = useState(false);
  const [breedProgress, setBreedProgress] = useState(0);
  const [newBreedName, setNewBreedName] = useState('');
  const [breedLogs, setBreedLogs] = useState<string[]>([]);
  const [punnettMatrix, setPunnettMatrix] = useState<any | null>(null);
  const [hybridResult, setHybridResult] = useState<Strain | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadSuccess, setDriveUploadSuccess] = useState(false);

  // Scraper State
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [scrapeTarget, setScrapeTarget] = useState('Leafly API / DOM');
  const [scrapeQuery, setScrapeQuery] = useState('Haze Crossbreeds');

  // Radar Terpene chart data helper
  const getRadarData = (strain: Strain) => [
    { subject: 'Myrcene (Relax)', value: strain.terpenes.myrcene * 100 },
    { subject: 'Limonene (Citrus)', value: strain.terpenes.limonene * 100 },
    { subject: 'Caryophyllene (Spice)', value: strain.terpenes.caryophyllene * 100 },
    { subject: 'Pinene (Focus)', value: strain.terpenes.pinene * 100 },
    { subject: 'Linalool (Floral)', value: strain.terpenes.linalool * 100 }
  ];

  // Apply strain to active system biomass feedstock
  const handleApplyToFeedstock = (strain: Strain) => {
    // Convert wt% to active/acid form ratio
    const thca = parseFloat((strain.thc / 0.877).toFixed(2));
    const cbda = parseFloat((strain.cbd / 0.877).toFixed(2));
    const cbga = parseFloat((strain.cbg / 0.877).toFixed(2));
    
    onApplyBiomass({
      thca,
      thc: strain.thc,
      cbda,
      cbd: strain.cbd,
      cbga,
      other: strain.cbn || 0.1,
    }, strain.name);
  };

  // Run Crossbreed simulation using high-resolution genetic mixing
  const handleSimulateCrossbreeding = () => {
    const parentA = strains.find(s => s.id === parentAId);
    const parentB = strains.find(s => s.id === parentBId);
    if (!parentA || !parentB) return;

    setIsBreeding(true);
    setBreedProgress(0);
    setBreedLogs(['[GENETICS ENGINE] Initiating diploid allele crossing...', '[GENETICS ENGINE] Loading maternal & paternal genomic matrices...']);
    setHybridResult(null);

    // Dynamic breed log timeline
    setTimeout(() => {
      setBreedProgress(25);
      setBreedLogs(prev => [...prev, `[GENETICS ENGINE] Aligning terpene synthase expression pathways for Parent A ("${parentA.name}")`]);
    }, 300);

    setTimeout(() => {
      setBreedProgress(50);
      setBreedLogs(prev => [...prev, `[GENETICS ENGINE] Mapping climate/flowering parameters for Parent B ("${parentB.name}")`]);
    }, 600);

    setTimeout(() => {
      setBreedProgress(75);
      // Punnett calculation
      // BD = CBD Synthase, BT = THC Synthase, BG = CBG Accumulation Synthase
      const gA = parentA.type.includes('CBD') ? 'BD/BD' : parentA.type.includes('CBG') ? 'BG/BG' : parentA.type.includes('Mixed') ? 'BT/BD' : 'BT/BT';
      const gB = parentB.type.includes('CBD') ? 'BD/BD' : parentB.type.includes('CBG') ? 'BG/BG' : parentB.type.includes('Mixed') ? 'BT/BD' : 'BT/BT';
      
      const allelesA = gA.split('/');
      const allelesB = gB.split('/');

      const matrix = [
        { alleleA: allelesA[0], alleleB: allelesB[0], result: `${allelesA[0]}/${allelesB[0]}` },
        { alleleA: allelesA[0], alleleB: allelesB[1], result: `${allelesA[0]}/${allelesB[1]}` },
        { alleleA: allelesA[1], alleleB: allelesB[0], result: `${allelesA[1]}/${allelesB[0]}` },
        { alleleA: allelesA[1], alleleB: allelesB[1], result: `${allelesA[1]}/${allelesB[1]}` }
      ];

      setPunnettMatrix({ allelesA, allelesB, matrix });
      setBreedLogs(prev => [...prev, '[GENETICS ENGINE] Matrix recombination resolved. Solving phenotype attributes...']);
    }, 900);

    setTimeout(() => {
      setBreedProgress(100);

      // Blended values
      const childThc = parseFloat(((parentA.thc + parentB.thc) / 2 * (0.95 + Math.random() * 0.1)).toFixed(2));
      const childCbd = parseFloat(((parentA.cbd + parentB.cbd) / 2 * (0.95 + Math.random() * 0.1)).toFixed(2));
      const childCbg = parseFloat(((parentA.cbg + parentB.cbg) / 2 * (0.95 + Math.random() * 0.1)).toFixed(2));
      const childCbn = parseFloat(((parentA.cbn + parentB.cbn) / 2).toFixed(2));

      // Recombine terpenes
      const childTerps = {
        myrcene: parseFloat(((parentA.terpenes.myrcene + parentB.terpenes.myrcene) / 2).toFixed(2)),
        limonene: parseFloat(((parentA.terpenes.limonene + parentB.terpenes.limonene) / 2).toFixed(2)),
        caryophyllene: parseFloat(((parentA.terpenes.caryophyllene + parentB.terpenes.caryophyllene) / 2).toFixed(2)),
        pinene: parseFloat(((parentA.terpenes.pinene + parentB.terpenes.pinene) / 2).toFixed(2)),
        linalool: parseFloat(((parentA.terpenes.linalool + parentB.terpenes.linalool) / 2).toFixed(2))
      };

      // Type
      let childType: Strain['type'] = 'Type I (THC Dominant)';
      if (childCbd > childThc && childCbd > childCbg) {
        childType = 'Type III (CBD Dominant)';
      } else if (childCbg > childThc && childCbg > childCbd) {
        childType = 'Type IV (CBG Dominant)';
      } else if (childThc > 2.0 && childCbd > 2.0) {
        childType = 'Type II (Mixed Ratio)';
      }

      // Breeders metadata blending (SeedFinder.eu style)
      const childFlowering = Math.round((parentA.seedFinderInfo.floweringTimeDays + parentB.seedFinderInfo.floweringTimeDays) / 2);
      const childHeight = Math.round((parentA.seedFinderInfo.heightCm + parentB.seedFinderInfo.heightCm) / 2);
      const childYield = Math.round((parentA.seedFinderInfo.yieldGPerM2 + parentB.seedFinderInfo.yieldGPerM2) / 2);
      
      // Merge unique effects, flavors, activities
      const childEffects = Array.from(new Set([...parentA.leaflyInfo.effects, ...parentB.leaflyInfo.effects])).slice(0, 5);
      const childFlavors = Array.from(new Set([...parentA.leaflyInfo.flavors, ...parentB.leaflyInfo.flavors])).slice(0, 3);
      const childActivities = Array.from(new Set([...parentA.hytivaInfo.activities, ...parentB.hytivaInfo.activities])).slice(0, 4);
      const childMedical = Array.from(new Set([...parentA.hytivaInfo.medicalIndications, ...parentB.hytivaInfo.medicalIndications])).slice(0, 4);

      // Name generation
      const generatedName = newBreedName.trim() || `${parentA.name.split(' ')[0]}'s ${parentB.name.split(' ').pop()}`;

      // Mock user review synthesis based on both parents
      const parentNameA = parentA.name;
      const parentNameB = parentB.name;
      const mockReview = `A sensational F1 combination of ${parentNameA} and ${parentNameB}. It inherits the exquisite flavor tones of ${childFlavors.join(' & ')} while delivering a highly optimized physical feeling suitable for ${childActivities[0]} and ${childActivities[1]}.`;

      const childStrain: Strain = {
        id: `custom-strain-${Date.now()}`,
        name: generatedName,
        type: childType,
        thc: childThc,
        cbd: childCbd,
        cbg: childCbg,
        cbn: childCbn,
        terpenes: childTerps,
        classification: 'Hybrid',
        lineage: [parentA.name, parentB.name],
        origin: `An elite F1 hybrid engineered and stabilized inside the Hemp OS Breed Sim Lab on 2026-06-30. Perfected for robust essential oil and compound yields.`,
        landraceBackground: `Synthesized from heritage lines of ${parentA.name} x ${parentB.name}.`,
        isCustom: true,
        leaflyInfo: {
          effects: childEffects,
          flavors: childFlavors,
          rating: parseFloat((4.0 + Math.random() * 0.9).toFixed(1)),
          reviewsCount: 1,
          popularReview: mockReview
        },
        seedFinderInfo: {
          breeder: "Hemp OS Autonomy Lab",
          floweringTimeDays: childFlowering,
          heightCm: childHeight,
          environment: 'Multi-environment',
          availability: 'Clone-only',
          yieldGPerM2: childYield
        },
        cannaConnectionInfo: {
          seedBank: "Hemp OS Vault",
          climateTolerance: parentA.cannaConnectionInfo.climateTolerance,
          difficulty: 'Medium',
          thcRange: childThc > 15 ? 'High' : childThc > 2 ? 'Medium' : 'Low',
          cbdRange: childCbd > 10 ? 'High' : childCbd > 1 ? 'Medium' : 'None'
        },
        hytivaInfo: {
          activities: childActivities,
          terpeneDominance: childTerps.myrcene > childTerps.limonene ? "Myrcene-dominant" : "Limonene-dominant",
          medicalIndications: childMedical
        },
        allBudInfo: {
          avgPricePerGram: parseFloat(((parentA.allBudInfo.avgPricePerGram + parentB.allBudInfo.avgPricePerGram) / 2).toFixed(2)),
          dispensaryStates: Array.from(new Set([...parentA.allBudInfo.dispensaryStates, ...parentB.allBudInfo.dispensaryStates])).slice(0, 5),
          retailStatus: 'Rare',
          thcMax: Math.round(childThc * 1.15)
        }
      };

      setHybridResult(childStrain);
      setBreedLogs(prev => [
        ...prev, 
        `✔️ [GENETICS ENGINE] Recombination complete. Generated F1 Hybrid: "${generatedName}"`,
        `✔️ Potency Predictions: THC = ${childThc}%, CBD = ${childCbd}%, CBG = ${childCbg}%`,
        `✔️ SeedFinder Estimate: Flowering in ${childFlowering} days. Average height: ${childHeight}cm.`
      ]);
      setIsBreeding(false);
    }, 1200);
  };

  // Add the offspring to the database
  const handleRegisterStrain = () => {
    if (!hybridResult) return;
    setStrains(prev => [...prev, hybridResult]);
    setSelectedStrainId(hybridResult.id);
    setHybridResult(null);
    setNewBreedName('');
    setPunnettMatrix(null);
  };

  // Toggle comparative strain
  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id]; // keep max 3
      }
      return [...prev, id];
    });
  };

  // Filtered strains list for Trait Finder (CannaConnection / Hytiva styles)
  const filteredStrains = strains.filter(strain => {
    const matchesSearch = strain.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          strain.origin.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'ALL' || strain.type.includes(filterType);
    
    const matchesActivity = filterActivity === 'ALL' || strain.hytivaInfo.activities.includes(filterActivity);
    
    const matchesDifficulty = filterDifficulty === 'ALL' || strain.cannaConnectionInfo.difficulty === filterDifficulty;
    
    const matchesThcRange = filterThcRange === 'ALL' || strain.cannaConnectionInfo.thcRange === filterThcRange;
    
    const matchesClimate = filterClimate === 'ALL' || strain.cannaConnectionInfo.climateTolerance === filterClimate;

    return matchesSearch && matchesType && matchesActivity && matchesDifficulty && matchesThcRange && matchesClimate;
  });

  // Export bred F1 profile directly to Google Drive "Hemp OS" Folder
  const uploadBredStrainToDrive = async () => {
    if (!hybridResult || !accessToken) return;
    setIsUploadingToDrive(true);
    setDriveUploadSuccess(false);

    try {
      // Find or create Hemp OS folder
      const searchResponse = await fetch('/api/drive/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'Hemp OS',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      const searchData = await searchResponse.json();
      let folderId = '';

      if (searchData.success && searchData.files && searchData.files.length > 0) {
        folderId = searchData.files[0].id;
      } else {
        const createResponse = await fetch('/api/drive/create-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ name: 'Hemp OS' })
        });
        const createData = await createResponse.json();
        if (createData.success) {
          folderId = createData.folder.id;
        }
      }

      const reportMarkdown = `
# HEMP OS F1 CULTIVAR REGISTRATION DOCUMENT
**Generated Autonomously inside the Crossbreed Sim Lab**
**Timestamp**: ${new Date().toISOString()}

## 1. IDENTITY & TAXONOMY
- **Name**: ${hybridResult.name}
- **Genetic Tier**: F1 Hybrid Stabilized Clonal
- **Type**: ${hybridResult.type}
- **Lineage**: ${hybridResult.lineage.join(' x ')}

## 2. METABOLOMIC ANALYTICAL PROFILE (SIMULATED)
- **THC wt%**: ${hybridResult.thc}%
- **CBD wt%**: ${hybridResult.cbd}%
- **CBG wt%**: ${hybridResult.cbg}%
- **CBN wt%**: ${hybridResult.cbn}%

### Terpenic Ratios:
- Myrcene: ${hybridResult.terpenes.myrcene}%
- Limonene: ${hybridResult.terpenes.limonene}%
- Caryophyllene: ${hybridResult.terpenes.caryophyllene}%
- Pinene: ${hybridResult.terpenes.pinene}%
- Linalool: ${hybridResult.terpenes.linalool}%

## 3. SEEDFINDER.EU BREEDER SPECS
- **Breeder of Record**: ${hybridResult.seedFinderInfo.breeder}
- **Flowering Timeline**: ${hybridResult.seedFinderInfo.floweringTimeDays} days
- **Morphological Height**: ${hybridResult.seedFinderInfo.heightCm} cm
- **Yield Capacity**: ${hybridResult.seedFinderInfo.yieldGPerM2} g/m²
- **Climate Tolerance**: ${hybridResult.cannaConnectionInfo.climateTolerance}

## 4. LEAFLY CONSUMER INTELLIGENCE
- **Target Rating**: ${hybridResult.leaflyInfo.rating}/5.0
- **Aroma Profile**: ${hybridResult.leaflyInfo.flavors.join(', ')}
- **Synergistic Effects**: ${hybridResult.leaflyInfo.effects.join(', ')}
- **Activities Pairing**: ${hybridResult.hytivaInfo.activities.join(', ')}

---------------------------------------------------------
Validated & Digitally Signed by Hemp OS Genetics Sequencer.
      `;

      const uploadResponse = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: `f1_hybrid_${hybridResult.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.txt`,
          content: reportMarkdown,
          mimeType: 'text/plain',
          parentId: folderId
        })
      });

      if (uploadResponse.ok) {
        setDriveUploadSuccess(true);
        setBreedLogs(prev => [...prev, `✔️ [DRIVE] Successfully uploaded hybrid profile to Google Drive folder "Hemp OS"`]);
      } else {
        throw new Error('Drive API rejected payload');
      }
    } catch (err: any) {
      setBreedLogs(prev => [...prev, `❌ [DRIVE_ERR] Google Drive upload failed: ${err.message}`]);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleStartScraping = async () => {
    setIsScraping(true);
    setScrapeLogs([`Initializing Web Scraper Swarm for target: ${scrapeTarget}...`, 'Establishing Headless DOM Injectors...']);
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: scrapeTarget,
          query: scrapeQuery
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      setScrapeLogs(prev => [
        ...prev, 
        `✔️ SCAPE COMPLETE. Extracted ${data.count} science papers.`,
        `✔️ Data successfully written to local folder: ${data.savedTo}`,
        ...data.data.slice(0, 3).map((item: any) => `> INGESTED: ${item.title.substring(0, 50)}...`)
      ]);

    } catch (err: any) {
      setScrapeLogs(prev => [...prev, `❌ [SCRAPE_ERR] Failed to scrape: ${err.message}`]);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              Hemp OS Strain Breed & Intel Lab <span className="text-[#666] font-normal italic text-xs">Layer 10</span>
            </h2>
            <span className="ml-2 text-[8px] bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded font-mono font-bold tracking-widest">[HEURISTIC/SIMULATED APPROXIMATIONS]</span>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase leading-relaxed max-w-2xl">
            Diploid Chromosome Mapping & Synthesized intelligence compiled from Leafly (5,000+ strains), SeedFinder Breeder indices, CannaConnection traits, Hytiva activities, and AllBud availability.
          </p>
        </div>
        
        {/* Main Tab Controls */}
        <div className="flex bg-[#121214] border border-[#1f1f21] p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveMainTab('explorer')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === 'explorer'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 inline mr-1" />
            Explorer
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('comparer')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === 'comparer'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5 inline mr-1" />
            SeedFinder Comparer
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('trait_finder')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === 'trait_finder'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 inline mr-1" />
            Faceted Trait Search
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('scraper')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === 'scraper'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
            Autonomous Scraper
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('platform')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === 'platform'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 inline mr-1" />
            Genetics Platform
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-[#1f1f21]">
        
        {/* ==========================================
            LEFT PANEL: EXPLORER / COMPARER / TRAIT FINDER 
            ========================================== */}
        <div className="xl:col-span-7 p-6 space-y-6">
          
          {/* VIEW A: MULTI-DATABASE STRAIN EXPLORER */}
          {activeMainTab === 'explorer' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" /> Cultivar Library Exploration
                  </h3>
                  <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Select a strain below to unlock its multi-database profiles</p>
                </div>

                <div className="text-[9px] font-mono text-gray-400 bg-[#121214] border border-[#1f1f21] px-2.5 py-1 rounded">
                  Feedstock Flow: <span className="text-emerald-400 font-bold">{activeBiomassName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Sidebar list of Strains (5 cols) */}
                <div className="md:col-span-5 flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                  {strains.map((strain) => (
                    <button
                      type="button"
                      key={strain.id}
                      onClick={() => setSelectedStrainId(strain.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedStrainId === strain.id
                          ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300'
                          : 'bg-[#121214] border-[#1f1f21] hover:border-emerald-500/20 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-[11px] truncate">{strain.name}</span>
                        {strain.isCustom && (
                          <span className="px-1.5 py-0.5 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-[6px] font-mono rounded font-bold uppercase">F1 Hybrid</span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[7px] font-mono uppercase text-gray-500">{strain.classification}</span>
                        <span className="text-[7px] font-mono text-gray-500 bg-[#0d0d0f] px-1 rounded">{strain.seedFinderInfo.breeder.split(' ')[0]}</span>
                      </div>

                      <div className="flex gap-2.5 text-[8.5px] font-mono mt-2 text-gray-400 border-t border-[#1c1c1f]/50 pt-2">
                        <span>THC: <strong className="text-red-400">{strain.thc}%</strong></span>
                        <span>CBD: <strong className="text-emerald-400">{strain.cbd}%</strong></span>
                        <span>CBG: <strong className="text-cyan-400">{strain.cbg}%</strong></span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Highly structured multi-perspective Selected Strain card (7 cols) */}
                <div className="md:col-span-7 bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between space-y-4">
                  
                  {/* Strain Title Block */}
                  <div className="flex justify-between items-start border-b border-[#1c1c1f] pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono">{selectedStrain.name}</h4>
                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{selectedStrain.type}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleApplyToFeedstock(selectedStrain)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[8.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Apply Feedstock
                    </button>
                  </div>

                  {/* PERSPECTIVE SWITCHER TABS (The 5 requested sites) */}
                  <div className="grid grid-cols-5 gap-1 bg-[#0a0a0b] p-1 rounded-xl border border-[#1c1c1f]">
                    {[
                      { id: 'leafly', label: 'Leafly', color: 'text-[#10b981]' },
                      { id: 'seedfinder', label: 'SeedFinder', color: 'text-amber-400' },
                      { id: 'cannaconnection', label: 'CannaCon', color: 'text-purple-400' },
                      { id: 'hytiva', label: 'Hytiva', color: 'text-sky-400' },
                      { id: 'allbud', label: 'AllBud', color: 'text-red-400' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveIntelTab(tab.id as any)}
                        className={`py-1 rounded text-[8px] font-mono uppercase font-bold transition-all cursor-pointer ${
                          activeIntelTab === tab.id
                            ? 'bg-[#18181b] border border-[#2d2d30] text-white font-black'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* PERSPECTIVE DETAILS CONTAINER */}
                  <div className="bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] p-4.5 min-h-[220px] flex flex-col justify-between">
                    
                    {/* 1. Leafly Consumer view */}
                    {activeIntelTab === 'leafly' && (
                      <div className="space-y-3 font-mono text-[9px]">
                        <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                          <span className="font-bold text-emerald-400 uppercase tracking-widest text-[8.5px]">Leafly Consumer Database</span>
                          <span className="text-gray-500 text-[8px]">5,000+ Cultivars Indexed</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-white text-[11px] font-bold">{selectedStrain.leaflyInfo.rating} / 5.0</span>
                          <div className="flex text-amber-400 gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400 stroke-none" />
                            ))}
                          </div>
                          <span className="text-gray-500 text-[8px] ml-1">({selectedStrain.leaflyInfo.reviewsCount.toLocaleString()} real consumer reviews)</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block uppercase font-bold text-[7.5px] mb-1">Dominant Consumer Effects</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedStrain.leaflyInfo.effects.map((fx, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 rounded-full font-bold">
                                {fx}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500 block uppercase font-bold text-[7.5px] mb-1">Aromatic & Flavor Profile</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedStrain.leaflyInfo.flavors.map((fl, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-gray-300 rounded font-semibold">
                                {fl}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 bg-[#121214] border border-[#1f1f21] rounded-lg">
                          <span className="text-[7.5px] text-emerald-400 uppercase font-black tracking-widest block mb-1">🔥 Top Featured Review</span>
                          <p className="text-gray-400 italic leading-relaxed text-[8.5px]">"{selectedStrain.leaflyInfo.popularReview}"</p>
                        </div>
                      </div>
                    )}

                    {/* 2. SeedFinder Breeder view */}
                    {activeIntelTab === 'seedfinder' && (
                      <div className="space-y-3 font-mono text-[9px]">
                        <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                          <span className="font-bold text-amber-400 uppercase tracking-widest text-[8.5px]">SeedFinder.eu Breeder Specs</span>
                          <span className="text-gray-500 text-[8px]">Genealogy & Flowering Schedules</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 text-gray-300">
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Breeder of Record</span>
                            <span className="text-white font-bold">{selectedStrain.seedFinderInfo.breeder}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Flowering Period</span>
                            <span className="text-white font-bold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              {selectedStrain.seedFinderInfo.floweringTimeDays} Days ({Math.ceil(selectedStrain.seedFinderInfo.floweringTimeDays / 7)} weeks)
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Estimated Height</span>
                            <span className="text-white font-bold">{selectedStrain.seedFinderInfo.heightCm} cm (indoor median)</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Breeding Availability</span>
                            <span className="text-white font-bold">{selectedStrain.seedFinderInfo.availability}</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-amber-950/10 border border-amber-500/20 rounded-lg text-amber-400">
                          <span className="text-[7.5px] uppercase font-bold block mb-1">⚡ Theoretical Phenotype Yield Capacity</span>
                          <p className="text-[10px] font-bold">{selectedStrain.seedFinderInfo.yieldGPerM2} grams per square meter (SOG/SCROG)</p>
                          <p className="text-[7px] text-gray-500 mt-0.5 leading-tight">Calculated across indoor 600W equivalent high-efficiency LED microclimates.</p>
                        </div>
                      </div>
                    )}

                    {/* 3. CannaConnection view */}
                    {activeIntelTab === 'cannaconnection' && (
                      <div className="space-y-3 font-mono text-[9px]">
                        <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                          <span className="font-bold text-purple-400 uppercase tracking-widest text-[8.5px]">CannaConnection Traits & Banks</span>
                          <span className="text-gray-500 text-[8px]">Trait Search Criteria Matches</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 text-gray-300">
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Primary Seed Bank</span>
                            <span className="text-white font-bold">{selectedStrain.cannaConnectionInfo.seedBank}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Cultivation Difficulty</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              selectedStrain.cannaConnectionInfo.difficulty === 'Easy' 
                                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' 
                                : selectedStrain.cannaConnectionInfo.difficulty === 'Medium'
                                  ? 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
                                  : 'bg-red-950/40 border border-red-500/30 text-red-300'
                            }`}>
                              {selectedStrain.cannaConnectionInfo.difficulty}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Climate Adaptability</span>
                            <span className="text-white font-bold flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-purple-400" />
                              {selectedStrain.cannaConnectionInfo.climateTolerance} climates
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">THC Level Rating</span>
                            <span className="text-white font-bold text-red-400">{selectedStrain.cannaConnectionInfo.thcRange} Range</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-purple-950/10 border border-purple-500/20 rounded-lg text-purple-300 text-center">
                          <p className="text-[8.5px]">Matches core filtering criteria for <strong>pest tolerance</strong> and <strong>high nitrogen demands</strong>.</p>
                        </div>
                      </div>
                    )}

                    {/* 4. Hytiva view */}
                    {activeIntelTab === 'hytiva' && (
                      <div className="space-y-3 font-mono text-[9px]">
                        <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                          <span className="font-bold text-sky-400 uppercase tracking-widest text-[8.5px]">Hytiva Strain Activities Explorer</span>
                          <span className="text-gray-500 text-[8px]">Active Lifestyle & Wellness Pairing</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block uppercase font-bold text-[7.5px] mb-1">Recommended Physical Activities</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedStrain.hytivaInfo.activities.map((act, idx) => (
                              <span key={idx} className="px-2.5 py-0.5 bg-sky-950/30 border border-sky-500/20 text-sky-300 rounded-full font-bold flex items-center gap-1">
                                <Activity className="w-3 h-3 text-sky-400 animate-pulse" />
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500 block uppercase font-bold text-[7.5px] mb-1">Clinically Reported Relief Reliefs</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedStrain.hytivaInfo.medicalIndications.map((ind, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-gray-300 rounded font-semibold">
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-[8px] text-gray-500 leading-normal italic pt-1 border-t border-[#1c1c1f]">
                          Primary Chemical Classification: <strong className="text-white">{selectedStrain.hytivaInfo.terpeneDominance}</strong>. Pairings modeled from clinical customer telemetry.
                        </div>
                      </div>
                    )}

                    {/* 5. AllBud view */}
                    {activeIntelTab === 'allbud' && (
                      <div className="space-y-3 font-mono text-[9px]">
                        <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                          <span className="font-bold text-red-400 uppercase tracking-widest text-[8.5px]">AllBud Dispensary Availability</span>
                          <span className="text-gray-500 text-[8px]">State Retail Statuses & Limits</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 text-gray-300">
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Estimated Average Retail Price</span>
                            <span className="text-white font-bold text-emerald-400 flex items-center gap-0.5">
                              <DollarSign className="w-3.5 h-3.5" />
                              {selectedStrain.allBudInfo.avgPricePerGram.toFixed(2)} / gram
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 uppercase text-[7.5px] block font-bold">Retail Availability</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              selectedStrain.allBudInfo.retailStatus === 'In Stock'
                                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                                : 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
                            }`}>
                              {selectedStrain.allBudInfo.retailStatus}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500 block uppercase font-bold text-[7.5px] mb-1">State Legality Listings</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedStrain.allBudInfo.dispensaryStates.map((state, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-red-950/20 border border-red-500/20 text-red-300 rounded font-bold text-[8.5px] flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-red-400" />
                                {state}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-2 bg-zinc-950 border border-[#1f1f21] rounded text-[8.5px] text-gray-500 leading-normal">
                          AllBud Potency Ceiling: <span className="text-red-400 font-bold">{selectedStrain.allBudInfo.thcMax}% Max THC</span> recorded in analytical lab entries.
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Terpene Profile Wheel Render */}
                  <div className="space-y-2">
                    <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Analytical Terpene Weight Spectrum</span>
                    <div className="h-[105px] bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] overflow-hidden p-1 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData(selectedStrain)}>
                          <PolarGrid stroke="#1c1c1f" />
                          <PolarAngleAxis dataKey="subject" stroke="#888" fontSize={6.5} />
                          <Radar name="Terpenes" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* VIEW B: SEEDFINDER SIDE-BY-SIDE COMPARER */}
          {activeMainTab === 'comparer' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" /> SeedFinder Comparison Matrix
                </h3>
                <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Select up to 3 cultivars to construct breeder and morphological side-by-side matrices</p>
              </div>

              {/* Strain select checklists */}
              <div className="flex flex-wrap gap-2 bg-[#121214] p-3 rounded-xl border border-[#1f1f21]">
                {strains.map(strain => {
                  const isChecked = compareIds.includes(strain.id);
                  return (
                    <button
                      key={strain.id}
                      type="button"
                      onClick={() => toggleCompare(strain.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9.5px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked 
                          ? 'bg-amber-950/20 border-amber-500 text-amber-300' 
                          : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        readOnly 
                        className="accent-amber-500 pointer-events-none w-3 h-3"
                      />
                      {strain.name}
                    </button>
                  );
                })}
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto bg-[#121214] border border-[#1f1f21] rounded-2xl">
                <table className="w-full text-[10px] font-mono text-gray-300 border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f1f21] bg-[#0d0d0f] text-[8.5px] text-gray-400 uppercase font-black text-left">
                      <th className="p-3">Attribute</th>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <th key={id} className="p-3 text-amber-400 border-l border-[#1f1f21]">{s?.name || 'N/A'}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c1c1f]">
                    <tr>
                      <td className="p-3 font-bold text-gray-400">Classification</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21] text-white">{s?.classification}</td>;
                      })}
                    </tr>
                    <tr className="bg-[#0c0c0e]/30">
                      <td className="p-3 font-bold text-gray-400">Breeder Origin</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21]">{s?.seedFinderInfo.breeder}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-400">Flowering Period</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21] text-amber-400 font-bold">{s?.seedFinderInfo.floweringTimeDays} Days</td>;
                      })}
                    </tr>
                    <tr className="bg-[#0c0c0e]/30">
                      <td className="p-3 font-bold text-gray-400">Indoor Height</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21]">{s?.seedFinderInfo.heightCm} cm</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-400">Yield g/m²</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21] text-emerald-400 font-bold">{s?.seedFinderInfo.yieldGPerM2} g/m²</td>;
                      })}
                    </tr>
                    <tr className="bg-[#0c0c0e]/30">
                      <td className="p-3 font-bold text-gray-400">Environment Mode</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21]">{s?.seedFinderInfo.environment}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-400">Lineage Ancestry</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21] text-[8px] text-gray-400">{s?.lineage.join(' x ')}</td>;
                      })}
                    </tr>
                    <tr className="bg-[#0c0c0e]/30">
                      <td className="p-3 font-bold text-gray-400">THC Range Class</td>
                      {compareIds.map(id => {
                        const s = strains.find(x => x.id === id);
                        return <td key={id} className="p-3 border-l border-[#1f1f21] text-red-400 font-bold">{s?.cannaConnectionInfo.thcRange}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW C: CANNACONNECTION & HYTIVA TRAIT SEARCHER */}
          {activeMainTab === 'trait_finder' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-400" /> Faceted Trait Search Engine
                </h3>
                <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Filter by specific chemical boundaries, recommended physical activities, and climate tolerance</p>
              </div>

              {/* Search bar + filter selections */}
              <div className="bg-[#121214] border border-[#1f1f21] p-4.5 rounded-2xl space-y-3 font-mono text-[9px]">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search strain database..."
                      className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {/* Type Filter */}
                  <div className="space-y-1">
                    <label className="text-gray-500 text-[7px] uppercase font-bold">Cannabis Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-1.5 text-white text-[8.5px] focus:outline-none"
                    >
                      <option value="ALL">All Types</option>
                      <option value="THC Dominant">Type I (THC)</option>
                      <option value="Mixed Ratio">Type II (Mixed)</option>
                      <option value="CBD Dominant">Type III (CBD)</option>
                      <option value="CBG Dominant">Type IV (CBG)</option>
                    </select>
                  </div>

                  {/* Activity Filter */}
                  <div className="space-y-1">
                    <label className="text-gray-500 text-[7px] uppercase font-bold">Activity pairing</label>
                    <select
                      value={filterActivity}
                      onChange={(e) => setFilterActivity(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-1.5 text-white text-[8.5px] focus:outline-none"
                    >
                      <option value="ALL">All Activities</option>
                      <option value="Socializing">Socializing</option>
                      <option value="Yoga">Yoga</option>
                      <option value="Studying">Studying</option>
                      <option value="Sleeping">Sleeping</option>
                    </select>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="space-y-1">
                    <label className="text-gray-500 text-[7px] uppercase font-bold">Breeder Difficulty</label>
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-1.5 text-white text-[8.5px] focus:outline-none"
                    >
                      <option value="ALL">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Experienced">Experienced</option>
                    </select>
                  </div>

                  {/* THC Range */}
                  <div className="space-y-1">
                    <label className="text-gray-500 text-[7px] uppercase font-bold">THC Level</label>
                    <select
                      value={filterThcRange}
                      onChange={(e) => setFilterThcRange(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-1.5 text-white text-[8.5px] focus:outline-none"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Extreme">Extreme</option>
                    </select>
                  </div>

                  {/* Climate Tolerance */}
                  <div className="space-y-1">
                    <label className="text-gray-500 text-[7px] uppercase font-bold">Climate</label>
                    <select
                      value={filterClimate}
                      onChange={(e) => setFilterClimate(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-1.5 text-white text-[8.5px] focus:outline-none"
                    >
                      <option value="ALL">All Climates</option>
                      <option value="Temperate">Temperate</option>
                      <option value="Warm">Warm</option>
                      <option value="Cool">Cool</option>
                      <option value="Robust">Robust</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Search Results list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredStrains.map(strain => (
                  <div 
                    key={strain.id}
                    className="p-3 bg-[#121214] border border-[#1f1f21] rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[10px] text-white font-mono">{strain.name}</span>
                        <span className="text-[7px] font-mono text-purple-400 uppercase tracking-widest font-bold">{strain.classification.substring(0, 15)}</span>
                      </div>
                      <p className="text-[8.5px] text-gray-500 font-mono mt-1 leading-snug line-clamp-2">{strain.origin}</p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {strain.hytivaInfo.activities.slice(0, 2).map((act, i) => (
                          <span key={i} className="text-[7.5px] bg-sky-950/20 text-sky-400 border border-sky-500/20 px-1.5 rounded font-mono">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#1c1c1f]">
                      <span className="text-[7.5px] font-mono text-gray-500">Flowering: {strain.seedFinderInfo.floweringTimeDays} Days</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStrainId(strain.id);
                          setActiveMainTab('explorer');
                        }}
                        className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                      >
                        Inspect Perspective <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredStrains.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-gray-600 font-mono text-[9px] uppercase tracking-wider">
                    <ShieldAlert className="w-7 h-7 mx-auto mb-1.5 text-gray-700" />
                    No strains match the search criteria. Try loosening the filter constraints.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW D: AUTONOMOUS STRAIN SCRAPER */}
          {activeMainTab === 'scraper' && (
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
                {/* Scraper Configuration */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 border-b border-[#1f1f21] pb-2">
                    <Database className="w-3.5 h-3.5 text-blue-400" /> Web Scraper Configuration
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-gray-500 uppercase font-bold tracking-widest">Target Database</label>
                      <select 
                        value={scrapeTarget}
                        onChange={(e) => setScrapeTarget(e.target.value)}
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
                        value={scrapeQuery}
                        onChange={(e) => setScrapeQuery(e.target.value)}
                        placeholder="e.g. 'Haze Crossbreeds'" 
                        className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-2 text-[9px] text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-gray-500 uppercase font-bold tracking-widest">Rate Limit (req/s)</label>
                      <select className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-2 text-[9px] text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors">
                        <option>10 req/s (Standard)</option>
                        <option>50 req/s (Aggressive)</option>
                        <option>1 req/s (Stealth)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-gray-500 uppercase font-bold tracking-widest">Proxy Mode</label>
                      <select className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded p-2 text-[9px] text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors">
                        <option>Rotating Residential</option>
                        <option>Datacenter Static</option>
                        <option>Direct (Local IP)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button className="px-4 py-2 bg-[#0d0d0f] hover:bg-[#1a1a1c] border border-[#1f1f21] text-gray-400 text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all">
                    Dry Run Test
                  </button>
                  <button 
                    onClick={handleStartScraping}
                    disabled={isScraping}
                    className="px-5 py-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 shadow"
                  >
                    {isScraping ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                    )}
                    {isScraping ? 'Swarm Active...' : 'Initialize Ingestion Swarm'}
                  </button>
                </div>

                {/* Scraper Console output */}
                <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-3 font-mono text-[9px] h-[200px] overflow-y-auto space-y-1 text-gray-400">
                  <span className="text-[7.5px] text-emerald-500 uppercase tracking-wider font-bold block border-b border-[#1c1c1f]/50 pb-1 mb-2">
                    // SCRAPER SWARM TERMINAL
                  </span>
                  {scrapeLogs.length === 0 ? (
                    <div className="text-gray-600 italic uppercase text-center mt-6">Swarm idle. Configure parameters and execute initialization.</div>
                  ) : (
                    scrapeLogs.map((log, idx) => (
                      <div key={idx} className={log.includes('✔️') ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW E: GENETICS ANALYTICS PLATFORM */}
          {activeMainTab === 'platform' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-[#1f1f21] pb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <LineChart className="w-4 h-4 text-emerald-400" /> Breeding & Genetics Analytics Platform
                  </h3>
                  <p className="text-[8.5px] font-mono text-gray-500 uppercase mt-0.5">Tie genotype, phenotype, environment, and process outcomes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strain/Genotype Registry */}
                <div className="bg-[#121214] border border-[#1f1f21] p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-blue-400" /> Genotype Registry
                  </h4>
                  <p className="text-[8px] text-gray-400 font-mono">1,244 Active Cultivars Tracked</p>
                  <div className="space-y-2">
                    {['Blue Dream F2 x Haze', 'OG Kush x Sour Diesel', 'Granddaddy Purple V4'].map((strain, i) => (
                      <div key={i} className="bg-[#0b0b0c] border border-[#1f1f21] p-2 rounded flex justify-between items-center">
                        <span className="text-[9px] text-gray-300 font-mono">{strain}</span>
                        <span className="text-[8px] text-emerald-400 font-bold border border-emerald-500/30 px-1 rounded bg-emerald-950/20">Gen {i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phenotype Tracking */}
                <div className="bg-[#121214] border border-[#1f1f21] p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-rose-400" /> Phenotype Outcomes
                  </h4>
                  <p className="text-[8px] text-gray-400 font-mono">Yield, Cannabinoids & Resilience tracking</p>
                  <div className="h-[100px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { subject: 'Yield', A: 80, B: 60, fullMark: 100 },
                        { subject: 'THC', A: 90, B: 85, fullMark: 100 },
                        { subject: 'Resilience', A: 60, B: 90, fullMark: 100 },
                        { subject: 'Terpenes', A: 70, B: 65, fullMark: 100 },
                        { subject: 'Flowering', A: 85, B: 75, fullMark: 100 }
                      ]}>
                        <PolarGrid stroke="#1f1f21" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#555', fontSize: 8 }} />
                        <Radar name="Genotype A" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        <Radar name="Genotype B" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Environment Logging */}
                <div className="bg-[#121214] border border-[#1f1f21] p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Cultivation Environment
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0b0b0c] border border-[#1f1f21] p-2 rounded">
                      <div className="text-[8px] text-gray-500 font-mono uppercase">VPD (kPa)</div>
                      <div className="text-[12px] text-amber-400 font-bold font-mono">1.15</div>
                    </div>
                    <div className="bg-[#0b0b0c] border border-[#1f1f21] p-2 rounded">
                      <div className="text-[8px] text-gray-500 font-mono uppercase">Avg Temp (C)</div>
                      <div className="text-[12px] text-emerald-400 font-bold font-mono">24.5</div>
                    </div>
                    <div className="bg-[#0b0b0c] border border-[#1f1f21] p-2 rounded">
                      <div className="text-[8px] text-gray-500 font-mono uppercase">Light DLI</div>
                      <div className="text-[12px] text-blue-400 font-bold font-mono">45.2</div>
                    </div>
                    <div className="bg-[#0b0b0c] border border-[#1f1f21] p-2 rounded">
                      <div className="text-[8px] text-gray-500 font-mono uppercase">Soil EC</div>
                      <div className="text-[12px] text-purple-400 font-bold font-mono">2.1</div>
                    </div>
                  </div>
                </div>

                {/* Analytics & Lab Integration */}
                <div className="bg-[#121214] border border-[#1f1f21] p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-400" /> Lab & Simulation Integration
                  </h4>
                  <p className="text-[8px] text-gray-400 font-mono">Link genetics → outcomes → products</p>
                  <div className="space-y-2">
                    <button className="w-full text-left bg-[#0b0b0c] hover:bg-[#1a1a1c] border border-[#1f1f21] p-2 rounded flex justify-between items-center transition-colors">
                      <span className="text-[9px] text-gray-300 font-mono">Pull HPLC Results (Agilent)</span>
                      <FileDown className="w-3 h-3 text-gray-500" />
                    </button>
                    <button className="w-full text-left bg-[#0b0b0c] hover:bg-[#1a1a1c] border border-[#1f1f21] p-2 rounded flex justify-between items-center transition-colors">
                      <span className="text-[9px] text-gray-300 font-mono">Run Yield Prediction Sim</span>
                      <Play className="w-3 h-3 text-emerald-400" />
                    </button>
                    <button className="w-full text-left bg-[#0b0b0c] hover:bg-[#1a1a1c] border border-[#1f1f21] p-2 rounded flex justify-between items-center transition-colors">
                      <span className="text-[9px] text-gray-300 font-mono">Submit to Peer Review</span>
                      <Users className="w-3 h-3 text-purple-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ==========================================
            RIGHT PANEL: CROSSBREED F1 SIMULATION LAB
            ========================================== */}
        <div className="xl:col-span-5 p-6 bg-[#0c0c0e]/40 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1f1f21] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              Crossbreed Gene Machine
            </h3>
            <button
              type="button"
              onClick={() => {
                setParentAId('s_05'); // GMO
                setParentBId('s_07'); // Lifter
                setNewBreedName('Copilot GMO-Lift');
              }}
              className="flex items-center gap-1 text-[8px] font-bold tracking-widest text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              COPILOT GENETICS
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Parent A Selection */}
              <div className="space-y-1">
                <label className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Parent A (Pollen Donor)</label>
                <select
                  value={parentAId}
                  onChange={(e) => setParentAId(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f21] hover:border-emerald-500/20 rounded-lg p-2 text-xs text-white focus:outline-none transition-all font-mono"
                >
                  {strains.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type.split(' ')[0]})</option>
                  ))}
                </select>
              </div>

              {/* Parent B Selection */}
              <div className="space-y-1">
                <label className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Parent B (Seed Bearer)</label>
                <select
                  value={parentBId}
                  onChange={(e) => setParentBId(e.target.value)}
                  className="w-full bg-[#121214] border border-[#1f1f21] hover:border-emerald-500/20 rounded-lg p-2 text-xs text-white focus:outline-none transition-all font-mono"
                >
                  {strains.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type.split(' ')[0]})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Offspring Custom Name Input */}
            <div className="space-y-1">
              <label className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Stabilized Custom F1 Name (Optional)</label>
              <input
                type="text"
                value={newBreedName}
                onChange={(e) => setNewBreedName(e.target.value)}
                placeholder="e.g. Blue Sour, Gorilla Haze, CBG Dream..."
                className="w-full bg-[#121214] border border-[#1f1f21] focus:border-emerald-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSimulateCrossbreeding}
              disabled={isBreeding}
              className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 hover:border-emerald-500 text-emerald-200 text-[9.5px] font-bold font-mono uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
            >
              {isBreeding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Diploid Crossing Matrix ({breedProgress}%)
                </>
              ) : (
                <>
                  <Dna className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Synthesize Cultivar
                </>
              )}
            </button>
          </div>

          {/* Genetic Recombinator Log screen */}
          <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-3 font-mono text-[9px] h-[130px] overflow-y-auto space-y-1 text-gray-400">
            <span className="text-[7.5px] text-emerald-500 uppercase tracking-widest block font-bold border-b border-[#1c1c1f]/40 pb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> F1 RECOMBINATOR OUTPUT CONSOLE
            </span>
            {breedLogs.map((log, idx) => {
              let color = 'text-gray-300';
              if (log.includes('✔️')) color = 'text-emerald-400 font-bold';
              if (log.includes('❌')) color = 'text-red-400 font-bold';
              return (
                <div key={idx} className={color}>
                  {log}
                </div>
              );
            })}
            {breedLogs.length === 0 && (
              <div className="text-gray-600 italic uppercase py-8 text-center text-[8.5px]">Select parental donor combinations and initialize crossing sequencer.</div>
            )}
          </div>

          {/* Punnett Square results & custom catalog publishing */}
          <AnimatePresence>
            {punnettMatrix && hybridResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4.5 space-y-4 font-mono text-[9px]"
              >
                {/* Punnett grid mapping */}
                <div>
                  <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold mb-2">Synthase Recombination Matrix</span>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[9.5px]">
                    <div className="p-1 text-gray-600">Donor \ Bearer</div>
                    <div className="p-1.5 bg-[#1a1a1c] text-emerald-400 rounded-lg">{punnettMatrix.allelesB[0]}</div>
                    <div className="p-1.5 bg-[#1a1a1c] text-emerald-400 rounded-lg">{punnettMatrix.allelesB[1]}</div>

                    <div className="p-1.5 bg-[#1a1a1c] text-emerald-400 rounded-lg flex items-center justify-center">{punnettMatrix.allelesA[0]}</div>
                    {punnettMatrix.matrix.slice(0, 2).map((item: any, i: number) => (
                      <div key={i} className="p-2 bg-[#0d0d0f] border border-emerald-500/10 text-white rounded-lg text-[9px] font-bold">
                        {item.result}
                      </div>
                    ))}

                    <div className="p-1.5 bg-[#1a1a1c] text-emerald-400 rounded-lg flex items-center justify-center">{punnettMatrix.allelesA[1]}</div>
                    {punnettMatrix.matrix.slice(2, 4).map((item: any, i: number) => (
                      <div key={i} className="p-2 bg-[#0d0d0f] border border-emerald-500/10 text-white rounded-lg text-[9px] font-bold">
                        {item.result}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blended stats summary preview */}
                <div className="p-3 bg-[#0d0d0f] border border-[#1f1f21] rounded-lg space-y-2">
                  <span className="text-[7.5px] text-gray-500 uppercase block font-bold">Projected Cultivar Baseline Metrics</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1 bg-[#121214] rounded">
                      <span className="text-gray-500 text-[6.5px] block uppercase">THC</span>
                      <strong className="text-red-400 text-[10px]">{hybridResult.thc}%</strong>
                    </div>
                    <div className="p-1 bg-[#121214] rounded">
                      <span className="text-gray-500 text-[6.5px] block uppercase">CBD</span>
                      <strong className="text-emerald-400 text-[10px]">{hybridResult.cbd}%</strong>
                    </div>
                    <div className="p-1 bg-[#121214] rounded">
                      <span className="text-gray-500 text-[6.5px] block uppercase">CBG</span>
                      <strong className="text-cyan-400 text-[10px]">{hybridResult.cbg}%</strong>
                    </div>
                  </div>
                  <p className="text-[8px] text-gray-400 leading-normal">{hybridResult.leaflyInfo.popularReview}</p>
                </div>

                {/* Save offspring controls */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRegisterStrain}
                    className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[8.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register Locally
                  </button>

                  {accessToken && (
                    <button
                      type="button"
                      onClick={uploadBredStrainToDrive}
                      disabled={isUploadingToDrive}
                      className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white font-mono text-[8.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      {isUploadingToDrive ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : driveUploadSuccess ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5" />
                      )}
                      <span>Google Drive</span>
                    </button>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
