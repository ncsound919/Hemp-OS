/**
 * Statistical Validation Layer
 *
 * Uses jstat — a mature pure-JS statistics library — for all
 * hypothesis testing, confidence intervals, and effect sizes.
 *
 * jstat replaces the previous hand-rolled t-distribution CDF
 * which had numerical precision issues with extreme t-values.
 *
 * When more advanced models are needed (ANOVA, GLM, time-series),
 * add a Python FastAPI microservice with scipy/statsmodels.
 */

import jstat from 'jstat';

export interface StatisticalResult {
  type: 't-test' | 'correlation' | 'effect-size' | 'confidence-interval';
  statistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  effectSize?: number;
  confidenceInterval?: [number, number];
  interpretation: string;
  significant: boolean;
}

export class StatisticalValidator {
  /**
   * Welch's t-test via jstat
   */
  tTestIndependent(group1: number[], group2: number[]): StatisticalResult {
    const n1 = group1.length, n2 = group2.length;
    const mean1 = group1.reduce((s, v) => s + v, 0) / n1;
    const mean2 = group2.reduce((s, v) => s + v, 0) / n2;
    const var1 = group1.reduce((s, v) => s + (v - mean1) ** 2, 0) / (n1 - 1);
    const var2 = group2.reduce((s, v) => s + (v - mean2) ** 2, 0) / (n2 - 1);
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const t = (mean1 - mean2) / se;
    const df = Math.floor(((var1 / n1 + var2 / n2) ** 2) / ((var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)));
    const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df));
    const cohensD = (mean1 - mean2) / Math.sqrt((var1 + var2) / 2);

    return {
      type: 't-test',
      statistic: Math.abs(t),
      pValue,
      degreesOfFreedom: df,
      effectSize: Math.abs(cohensD),
      confidenceInterval: [t - 1.96 * se, t + 1.96 * se],
      interpretation: this.interpretTTest(pValue, Math.abs(cohensD), mean1, mean2),
      significant: pValue < 0.05,
    };
  }

  /**
   * Pearson correlation via jstat
   */
  pearsonCorrelation(x: number[], y: number[]): StatisticalResult {
    const r = jstat.corrcoeff(x, y);
    const n = x.length;
    const df = n - 2;
    const t = r * Math.sqrt(df / (1 - r * r));
    const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df));

    return {
      type: 'correlation',
      statistic: r,
      pValue,
      degreesOfFreedom: df,
      confidenceInterval: [r - 1.96 * Math.sqrt((1 - r * r) / df), r + 1.96 * Math.sqrt((1 - r * r) / df)],
      interpretation: this.interpretCorrelation(r, pValue),
      significant: pValue < 0.05,
    };
  }

  /**
   * Cohen's d effect size
   */
  effectSize(group1: number[], group2: number[]): StatisticalResult {
    const n1 = group1.length, n2 = group2.length;
    const m1 = group1.reduce((s, v) => s + v, 0) / n1;
    const m2 = group2.reduce((s, v) => s + v, 0) / n2;
    const v1 = group1.reduce((s, v) => s + (v - m1) ** 2, 0) / (n1 - 1);
    const v2 = group2.reduce((s, v) => s + (v - m2) ** 2, 0) / (n2 - 1);
    const d = (m1 - m2) / Math.sqrt((v1 + v2) / 2);
    const interpretation = Math.abs(d) < 0.2 ? 'Negligible effect' :
      Math.abs(d) < 0.5 ? 'Small effect' :
      Math.abs(d) < 0.8 ? 'Medium effect' : 'Large effect';

    return {
      type: 'effect-size',
      statistic: Math.abs(d),
      pValue: 0,
      effectSize: Math.abs(d),
      interpretation: `${interpretation} (d = ${Math.abs(d).toFixed(3)})`,
      significant: Math.abs(d) > 0.2,
    };
  }

  /**
   * Confidence interval for a mean via jstat
   */
  meanConfidenceInterval(values: number[], confidence = 0.95): StatisticalResult {
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const se = Math.sqrt(variance / n);
    const t = jstat.studentt.inv(1 - (1 - confidence) / 2, n - 1);
    const halfWidth = t * se;

    return {
      type: 'confidence-interval',
      statistic: mean,
      pValue: 0,
      degreesOfFreedom: n - 1,
      confidenceInterval: [mean - halfWidth, mean + halfWidth],
      interpretation: `True mean is between ${(mean - halfWidth).toFixed(2)} and ${(mean + halfWidth).toFixed(2)} with ${(confidence * 100)}% confidence`,
      significant: true,
    };
  }

  private interpretTTest(p: number, d: number, m1: number, m2: number): string {
    const pStr = p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(4)}`;
    const sigStr = p < 0.05 ? 'STATISTICALLY SIGNIFICANT' : 'NOT statistically significant';
    const effStr = d < 0.2 ? 'negligible' : d < 0.5 ? 'small' : d < 0.8 ? 'medium' : 'large';
    return `${sigStr} (${pStr}), ${effStr} practical significance (d = ${d.toFixed(3)}). Mean difference: $${Math.abs(m1 - m2).toFixed(2)}`;
  }

  private interpretCorrelation(r: number, p: number): string {
    const strength = Math.abs(r) < 0.1 ? 'negligible' : Math.abs(r) < 0.3 ? 'weak' :
      Math.abs(r) < 0.5 ? 'moderate' : Math.abs(r) < 0.7 ? 'strong' : 'very strong';
    return `${strength} ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(3)})`;
  }
}

export const stats = new StatisticalValidator();
