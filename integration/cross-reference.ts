/**
 * Cross-Reference Analysis Engine
 *
 * Joins data across all real datasets to produce novel, data-driven conclusions:
 *  - Market pricing × legal status × demographics (22,899 records)
 *  - Research study outcomes × conditions (12,292 classified studies)
 *  - Lab-tested product chemistry × brand data (14,150 CT state products)
 *  - Strain genetics × grow characteristics × cannabinoid profiles
 *  - PubChem molecular properties for structure-activity correlation
 */

import Database from 'better-sqlite3';
import path from 'path';
import { stats, StatisticalResult } from './statistical-validation.ts';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

export interface CrossReferenceInsight {
  id: string;
  category: string;
  title: string;
  finding: string;
  confidence: 'high' | 'medium' | 'low';
  dataSources: string[];
  recordCount: number;
  significance: string;
  statistics?: StatisticalResult;
}

export class CrossReferenceEngine {
  /**
   * 1. Market × Legal Status × Demographics
   * Uses: market_prices (22,899), market_states, state_demographics
   */
  analyzeMarketVsLegalStatus(): CrossReferenceInsight {
    const data = db.prepare(`
      SELECT s.legal_status as status,
        ROUND(AVG(mp.highq_price), 2) as avg_price,
        ROUND(AVG(mp.highq_price) - AVG(mp.medq_price), 2) as premium_spread,
        COUNT(DISTINCT mp.state) as states,
        SUM(mp.highq_transactions + mp.medq_transactions) as total_tx
      FROM market_states s
      JOIN market_prices mp ON LOWER(s.name) = LOWER(mp.state)
      GROUP BY s.legal_status
      ORDER BY avg_price DESC
    `).all() as any[];

    const legal = data.find(d => d.status === 'legal');
    const illegal = data.find(d => d.status === 'illegal');
    const premiumDiff = legal && illegal ? (illegal.avg_price - legal.avg_price).toFixed(2) : 'N/A';

    // Statistical test: compare legal vs illegal state prices
    let ttestResult: StatisticalResult | undefined;
    if (legal && illegal) {
      const legalPrices = db.prepare(`
        SELECT mp.highq_price as price FROM market_prices mp
        JOIN market_states s ON LOWER(s.name) = LOWER(mp.state)
        WHERE s.legal_status = 'legal' AND mp.highq_price IS NOT NULL
      `).all() as any[];
      const illegalPrices = db.prepare(`
        SELECT mp.highq_price as price FROM market_prices mp
        JOIN market_states s ON LOWER(s.name) = LOWER(mp.state)
        WHERE s.legal_status = 'illegal' AND mp.highq_price IS NOT NULL
      `).all() as any[];

      if (legalPrices.length > 1 && illegalPrices.length > 1) {
        ttestResult = stats.tTestIndependent(
          legalPrices.map((r: any) => r.price),
          illegalPrices.map((r: any) => r.price),
        );
      }
    }

    return {
      id: 'market-legal-001',
      category: 'Market Economics',
      title: 'Prohibition Tax: How Legal Status Affects Pricing',
      finding: `In fully illegal states, high-quality cannabis averages $${illegal?.avg_price || '?'}/oz — a $${premiumDiff} premium over legal states. The "prohibition tax" represents the risk premium embedded in black market pricing. ${ttestResult ? `Statistical test: ${ttestResult.interpretation}.` : ''} Meanwhile, legal states see ${(legal?.total_tx || 0).toLocaleString()} transactions vs ${(illegal?.total_tx || 0).toLocaleString()} in illegal states, reflecting market transparency.`,
      confidence: ttestResult?.significant ? 'high' : 'medium',
      dataSources: ['priceofweed.com (22,899 records)', 'State legal status database (51 states)'],
      recordCount: 22899,
      significance: 'Directly quantifies the economic impact of cannabis prohibition at state level.',
      statistics: ttestResult,
    };
  }

  /**
   * 2. Research outcomes by condition
   * Uses: research_studies (12,292 classified studies)
   */
  analyzeResearchOutcomes(): CrossReferenceInsight[] {
    const byCondition = db.prepare(`
      SELECT TRIM(value) as condition, result_no_finetune as result, COUNT(*) as c
      FROM research_studies, json_each('["' || REPLACE(study_conditions, ';', '","') || '"]')
      WHERE study_conditions != '' AND result_no_finetune IN ('Positive', 'Negative', 'Inconclusive')
      GROUP BY condition, result
      ORDER BY c DESC
    `).all() as any[];

    // Aggregate to find conditions with strongest evidence
    const conditions = new Map<string, { positive: number; negative: number; inconclusive: number; total: number }>();
    for (const r of byCondition) {
      if (!r.condition || r.condition.length < 3) {continue;}
      const c = conditions.get(r.condition) || { positive: 0, negative: 0, inconclusive: 0, total: 0 };
      if (r.result === 'Positive') {c.positive += r.c;}
      else if (r.result === 'Negative') {c.negative += r.c;}
      else if (r.result === 'Inconclusive') {c.inconclusive += r.c;}
      c.total += r.c;
      conditions.set(r.condition, c);
    }

    const insights: CrossReferenceInsight[] = [];
    let count = 0;
    for (const [condition, data] of conditions) {
      if (data.total < 5) {continue;} // minimum sample size
      count++;
      if (count > 10) {break;}

      const positivityRate = ((data.positive / data.total) * 100).toFixed(1);
      const evidenceLevel = parseFloat(positivityRate) >= 70 ? 'strong' : parseFloat(positivityRate) >= 50 ? 'moderate' : 'limited';

      insights.push({
        id: `research-${condition.toLowerCase().replace(/[^a-z]/g, '-').substring(0, 30)}`,
        category: 'Clinical Evidence',
        title: `Cannabis for ${condition}: Evidence Review`,
        finding: `Across ${data.total} studies, ${data.positive} (${positivityRate}%) reported Positive outcomes for ${condition}, ${data.negative} Negative, and ${data.inconclusive} Inconclusive. This represents **${evidenceLevel} evidence** for cannabis efficacy in treating ${condition}.`,
        confidence: data.total >= 50 ? 'high' : data.total >= 20 ? 'medium' : 'low',
        dataSources: ['AI-classified research studies database (12,292 records)'],
        recordCount: data.total,
        significance: `${condition} is one of the most studied conditions in the cannabis literature with ${data.total} classified studies.`,
      });
    }
    return insights;
  }

  /**
   * 3. Cannabinoid ratio patterns from lab-tested products
   * Uses: mmj_products (14,150 lab-tested CT state products)
   */
  analyzeMMJProfiles(): CrossReferenceInsight[] {
    const insights: CrossReferenceInsight[] = [];

    // THC:CBD ratio distribution
    const ratios = db.prepare(`
      SELECT
        CASE
          WHEN cbd > 0 AND thc / cbd < 0.5 THEN 'CBD-dominant'
          WHEN cbd > 0 AND thc / cbd BETWEEN 0.5 AND 2 THEN 'Balanced (1:1)'
          WHEN thc > 0 AND thc / cbd > 2 THEN 'THC-dominant'
          ELSE 'THC-only'
        END as category,
        COUNT(*) as c,
        ROUND(AVG(thc), 2) as avg_thc,
        ROUND(AVG(cbd), 2) as avg_cbd
      FROM mmj_products
      GROUP BY category
      ORDER BY c DESC
    `).all() as any[];

    insights.push({
      id: 'mmj-ratios-001',
      category: 'Product Chemistry',
      title: 'Medical Market Cannabinoid Ratio Distribution',
      finding: `Of ${ratios.reduce((s: number, r: any) => s + r.c, 0)} lab-tested medical products, the cannabinoid ratio breakdown is: ${ratios.map((r: any) => `${r.category}: ${r.c} products (avg ${r.avg_thc}% THC, ${r.avg_cbd}% CBD)`).join('; ')}. This reveals what ratio profiles the medical market actually demands.`,
      confidence: 'high',
      dataSources: ['Connecticut Medical Marijuana Program lab tests (14,150 products)'],
      recordCount: ratios.reduce((s: number, r: any) => s + r.c, 0),
      significance: 'Shows real-world medical cannabis product formulation trends from state-regulated lab data.',
    });

    // Formulation preferences
    const forms = db.prepare(`
      SELECT dosage_form, COUNT(*) as c, ROUND(AVG(thc), 2) as avg_thc, ROUND(AVG(cbd), 2) as avg_cbd
      FROM mmj_products WHERE dosage_form != ''
      GROUP BY dosage_form ORDER BY c DESC LIMIT 10
    `).all() as any[];

    insights.push({
      id: 'mmj-forms-001',
      category: 'Product Chemistry',
      title: 'Medical Cannabis Formulation Preferences',
      finding: `The most common product forms are: ${forms.map((f: any) => `${f.dosage_form} (${f.c} products, ${f.avg_thc}% THC, ${f.avg_cbd}% CBD)`).join('; ')}. This reveals how patients actually consume medical cannabis.`,
      confidence: 'high',
      dataSources: ['Connecticut Medical Marijuana Program (14,150 products)'],
      recordCount: forms.reduce((s: number, f: any) => s + f.c, 0),
      significance: 'Guides product development and formulation strategy based on real market data.',
    });

    return insights;
  }

  /**
   * 4. Cross-reference: Strain characteristics vs grow properties
   * Uses: strains (466) + strain_grow_data (70) + market_prices
   */
  analyzeStrainEconomics(): CrossReferenceInsight[] {
    const insights: CrossReferenceInsight[] = [];

    // THC vs yield
    const growCorr = db.prepare(`
      SELECT g.strain, g.thc, g.indoor_yield_max, g.flowering_weeks_max,
             g.difficulty, g.good_effects
      FROM strain_grow_data g
      WHERE g.thc > 0 AND g.indoor_yield_max > 0
      ORDER BY g.thc DESC
    `).all() as any[];

    if (growCorr.length > 0) {
      const avgYield = growCorr.reduce((s, r: any) => s + r.indoor_yield_max, 0) / growCorr.length;
      const highTHC = growCorr.filter((r: any) => r.thc > 18);
      const highTHCYield = highTHC.length > 0 ? highTHC.reduce((s: any, r: any) => s + r.indoor_yield_max, 0) / highTHC.length : 0;

      const thcYieldDelta = ((highTHCYield - avgYield) / avgYield * 100).toFixed(1);

      insights.push({
        id: 'grow-econ-001',
        category: 'Cultivation Economics',
        title: 'Potency vs Yield: The Trade-off',
        finding: `Average indoor yield across all strains: ${avgYield.toFixed(0)}g. High-THC strains (>18%): ${highTHCYield.toFixed(0)}g (${thcYieldDelta}% vs average). This quantifies the real trade-off between potency and productivity in cannabis cultivation.`,
        confidence: 'medium',
        dataSources: ['weed_strain.csv grow data (70 strains)', 'Hemp OS strain database (466 strains)'],
        recordCount: growCorr.length,
        significance: 'Critical data for cultivation planning and breeding program ROI analysis.',
      });
    }

    return insights;
  }

  /**
   * 5. Time-series: Market price trends by legal status transition
   */
  analyzeMarketTrends(): CrossReferenceInsight {
    const trends = db.prepare(`
      SELECT year, month,
        ROUND(AVG(CASE WHEN s.legal_status = 'legal' THEN mp.highq_price END), 2) as legal_price,
        ROUND(AVG(CASE WHEN s.legal_status = 'illegal' THEN mp.highq_price END), 2) as illegal_price,
        ROUND(AVG(CASE WHEN s.legal_status = 'medical' THEN mp.highq_price END), 2) as medical_price
      FROM market_prices mp
      JOIN market_states s ON LOWER(s.name) = LOWER(mp.state)
      WHERE mp.year >= 2014
      GROUP BY year, month
      ORDER BY year, month
    `).all() as any[];

    const start2014 = trends.find((t: any) => t.year === 2014 && t.month === 1);
    const end2015 = trends[trends.length - 1];

    return {
      id: 'market-trends-001',
      category: 'Market Economics',
      title: 'Price Convergence in Legal vs Illegal Markets (2014-2015)',
      finding: `In Jan 2014, legal states averaged $${start2014?.legal_price || '?'}/oz vs $${start2014?.illegal_price || '?'}/oz in illegal states (${start2014 && end2015 ? `a gap of $${(start2014.illegal_price - start2014.legal_price).toFixed(2)}` : '?'}). By mid-2015, the gap had ${end2015 && start2014 && end2015.illegal_price < start2014.illegal_price ? 'narrowed as illegal market prices declined' : 'shifted'}. This tracks the early price dynamics of cannabis legalization.`,
      confidence: 'high',
      dataSources: ['priceofweed.com daily pricing (2013-2015)', 'State legal status classifications'],
      recordCount: trends.length,
      significance: 'Historical baseline for measuring the economic impact of cannabis legalization over time.',
    };
  }

  /**
   * 6. Strain cannabinoid profile clustering
   * Uses: strain database to find natural groupings
   */
  analyzeStrainChemotypes(): CrossReferenceInsight {
    const strains = db.prepare(`
      SELECT canonical_name, type,
        CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc,
        CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) as cbd,
        CAST(json_extract(cannabinoids_json, '$.cbg') AS REAL) as cbg
      FROM strains
      WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0
      ORDER BY thc DESC
    `).all() as any[];

    const highTHC = strains.filter((s: any) => s.thc >= 20).length;
    const medTHC = strains.filter((s: any) => s.thc >= 10 && s.thc < 20).length;
    const lowTHC = strains.filter((s: any) => s.thc < 10 && s.thc > 0).length;
    const cbdRich = strains.filter((s: any) => s.cbd > 4).length;
    const cbgRich = strains.filter((s: any) => s.cbg > 1).length;
    const totalTyped = highTHC + medTHC + lowTHC;

    return {
      id: 'chemo-types-001',
      category: 'Chemical Profiling',
      title: 'Cannabinoid Chemotype Distribution in Modern Strains',
      finding: `Of ${totalTyped} strains with known cannabinoid profiles: ${highTHC} (${(highTHC/totalTyped*100).toFixed(1)}%) are high-THC (>20%), ${medTHC} (${(medTHC/totalTyped*100).toFixed(1)}%) are mid-range (10-20%), ${lowTHC} (${(lowTHC/totalTyped*100).toFixed(1)}%) are low-THC (<10%). Only ${cbdRich} strains are CBD-rich (>4%) and ${cbgRich} are CBG-rich (>1%). The market is overwhelmingly THC-dominant with limited chemotype diversity.`,
      confidence: 'high',
      dataSources: ['Hemp OS strain database (466 strains with cannabinoid data)'],
      recordCount: totalTyped,
      significance: 'Reveals the chemotype gap in the current cannabis market — opportunity for targeted breeding of alternative cannabinoid profiles.',
    };
  }

  /**
   * Run all analyses and return combined insights
   */
  getAllInsights(): CrossReferenceInsight[] {
    const insights: CrossReferenceInsight[] = [];
    insights.push(this.analyzeMarketVsLegalStatus());
    insights.push(this.analyzeMarketTrends());
    insights.push(this.analyzeStrainChemotypes());
    insights.push(...this.analyzeResearchOutcomes());
    insights.push(...this.analyzeMMJProfiles());
    insights.push(...this.analyzeStrainEconomics());
    return insights;
  }
}

export const crossReference = new CrossReferenceEngine();
