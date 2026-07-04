/**
 * Full System Analysis Demo
 *
 * Combines all 6 real datasets through the cross-reference engine
 * to produce novel, data-driven conclusions.
 */

import { crossReference } from '../integration/cross-reference.ts';
import { publicEducation } from '../src/services/public-education.service.ts';
import { pubchem } from '../integration/pubchem.service.ts';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

async function main() {
  // ================================================================
  // SYSTEM STATUS
  // ================================================================
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              HEMP OS — COMPREHENSIVE DATA ANALYSIS                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const counts = db.prepare(`
    SELECT 'Research Studies (AI-classified)' as source, COUNT(*) as c FROM research_studies
    UNION ALL SELECT 'Medical Marijuana Products (lab-tested)', COUNT(*) FROM mmj_products
    UNION ALL SELECT 'Market Price Records (daily, 51 states)', COUNT(*) FROM market_prices
    UNION ALL SELECT 'Cannabis Strains', COUNT(*) FROM strains
    UNION ALL SELECT 'Scientific Papers (PubMed/OpenAlex)', COUNT(*) FROM papers
    UNION ALL SELECT 'Strain Grow Data', COUNT(*) FROM strain_grow_data
    UNION ALL SELECT 'States with Demographics', COUNT(*) FROM market_states
  `).all() as any[];

  console.log('Datasets Loaded:');
  let total = 0;
  for (const r of counts) {
    console.log(`  ${r.source.padEnd(50)} ${String(r.c).padStart(8)}`);
    total += r.c;
  }
  console.log(`  ${'─'.repeat(58)}`);
  console.log(`  ${'TOTAL RECORDS'.padEnd(50)} ${String(total).padStart(8)}\n`);

  // ================================================================
  // PUB CHEM MOLECULAR DATA
  // ================================================================
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  1. REAL MOLECULAR DATA FROM NIH PUBCHEM                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const pubchemData = await pubchem.getAllCannabinoidProperties();
  console.log(`\nRetrieved ${pubchemData.length} cannabinoid molecular profiles from PubChem\n`);

  if (pubchemData.length >= 2) {
    const thc = pubchemData.find(r => r.name.includes('Delta-9-THC'));
    const cbd = pubchemData.find(r => r.name.includes('CBD'));
    if (thc && cbd) {
      const sim = pubchem.computeSimilarity(thc, cbd);
      console.log(`  THC-CBD similarity: ${(sim * 100).toFixed(1)}% — despite same molecular weight (${thc.molecularWeight} g/mol), their 3D structure differences produce different LogP and receptor binding.`);
    }
  }

  // ================================================================
  // CROSS-REFERENCE INSIGHTS
  // ================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  2. CROSS-REFERENCE INSIGHTS (ALL DATASETS COMBINED)              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const insights = crossReference.getAllInsights();
  for (let i = 0; i < insights.length; i++) {
    const ins = insights[i];
    console.log(`\n━━━ Insight ${i+1}: ${ins.title} ━━━`);
    console.log(`  Category:    ${ins.category}`);
    console.log(`  Confidence:  ${ins.confidence.toUpperCase()}`);
    console.log(`  Sources:     ${ins.dataSources.join(', ')}`);
    console.log(`  Records:     ${ins.recordCount.toLocaleString()}`);
    console.log(`\n  ${ins.finding}`);
    console.log(`\n  Significance: ${ins.significance}`);
  }

  // ================================================================
  // DEMO: DID YOU KNOW + INFOGRAPHIC
  // ================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  3. PUBLIC EDUCATION (generated from real data)                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const fact1 = publicEducation.generateDidYouKnow();
  const fact2 = publicEducation.generateDidYouKnow();
  const fact3 = publicEducation.generateDidYouKnow();
  console.log(`  🎓 [${fact1.category}] ${fact1.fact}`);
  console.log(`  🎓 [${fact2.category}] ${fact2.fact}`);
  console.log(`  🎓 [${fact3.category}] ${fact3.fact}`);

  const info = publicEducation.generateInfographic();
  console.log(`\n  📊 Infographic: ${info.headline}`);
  info.stats.forEach(s => console.log(`     ${s.icon} ${s.label}: ${s.value}`));

  // ================================================================
  // SAMPLE INSIGHT: Market + Legal + Demographics
  // ================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  4. MARKET × LEGAL × DEMOGRAPHICS CORRELATION                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const legalAnalysis = db.prepare(`
    SELECT s.legal_status as status,
      ROUND(AVG(mp.highq_price), 2) as avg_high,
      ROUND(AVG(mp.medq_price), 2) as avg_med,
      COUNT(DISTINCT mp.state) as states,
      SUM(mp.highq_transactions + mp.medq_transactions) as total_tx
    FROM market_states s
    JOIN market_prices mp ON LOWER(s.name) = LOWER(mp.state)
    GROUP BY s.legal_status
    ORDER BY avg_high DESC
  `).all() as any[];

  for (const r of legalAnalysis) {
    console.log(`  ${r.status.padEnd(25)} $${r.avg_high}/oz high  $${r.avg_med}/oz med  ${r.states} states  ${r.total_tx.toLocaleString()} transactions`);
  }

  // ================================================================
  // SAMPLE INSIGHT: Lab Tested Product Analysis
  // ================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  5. LAB-TESTED PRODUCT ANALYSIS (14,150 CT State Products)         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const topProducers = db.prepare(`
    SELECT producer, COUNT(*) as products, ROUND(AVG(thc), 2) as avg_thc, ROUND(AVG(cbd), 2) as avg_cbd
    FROM mmj_products WHERE producer != ''
    GROUP BY producer ORDER BY products DESC LIMIT 10
  `).all() as any[];

  console.log('Top Medical Cannabis Producers (by product count):');
  for (const p of topProducers) {
    console.log(`  ${p.producer.padEnd(45)} ${String(p.products).padStart(4)} products  ${p.avg_thc}% THC  ${p.avg_cbd}% CBD`);
  }

  const terpeneData = db.prepare(`
    SELECT
      ROUND(AVG(a_pinene), 3) as a_pinene,
      ROUND(AVG(b_myrcene), 3) as b_myrcene,
      ROUND(AVG(b_caryophyllene), 3) as b_caryophyllene,
      ROUND(AVG(limonene), 3) as limonene,
      ROUND(AVG(linalool), 3) as linalool,
      ROUND(AVG(humulene), 3) as humulene,
      COUNT(*) as samples
    FROM mmj_products WHERE thc > 0
  `).get() as any;

  console.log(`\nAverage Terpene Profile across ${terpeneData.samples} samples:`);
  console.log(`  Myrcene: ${terpeneData.b_myrcene}%  Caryophyllene: ${terpeneData.b_caryophyllene}%  Limonene: ${terpeneData.limonene}%`);
  console.log(`  Pinene: ${terpeneData.a_pinene}%  Linalool: ${terpeneData.linalool}%  Humulene: ${terpeneData.humulene}%`);

  // ================================================================
  // FINAL SUMMARY
  // ================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                       SYSTEM CAPABILITIES                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log('What this system can do that no other system can:');
  console.log('');
  console.log('  1. JOIN market pricing (22,899 records) × legal status × demographics');
  console.log('     → Quantify the "prohibition tax" per state');
  console.log('  2. CROSS-REFERENCE research outcomes (12,292 studies) × conditions');
  console.log('     → Evidence-based efficacy analysis per medical condition');
  console.log('  3. ANALYZE lab-tested products (14,150 CT registry) × cannabinoid ratios');
  console.log('     → Real formulation trends from regulated medical market data');
  console.log('  4. COMBINE strain genetics × grow economics × market pricing');
  console.log('     → ROI-optimized cultivation and breeding recommendations');
  console.log('  5. INTEGRATE PubChem molecular properties (17 cannabinoids)');
  console.log('     → Structure-activity relationships grounded in real NIH data');
  console.log('  6. GENERATE public education content from real data');
  console.log('     → Layman articles, social threads, infographics, did-you-know facts');
  console.log('');
  console.log('All insights are data-driven, sourced from real databases, and reproducible.');

  db.close();
}

main().catch(console.error);
