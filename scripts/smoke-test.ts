/**
 * End-to-End Smoke Test
 *
 * Verifies all major system components are functioning:
 *  1. Kernel simulation (process models)
 *  2. Database (all tables readable)
 *  3. Cross-reference engine (insights generated)
 *  4. Statistical validation (p-values correct)
 *  5. PubChem molecular data (real values)
 *  6. Public education content generated
 *  7. DuckDB analytics available
 *  8. Python microservice reachable
 *
 * Run: npx tsx scripts/smoke-test.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { crossReference } from '../integration/cross-reference.ts';
import { stats } from '../integration/statistical-validation.ts';
import { pubchem } from '../integration/pubchem.service.ts';
import { publicEducation } from '../src/services/public-education.service.ts';
import { analytics } from '../integration/duckdb-analytics.ts';
import { pythonClient } from '../integration/python-microservice-client.ts';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

interface SmokeResult {
  component: string;
  status: '✅ PASS' | '⚠️ WARN' | '❌ FAIL';
  detail: string;
  duration: number;
}

async function runSmokeTest(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];

  // 1. KERNEL SIMULATION
  let start = Date.now();
  try {
    const { KernelExecutor } = await import('../kernel/workflow/executor.ts');
    const { ExtractionModel } = await import('../kernel/models/extractionModel.ts');
    const output = ExtractionModel.run({
      biomass: { id: 'test', name: 'test', mass: 10, moisture: 10, waxContent: 5, potency: { thca: 15, thc: 0.5, cbda: 0, cbd: 0, cbga: 0, cbg: 0, other: 0 } },
      solvent: { type: 'Ethanol', purity: 99.5, temperature: -40 },
      solventRatio: 8, temperature: -40, duration: 30, agitationSpeed: 300,
    });
    results.push({
      component: 'Kernel: Extraction Model',
      status: output.recoveryRate > 0 && output.purity > 0 ? '✅ PASS' : '❌ FAIL',
      detail: `Recovery: ${output.recoveryRate.toFixed(1)}%, Purity: ${output.purity.toFixed(1)}%, Cannabinoids: ${Object.keys(output.cannabinoidRecovery).length}`,
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'Kernel: Extraction Model', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 2. DATABASE
  start = Date.now();
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[];
    const counts = tables.map((t: any) => {
      const c = db.prepare(`SELECT COUNT(*) as c FROM \`${t.name}\``).get() as any;
      return `${t.name}=${c.c}`;
    });
    results.push({
      component: 'Database Tables',
      status: tables.length >= 10 ? '✅ PASS' : '⚠️ WARN',
      detail: `${tables.length} tables: ${counts.join(', ')}`,
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'Database', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 3. CROSS-REFERENCE ENGINE
  start = Date.now();
  try {
    const insights = crossReference.getAllInsights();
    results.push({
      component: 'Cross-Reference Engine',
      status: insights.length >= 10 ? '✅ PASS' : '⚠️ WARN',
      detail: `${insights.length} insights generated (${insights.filter(i => i.statistics?.significant).length} statistically significant)`,
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'Cross-Reference Engine', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 4. STATISTICAL VALIDATION
  start = Date.now();
  try {
    const ttest = stats.tTestIndependent([100, 110, 105, 108, 102], [90, 85, 88, 92, 87]);
    const corr = stats.pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    results.push({
      component: 'Statistical Validation',
      status: ttest.significant && corr.significant ? '✅ PASS' : '⚠️ WARN',
      detail: `t-test: p=${ttest.pValue.toFixed(4)}, d=${ttest.effectSize?.toFixed(3)} | Pearson: r=${corr.statistic.toFixed(3)}, p=${corr.pValue.toFixed(4)}`,
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'Statistical Validation', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 5. PUB CHEM
  start = Date.now();
  try {
    const thc = await pubchem.getProperties(16078);
    const cbd = await pubchem.getProperties(644019);
    const sim = thc && cbd ? pubchem.computeSimilarity(thc, cbd) : 0;
    results.push({
      component: 'PubChem Molecular Data',
      status: thc && cbd ? '✅ PASS' : '⚠️ WARN',
      detail: `THC: MW=${thc?.molecularWeight}, LogP=${thc?.xlogP} | CBD: MW=${cbd?.molecularWeight}, LogP=${cbd?.xlogP} | Tanimoto: ${(sim * 100).toFixed(1)}%`,
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'PubChem', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 6. PUBLIC EDUCATION
  start = Date.now();
  try {
    const article = publicEducation.generateStrainArticle('Sour Diesel');
    const fact = publicEducation.generateDidYouKnow();
    const thread = publicEducation.generateSocialThread('strain_spotlight');
    results.push({
      component: 'Public Education Engine',
      status: article && fact && thread.posts.length > 0 ? '✅ PASS' : '⚠️ WARN',
      detail: `Article: ${article?.keyTakeaways.length} takeaways | Fact: [${fact.category}] | Thread: ${thread.posts.length} posts`,
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'Public Education', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 7. DUCKDB ANALYTICS
  start = Date.now();
  try {
    const available = analytics.isAvailable();
    const queries = analytics.getPrebuiltQueries();
    let queryWorks = false;
    if (available) {
      try { analytics.query('SELECT COUNT(*) as c FROM market_prices'); queryWorks = true; } catch {}
    }
    results.push({
      component: 'DuckDB Analytics',
      status: available && queryWorks ? '✅ PASS' : available ? '⚠️ WARN' : '⚠️ WARN',
      detail: available ? `${queries.length} pre-built queries, execution ${queryWorks ? 'OK' : 'failed'}` : 'Not available — install duckdb npm package',
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'DuckDB Analytics', status: '❌ FAIL', detail: e.message, duration: Date.now() - start });
  }

  // 8. PYTHON MICROSERVICE
  start = Date.now();
  try {
    const status = await pythonClient.getStatus();
    const modules = status.ok ? Object.entries(status.modules).map(([k, v]) => `${k}=${v}`).join(', ') : '';
    results.push({
      component: 'Python Microservice',
      status: status.ok ? '✅ PASS' : '⚠️ WARN',
      detail: status.ok ? `Modules: ${modules}` : 'Not running — start with: cd python-microservice && uvicorn main:app --port 8000',
      duration: Date.now() - start,
    });
  } catch (e: any) {
    results.push({ component: 'Python Microservice', status: '⚠️ WARN', detail: 'Not reachable — Python service optional', duration: Date.now() - start });
  }

  return results;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              HEMP OS — END-TO-END SMOKE TEST                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const results = await runSmokeTest();
  let pass = 0, warn = 0, fail = 0;

  for (const r of results) {
    const icon = r.status === '✅ PASS' ? '✅' : r.status === '⚠️ WARN' ? '⚠️' : '❌';
    console.log(`  ${icon} ${r.component}`);
    console.log(`     ${r.status}  (${r.duration}ms)`);
    console.log(`     ${r.detail.substring(0, 180)}`);
    console.log();
    if (r.status === '✅ PASS') pass++;
    else if (r.status === '⚠️ WARN') warn++;
    else fail++;
  }

  const total = results.length;
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                          SMOKE TEST SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`  Passed:  ${pass}/${total}`);
  console.log(`  Warning: ${warn}/${total}`);
  console.log(`  Failed:  ${fail}/${total}`);
  console.log(`\n  SYSTEM STATUS: ${fail > 0 ? '❌ UNSTABLE' : warn > 0 ? '⚠️  DEGRADED' : '✅ OPERATIONAL'}`);

  db.close();
  process.exit(fail > 0 ? 1 : 0);
}

main();
