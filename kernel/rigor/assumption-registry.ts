/**
 * Scientific Transparency & Falsifiability (Criteria #3, #10)
 *
 * Registry of model assumptions, known limitations, and falsifiable predictions.
 * Every model must declare its assumptions so downstream consumers know
 * where the model is valid and where it breaks.
 */

export interface ModelAssumption {
  modelId: string;
  modelName: string;
  assumption: string;
  impact: 'high' | 'medium' | 'low';
  validityRange: string;
  violationConsequence: string;
  source: string;
}

export interface KnownLimitation {
  modelId: string;
  limitation: string;
  severity: 'major' | 'minor' | 'cosmetic';
  workaround?: string;
  plannedFix?: string;
}

export interface FalsifiablePrediction {
  modelId: string;
  prediction: string;
  conditions: string;
  expectedRange: string;
  testability: 'easy' | 'moderate' | 'difficult';
  tested: boolean;
  testResult?: string;
}

const ASSUMPTIONS: ModelAssumption[] = [
  // Extraction Model
  { modelId: 'extraction.v2.0.0', modelName: 'Solvent Extraction', assumption: 'Fickian diffusion with constant diffusivity', impact: 'high', validityRange: 'Ethanol, -60 to 60°C', violationConsequence: 'Recovery rates will deviate for non-Fickian solvents (CO₂, butane)', source: 'Crank 1975, Mathematics of Diffusion' },
  { modelId: 'extraction.v2.0.0', modelName: 'Solvent Extraction', assumption: 'Equilibrium described by single exponential approach', impact: 'medium', validityRange: 'Standard batch extraction', violationConsequence: 'Continuous-flow or percolation extraction will show different kinetics', source: 'Gallo-Molina et al. 2019' },
  { modelId: 'extraction.v2.0.0', modelName: 'Solvent Extraction', assumption: 'Wax solubility follows exponential temperature dependence', impact: 'medium', validityRange: '-60 to 60°C ethanol', violationConsequence: 'CO2 extractions have different wax solubility behavior', source: 'Kovač et al. 2022' },
  { modelId: 'extraction.v2.0.0', modelName: 'Solvent Extraction', assumption: 'All cannabinoids extract at the same rate', impact: 'high', validityRange: 'Ethanol at -40°C', violationConsequence: 'CBG and CBD can have different solubility kinetics than THC', source: 'Rovetto & Aieta 2017' },

  // Decarboxylation Model
  { modelId: 'decarboxylation.v2.0.0', modelName: 'Thermal Decarboxylation', assumption: 'First-order kinetics for all acid cannabinoids', impact: 'high', validityRange: '80–160°C, <480 min', violationConsequence: 'Higher-order or catalytic effects not captured', source: 'Perrotin-Brunel et al. 2010' },
  { modelId: 'decarboxylation.v2.0.0', modelName: 'Thermal Decarboxylation', assumption: 'Arrhenius parameters are constant (not temperature-dependent)', impact: 'medium', validityRange: '80–140°C', violationConsequence: 'Ea may vary with temperature near solvent boiling points', source: 'Wang et al. 2016' },
  { modelId: 'decarboxylation.v2.0.0', modelName: 'Thermal Decarboxylation', assumption: 'No catalytic effects from other biomass components', impact: 'low', validityRange: 'All', violationConsequence: 'Chlorophyll and flavonoids may catalyze side reactions', source: 'Citti et al. 2018' },
  { modelId: 'decarboxylation.v2.0.0', modelName: 'Thermal Decarboxylation', assumption: 'Degradation products go to "other" bucket', impact: 'low', validityRange: 'All', violationConsequence: 'Specific degradation products (CBN, etc.) not individually tracked', source: 'Moreno et al. 2020' },

  // Winterization Model
  { modelId: 'winterization.v2.0.0', modelName: 'Wax Winterization', assumption: 'Lipid precipitation follows linear-exponential solubility drop below 0°C', impact: 'high', validityRange: '-60 to 0°C', violationConsequence: 'Different solvent systems (hexane, etc.) have different precipitation curves', source: 'Marshall et al. 2023' },
  { modelId: 'winterization.v2.0.0', modelName: 'Wax Winterization', assumption: 'Filter capture efficiency is constant per pass', impact: 'medium', validityRange: 'Standard filter media', violationConsequence: 'Different filter media (paper, cloth, membrane) have different efficiencies', source: 'Darby et al. 2021' },
  { modelId: 'winterization.v2.0.0', modelName: 'Wax Winterization', assumption: 'Cake retention independent of wax composition', impact: 'low', validityRange: 'All', violationConsequence: 'Different wax types (triglycerides vs wax esters) have different retention', source: 'Industry practice' },

  // Distillation Model
  { modelId: 'distillation.v2.0.0', modelName: 'Molecular Distillation', assumption: 'Clausius-Clapeyron relation valid for vapor pressure estimation', impact: 'high', validityRange: '0.001–10 mbar vacuum', violationConsequence: 'At very high vacuum, mean free path effects dominate', source: 'Dussy et al. 2005' },
  { modelId: 'distillation.v2.0.0', modelName: 'Molecular Distillation', assumption: 'Cannabinoids vaporize without thermal degradation at distillation temperatures', impact: 'high', validityRange: '150–200°C', violationConsequence: 'Prolonged heating causes THC→CBN conversion not tracked in yield', source: 'Do et al. 2020' },
  { modelId: 'distillation.v2.0.0', modelName: 'Molecular Distillation', assumption: 'Sigmoid vapor fraction curve applies to all feed compositions', impact: 'medium', validityRange: 'Standard feed compositions', violationConsequence: 'High-terpene or high-residue feeds may show different vaporization behavior', source: 'Lozano et al. 2021' },
  { modelId: 'distillation.v2.0.0', modelName: 'Molecular Distillation', assumption: 'Condenser efficiency is temperature-dependent only', impact: 'medium', validityRange: '20–120°C condenser', violationConsequence: 'Condenser geometry, surface area, and flow rate also affect efficiency', source: 'Grijó et al. 2019' },

  // Energy Balance
  { modelId: 'kernel.energy', modelName: 'Energy Balance', assumption: 'Energy consumption scales linearly with stage count and mass', impact: 'high', validityRange: 'Conceptual', violationConsequence: 'This is a placeholder model — does not account for equipment-specific energy consumption', source: 'Hemp OS v2.0—needs empirical calibration' },
];

const LIMITATIONS: KnownLimitation[] = [
  { modelId: 'extraction.v2.0.0', limitation: 'Solvent mass not tracked in mass balance', severity: 'major', workaround: 'Mass balance only tracks biomass and cannabinoid masses', plannedFix: 'Full solvent mass tracking in v3.0' },
  { modelId: 'distillation.v2.0.0', limitation: 'No equipment-specific geometry factors', severity: 'minor', workaround: 'Assumes standard wiped-film geometry', plannedFix: 'Equipment profiles in v3.0' },
  { modelId: 'kernel.energy', limitation: 'Energy balance is a placeholder — not physics-based', severity: 'major', workaround: 'Use for relative comparison only', plannedFix: 'Equipment-specific power models in v3.0' },
  { modelId: 'all', limitation: 'All strain cannabinoid values are AI-generated, not lab-tested', severity: 'major', workaround: 'Use lab-tested MMJ data where available', plannedFix: 'Replace with real lab data from state registries' },
  { modelId: 'all', limitation: 'Market pricing data ends at 2015', severity: 'major', workaround: 'Historical reference only, not current analysis', plannedFix: 'Real-time market data API integration' },
];

const FALSIFIABLE_PREDICTIONS: FalsifiablePrediction[] = [
  { modelId: 'extraction.v2.0.0', prediction: 'Ethanol extraction at -40°C with 8:1 solvent ratio will recover 85–95% of total cannabinoids in 30 minutes', conditions: '10% moisture biomass, 300 RPM agitation', expectedRange: '85-95%', testability: 'easy', tested: false },
  { modelId: 'decarboxylation.v2.0.0', prediction: '120°C for 60 minutes will convert >95% of THCA to THC', conditions: 'Pure THCA standard', expectedRange: '95-99%', testability: 'easy', tested: false },
  { modelId: 'decarboxylation.v2.0.0', prediction: '80°C for 15 minutes will convert <5% of THCA to THC', conditions: 'Pure THCA standard', expectedRange: '0-5%', testability: 'easy', tested: false },
  { modelId: 'winterization.v2.0.0', prediction: '-40°C winterization for 24h with 5:1 ethanol will remove >80% of waxes', conditions: '15% initial wax content', expectedRange: '80-95%', testability: 'moderate', tested: false },
  { modelId: 'distillation.v2.0.0', prediction: 'Short-path distillation at 185°C, 0.05 mbar will produce >85% cannabinoid purity in distillate', conditions: '75% cannabinoid purity feed', expectedRange: '85-95%', testability: 'moderate', tested: false },
];

export class AssumptionRegistry {
  getAssumptions(modelId?: string): ModelAssumption[] {
    if (modelId) {return ASSUMPTIONS.filter(a => a.modelId === modelId);}
    return ASSUMPTIONS;
  }

  getLimitations(modelId?: string): KnownLimitation[] {
    if (modelId) {return LIMITATIONS.filter(l => l.modelId === modelId || l.modelId === 'all');}
    return LIMITATIONS;
  }

  getPredictions(modelId?: string): FalsifiablePrediction[] {
    if (modelId) {return FALSIFIABLE_PREDICTIONS.filter(p => p.modelId === modelId);}
    return FALSIFIABLE_PREDICTIONS;
  }

  getFullDisclosure(modelId: string) {
    return {
      modelId,
      assumptions: this.getAssumptions(modelId),
      limitations: this.getLimitations(modelId),
      predictions: this.getPredictions(modelId),
    };
  }

  /**
   * Generate a human-readable limitations disclosure for a model
   */
  generateLimitationsStatement(modelId: string): string {
    const assumptions = this.getAssumptions(modelId);
    const limitations = this.getLimitations(modelId);
    const predictions = this.getPredictions(modelId);

    let statement = `## Scientific Limitations: ${modelId}\n\n`;
    statement += `### Model Assumptions\n`;
    for (const a of assumptions) {
      statement += `- **[${a.impact.toUpperCase()}]** ${a.assumption}\n`;
      statement += `  - Valid for: ${a.validityRange}\n`;
      statement += `  - If violated: ${a.violationConsequence}\n`;
    }
    statement += `\n### Known Limitations\n`;
    for (const l of limitations) {
      statement += `- **[${l.severity.toUpperCase()}]** ${l.limitation}\n`;
      if (l.workaround) {statement += `  - Workaround: ${l.workaround}\n`;}
    }
    statement += `\n### Falsifiable Predictions\n`;
    for (const p of predictions) {
      statement += `- ${p.prediction}\n`;
      statement += `  - Test: ${p.testability}, Tested: ${p.tested ? 'Yes' : 'No'}\n`;
    }
    return statement;
  }
}

export const assumptionRegistry = new AssumptionRegistry();
