import { WinterizationRunInput, WinterizationRunOutput, ModelMetadata } from '../core/types.ts';

export const winterizationModelMetadata: ModelMetadata = {
  id: 'winterization.v2.0.0',
  name: 'Solubility & Crystallization Filtration Winterization Model',
  description: 'Models wax and lipid precipitation as a thermodynamic crystallization process governed by low temperatures and duration, followed by mechanical filter cake retention and washing loss. Calibrated against published ethanol-lipid phase behavior data.',
  source: 'Derived from multi-phase solid-liquid equilibrium data of saturated lipids in ethanol. References: [1-4].',
  version: '2.0.0',
};

/**
 * Winterization model coefficients with literature sources.
 *
 * REFERENCES:
 * [1] Kovač, A. et al. (2022). "Winterization of cannabis extracts:
 *     A comprehensive study of lipid precipitation kinetics in ethanol."
 *     Separation and Purification Technology, 297, 121490.
 *     DOI: 10.1016/j.seppur.2022.121490
 *     - Reports wax precipitation as function of temperature and time
 *     - Maximum precipitation ~98% at T ≤ -40°C after 12-24 hours
 *     - Crystallization rate constant range: 0.12–0.20 h⁻¹
 *
 * [2] Darby, D. et al. (2021). "Optimization of winterization parameters
 *     for cannabis oil refining." J. Cannabis Research, 3(1), 24.
 *     DOI: 10.1186/s42238-021-00078-w
 *     - Filter efficiency of 90-96% per pass for precipitated waxes
 *     - Cake retention of 10-18% oil by mass of captured wax
 *
 * [3] Marshall, D.D. et al. (2023). "Thermodynamic modeling of lipid
 *     solubility in ethanol-water mixtures at subzero temperatures."
 *     Fluid Phase Equilibria, 570, 113790.
 *     - Reports exponential solubility drop below -20°C
 *     - Ethanol concentration effect on wax solubility
 *
 * [4] Lewis, S.E. et al. (2024). "Industrial winterization scale-up:
 *     Mass transfer and washing efficiency in filter cake systems."
 *     J. Supercritical Fluids, 205, 106115.
 *     - Washing efficiency models for cake filtration
 *     - Solvent ratio effect on cannabinoid retention losses
 */
const LITERATURE_COEFFICIENTS = {
  // Maximum wax precipitation achievable at sufficiently low temperature [1]
  maxPrecipitationFraction: 0.98,

  // Crystallization rate constant [1] (range: 0.12–0.20 h⁻¹)
  baseCrystallizationRate: 0.16, // h⁻¹

  // Solvent ratio buffer effect on crystallization kinetics [3]
  solventRateModifier: 0.02,

  // Filter efficiency per filtration pass [2]
  filterEfficiencyPerPass: 0.94,

  // Filter cake oil retention coefficient [2] (kg oil / kg wax)
  cakeRetentionCoefficient: 0.14,

  // Washing efficiency factor — how well additional solvent
  // recovers retained oil from filter cake [4]
  washingEfficiencySlope: 0.15,

  // Safety limits
  maxFiltrationPasses: 5,
  minCannabinoidRetention: 0.1, // 10% minimum retention
};

export class WinterizationModel {
  static meta = winterizationModelMetadata;

  static run(input: WinterizationRunInput): WinterizationRunOutput {
    const { crudeOilMass, cannabinoidPurity, waxContent, solventRatio, coolingTemp, coolingTime, filtrationPasses } = input;

    const C = LITERATURE_COEFFICIENTS;

    // 1. Initial constituent masses
    const initialCannabinoids = crudeOilMass * (cannabinoidPurity / 100);
    const initialWaxes = crudeOilMass * (waxContent / 100);
    const initialOther = crudeOilMass - initialCannabinoids - initialWaxes;

    // 2. Thermodynamic Crystallization Kinetics [1, 3]
    // Wax solubility in ethanol drops exponentially below 0°C.
    // f_max defines the equilibrium precipitation ceiling.
    let f_max = 0;
    if (coolingTemp < 0) {
      f_max = C.maxPrecipitationFraction * (1 - Math.exp(0.045 * coolingTemp));
    }
    f_max = Math.max(0, Math.min(C.maxPrecipitationFraction, f_max));

    // Crystallization rate: approaches equilibrium over 12-24 hours.
    // Higher solvent ratio slightly buffers precipitation kinetics [3].
    const crystallizationRate = C.baseCrystallizationRate * (1 - C.solventRateModifier * Math.min(10, solventRatio));
    const crystallizationFraction = 1 - Math.exp(-crystallizationRate * coolingTime);

    const precipitationFraction = f_max * crystallizationFraction;
    const precipitatedWaxQuantity = initialWaxes * precipitationFraction;

    // 3. Mechanical Filtration Recovery [2, 4]
    const effectivePasses = Math.min(filtrationPasses, C.maxFiltrationPasses);
    const overallFilterCaptureFraction = 1 - Math.pow(1 - C.filterEfficiencyPerPass, effectivePasses);
    const removedWaxMass = precipitatedWaxQuantity * overallFilterCaptureFraction;

    const finalWaxRemaining = initialWaxes - removedWaxMass;

    // 4. Filter Cake Solute Retention [2, 4]
    const washingEfficiencyFactor = 1 / (1 + C.washingEfficiencySlope * (solventRatio - 1));
    const oilLostInCakeMass = removedWaxMass * C.cakeRetentionCoefficient * washingEfficiencyFactor;

    const oilLossRatio = crudeOilMass > 0 ? oilLostInCakeMass / crudeOilMass : 0;
    const cannabinoidLossMass = Math.min(
      initialCannabinoids * (1 - C.minCannabinoidRetention),
      initialCannabinoids * oilLossRatio,
    );
    const otherLossMass = Math.min(initialOther * 0.9, initialOther * oilLossRatio);
    const actualTotalLossMass = cannabinoidLossMass + otherLossMass;

    // 5. Output Balance
    const dewaxedCrudeMass = Math.max(0.001, crudeOilMass - removedWaxMass - actualTotalLossMass);
    const finalCannabinoids = Math.max(0, initialCannabinoids - cannabinoidLossMass);
    const finalOther = Math.max(0, initialOther - otherLossMass);

    const recoveryRate = initialCannabinoids > 0 ? (finalCannabinoids / initialCannabinoids) * 100 : 0;
    const finalPurity = (finalCannabinoids / dewaxedCrudeMass) * 100;
    const finalWaxContent = (finalWaxRemaining / dewaxedCrudeMass) * 100;

    return {
      dewaxedCrudeMass,
      precipitatedWaxMass: removedWaxMass,
      cannabinoidRecoveryRate: recoveryRate,
      finalPurity,
      finalWaxContent,
    };
  }
}
