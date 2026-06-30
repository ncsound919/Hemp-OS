/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CannabinoidProfile {
  thca: number; // wt% (e.g. 12.5)
  thc: number;  // wt% (e.g. 0.3)
  cbda: number; // wt% (e.g. 8.2)
  cbd: number;  // wt% (e.g. 0.1)
  cbga: number; // wt% (e.g. 1.2)
  cbg: number;  // wt% (e.g. 0.1)
  other: number; // wt% (e.g. 2.0)
}

export interface Biomass {
  id: string;
  name: string;
  mass: number; // in kg
  moisture: number; // wt% (e.g. 8.0)
  potency: CannabinoidProfile;
  waxContent: number; // wt% of lipids/waxes (e.g. 4.0)
}

export interface Solvent {
  type: 'Ethanol' | 'CO2' | 'Butane';
  purity: number; // wt% (e.g. 99.5)
  temperature: number; // in C
}

export interface ModelMetadata {
  id: string;          // e.g. "extraction.v1.0.0"
  name: string;
  description: string;
  source: string;      // SOP, paper, dataset
  version: string;
}

// Extraction Types
export interface ExtractionRunInput {
  biomass: Biomass;
  solvent: Solvent;
  solventRatio: number; // L/kg of biomass (e.g. 8.0)
  temperature: number; // in C
  duration: number; // in minutes
  agitationSpeed: number; // in rpm
}

export interface ExtractionRunOutput {
  miscellaMass: number; // kg of liquid extract
  spentBiomassMass: number; // kg of spent solid residue
  cannabinoidRecovery: Record<string, number>; // mass in grams recovered
  waxExtracted: number; // kg of waxes/lipids extracted
  solventLoss: number; // L of solvent lost (absorbed by biomass or evaporated)
  recoveryRate: number; // % overall cannabinoid recovery rate
  purity: number; // wt% of cannabinoids in dry extract solids
}

// Decarboxylation Types
export interface DecarboxylationRunInput {
  initialCannabinoidProfile: CannabinoidProfile;
  totalMass: number; // kg of oil/crude
  temperature: number; // in C
  duration: number; // in minutes
}

export interface DecarboxylationRunOutput {
  finalCannabinoidProfile: CannabinoidProfile;
  conversionRateTHCA: number; // %
  conversionRateCBDA: number; // %
  lossToThermalDegradation: number; // wt% of cannabinoids degraded to CBN/other
  totalCannabinoidsMass: number; // in grams
  co2Evolved: number; // kg of CO2 released as gas
}

// Winterization Types
export interface WinterizationRunInput {
  crudeOilMass: number; // kg of crude oil to winterize
  cannabinoidPurity: number; // wt% of cannabinoids in crude (e.g. 60.0)
  waxContent: number; // wt% of waxes in crude (e.g. 15.0)
  solventRatio: number; // L of ethanol per kg of crude oil (e.g. 5.0)
  coolingTemp: number; // in C (e.g. -40)
  coolingTime: number; // in hours (e.g. 24)
  filtrationPasses: number; // count (e.g. 1 or 2)
}

export interface WinterizationRunOutput {
  dewaxedCrudeMass: number; // kg of dewaxed crude oil (solute remaining)
  precipitatedWaxMass: number; // kg of wax captured in filter
  cannabinoidRecoveryRate: number; // %
  finalPurity: number; // wt% of cannabinoids in dewaxed oil
  finalWaxContent: number; // wt% of waxes remaining in dewaxed oil
}

// Distillation Types
export interface DistillationRunInput {
  feedMass: number; // kg of feed oil (usually winterized/decarbed crude)
  feedCannabinoidPurity: number; // wt% of cannabinoids in feed (e.g. 75.0)
  feedTerpeneContent: number; // wt% of light volatiles (e.g. 3.0)
  feedHeavyResidue: number; // wt% of non-distillables (e.g. 22.0)
  evaporatorTemp: number; // in C (e.g. 180)
  condenserTemp: number; // in C (e.g. 70)
  vacuumPressure: number; // in mbar (e.g. 0.05)
  feedRate: number; // kg/hr (e.g. 1.5)
}

export interface DistillationRunOutput {
  distillateMass: number; // kg of main cannabinoid fraction (distillate)
  headsMass: number; // kg of light volatiles/terpene fraction
  tailsMass: number; // kg of heavy bottom residue fraction
  cannabinoidPurity: number; // wt% of cannabinoids in distillate
  cannabinoidYield: number; // % of cannabinoids recovered in distillate
  boilingPoints: {
    terpenes: number; // boiling point in C at set vacuum
    cannabinoids: number; // boiling point in C at set vacuum
    heavyResidue: number; // boiling point in C at set vacuum
  };
}

// Workflow types
export interface OperatorVersion {
  versionId: string;
  releasedAt: string;
  calibrationDrift: number; // typical calibration drift %
  uncertaintyMargin: number; // base uncertainty margin +/- %
}

export interface ProcessStage {
  id: string;
  name: string;
  type: 'extraction' | 'decarboxylation' | 'winterization' | 'distillation';
  modelId: string;
  operatorVersion?: OperatorVersion; // versioned operators
  config: Record<string, any>;
}

export interface ProcessGraph {
  stages: ProcessStage[];
  connections: Array<{ from: string; to: string }>;
}

export interface SensitivityAnalysis {
  param: string;
  impactMagnitude: number; // e.g. how much +/- 10% param affects yield
}

export interface EnergyBalance {
  energyConsumedKWh: number;
  thermalEnergyKWh: number;
  mechanicalEnergyKWh: number;
}

export interface RunManifest {
  runId: string;
  timestamp: string;
  graphSnapshot: ProcessGraph;
  biomassSnapshot: Biomass;
  kernelVersion: string;
  environment: 'local' | 'cloud';
}

export interface ProcessRunResult {
  manifest: RunManifest;
  stagesResults: Record<string, any>; // maps stage.id -> execution output
  massBalanceReport: {
    initialMassKg: number;
    finalMassKg: number;
    massLossKg: number;
    massBalanceCheckPass: boolean;
    uncertainty: number; // combined uncertainty across stages
  };
  energyBalanceReport: EnergyBalance;
  sensitivity: SensitivityAnalysis[];
}
