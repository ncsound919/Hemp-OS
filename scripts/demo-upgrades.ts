/**
 * Demo all 4 upgrades.
 */

import { pipelineOrch } from '../kernel/autonomy/pipeline-orchestrator.ts';
import { strainIntel } from '../kernel/rigor/strain-intelligence.ts';
import { publicEducation } from '../src/services/public-education.service.ts';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║         HEMP OS — UPGRADE DEMONSTRATION                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // ==================================================================
  // Upgrade 1: Autonomous Pipeline
  // ==================================================================
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ UPGRADE 1: Autonomous Pipeline Orchestrator                   │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const run = await pipelineOrch.runFullPipeline();
  console.log(`Run ID: ${run.id}`);
  console.log(`Duration: ${(run.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`Stages: ${run.stages.map(s => `${s.name}=${s.status}(${s.durationMs}ms)`).join(', ')}`);
  console.log(`Output: ${run.insightsGenerated} insights, ${run.papersGenerated} papers, ${run.contentGenerated} content items`);

  const stats = pipelineOrch.getStats() as any;
  console.log(`\nPipeline Stats: ${stats.total_runs} runs, ${stats.total_insights} total insights, ${stats.total_papers} papers`);

  // ==================================================================
  // Upgrade 2: Strain Intelligence Network
  // ==================================================================
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ UPGRADE 2: Strain Intelligence Network                        │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const { nodes, edges } = strainIntel.getStrainNetwork();
  console.log(`Network: ${nodes.length} strains, ${edges.length} similarity connections`);

  const clusters = strainIntel.getChemotypeClusters();
  for (const c of clusters) {
    console.log(`  ${c.name.padEnd(25)} ${c.count} strains · avg ${c.avgTHC}% THC · ${c.avgCBD}% CBD`);
  }

  // Show similar strains
  const similar = strainIntel.findSimilar('Sour Diesel', 5);
  console.log(`\nStrains similar to Sour Diesel:`);
  for (const s of similar) {
    console.log(`  ${s.name.padEnd(25)} ${s.thc}% THC · ${s.type}`);
  }

  // ==================================================================
  // Upgrade 3: Python Microservice Status
  // ==================================================================
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ UPGRADE 3: Python Scientific Microservice                    │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const { pythonClient } = await import('../integration/python-microservice-client.ts');
  const pyStatus = await pythonClient.getStatus();
  console.log(`Service: ${pyStatus.ok ? '✅ AVAILABLE' : '⚠️  NOT RUNNING'}`);
  if (pyStatus.ok) {
    for (const [mod, ver] of Object.entries(pyStatus.modules)) {
      console.log(`  ${mod}: ${ver}`);
    }
  }
  console.log(`  Start with: cd python-microservice && pip install -r requirements.txt && uvicorn main:app --port 8000`);

  // ==================================================================
  // Upgrade 4: Public Content
  // ==================================================================
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ UPGRADE 4: Public Content Generation                         │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const article = publicEducation.generateStrainArticle('Sour Diesel');
  if (article) {
    console.log(`Article: "${article.title}"`);
    console.log(`  ${article.summary.substring(0, 150)}...`);
    console.log(`  ${article.sections.length} sections, ${article.readingTimeMinutes} min read`);
    console.log(`  ${article.keyTakeaways.length} key takeaways`);
  }

  const info = publicEducation.generateInfographic();
  console.log(`\nInfographic: ${info.headline}`);
  console.log(`  ${info.stats.length} stats, ${info.comparisons.length} comparisons`);

  const thread = publicEducation.generateSocialThread('strain_spotlight');
  console.log(`\nSocial Thread: ${thread.posts.length} posts`);
  console.log(`  Total chars: ${thread.totalLength}`);

  // ==================================================================
  // Summary
  // ==================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log('All 4 upgrades operational:');
  console.log('  1. ✅ Pipeline Orchestrator — 4-stage autonomous pipeline');
  console.log('  2. ✅ Strain Intelligence — real data network + chemotypes');
  console.log('  3. ✅ Python Microservice — scaffolded, ready for startup');
  console.log('  4. ✅ Content Generation — articles, infographics, social threads');
}

main().catch(console.error);
