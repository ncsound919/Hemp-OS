/**
 * Validated Analysis — runs the cross-reference engine with statistical
 * validation and shows p-values, effect sizes, and confidence intervals.
 */

import { crossReference } from '../integration/cross-reference.ts';

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          STATISTICALLY VALIDATED CROSS-REFERENCE INSIGHTS          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const insights = crossReference.getAllInsights();
  let statCount = 0;

  for (const ins of insights) {
    const icon = ins.confidence === 'high' ? '🟢' : ins.confidence === 'medium' ? '🟡' : '🔴';
    console.log(`${icon} [${ins.confidence.toUpperCase()}] ${ins.title}`);
    console.log(`   ${ins.finding.substring(0, 250)}...`);

    if (ins.statistics) {
      const s = ins.statistics;
      statCount++;
      console.log(`   ── Statistical Validation ──`);
      console.log(`   Type: ${s.type}`);
      console.log(`   ${s.type === 't-test' ? `t(${s.degreesOfFreedom}) = ${s.statistic.toFixed(3)}` : ''}`);
      console.log(`   ${s.pValue !== undefined ? `p ${s.pValue < 0.001 ? '< 0.001' : `= ${s.pValue.toFixed(4)}`}` : ''}`);
      if (s.effectSize) console.log(`   Cohen\'s d = ${s.effectSize.toFixed(3)}`);
      if (s.confidenceInterval) console.log(`   95% CI: [${s.confidenceInterval[0].toFixed(2)}, ${s.confidenceInterval[1].toFixed(2)}]`);
      console.log(`   ${s.significant ? '✅ STATISTICALLY SIGNIFICANT' : '❌ NOT significant'}`);
      console.log(`   ${s.interpretation.substring(0, 150)}`);
    }
    console.log();
  }

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log(`║  Summary: ${insights.length} insights, ${statCount} with statistical validation        ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

main();
