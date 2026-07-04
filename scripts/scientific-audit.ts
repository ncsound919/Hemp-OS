/**
 * Scientific Audit & Upgrade Planner
 *
 * Evaluates every data source and analysis module on:
 *  1. Source credibility (peer-reviewed? government? AI-generated?)
 *  2. Temporal relevance (how current is the data?)
 *  3. Sample size adequacy (statistical power)
 *  4. Methodology rigor (controlled experiment? observational? speculative?)
 *  5. Reproducibility (can findings be independently verified?)
 *  6. Bias assessment (known confounders)
 *
 * Then generates prioritized upgrade plan.
 */

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

interface ScientificGrade {
  source: string;
  records: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  credibility: number; // 0-100
  temporalRelevance: number; // 0-100
  sampleAdequacy: number; // 0-100
  methodologyRigor: number; // 0-100
  notes: string[];
  upgradePriority: 'critical' | 'high' | 'medium' | 'low';
  specificUpgrade: string;
}

export class ScientificAuditor {
  gradeAll(): ScientificGrade[] {
    return [
      this.gradePubChem(),
      this.gradeMMJRegistry(),
      this.gradeMarketPrices(),
      this.gradeResearchStudies(),
      this.gradePubMedPapers(),
      this.gradeStrainsAI(),
      this.gradeStrainGrowData(),
      this.gradeCrossReference(),
      this.gradePublicEducation(),
      this.gradeAutonomousInsights(),
    ];
  }

  private gradePubChem(): ScientificGrade {
    return {
      source: 'PubChem (NIH) — Cannabinoid Molecular Properties',
      records: 17,
      grade: 'A',
      credibility: 95,
      temporalRelevance: 100, // Chemical properties don't change
      sampleAdequacy: 85,    // Covers all major cannabinoids
      methodologyRigor: 98,  // NIH standard analytical chemistry
      notes: [
        'Gold-standard data from US federal agency (NIH/NCBI)',
        'Computed properties (LogP, MW) validated against experimental measurements',
        'All 17 major cannabinoids covered',
        'Does NOT include minor cannabinoids or metabolites',
        'Some properties are computed (XLogP) not measured experimentally',
      ],
      upgradePriority: 'low',
      specificUpgrade: 'Add PubChem bioassay data for CB1/CB2 receptor binding affinity to enable structure-activity relationship analysis',
    };
  }

  private gradeMMJRegistry(): ScientificGrade {
    const count = (db.prepare('SELECT COUNT(*) as c FROM mmj_products').get() as any).c;
    const producerCount = db.prepare("SELECT COUNT(DISTINCT producer) as c FROM mmj_products WHERE producer IS NOT NULL AND producer != ''").get() as any;
    const dateRange = db.prepare("SELECT MIN(approval_date) as min, MAX(approval_date) as max FROM mmj_products WHERE approval_date IS NOT NULL AND approval_date != ''").get() as any;

    return {
      source: 'Connecticut Medical Marijuana Program — Lab Test Registry',
      records: count,
      grade: 'A',
      credibility: 90,
      temporalRelevance: 60, // Data from 2021-2022 mostly
      sampleAdequacy: 95,    // 14K+ products, excellent sample
      methodologyRigor: 85,  // State-regulated lab testing
      notes: [
        `Official state regulatory data from CT Dept of Consumer Protection`,
        `${producerCount.c} licensed producers, third-party lab tested`,
        `Spans ${dateRange?.min || '?'} to ${dateRange?.max || '?'}`,
        'Only one state (CT) — limited generalizability nationally',
        'Terpene data completeness varies between products',
        'No product efficacy/outcome data — only chemical composition',
      ],
      upgradePriority: 'high',
      specificUpgrade: 'Integrate additional state registries (CA, CO, WA, OR, MA, NY, MI, IL, NV, AZ) as they publish open data — multiply sample size and geographic diversity',
    };
  }

  private gradeMarketPrices(): ScientificGrade {
    const count = (db.prepare('SELECT COUNT(*) as c FROM market_prices').get() as any).c;
    const latest = db.prepare('SELECT MAX(observation_date) as d FROM market_prices').get() as any;
    const earliest = db.prepare('SELECT MIN(observation_date) as d FROM market_prices').get() as any;
    const stateCount = db.prepare('SELECT COUNT(DISTINCT state) as c FROM market_prices').get() as any;

    return {
      source: 'PriceOfWeed.com — Crowdsourced US Market Pricing',
      records: count,
      grade: 'C',
      credibility: 55,
      temporalRelevance: 10, // 11 YEARS OUT OF DATE
      sampleAdequacy: 90,    // 22K records, good geographic spread
      methodologyRigor: 35,  // Self-reported crowdsourced data
      notes: [
        `CRITICAL: Latest data point is ${latest?.d || '?'} — over 11 years old`,
        `Data from ${earliest?.d || '?'} to ${latest?.d || '?'}`,
        `${stateCount.c} states covered`,
        'Self-reported prices (not verified transactions) — unknown accuracy',
        'Only three quality tiers (high/medium/low) — no strain-level pricing',
        'No data on legal market dynamics post-2015',
        'Crowdsourced = selection bias toward certain demographics',
      ],
      upgradePriority: 'critical',
      specificUpgrade: 'Integrate real-time pricing from Leafly API, Headset.io, BDSA, or state regulatory price reporting. Current data is historically interesting but scientifically unusable for current analysis.',
    };
  }

  private gradeResearchStudies(): ScientificGrade {
    const count = (db.prepare('SELECT COUNT(*) as c FROM research_studies').get() as any).c;
    const posCount = db.prepare("SELECT COUNT(*) as c FROM research_studies WHERE result_no_finetune = 'Positive'").get() as any;
    const negCount = db.prepare("SELECT COUNT(*) as c FROM research_studies WHERE result_no_finetune = 'Negative'").get() as any;
    const incCount = db.prepare("SELECT COUNT(*) as c FROM research_studies WHERE result_no_finetune = 'Inconclusive'").get() as any;
    const yearRange = db.prepare('SELECT MIN(study_year) as min, MAX(study_year) as max FROM research_studies WHERE study_year > 0').get() as any;

    return {
      source: 'AI-Classified Cannabis Research Studies',
      records: count,
      grade: 'C',
      credibility: 40,
      temporalRelevance: 90,  // Studies up to 2025
      sampleAdequacy: 90,     // 12K+ studies
      methodologyRigor: 30,   // AI classification, not human curation
      notes: [
        `Spans ${yearRange?.min || '?'} to ${yearRange?.max || '?'}`,
        `Classification breakdown: ${posCount.c} Positive, ${negCount.c} Negative, ${incCount.c} Inconclusive`,
        'CRITICAL WEAKNESS: AI classification accuracy is UNKNOWN — no validation against human expert curation',
        'No effect sizes, confidence intervals, or p-values in the classification',
        'No differentiation between study quality (RCT vs observational vs case report)',
        '"Positive" does not mean "clinically significant" — conflates statistical and clinical significance',
        'No meta-analysis weighting by sample size',
      ],
      upgradePriority: 'critical',
      specificUpgrade: 'Validate AI classification against a human-curated gold standard subset. Add effect size extraction and meta-analysis weighting. Differentiate study types (RCT, cohort, case-control, case series, review).',
    };
  }

  private gradePubMedPapers(): ScientificGrade {
    const count = (db.prepare('SELECT COUNT(*) as c FROM papers').get() as any).c;

    return {
      source: 'PubMed & OpenAlex — Peer-Reviewed Papers',
      records: count,
      grade: 'B',
      credibility: 85,
      temporalRelevance: 95,  // Recent papers
      sampleAdequacy: 35,    // Only 229 papers — small sample
      methodologyRigor: 90,  // Peer-reviewed academic publications
      notes: [
        'Real peer-reviewed papers from PubMed and OpenAlex',
        'High individual paper quality',
        'SMALL SAMPLE: Only 229 papers retrieved — need more comprehensive coverage',
        'No full-text indexing — only titles and abstracts',
        'No systematic search strategy — keyword-based retrieval introduces selection bias',
        'OpenAlex metadata quality varies',
      ],
      upgradePriority: 'high',
      specificUpgrade: 'Systematic literature search with PRISMA methodology. Expand to 5,000+ papers using broader query terms and snowball citation chasing. Add full-text PDF indexing for deeper analysis.',
    };
  }

  private gradeStrainsAI(): ScientificGrade {
    const count = (db.prepare('SELECT COUNT(*) as c FROM strains').get() as any).c;
    const withTHC = db.prepare(`SELECT COUNT(*) as c FROM strains WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0`).get() as any;

    return {
      source: 'Hemp OS Strain Database (AI-Generated via DeepSeek)',
      records: count,
      grade: 'D',
      credibility: 15,
      temporalRelevance: 50,  // Current but AI-generated
      sampleAdequacy: 70,     // 466 strains — decent coverage
      methodologyRigor: 10,   // AI-generated values, not lab-tested
      notes: [
        `${withTHC.c} strains have THC data`,
        'CRITICAL: ALL cannabinoid values are AI-GENERATED, not lab-tested',
        'DeepSeek was asked to provide "real" values but they are estimates from training data',
        'No provenance or quality score per data point',
        'Terpene data limited to 5 common terpenes, values are approximate',
        'Strain lineage data may contain inaccuracies',
        'Some AI hallucination detected (sequential "Skunk #" entries removed)',
        'Reasonable for educational/demonstration purposes only — NOT scientifically valid',
      ],
      upgradePriority: 'critical',
      specificUpgrade: 'Replace ALL AI-generated cannabinoid values with lab-tested values from real sources: state testing databases (CA, CO, WA, OR, MA, MI, NY, IL), analytical lab API partnerships (SC Labs, Analytical 360, Cannabitest), and published chemotype surveys in peer-reviewed literature.',
    };
  }

  private gradeStrainGrowData(): ScientificGrade {
    const count = (db.prepare('SELECT COUNT(*) as c FROM strain_grow_data').get() as any).c;

    return {
      source: 'weed_strain.csv — Strain Grow Characteristics',
      records: count,
      grade: 'C',
      credibility: 40,
      temporalRelevance: 60,
      sampleAdequacy: 15,    // Only 70 strains
      methodologyRigor: 30,  // Unknown origin, self-reported
      notes: [
        `Only ${count} strains — very small sample`,
        'Contains useful grow metrics (yield, flowering time, height, effects)',
        'Unknown data provenance — likely crowdsourced from grower reports',
        'No quality scores or confidence intervals',
        'Good structure for analysis but too small for statistical significance',
      ],
      upgradePriority: 'high',
      specificUpgrade: 'Integrate with seed bank catalog APIs (Sensi Seeds, Dutch Passion, Barney\'s Farm) for verified grow data. Target 1,000+ strains with breeder-verified metrics.',
    };
  }

  private gradeCrossReference(): ScientificGrade {
    return {
      source: 'Cross-Reference Analysis Engine (15 Insight Types)',
      records: 15,
      grade: 'C',
      credibility: 35,
      temporalRelevance: 45,
      sampleAdequacy: 40,
      methodologyRigor: 25,
      notes: [
        'Novel approach combining multiple datasets — genuinely unique',
        'BUT: GIGO (Garbage In, Garbage Out) — insights are only as good as weakest input',
        'No hypothesis testing — insights are descriptive, not inferential',
        'No statistical significance reported',
        'No correction for multiple comparisons',
        'Confidence labels (high/medium/low) are subjective, not data-driven',
        'Some insights based on AI-generated strain data = unreliable',
        'Market insights based on 2013-2015 data = historically interesting only',
      ],
      upgradePriority: 'high',
      specificUpgrade: 'Add proper statistical testing (t-tests, chi-square, regression p-values). Replace confidence labels with actual p-values and effect sizes. Add FDR correction for multiple comparisons.',
    };
  }

  private gradePublicEducation(): ScientificGrade {
    return {
      source: 'Public Education Content Generator',
      records: 0,
      grade: 'B',
      credibility: 60,
      temporalRelevance: 70,
      sampleAdequacy: 50,
      methodologyRigor: 50,
      notes: [
        'Did-You-Know facts sourced from real published literature with citations',
        'Strain articles combine real data with template text — accuracy depends on input data',
        'Social media threads reference real strain data where available',
        'Effective for public communication of scientific concepts',
        'Citations should always be verified against source before publication',
      ],
      upgradePriority: 'medium',
      specificUpgrade: 'Add automated citation verification (check that each cited DOI/PMID actually contains the claimed information). Add fact-checking layer using secondary sources.',
    };
  }

  private gradeAutonomousInsights(): ScientificGrade {
    return {
      source: 'Autonomous Intelligence Orchestrator (Insights + Tasks + Content)',
      records: 0,
      grade: 'D',
      credibility: 20,
      temporalRelevance: 30,
      sampleAdequacy: 25,
      methodologyRigor: 15,
      notes: [
        'Automated pipeline is well-structured technically',
        'BUT: auto-generates content from unvalidated data — risk of propagating errors',
        'No human-in-the-loop verification before insight publication',
        'Research tasks are rule-based, not driven by actual statistical anomaly detection',
        'Content generation does not verify facts before publishing',
        'Strong technical foundation but needs scientific governance layer',
      ],
      upgradePriority: 'critical',
      specificUpgrade: 'Add human-in-the-loop verification gate before any insight is published. Implement automated anomaly detection (not just rule-based) to trigger research tasks. Add confidence scoring based on underlying data quality.',
    };
  }

  /**
   * Generate prioritized upgrade plan
   */
  generateUpgradePlan(): { priority: string; action: string; estimatedEffort: string; scientificROI: string }[] {
    return [
      {
        priority: 'P0 - CRITICAL',
        action: 'Replace AI-generated strain THC/CBD/CBG values with lab-tested data from real sources',
        estimatedEffort: '2-3 months (API integration + data validation)',
        scientificROI: 'Transforms D-grade strain data into A-grade. Foundation for all downstream analysis.',
      },
      {
        priority: 'P0 - CRITICAL',
        action: 'Replace 2013-2015 market pricing with real-time or current data',
        estimatedEffort: '1-2 months (Leafly API + Headset/BDSA partnerships)',
        scientificROI: 'Enables current market analysis instead of historical curiosity.',
      },
      {
        priority: 'P0 - CRITICAL',
        action: 'Validate AI research study classification against human expert gold standard',
        estimatedEffort: '2-4 weeks (1000-study random sample, 3 expert reviewers)',
        scientificROI: 'Quantifies and corrects classification accuracy. Essential for all evidence-based claims.',
      },
      {
        priority: 'P1 - HIGH',
        action: 'Add proper statistical inference (p-values, effect sizes, confidence intervals) to cross-reference engine',
        estimatedEffort: '2-3 weeks (implement scipy/statsmodels integration)',
        scientificROI: 'Transforms descriptive insights into inferential findings with known error rates.',
      },
      {
        priority: 'P1 - HIGH',
        action: 'Integrate additional state MMJ registries (CO, WA, OR, CA, MA) for geographic diversity',
        estimatedEffort: '1-2 months (per-state API/PDF parsing)',
        scientificROI: 'Expands single-state A-grade data to multi-state. Enables regional comparison.',
      },
      {
        priority: 'P1 - HIGH',
        action: 'Systematic literature search: expand from 229 to 5,000+ papers with PRISMA methodology',
        estimatedEffort: '1 month (automated search + dedup + screening)',
        scientificROI: 'Comprehensive evidence base. Enables real meta-analysis with publication bias assessment.',
      },
      {
        priority: 'P2 - MEDIUM',
        action: 'Add human-in-the-loop verification gate for all autonomous insights',
        estimatedEffort: '2 weeks (review dashboard + approval workflow)',
        scientificROI: 'Prevents propagation of AI-generated errors. Adds accountability.',
      },
      {
        priority: 'P2 - MEDIUM',
        action: 'Integrate NCBI Datasets for Cannabis sativa genomic data (biosynthesis pathway genes)',
        estimatedEffort: '2-4 weeks (install datasets CLI + build query pipeline)',
        scientificROI: 'Adds genomic dimension — links chemotype to genotype. Enables breeding predictions.',
      },
      {
        priority: 'P2 - MEDIUM',
        action: 'Add CB1/CB2 receptor binding affinity data from PubChem bioassay',
        estimatedEffort: '1 week (PubChem bioassay REST API)',
        scientificROI: 'Enables structure-activity relationship analysis across cannabinoid family.',
      },
      {
        priority: 'P3 - LOW',
        action: 'Implement automated citation verification for public education content',
        estimatedEffort: '2 weeks (DOI resolution + claim extraction + LLM verification)',
        scientificROI: 'Ensures public-facing content is factually accurate and citable.',
      },
      {
        priority: 'P3 - LOW',
        action: 'Add effect size meta-analysis weighting to research study classification',
        estimatedEffort: '3-4 weeks (extract effect sizes from PDFs + random-effects model)',
        scientificROI: 'Transforms vote-counting (positive/negative) into quantitative meta-analysis.',
      },
      {
        priority: 'P3 - LOW',
        action: 'Create reproducibility package: Docker image + data snapshots + analysis scripts',
        estimatedEffort: '2 weeks (containerization + documentation)',
        scientificROI: 'Enables independent verification of all findings by third-party researchers.',
      },
    ];
  }
}

// Run the audit
const auditor = new ScientificAuditor();
console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                   SCIENTIFIC AUDIT — HEMP OS DATA SOURCES                          ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const grades = auditor.gradeAll();
for (const g of grades) {
  const color = g.grade === 'A' ? '🟢' : g.grade === 'B' ? '🟡' : g.grade === 'C' ? '🟠' : '🔴';
  console.log(`${color} [${g.grade}] ${g.source}`);
  console.log(`   Records: ${g.records.toLocaleString().padStart(8)}  |  Sample: ${g.sampleAdequacy}%  |  Credibility: ${g.credibility}%  |  Temporality: ${g.temporalRelevance}%  |  Rigor: ${g.methodologyRigor}%`);
  console.log(`   Upgrade: ${g.upgradePriority.toUpperCase()}`);
  for (const note of g.notes) {
    if (note.includes('CRITICAL')) {
      console.log(`   ⚠️  ${note}`);
    }
  }
  console.log();
}

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              UPGRADE ROADMAP                                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const plan = auditor.generateUpgradePlan();
for (const item of plan) {
  console.log(`${item.priority}`);
  console.log(`   Action: ${item.action}`);
  console.log(`   Effort: ${item.estimatedEffort}`);
  console.log(`   ROI:    ${item.scientificROI}`);
  console.log();
}

// Summary scores
const avgCred = grades.reduce((s, g) => s + g.credibility, 0) / grades.length;
const avgTemp = grades.reduce((s, g) => s + g.temporalRelevance, 0) / grades.length;
const avgSamp = grades.reduce((s, g) => s + g.sampleAdequacy, 0) / grades.length;
const avgRigor = grades.reduce((s, g) => s + g.methodologyRigor, 0) / grades.length;

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           OVERALL SYSTEM GRADES                                    ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');
console.log(`   Overall Credibility:      ${avgCred.toFixed(0)}%  — ${avgCred < 50 ? 'NEEDS SIGNIFICANT IMPROVEMENT' : 'ACCEPTABLE'}`);
console.log(`   Overall Temporal Fitness: ${avgTemp.toFixed(0)}%  — ${avgTemp < 50 ? 'DATA IS DATED, NEEDS REFRESH' : 'CURRENT'}`);
console.log(`   Overall Sample Adequacy:  ${avgSamp.toFixed(0)}%  — ${avgSamp < 50 ? 'UNDERPOWERED, NEEDS MORE DATA' : 'ADEQUATE'}`);
console.log(`   Overall Methodological:   ${avgRigor.toFixed(0)}%  — ${avgRigor < 50 ? 'NEEDS RIGOROUS METHODS' : 'SOLID'}`);
console.log(`\n   SYSTEM GRADE: ${(avgCred + avgTemp + avgSamp + avgRigor) / 4 < 50 ? 'D — NEEDS MAJOR UPGRADE' : 'C — FUNCTIONAL WITH GAPS'}`);
