import { publicEducation } from '../src/services/public-education.service.ts';
import { chartDataService } from '../src/services/chart-data.service.ts';

async function main() {
  // ============================================================
  // 1. LAYMAN ARTICLE DEMO
  // ============================================================
  console.log('================================================================================');
  console.log('  1. LAYMAN-FRIENDLY STRAIN ARTICLE');
  console.log('================================================================================\n');

  const article = publicEducation.generateStrainArticle('Sour Diesel');
  if (article) {
    console.log('Title: ' + article.title);
    console.log('Subtitle: ' + article.subtitle + '\n');
    console.log('Summary: ' + article.summary + '\n');
    for (const s of article.sections) {
      console.log('## ' + s.heading);
      console.log(s.body + '\n');
      if (s.funFact) console.log('*** ' + s.funFact + ' ***\n');
    }
    console.log('Key Takeaways:');
    article.keyTakeaways.forEach(t => console.log('  - ' + t));
    console.log('Reading time: ~' + article.readingTimeMinutes + ' minutes\n');
  }

  // ============================================================
  // 2. SOCIAL MEDIA THREAD DEMO
  // ============================================================
  console.log('================================================================================');
  console.log('  2. SOCIAL MEDIA THREAD');
  console.log('================================================================================\n');

  const thread = publicEducation.generateSocialThread('strain_spotlight');
  thread.posts.forEach((p, i) => {
    console.log(`Post ${i + 1}/${thread.posts.length}:`);
    console.log(p.text);
    if (p.hashtags) console.log('  Hashtags: ' + p.hashtags.join(' '));
    console.log();
  });

  // ============================================================
  // 3. DID YOU KNOW DEMO
  // ============================================================
  console.log('================================================================================');
  console.log('  3. DID YOU KNOW? (Random Educational Facts)');
  console.log('================================================================================\n');

  for (let i = 0; i < 3; i++) {
    const fact = publicEducation.generateDidYouKnow();
    console.log(`🎓 [${fact.category}] ${fact.fact}`);
    console.log(`   Source: ${fact.source}\n`);
  }

  // ============================================================
  // 4. INFOGRAPHIC DATA DEMO
  // ============================================================
  console.log('================================================================================');
  console.log('  4. INFOGRAPHIC-READY DATA');
  console.log('================================================================================\n');

  const info = publicEducation.generateInfographic();
  console.log(info.headline + '\n');
  console.log('Stats:');
  info.stats.forEach(s => console.log(`  ${s.icon || '•'} ${s.label}: ${s.value}`));
  console.log('\nComparisons:');
  info.comparisons.forEach(c => console.log(`  ${c.label}: ${c.left}  vs  ${c.right}`));

  // ============================================================
  // 5. CHART DATA SAMPLES
  // ============================================================
  console.log('\n================================================================================');
  console.log('  5. CHART DATA SAMPLES');
  console.log('================================================================================\n');

  const charts = chartDataService.getDashboardCharts();
  for (const [key, chart] of Object.entries(charts)) {
    console.log(`${key}: ${chart.title}`);
    console.log(`  Type: ${chart.type}, Labels: ${chart.labels.length}, Data points: ${chart.datasets[0].data.length}`);
    console.log(`  Sample: ${chart.labels.slice(0, 3).join(', ')}...`);
    console.log(`  Values: ${chart.datasets[0].data.slice(0, 3).join(', ')}...`);
    console.log();
  }

  // ============================================================
  // 6. SUMMARY
  // ============================================================
  console.log('================================================================================');
  console.log('  SYSTEM SUMMARY');
  console.log('================================================================================\n');
  console.log('What was built:');
  console.log('  1. Public Education Service');
  console.log('     - Layman strain articles (plain English, no jargon)');
  console.log('     - Social media threads (Twitter/X ready)');
  console.log('     - Did You Know educational fact generator');
  console.log('     - Infographic data packs');
  console.log('  2. Chart Data Service');
  console.log('     - 8 visualization-ready chart datasets');
  console.log('     - THC distribution histograms');
  console.log('     - Strain type pie charts');
  console.log('     - Market price trend lines');
  console.log('     - State price comparison bars');
  console.log('     - Legal status vs price analysis');
  console.log('     - Research papers timeline');
  console.log('     - Strain effects frequency bars');
  console.log('     - Cannabinoid profile radar charts');
  console.log('  3. REST API Endpoints');
  console.log('     - 12 chart data endpoints');
  console.log('     - 4 education content endpoints');
  console.log('\nAll accessible via: /api/integration/charts/* and /api/integration/education/*');
}

main().catch(console.error);
