
import { StageType, StageConfig } from './types.ts';

export function getSubstrateDetails(activeStageType: StageType, stageConfig: StageConfig, isDecarboxylated: boolean, isDecarboxylating: boolean) {
  switch (activeStageType) {
    case 'extraction':
      return {
        title: 'Vortex Solvent Extraction Substrate',
        desc: `Visualizing standard molecular structures of raw CBD Acid (CBDA) surrounded by a rushing phase of ${(stageConfig as any).solventType || 'Ethanol'} solvent.`,
        metrics: [
          { label: 'Solvent Flow', value: `${(((stageConfig as any).agitationSpeed || 300) / 10).toFixed(0)} mL/s` },
          { label: 'Solvent Ratio', value: `${((stageConfig as any).solventRatio || 8.0).toFixed(1)} L/kg` },
          { label: 'Thermal Jitter', value: `${Math.max(((stageConfig as any).extractionTemp + 80) / 1.2, 0).toFixed(0)}%` }
        ]
      };
    case 'winterization':
      return {
        title: 'Co-solvent Freezing Crystallization Lattice',
        desc: 'Simulating the critical precipitation boundary. Standard phytochem waxes and heavy lipids crystallize into locked solid matrices while pure CBD molecules remain in the liquid supernatant.',
        metrics: [
          { label: 'Wax Crystal Order', value: ((stageConfig as any).coolingTemp || -40) <= -30 ? '99.4% Highly Crystalline' : 'Amorphous Dispersion' },
          { label: 'Precipitation Threshold', value: '-30°C Critical Bound' },
          { label: 'Wax Density', value: '0.865 g/cm³' }
        ]
      };
    case 'decarboxylation':
      return {
        title: 'Arrhenius Thermal CO₂ Bond Cleavage',
        desc: isDecarboxylated 
          ? 'Reaction Completed. CBDA has been fully decarboxylated into CBD. Pure carbon dioxide gas was evolved and evacuated safely.'
          : isDecarboxylating
            ? 'Reaction in progress. The covalent bond connecting the carboxyl group (-COOH) is breaking under high temperature thermal excitation...'
            : 'Decarboxylation ready. Thermal excitation of the carboxyl group on the phytochem ring structure. Trigger to observe CO2 extraction.',
        metrics: [
          { label: 'Kinetic Rate', value: `${(2.45e11 * Math.exp(-126000 / (8.314 * (((stageConfig as any).temperature || 120) + 273.15)))).toExponential(3)} s⁻¹` },
          { label: 'Molecular Form', value: isDecarboxylated ? 'CBD (Active)' : 'CBDA (Acidic)' },
          { label: 'Thermal Vibration', value: `${((stageConfig as any).temperature || 120) > 130 ? 'Extremely High' : 'Moderate'}` }
        ]
      };
    case 'distillation':
      return {
        title: 'Kinetic Evaporation Column Path',
        desc: 'Visualizing fractional boiling point separation. Highly kinetic orange terpene molecules vaporize rapidly and condense on the cold finger collector first, leaving the heavier golden cannabinoids.',
        metrics: [
          { label: 'Evaporation Speed', value: `${((stageConfig as any).feedRate || 1.5).toFixed(1)} kg/hr` },
          { label: 'Vacuum Pressure', value: `${((stageConfig as any).vacuumPressure || 0.05).toFixed(3)} mbar` },
          { label: 'Mean Free Path', value: `${(0.05 / ((stageConfig as any).vacuumPressure || 0.05)).toFixed(1)} cm` }
        ]
      };
    default:
      return {
        title: 'Molecular Substrate Explorer',
        desc: 'Phytochemical structures and solvent vectors.',
        metrics: []
      };
  }
}
