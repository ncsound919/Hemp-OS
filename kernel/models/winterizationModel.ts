import { WinterizationRunInput, WinterizationRunOutput, ModelMetadata } from '../core/types.ts';

export const winterizationModelMetadata: ModelMetadata = {
  id: 'winterization.v2.0.0',
  name: 'Solubility & Crystallization Filtration Winterization Model',
  description: 'Models wax and lipid precipitation as a thermodynamic crystallization process governed by low temperatures and duration, followed by mechanical filter cake retention and washing loss. Constants are engineering estimates based on general ethanol-lipid phase behavior.',
  source: 'Engineering estimates based on general solid-liquid equilibrium principles of saturated lipids in ethanol. Literature verification pending.',
  version: '2.0.0',
};

/**
 * Winterization model coefficients.
 *
 * These constants are engineering estimates consistent with the general
 * physical behavior of wax precipitation in ethanol at low temperature.
 * They have NOT been verified against specific published studies and
 * should be treated as approximate until laboratory calibration is performed.
 *
 * Physical basis:
 * - Wax solubility in ethanol drops exponentially below 0°C
 * - Precipitation follows first-order crystallization kinetics
 * - Mechanical filtration captures precipitated solids with typical
 *   efficiency in the 90-96% range per pass
 * - Filter cake retains a fraction of oil proportional to captured wax mass
 * - Additional solvent washing recovers some retained oil
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
