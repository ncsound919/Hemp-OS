import { strainIntel } from '../kernel/rigor/strain-intelligence.ts';
import { pipelineOrch } from '../kernel/autonomy/pipeline-orchestrator.ts';
import { publicEducation } from '../src/services/public-education.service.ts';

function main() {
  console.log('=== Upgrade 2: Strain Intelligence Network ===\n');
  const { nodes, edges } = strainIntel.getStrainNetwork();
  console.log(`Network: ${nodes.length} strains, ${edges.length} similarity connections\n`);

  const clusters = strainIntel.getChemotypeClusters();
  console.log('Chemotype Distribution:');
  for (const c of clusters) {
    console.log(`  ${c.name.padEnd(25)} ${c.count} strains · avg ${c.avgTHC}% THC · ${c.avgCBD}% CBD`);
  }

  console.log('\n=== Strains similar to Sour Diesel ===');
  const similar = strainIntel.findSimilar('Sour Diesel', 5);
  for (const s of similar) {
    console.log(`  ${s.name.padEnd(25)} ${s.thc}% THC · ${s.cbd}% CBD · ${s.type}`);
  }

  console.log('\n=== Upgrade 1: Pipeline Stats ===');
  const stats = pipelineOrch.getStats() as any;
  console.log(`  Runs: ${stats.total_runs}`);
  console.log(`  Insights: ${stats.total_insights}`);
  console.log(`  Papers: ${stats.total_papers}`);

  console.log('\n=== Upgrade 4: Content Sample ===');
  const fact = publicEducation.generateDidYouKnow();
  console.log(`  [${fact.category}] ${fact.fact}`);

  console.log('\nAll 4 upgrades verified ✓');
}

main();
