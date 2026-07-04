/**
 * Core domain types for the quantitative-genetics breeding engine.
 * No UI concerns live here — this is pure data modeling.
 */

/** A single quantitative trait's population statistics for one strain. */
export interface TraitStat {
  mean: number;
  /** Phenotypic variance (Vp) observed for this trait in this strain's records. */
  variance: number;
  /**
   * Narrow-sense heritability (h^2) for this trait: fraction of phenotypic
   * variance attributable to additive genetic effects. Must be in [0, 1].
   * Defaults should come from published cultivar studies or the user's own
   * parent/offspring regressions — never invented.
   */
  heritability: number;
  /** Number of independent measurements backing this estimate. */
  sampleSize: number;
}

/** Optional QTL-level detail, used only if the user has actual marker data. */
export interface Genotype {
  qtlScores?: Record<string, number>;
}

export interface EnvironmentRecord {
  date: string; // ISO date
  tempC: number;
  humidityPct: number;
  vpdKpa: number;
  lightDLI: number;
  ec: number;
  ph: number;
}

export interface Strain {
  id: string;
  name: string;
  genotype?: Genotype;
  /** trait key -> stats, e.g. "thc", "cbd", "cbg", "myrcene", "floweringDays", "yieldG", "heightCm" */
  phenotype: Record<string, TraitStat>;
  /** IDs of the two parents that produced this strain, if known. Empty for a founder/landrace. */
  parents: [string, string] | [];
  environmentHistory?: EnvironmentRecord[];
  /** true if phenotype stats came from actual lab/field records, false if provisional/assumed */
  isMeasured: boolean;
}

export type CrossType = "F1" | "BC1" | "S1" | "Polyhybrid";

export interface Cross {
  id: string;
  parentAId: string;
  parentBId: string;
  crossType: CrossType;
  offspringIds: string[];
  dateCrossed?: string;
}

/** Result of simulating one trait's segregation in a cross. */
export interface TraitProjection {
  trait: string;
  midParentValue: number;
  offspringMean: number;
  offspringSD: number;
  ci90: [number, number];
  heritabilityUsed: number;
  sampleSize: number;
  /** Monte Carlo draws, kept only if requested — can be large. */
  samples?: number[];
}

export interface CrossProjection {
  parentAId: string;
  parentBId: string;
  nProgeny: number;
  traits: Record<string, TraitProjection>;
  inbreedingCoefficient: number | null;
  warnings: string[];
}
