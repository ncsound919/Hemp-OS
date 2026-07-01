import { TraitStat, EnvironmentRecord, Genotype } from './engine/types';

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
  classification: 'Indica' | 'Sativa' | 'Hybrid' | 'Indica-dominant Hybrid' | 'Sativa-dominant Hybrid' | 'Phytochemical Specialty Cultivar' | 'Medical / Therapeutic Hemp';
  lineage: string[];
  origin: string;
  landraceBackground: string;
  isCustom?: boolean;
  verificationStatus?: 'verified' | 'warning' | 'failed';
  leanSpec?: string;

  // --- QUANTITATIVE GENETICS ENGINE EXTRA FIELDS ---
  phenotype?: Record<string, TraitStat>;
  parents?: [string, string] | [];
  isMeasured?: boolean;
  genotype?: Genotype;
  environmentHistory?: EnvironmentRecord[];


  // --- LEAFLY CONSUMER INTEL ---
  leaflyInfo: {
    effects: string[];
    flavors: string[];
    rating: number;
    reviewsCount: number;
    popularReview: string;
  };

  // --- SEEDFINDER BREEDER METRICS ---
  seedFinderInfo: {
    breeder: string;
    floweringTimeDays: number;
    heightCm: number;
    environment: 'Indoor' | 'Outdoor' | 'Greenhouse' | 'Multi-environment';
    availability: 'Highly Available' | 'Limited Release' | 'Clone-only' | 'Heirloom Archive';
    yieldGPerM2: number;
  };

  // --- CANNACONNECTION TRAIT PROFILES ---
  cannaConnectionInfo: {
    seedBank: string;
    climateTolerance: 'Warm' | 'Cool' | 'Temperate' | 'Robust';
    difficulty: 'Easy' | 'Medium' | 'Experienced';
    thcRange: 'Low' | 'Medium' | 'High' | 'Extreme';
    cbdRange: 'None' | 'Low' | 'Medium' | 'High';
  };

  // --- HYTIVA EXPLORER METRICS ---
  hytivaInfo: {
    activities: string[];
    terpeneDominance: string;
    medicalIndications: string[];
  };

  // --- ALLBUD RETAIL INTELLIGENCE ---
  allBudInfo: {
    avgPricePerGram: number;
    dispensaryStates: string[];
    retailStatus: 'In Stock' | 'Rare' | 'Special Order' | 'Seasonal';
    thcMax: number;
  };
}

export interface PunnettResult {
  allelesA: string[];
  allelesB: string[];
  matrix: { alleleA: string; alleleB: string; result: string }[];
}
