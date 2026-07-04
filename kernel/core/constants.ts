/**
 * Hemp OS — Shared Constants
 *
 * Single source of truth for all default configuration values,
 * replacing duplicated magic numbers across 10+ files.
 */

// ─── Extraction Model Defaults ─────────────────────────────────────────
export const EXTRACTION = {
  DEFAULT_SOLVENT_TYPE: 'Ethanol' as const,
  DEFAULT_SOLVENT_PURITY: 99.5,
  DEFAULT_SOLVENT_TEMP: -40,
  DEFAULT_SOLVENT_RATIO: 8,
  DEFAULT_TEMPERATURE: -40,
  DEFAULT_DURATION: 30,
  DEFAULT_AGITATION_SPEED: 300,
  SOLVENT_TYPE: ['Ethanol', 'CO2', 'Butane'] as const,
};
//

// =========================================================================
// -----------------------------------------------------
export const WINTERIZATION = {
  DEFAULT_SOLVENT_RATIO: 5,
  DEFAULT_COOLING_TEMP: -40,
  DEFAULT_COOLING_TIME: 24,
  DEFAULT_FILTRATION_PASSES: 1,
};
//

// =========================================================================
// -----------------------------------------------------
export const DECARB = {
  DEFAULT_TEMPERATURE: 120,
  DEFAULT_DURATION: 60,
};
//

// =========================================================================
// -----------------------------------------------------
export const DISTILLATION = {
  DEFAULT_EVAPORATOR_TEMP: 185,
  DEFAULT_CONDENSER_TEMP: 70,
  DEFAULT_VACUUM_PRESSURE: 0.05,
  DEFAULT_FEED_RATE: 1.5,
};
//

// =========================================================================
// -----------------------------------------------------
export const KERNEL = {
  TARGET_THC_LIMIT: 0.3,    // USDA legal limit %
  THCA_DECARB_RATIO: 0.877,  // Molecular weight conversion factor
  ENERGY_PER_STAGE_KWH: 3.8,
  THERMAL_FRACTION: 0.71,
  TERPENE_FRACTION_OF_OTHER: 0.25,
  TOLERANCE: {
    MASS_BALANCE: 0.015,     // 1.5% mass balance tolerance
    CALIBRATION_DRIFT: 0.10, // 10% drift threshold for alerts
  },
};
//

// =========================================================================
// -----------------------------------------------------
export const BIOLOGICAL_LIMITS = {
  THC_MAX_PERCENT: 38,       // Highest recorded lab value
  CBD_MAX_PERCENT: 20,       // Known ceiling from breeding data
  CBG_MAX_PERCENT: 6,
  CBN_MAX_PERCENT: 2,
  MOISTURE_MAX_PERCENT: 30,
  WAX_MAX_PERCENT: 15,
  TOTAL_CANNABINOID_MAX: 45, // % of dry weight
};
//

// =========================================================================
// -----------------------------------------------------
export const BENCHMARKS = {
  EXTRACTION: {
    RECOVERY_RATE: 21.1,
    PURITY: 93.7,
  },
  DECARBOXYLATION: {
    THCA_CONVERSION: 82.5,
    FINAL_MASS: 0.985,
  },
  WINTERIZATION: {
    CANNABINOID_RECOVERY: 99.0,
    FINAL_PURITY: 76.0,
  },
  DISTILLATION: {
    CANNABINOID_PURITY: 95.7,
    CANNABINOID_YIELD: 94.7,
  },
};
//

// =========================================================================
// -----------------------------------------------------
export const API = {
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_DEFAULT: 30,
  RATE_LIMIT_STRICT: 10,
  PYTHON_SERVICE_DEFAULT_URL: 'http://localhost:8000',
  BODY_LIMIT: '1mb',
};
//

// =========================================================================
// -----------------------------------------------------
export const VERSION = {
  KERNEL: 'v2.0.0-LiteratureCalibrated',
  SYSTEM: '2.0.0-Layered-OS',
};
//
