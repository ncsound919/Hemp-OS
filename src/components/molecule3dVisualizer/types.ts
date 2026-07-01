
export type StageType = 'extraction' | 'winterization' | 'decarboxylation' | 'distillation';

export interface ExtractionStageConfig {
  solventType: 'CO2' | 'Ethanol';
  agitationSpeed: number;
  solventRatio: number;
  extractionTemp: number;
}

export interface WinterizationStageConfig {
  coolingTemp: number;
}

export interface DecarbStageConfig {
  temperature: number;
}

export interface DistillationStageConfig {
  feedRate: number;
  vacuumPressure: number;
  evaporatorTemp: number;
}

export type StageConfig = 
  | ({ type: 'extraction' } & ExtractionStageConfig)
  | ({ type: 'winterization' } & WinterizationStageConfig)
  | ({ type: 'decarboxylation' } & DecarbStageConfig)
  | ({ type: 'distillation' } & DistillationStageConfig);

export interface AtomDef {
  id: number;
  element: 'C' | 'H' | 'O';
  pos: [number, number, number];
  isCarboxyl?: boolean;
  isCarboxylHydrogen?: boolean;
}

export interface BondDef {
  from: number;
  to: number;
  isCarboxyl?: boolean;
}
