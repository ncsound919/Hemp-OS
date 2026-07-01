/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DistillationRunInput,
  DistillationRunOutput,
  ModelMetadata,
  CannabinoidOnlyProfile,
} from '../core/types.ts';

export const distillationModelMetadata: ModelMetadata = {
  id: 'distillation.v1.5.0',
  name: 'Vapor-Liquid Equilibrium Wiped-Film Distillation Model',
  description:
    'Models short-path molecular distillation using pressure-corrected boiling points, selective volatility by component, condenser partitioning, and strict mass balance. Emits a cannabinoid-only profile (no "other") for KernelExecutor compatibility; non-cannabinoid content is derived downstream as 100 - sum(cannabinoids) - waxCarryover.',
  source:
    'Clausius-Clapeyron / Antoine-style vapor pressure approximations calibrated to phytocannabinoid volatility and empirical wiped-film behavior.',
  version: '1.5.0',
};

/**
 * The six cannabinoid fields tracked through the mass balance.
 * "other" is intentionally excluded from this list: KernelExecutor treats
 * `otherContent` as a derived quantity (100 - sum(cannabinoids) - wax),
 * so the model must never emit or scale an "other" fraction itself.
 */
const CANNABINOID_KEYS = ['thca', 'cbda', 'cbga', 'thc', 'cbd', 'cbg'] as const;
type CannabinoidKey = (typeof CANNABINOID_KEYS)[number];

type InputWithOptionalProfile = DistillationRunInput & {
  /** Cannabinoid-only profile from the previous kernel stage (no "other"). */
  feedCannabinoidProfile?: Partial<CannabinoidOnlyProfile>;
};

export class DistillationModel {
  static meta = distillationModelMetadata;

  private static readonly CONFIG = {
    torrPerBar: 750.062,
    minPressureBar: 1e-4,
    minMassKg: 1e-9,
    minCondEff: 0.01,
    maxCondEff: 0.999,
    filmThicknessSensitivity: 0.03,
    cannabinoidSensitivity: 0.08,
    terpeneSensitivity: 0.12,
    heavySensitivity: 0.05,
    heavyResidueRetention: 0.92, // wt% fraction of vaporized heavy residue ("wax") that condenses into distillate rather than tails
    condenserTempPenalty: 0.015,
    terpeneCondenserFactor: 0.012,
    headsTerpeneCaptureMin: 0.55,
    distillateTerpeneCaptureMax: 0.45,
    cannabinoidHeadsLossFactor: 0.2,
    acidSurvivalFactor: 0.02, // acids (THCA/CBDA/CBGA) largely decarboxylate/degrade before vaporizing; only a small trace carries over

    // "Other" bucket (non-cannabinoid, non-terpene, non-heavy-residue mass,
    // e.g. residual solvent, chlorophyll fragments, moisture) is vaporized
    // using blended terpene/cannabinoid volatility, then split between
    // distillate and heads. These coefficients are empirical placeholders
    // pending lab calibration data for "other" component behavior.
    otherVaporTerpeneWeight: 0.35, // share of terpene-like volatility driving "other" vaporization
    otherVaporCannabinoidWeight: 0.15, // share of cannabinoid-like volatility driving "other" vaporization
    otherToDistillateFraction: 0.35, // fraction of vaporized "other" mass collected in distillate
    otherToHeadsFraction: 0.45, // fraction of vaporized "other" mass collected in heads (remainder -> tails)

    defaultProfile: {
      thca: 0,
      cbda: 0,
      cbga: 0,
      thc: 1,
      cbd: 1,
      cbg: 1,
    } as CannabinoidOnlyProfile,

    // Relative volatility bias per cannabinoid during vaporization/condensation.
    // "other" has no bias entry because it is not part of the emitted profile.
    volatilityBias: {
      thca: 0.02,
      cbda: 0.02,
      cbga: 0.02,
      thc: 1.12,
      cbd: 1.08,
      cbg: 1.05,
    } as CannabinoidOnlyProfile,
  };

  static run(input: DistillationRunInput): DistillationRunOutput {
    const typedInput = input as InputWithOptionalProfile;
    const {
      feedMass,
      feedCannabinoidPurity,
      feedTerpeneContent,
      feedHeavyResidue,
      evaporatorTemp = 185,
      condenserTemp = 70,
      vacuumPressure = 0.05,
      feedRate = 1.5,
      feedCannabinoidProfile,
    } = typedInput;

    this.validateInputs({
      feedMass,
      feedCannabinoidPurity,
      feedTerpeneContent,
      feedHeavyResidue,
      vacuumPressure,
      evaporatorTemp,
      condenserTemp,
      feedRate,
    });

    const boilingPoints = this.computeBoilingPoints(vacuumPressure);
    const filmFactor = this.computeFilmFactor(feedRate);

    const vaporFractions = {
      terpenes:
        this.getVaporFraction(evaporatorTemp, boilingPoints.terpenes, this.CONFIG.terpeneSensitivity) *
        filmFactor,
      cannabinoids:
        this.getVaporFraction(evaporatorTemp, boilingPoints.cannabinoids, this.CONFIG.cannabinoidSensitivity) *
        filmFactor,
      heavyResidue:
        this.getVaporFraction(evaporatorTemp, boilingPoints.heavyResidue, this.CONFIG.heavySensitivity) *
        filmFactor,
    };

    const feed = {
      cannabinoids: feedMass * (feedCannabinoidPurity / 100),
      terpenes: feedMass * (feedTerpeneContent / 100),
      heavyResidue: feedMass * (feedHeavyResidue / 100),
    };
    const feedOther = Math.max(0, feedMass - feed.cannabinoids - feed.terpenes - feed.heavyResidue);

    const vapor = {
      cannabinoids: feed.cannabinoids * vaporFractions.cannabinoids,
      terpenes: feed.terpenes * vaporFractions.terpenes,
      heavyResidue: feed.heavyResidue * vaporFractions.heavyResidue,
      other:
        feedOther *
        (vaporFractions.terpenes * this.CONFIG.otherVaporTerpeneWeight +
          vaporFractions.cannabinoids * this.CONFIG.otherVaporCannabinoidWeight),
    };

    const condenser = this.computeCondenserEfficiencies(condenserTemp);

    const cannabinoidToDistillate = vapor.cannabinoids * condenser.cannabinoids;
    const cannabinoidToHeads = vapor.cannabinoids * (1 - condenser.cannabinoids) * this.CONFIG.cannabinoidHeadsLossFactor;

    const condensedTerpenes = vapor.terpenes * condenser.terpenes;
    const terpeneToHeads = condensedTerpenes * condenser.terpeneHeadsSplit;
    const terpeneToDistillate = condensedTerpenes - terpeneToHeads;

    const heavyToDistillate = vapor.heavyResidue * condenser.heavyResidue;
    const otherToDistillate = vapor.other * this.CONFIG.otherToDistillateFraction;
    const otherToHeads = vapor.other * this.CONFIG.otherToHeadsFraction;

    const distillateMass =
      cannabinoidToDistillate + terpeneToDistillate + heavyToDistillate + otherToDistillate;

    const headsMass = cannabinoidToHeads + terpeneToHeads + otherToHeads;
    const tailsMass = Math.max(0, feedMass - distillateMass - headsMass);

    const finalCannPurity = this.toPercent(cannabinoidToDistillate, distillateMass);
    const cannabinoidYield = this.toPercent(cannabinoidToDistillate, feed.cannabinoids);
    const waxCarryover = this.toPercent(heavyToDistillate, distillateMass);

    // Cannabinoid-only profile, scaled to wt% of the distillate. "other" is
    // deliberately not part of this object — KernelExecutor derives
    // otherContent = 100 - sum(cannabinoids) - waxCarryover downstream.
    const cannabinoidOnlyProfile = this.enrichProfile(
      feedCannabinoidProfile,
      this.CONFIG.volatilityBias,
      finalCannPurity
    );

    const finalCannabinoidProfile: CannabinoidOnlyProfile = {
      ...cannabinoidOnlyProfile,
    } as CannabinoidOnlyProfile;

    const totalCollected = distillateMass + headsMass + tailsMass;
    const imbalance = Math.abs(totalCollected - feedMass);
    if (imbalance > 1e-6) {
      console.warn(`[DistillationModel] Mass imbalance: ${imbalance.toFixed(9)} kg`);
    }

    return {
      distillateMass,
      headsMass,
      tailsMass,
      cannabinoidPurity: finalCannPurity,
      cannabinoidYield,
      waxCarryover,
      finalCannabinoidProfile,
      boilingPoints,
    };
  }

  private static validateInputs(values: {
    feedMass: number;
    feedCannabinoidPurity: number;
    feedTerpeneContent: number;
    feedHeavyResidue: number;
    vacuumPressure: number;
    evaporatorTemp: number;
    condenserTemp: number;
    feedRate: number;
  }): void {
    const {
      feedMass,
      feedCannabinoidPurity,
      feedTerpeneContent,
      feedHeavyResidue,
      vacuumPressure,
      evaporatorTemp,
      condenserTemp,
      feedRate,
    } = values;

    if (!Number.isFinite(feedMass) || feedMass <= 0) {
      throw new Error('DistillationModel: feedMass must be a finite number > 0');
    }
    if (!Number.isFinite(vacuumPressure) || vacuumPressure <= 0) {
      throw new Error('DistillationModel: vacuumPressure must be a finite positive number');
    }
    if (!Number.isFinite(evaporatorTemp) || !Number.isFinite(condenserTemp)) {
      throw new Error('DistillationModel: temperatures must be finite numbers');
    }
    if (!Number.isFinite(feedRate) || feedRate <= 0) {
      throw new Error('DistillationModel: feedRate must be a finite number > 0');
    }

    const fractions = [
      ['feedCannabinoidPurity', feedCannabinoidPurity],
      ['feedTerpeneContent', feedTerpeneContent],
      ['feedHeavyResidue', feedHeavyResidue],
    ] as const;

    for (const [name, value] of fractions) {
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error(`DistillationModel: ${name} must be between 0 and 100`);
      }
    }

    const totalComposition = feedCannabinoidPurity + feedTerpeneContent + feedHeavyResidue;
    if (totalComposition > 100 + 1e-9) {
      throw new Error(
        'DistillationModel: feedCannabinoidPurity + feedTerpeneContent + feedHeavyResidue cannot exceed 100%'
      );
    }

    if (evaporatorTemp > 250) {
      console.warn(
        `[DistillationModel] Evaporator temperature ${evaporatorTemp}°C is unusually high.`
      );
    }
  }

  private static computeBoilingPoints(vacuumPressureBar: number): {
    terpenes: number;
    cannabinoids: number;
    heavyResidue: number;
  } {
    const pressureBar = Math.max(this.CONFIG.minPressureBar, vacuumPressureBar);
    const pTorr = Math.max(this.CONFIG.minPressureBar, pressureBar * this.CONFIG.torrPerBar);

    return {
      terpenes: 1420 / (7.35 - Math.log10(pTorr)) - 230,
      cannabinoids: 2450 / (8.1 - Math.log10(pTorr)) - 240,
      heavyResidue: 3200 / (8.5 - Math.log10(pTorr)) - 250,
    };
  }

  private static getVaporFraction(temp: number, bp: number, sensitivity: number): number {
    return 1 / (1 + Math.exp(-sensitivity * (temp - bp)));
  }

  private static computeFilmFactor(feedRate: number): number {
    return Math.max(0.5, 1 - this.CONFIG.filmThicknessSensitivity * Math.max(0, feedRate - 1.0));
  }

  private static computeCondenserEfficiencies(condenserTemp: number): {
    cannabinoids: number;
    terpenes: number;
    heavyResidue: number;
    terpeneHeadsSplit: number;
  } {
    const cannabinoids =
      condenserTemp < 55
        ? 0.99
        : condenserTemp > 80
          ? Math.max(
              0.1,
              0.99 - this.CONFIG.condenserTempPenalty * (condenserTemp - 80)
            )
          : 0.98;

    const terpenes = this.clamp(
      1 - this.CONFIG.terpeneCondenserFactor * condenserTemp,
      this.CONFIG.minCondEff,
      this.CONFIG.maxCondEff
    );

    const terpeneHeadsSplit = this.clamp(
      0.75 + (condenserTemp - 70) * 0.005,
      this.CONFIG.headsTerpeneCaptureMin,
      0.95
    );

    return {
      cannabinoids: this.clamp(cannabinoids, this.CONFIG.minCondEff, this.CONFIG.maxCondEff),
      terpenes,
      heavyResidue: this.CONFIG.heavyResidueRetention,
      terpeneHeadsSplit,
    };
  }

  /**
   * Produces a cannabinoid-only wt% profile of the distillate (sums to
   * `cannabinoidPurity`, not 100). Never includes an "other" key — callers
   * (KernelExecutor) must derive non-cannabinoid content independently.
   */
  private static enrichProfile(
    inputProfile: Partial<CannabinoidOnlyProfile> | undefined,
    volatilityBias: CannabinoidOnlyProfile,
    cannabinoidPurity: number
  ): CannabinoidOnlyProfile {
    const base = this.normalizeCannabinoidOnlyProfile(inputProfile);

    const weighted: CannabinoidOnlyProfile = {
      thca: base.thca * this.CONFIG.acidSurvivalFactor * volatilityBias.thca,
      cbda: base.cbda * this.CONFIG.acidSurvivalFactor * volatilityBias.cbda,
      cbga: base.cbga * this.CONFIG.acidSurvivalFactor * volatilityBias.cbga,
      thc: base.thc * volatilityBias.thc,
      cbd: base.cbd * volatilityBias.cbd,
      cbg: base.cbg * volatilityBias.cbg,
    };

    const normalized = this.normalizeCannabinoidOnlyProfile(weighted);
    const purityScale = this.clamp(cannabinoidPurity / 100, 0, 1);

    return {
      thca: normalized.thca * purityScale,
      cbda: normalized.cbda * purityScale,
      cbga: normalized.cbga * purityScale,
      thc: normalized.thc * purityScale,
      cbd: normalized.cbd * purityScale,
      cbg: normalized.cbg * purityScale,
    };
  }

  /** Normalizes only the six cannabinoid fields so they sum to 1 (never touches "other"). */
  private static normalizeCannabinoidOnlyProfile(
    profile: Partial<CannabinoidOnlyProfile> | undefined
  ): CannabinoidOnlyProfile {
    const safe: CannabinoidOnlyProfile = {
      thca: Math.max(0, profile?.thca || 0),
      cbda: Math.max(0, profile?.cbda || 0),
      cbga: Math.max(0, profile?.cbga || 0),
      thc: Math.max(0, profile?.thc || 0),
      cbd: Math.max(0, profile?.cbd || 0),
      cbg: Math.max(0, profile?.cbg || 0),
    };

    const total = CANNABINOID_KEYS.reduce((sum, key) => sum + safe[key], 0);

    if (total <= this.CONFIG.minMassKg) {
      return { ...this.CONFIG.defaultProfile };
    }

    return CANNABINOID_KEYS.reduce((acc, key) => {
      acc[key] = safe[key] / total;
      return acc;
    }, {} as CannabinoidOnlyProfile);
  }

  private static toPercent(numerator: number, denominator: number): number {
    if (denominator <= this.CONFIG.minMassKg) return 0;
    return (numerator / denominator) * 100;
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}