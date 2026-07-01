/**
 * Quantitative genetics engine.
 *
 * Model (standard Falconer & Mackay additive-polygenic framework):
 *   - Phenotypic variance Vp = Va + Ve  (additive genetic + environmental/residual)
 *   - h^2 (narrow-sense heritability) = Va / Vp
 *   - Estimated breeding value (EBV) from a single phenotypic record:
 *         EBV = popMean + h^2 * (P - popMean)
 *     (this is the standard single-record BLUP-lite predictor; more accurate
 *      with repeated records or relatives' data, which this engine also supports
 *      via `sampleSize`-weighted shrinkage.)
 *   - Mid-parent breeding value = (EBV_A + EBV_B) / 2
 *   - Mendelian sampling variance per cross = Va / 2  (segregation variance —
 *     the genetic variance introduced by independent assortment/recombination
 *     each time two parents are crossed; this is why full siblings differ)
 *   - Offspring phenotypic variance = (Va / 2) + Ve
 *
 * This is a decision-support model, not a prediction of any individual seed's
 * exact chemistry. It produces a distribution, not a point estimate.
 */

import { Strain, TraitStat, CrossProjection, TraitProjection } from "./types";
import {
  makeRng,
  sampleNormal,
  sampleStandardNormal,
  mean,
  sampleVariance,
  percentile,
  fractionAbove,
  fractionBelow,
} from "./stats";

export interface PopulationTraitStats {
  popMean: number;
  popVariance: number;
  n: number;
}

export interface SimulateCrossOptions {
  nProgeny?: number; // default 2000
  seed?: number; // for reproducible runs; default = time-based
  keepSamples?: boolean; // return raw draws (memory heavy for large nProgeny)
  /**
   * Override heritability per trait if the user has a better estimate than
   * what's stored on the parent strains (e.g. from their own trial data).
   */
  heritabilityOverrides?: Record<string, number>;
}

export class GeneticEngine {
  /**
   * Population mean/variance for a trait across a reference population.
   * Required to compute EBVs — heritability alone is meaningless without
   * knowing what the trait is being regressed toward.
   */
  static computePopulationStats(population: Strain[], trait: string): PopulationTraitStats | null {
    const values: number[] = [];
    for (const s of population) {
      const stat = s.phenotype[trait];
      if (stat) values.push(stat.mean);
    }
    if (values.length === 0) return null;
    return {
      popMean: mean(values),
      popVariance: values.length > 1 ? sampleVariance(values) : 0,
      n: values.length,
    };
  }

  /**
   * Estimated breeding value for one strain's trait, regressed toward the
   * population mean by heritability. Falls back gracefully when no
   * population context exists (treats the strain's own mean as the EBV,
   * which is only valid if it IS the population).
   */
  static estimateBreedingValue(
    strain: Strain,
    trait: string,
    popStats: PopulationTraitStats | null,
    heritabilityOverride?: number
  ): { ebv: number; heritabilityUsed: number } {
    const stat = strain.phenotype[trait];
    if (!stat) {
      throw new Error(`Strain "${strain.name}" has no recorded data for trait "${trait}"`);
    }
    const h2 = clampHeritability(heritabilityOverride ?? stat.heritability);
    if (!popStats) {
      return { ebv: stat.mean, heritabilityUsed: h2 };
    }
    const ebv = popStats.popMean + h2 * (stat.mean - popStats.popMean);
    return { ebv, heritabilityUsed: h2 };
  }

  /**
   * Simulate one trait's segregation in a cross via Monte Carlo, returning
   * a full projected distribution (not a single number).
   */
  static simulateTrait(
    parentA: Strain,
    parentB: Strain,
    trait: string,
    population: Strain[],
    opts: SimulateCrossOptions = {}
  ): TraitProjection {
    const nProgeny = opts.nProgeny ?? 2000;
    const rng = makeRng(opts.seed ?? Date.now());
    const popStats = this.computePopulationStats(population, trait);

    const statA = parentA.phenotype[trait];
    const statB = parentB.phenotype[trait];
    if (!statA || !statB) {
      throw new Error(
        `Cannot simulate trait "${trait}": missing data on ${!statA ? parentA.name : parentB.name}`
      );
    }

    const h2Override = opts.heritabilityOverrides?.[trait];
    const { ebv: ebvA, heritabilityUsed: h2A } = this.estimateBreedingValue(parentA, trait, popStats, h2Override);
    const { ebv: ebvB, heritabilityUsed: h2B } = this.estimateBreedingValue(parentB, trait, popStats, h2Override);

    // Use the average of the two parents' heritability estimates, weighted
    // by how much data backs each (more replicates -> more trusted).
    const h2 = weightedAverage(
      [h2A, h2B],
      [statA.sampleSize, statB.sampleSize]
    );

    const midParentValue = (ebvA + ebvB) / 2;

    // Phenotypic variance pooled from both parents' own records (best
    // available estimate of Vp for this trait/environment combo).
    const vpA = statA.variance;
    const vpB = statB.variance;
    const vp = weightedAverage([vpA, vpB], [statA.sampleSize, statB.sampleSize]) || (popStats?.popVariance ?? 0);

    const va = h2 * vp; // additive genetic variance
    const ve = (1 - h2) * vp; // environmental/residual variance
    const mendelianSamplingVariance = va / 2; // segregation variance per cross event
    const offspringVariance = mendelianSamplingVariance + ve;
    const offspringSD = Math.sqrt(Math.max(offspringVariance, 0));

    const samples: number[] = new Array(nProgeny);
    for (let i = 0; i < nProgeny; i++) {
      samples[i] = sampleNormal(midParentValue, offspringSD, rng);
    }
    samples.sort((a, b) => a - b);

    const projection: TraitProjection = {
      trait,
      midParentValue,
      offspringMean: mean(samples),
      offspringSD,
      ci90: [percentile(samples, 5), percentile(samples, 95)],
      heritabilityUsed: h2,
      sampleSize: statA.sampleSize + statB.sampleSize,
    };
    if (opts.keepSamples) projection.samples = samples;
    return projection;
  }

  /** Simulate a full cross across every trait both parents have in common. */
  static simulateCross(
    parentA: Strain,
    parentB: Strain,
    population: Strain[],
    opts: SimulateCrossOptions = {}
  ): CrossProjection {
    const warnings: string[] = [];
    const sharedTraits = Object.keys(parentA.phenotype).filter((t) => trait_in(parentB, t));
    const skipped = Object.keys(parentA.phenotype).filter((t) => !trait_in(parentB, t));
    if (skipped.length > 0) {
      warnings.push(
        `Skipped traits missing on one parent: ${skipped.join(", ")}. Add lab data for both parents to include them.`
      );
    }
    if (!parentA.isMeasured || !parentB.isMeasured) {
      warnings.push(
        "One or both parents have provisional (non-lab-verified) phenotype data. Treat projections as low-confidence."
      );
    }

    const traits: Record<string, TraitProjection> = {};
    for (const trait of sharedTraits) {
      traits[trait] = this.simulateTrait(parentA, parentB, trait, population, opts);
      if (traits[trait].sampleSize < 6) {
        warnings.push(
          `Trait "${trait}" has low replicate count (n=${traits[trait].sampleSize}); heritability/variance estimates are unstable below n≈6.`
        );
      }
    }

    return {
      parentAId: parentA.id,
      parentBId: parentB.id,
      nProgeny: opts.nProgeny ?? 2000,
      traits,
      inbreedingCoefficient: null, // populate via Pedigree.inbreedingCoefficient(offspringId) once the cross is registered
      warnings,
    };
  }

  /** Probability a random progeny individual exceeds/falls below given thresholds on a trait. */
  static probabilityInRange(
    projection: TraitProjection,
    opts: { above?: number; below?: number }
  ): number {
    if (!projection.samples) {
      throw new Error("probabilityInRange requires the projection to have been run with keepSamples: true");
    }
    let candidates = projection.samples;
    if (opts.above !== undefined) {
      return fractionAbove(candidates, opts.above);
    }
    if (opts.below !== undefined) {
      return fractionBelow(candidates, opts.below);
    }
    throw new Error("probabilityInRange requires an `above` or `below` threshold");
  }

  /**
   * Joint probability that a progeny individual satisfies thresholds on TWO
   * traits simultaneously (e.g. THC > 22% AND CBD < 1%).
   *
   * This requires generating paired (correlated) draws per individual —
   * `TraitProjection.samples` from two separate `simulateTrait` calls are
   * each independently sorted for percentile math and do NOT correspond
   * index-by-index to the same virtual plant. Zipping them, as an earlier
   * draft of this module did, silently computes a meaningless quantity.
   *
   * If you don't know the genetic correlation between the two traits,
   * pass correlation: 0 (independence) and treat the result as an upper/
   * lower bound rather than a precise joint estimate — real cannabinoid
   * traits are often correlated (e.g. THC/CBD tend to trade off), and
   * ignoring that will bias this number.
   */
  static jointProbability(
    parentA: Strain,
    parentB: Strain,
    population: Strain[],
    traitAName: string,
    traitBName: string,
    conditionA: { above?: number; below?: number },
    conditionB: { above?: number; below?: number },
    correlation: number,
    opts: SimulateCrossOptions = {}
  ): number {
    if (correlation < -1 || correlation > 1) {
      throw new Error(`correlation must be in [-1, 1], got ${correlation}`);
    }
    const nProgeny = opts.nProgeny ?? 2000;
    const rng = makeRng(opts.seed ?? Date.now());

    const projA = this.simulateTrait(parentA, parentB, traitAName, population, { ...opts, keepSamples: false });
    const projB = this.simulateTrait(parentA, parentB, traitBName, population, { ...opts, keepSamples: false });

    let hits = 0;
    for (let i = 0; i < nProgeny; i++) {
      const z1 = sampleStandardNormal(rng);
      const z2raw = sampleStandardNormal(rng);
      const z2 = correlation * z1 + Math.sqrt(1 - correlation * correlation) * z2raw;
      const drawA = projA.midParentValue + projA.offspringSD * z1;
      const drawB = projB.midParentValue + projB.offspringSD * z2;

      const passA =
        (conditionA.above === undefined || drawA > conditionA.above) &&
        (conditionA.below === undefined || drawA < conditionA.below);
      const passB =
        (conditionB.above === undefined || drawB > conditionB.above) &&
        (conditionB.below === undefined || drawB < conditionB.below);
      if (passA && passB) hits++;
    }
    return hits / nProgeny;
  }

  /**
   * Predicted response to truncation selection (breeder's equation): R = h^2 * S
   * where S is the selection differential (mean of selected group minus
   * population mean). Standard quantitative-genetics prediction for gain
   * per generation under a given selection intensity.
   */
  static predictedSelectionResponse(heritability: number, selectionDifferential: number): number {
    return clampHeritability(heritability) * selectionDifferential;
  }
}

function trait_in(strain: Strain, trait: string): boolean {
  return Object.prototype.hasOwnProperty.call(strain.phenotype, trait);
}

function clampHeritability(h2: number): number {
  if (Number.isNaN(h2)) return 0;
  return Math.min(1, Math.max(0, h2));
}

function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return mean(values);
  return values.reduce((acc, v, i) => acc + v * weights[i], 0) / totalWeight;
}
