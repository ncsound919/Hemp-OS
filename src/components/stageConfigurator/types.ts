
export interface ExtractionConfig {
  solventType: 'Ethanol' | 'CO2' | 'Butane';
  agitationSpeed: number;
  solventRatio: number;
  extractionTemp: number;
  duration: number;
}

export interface WinterizationConfig {
  solventRatio: number;
  coolingTemp: number;
  coolingTime: number;
  filtrationPasses: number;
}

export interface DecarbConfig {
  temperature: number;
  duration: number;
}

export interface DistillationConfig {
  feedRate: number;
  vacuumPressure: number;
  evaporatorTemp: number;
  condenserTemp: number;
}

export const EXTRACTION_PRESETS = {
  default: { solventType: 'Ethanol', agitationSpeed: 300, solventRatio: 8.0, extractionTemp: -40, duration: 30 },
  autoTune: { solventType: 'CO2', agitationSpeed: 600, solventRatio: 10.0, extractionTemp: -60, duration: 25 },
};

export const WINTERIZATION_PRESETS = {
  default: { solventRatio: 5.0, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 },
  autoTune: { solventRatio: 6.0, coolingTemp: -65, coolingTime: 18, filtrationPasses: 2 },
};

export const DECARB_PRESETS = {
  default: { temperature: 120, duration: 60 },
  autoTune: { temperature: 125, duration: 45 },
};

export const DISTILLATION_PRESETS = {
  default: { feedRate: 1.5, vacuumPressure: 0.05, evaporatorTemp: 185, condenserTemp: 70 },
  autoTune: { feedRate: 2.0, vacuumPressure: 0.01, evaporatorTemp: 195, condenserTemp: 65 },
};
