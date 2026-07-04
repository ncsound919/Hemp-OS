/**
 * Kernel barrel export
 *
 * Centralized exports for the deterministic simulation kernel.
 * Import from 'kernel' instead of deep paths to individual files.
 */

// Core types & constants
export { KernelExecutor } from './workflow/executor.ts';
export { topologicalSort, validateProcessGraph } from './workflow/processGraph.ts';
export * from './core/types.ts';
export * from './core/constants.ts';
export { convertMass, convertVolume, convertTemp, convertPressure, convertTime } from './core/units.ts';
export {
  validateBiomass, validateSolvent, validateExtractionInput,
  validateDecarboxylationInput, validateWinterizationInput,
  validateDistillationInput, assertValid,
} from './core/validation.ts';
export { BIOMASS_PROFILES } from './calibration/profiles.ts';

// Process models
export { ExtractionModel } from './models/extractionModel.ts';
export { DecarboxylationModel } from './models/decarboxylationModel.ts';
export { WinterizationModel } from './models/winterizationModel.ts';
export { DistillationModel } from './models/distillationModel.ts';

// Rigor and validation
export { biologicalValidator } from './rigor/biological-validator.ts';
export { chemicalValidator } from './rigor/chemical-validator.ts';
export { phaseValidator } from './rigor/phase-validator.ts';
export { typeGuards } from './rigor/type-guards.ts';
export { regulatoryCompliance } from './rigor/regulatory-compliance.ts';
export { calibrationManager } from './rigor/calibration-manager.ts';
export { provenanceReplay } from './rigor/provenance-replay.ts';
export { provenanceChain } from './rigor/provenance-chain.ts';
export { predictionValidator } from './rigor/prediction-validator.ts';
export { benchmarkCert } from './rigor/benchmark-certification.ts';
export { sensitivityEngine } from './rigor/sensitivity-engine.ts';
export { assumptionRegistry } from './rigor/assumption-registry.ts';
export { reproducibilityOrch } from './rigor/reproducibility-orchestrator.ts';
export { governance } from './rigor/governance.ts';
export { labPartnerships } from './rigor/lab-partnerships.ts';
export { StrainAwareOptimizer } from './StrainAwareOptimizer.ts';
export { matchBiomassProfile } from './StrainBiomassMatcher.ts';
