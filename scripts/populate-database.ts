/**
 * Hemp OS Database Population Script
 *
 * Fetches real scientific papers from PubMed and OpenAlex,
 * seeds strain data from the existing strain library,
 * and stores everything in the SQLite database.
 *
 * Usage: npx tsx scripts/populate-database.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { INITIAL_STRAINS } from '../src/components/breedLab/data.ts';

// =========================================================================
// Database Setup
// =========================================================================

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// =========================================================================
// Schema Setup (papers table for literature)
// =========================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT,
    journal TEXT,
    year INTEGER,
    doi TEXT,
    abstract TEXT,
    topic_tags TEXT,
    source TEXT NOT NULL,
    source_id TEXT,
    citation_count INTEGER DEFAULT 0,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS paper_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    FOREIGN KEY (paper_id) REFERENCES papers(id)
  );

  CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
  CREATE INDEX IF NOT EXISTS idx_papers_topic ON papers(topic_tags);
  CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);
`);

// =========================================================================
// Helper: Clean text
// =========================================================================

function cleanText(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
}

// =========================================================================
// 1. FETCH PAPERS FROM PUBMED
// =========================================================================

const PUBMED_QUERIES = [
  'cannabinoid extraction optimization',
  'cannabis terpene analysis',
  'hemp processing winterization',
  'cannabinoid distillation purification',
  'cannabis sativa L. chemistry',
  'phytocannabinoid pharmacology',
  'cannabinoid receptor binding',
  'cannabis extraction supercritical CO2',
  'hemp biomass processing',
  'cannabinoid stability degradation',
  'cannabis chromatography analysis',
  'cannabinoid mass spectrometry',
  'cannabis genetics breeding',
  'cannabinoid biosynthesis pathway',
  'industrial hemp applications',
  'cannabis terpenes entourage effect',
  'cannabinoid clinical trials',
  'cannabis drug development',
  'hemp fiber processing',
  'cannabinoid wastewater treatment',
];

const CANNABIS_SPECIFIC_QUERIES = [
  'cannabis strain genetics chemotype',
  'cannabinoid profile cultivar variation',
];

interface PubMedFetched {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
}

async function fetchPubMedPapers(query: string, maxResults = 10): Promise<PubMedFetched[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(15000) });
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json() as any;
    const ids: string[] = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(15000) });
    if (!summaryRes.ok) return [];
    const summaryData = await summaryRes.json() as any;

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml`;
    const fetchRes = await fetch(fetchUrl, { signal: AbortSignal.timeout(20000) });
    if (!fetchRes.ok) return [];
    const xmlText = await fetchRes.text();

    const abstractMap = new Map<string, string>();
    const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let match;
    while ((match = articleRegex.exec(xmlText)) !== null) {
      const articleXml = match[1];
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const abstractMatch = articleXml.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
      if (pmidMatch && abstractMatch) {
        const text = cleanText(abstractMatch[1]);
        abstractMap.set(pmidMatch[1], text);
      }
    }

    return ids.map((id: string) => {
      const summary = summaryData.result?.[id] || {};
      return {
        pmid: id,
        title: summary.title || '',
        authors: (summary.authors || []).map((a: any) => a.name).filter(Boolean),
        journal: summary.source || '',
        year: parseInt((summary.pubdate || '').substring(0, 4)) || 0,
        abstract: abstractMap.get(id) || '',
        doi: (summary.articleids || []).find((a: any) => a.idtype === 'doi')?.value,
      };
    });
  } catch (err) {
    console.error(`  PubMed error for "${query.substring(0, 40)}":`, (err as Error).message);
    return [];
  }
}

// =========================================================================
// 2. FETCH PAPERS FROM OPENALEX
// =========================================================================

const OPENALEX_QUERIES = [
  'cannabinoid extraction ethanol',
  'cannabis distillation vacuum',
  'hemp decarboxylation kinetics',
  'cannabis winterization wax removal',
  'cannabinoid solubility ethanol',
  'cannabis analytical chemistry',
  'hemp cannabinoid biosynthesis',
  'cannabis phytoremediation',
  'cannabinoid drug delivery',
  'cannabis chemovar classification',
  'hemp cannabinoid profiling',
  'cannabis supercritical fluid extraction',
  'cannabinoid metabolic engineering',
  'cannabis wastewater contaminants',
  'hemp building materials',
  'cannabinoid food safety',
  'cannabis genomics transcriptomics',
  'cannabinoid immunotherapy',
  'hemp seed nutrition',
  'cannabis patent innovation',
];

interface OpenAlexFetched {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi: string;
  topics: string[];
  citedByCount: number;
}

async function fetchOpenAlexPapers(query: string, maxResults = 10): Promise<OpenAlexFetched[]> {
  try {
    const params = new URLSearchParams({
      search: query,
      'per-page': String(maxResults),
      sort: 'relevance_score:desc',
      select: 'id,title,authorships,publication_year,doi,primary_location,abstract_inverted_index,topics,cited_by_count',
    });

    const res = await fetch(`https://api.openalex.org/works?${params}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'HempOS/1.0 (database-population)' },
    });
    if (!res.ok) return [];

    const data = await res.json() as any;
    return (data.results || []).map((work: any) => ({
      id: work.id || '',
      title: work.title || '',
      authors: (work.authorships || []).map((a: any) => a.author?.display_name || '').filter(Boolean),
      journal: work.primary_location?.source?.display_name || '',
      year: work.publication_year || 0,
      abstract: reconstructAbstract(work.abstract_inverted_index),
      doi: work.doi || '',
      topics: (work.topics || []).map((t: any) => t.display_name || ''),
      citedByCount: work.cited_by_count || 0,
    }));
  } catch (err) {
    console.error(`  OpenAlex error for "${query.substring(0, 40)}":`, (err as Error).message);
    return [];
  }
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const wordPositions: { word: string; pos: number }[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      if (typeof pos === 'number') wordPositions.push({ word, pos });
    }
  }
  wordPositions.sort((a, b) => a.pos - b.pos);
  return wordPositions.map(w => w.word).join(' ');
}

// =========================================================================
// 3. SEED STRAINS FROM BREED LAB LIBRARY
// =========================================================================

async function seedStrainsFromLibrary() {
  let seeded = 0;
  let skipped = 0;

  for (const strain of INITIAL_STRAINS) {
    try {
      const now = new Date().toISOString();
      const existing = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(strain.name);
      if (existing) { skipped++; continue; }

      const typeStr = strain.classification?.toLowerCase().includes('indica') ? 'indica'
        : strain.classification?.toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';

      db.prepare(`
        INSERT INTO strains (canonical_name, type, breeder, description, lineage_json, effects_json, flavors_json, terpenes_json, cannabinoids_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        strain.name,
        typeStr,
        strain.seedFinderInfo?.breeder || strain.cannaConnectionInfo?.seedBank || 'Unknown',
        strain.origin || strain.landraceBackground || '',
        JSON.stringify(strain.lineage || []),
        JSON.stringify(strain.leaflyInfo?.effects || strain.hytivaInfo?.activities || []),
        JSON.stringify(strain.leaflyInfo?.flavors || []),
        JSON.stringify(Object.keys(strain.terpenes || {})),
        JSON.stringify({ thc: strain.thc, cbd: strain.cbd, cbg: strain.cbg, cbn: strain.cbn }),
        now,
        now
      );

      const strainRow = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(strain.name) as any;

      const alias = strain.name.toLowerCase().replace(/\s+/g, '-');
      db.prepare('INSERT OR IGNORE INTO strain_aliases (strain_id, alias) VALUES (?, ?)').run(strainRow.id, alias);

      db.prepare(`
        INSERT INTO source_records (source, source_id, strain_id, source_url, raw_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('breed-lab', strain.id, strainRow.id, null, JSON.stringify(strain), now, now);

      seeded++;
    } catch (err: any) {
      console.error(`  Error seeding "${strain.name}": ${err.message.substring(0, 80)}`);
    }
  }

  return { seeded, skipped };
}

// =========================================================================
// 4. STORE PAPERS IN DATABASE
// =========================================================================

function storePubMedPaper(paper: PubMedFetched): boolean {
  try {
    const id = `pubmed:${paper.pmid}`;
    const existing = db.prepare('SELECT id FROM papers WHERE id = ?').get(id);
    if (existing) return false;

    db.prepare(`
      INSERT INTO papers (id, title, authors, journal, year, doi, abstract, source, source_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      paper.title.substring(0, 500),
      paper.authors.join('; ').substring(0, 500),
      paper.journal,
      paper.year,
      paper.doi || '',
      paper.abstract.substring(0, 5000),
      'pubmed',
      paper.pmid,
    );
    return true;
  } catch { return false; }
}

function storeOpenAlexPaper(paper: OpenAlexFetched): boolean {
  try {
    const id = `openalex:${paper.id}`;
    const existing = db.prepare('SELECT id FROM papers WHERE id = ?').get(id);
    if (existing) return false;

    db.prepare(`
      INSERT INTO papers (id, title, authors, journal, year, doi, abstract, topic_tags, source, source_id, citation_count, url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      paper.title.substring(0, 500),
      paper.authors.join('; ').substring(0, 500),
      paper.journal,
      paper.year,
      paper.doi || '',
      paper.abstract.substring(0, 5000),
      paper.topics.join(', ').substring(0, 500),
      'openalex',
      paper.id,
      paper.citedByCount,
      paper.doi || '',
    );
    return true;
  } catch { return false; }
}

// =========================================================================
// MAIN
// =========================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         HEMP OS — DATABASE POPULATION SCRIPT               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // ---- Step 1: Seed Strains ----
  console.log('📋 Step 1: Seeding strain library...');
  try {
    const { seeded, skipped } = seedStrainsFromLibrary();
    console.log(`   ✓ ${seeded} strains seeded, ${skipped} already existed`);
  } catch (err: any) {
    console.log(`   ⚠ Error seeding strains: ${err.message}`);
    console.log('   Continuing with paper import...');
  }

  // ---- Step 2: Fetch PubMed Papers ----
  console.log('\n📋 Step 2: Fetching papers from PubMed...');
  let pubmedTotal = 0;
  for (const query of PUBMED_QUERIES) {
    const papers = await fetchPubMedPapers(query, 8);
    let stored = 0;
    for (const p of papers) {
      if (storePubMedPaper(p)) stored++;
    }
    if (stored > 0) {
      console.log(`   ✓ "${query.substring(0, 40).padEnd(40)}" → ${stored} new papers`);
      pubmedTotal += stored;
    }
    // Be nice to NCBI: 3 requests per second max without API key
    await new Promise(r => setTimeout(r, 400));
  }

  // Fetch cannabis-specific queries
  for (const query of CANNABIS_SPECIFIC_QUERIES) {
    const papers = await fetchPubMedPapers(query, 15);
    let stored = 0;
    for (const p of papers) {
      if (storePubMedPaper(p)) stored++;
    }
    if (stored > 0) {
      console.log(`   ✓ "${query.substring(0, 40).padEnd(40)}" → ${stored} new papers`);
      pubmedTotal += stored;
    }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log(`   Total PubMed papers stored: ${pubmedTotal}`);

  // ---- Step 3: Fetch OpenAlex Papers ----
  console.log('\n📋 Step 3: Fetching papers from OpenAlex...');
  let openalexTotal = 0;
  for (const query of OPENALEX_QUERIES) {
    const papers = await fetchOpenAlexPapers(query, 8);
    let stored = 0;
    for (const p of papers) {
      if (storeOpenAlexPaper(p)) stored++;
    }
    if (stored > 0) {
      console.log(`   ✓ "${query.substring(0, 40).padEnd(40)}" → ${stored} new papers`);
      openalexTotal += stored;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`   Total OpenAlex papers stored: ${openalexTotal}`);

  // ---- Summary ----
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     POPULATION SUMMARY                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const strainCount = (db.prepare('SELECT COUNT(*) as c FROM strains').get() as any).c;
  const paperCount = (db.prepare('SELECT COUNT(*) as c FROM papers').get() as any).c;
  const aliasCount = (db.prepare('SELECT COUNT(*) as c FROM strain_aliases').get() as any).c;
  const sourceCount = (db.prepare('SELECT COUNT(*) as c FROM source_records').get() as any).c;

  console.log(`   Strains:         ${strainCount}`);
  console.log(`   Strain Aliases:  ${aliasCount}`);
  console.log(`   Source Records:  ${sourceCount}`);
  console.log(`   Scientific Papers: ${paperCount}`);
  console.log();
  console.log(`   PubMed papers:   ${pubmedTotal}`);
  console.log(`   OpenAlex papers: ${openalexTotal}`);

  // Show some sample papers
  if (paperCount > 0) {
    console.log('\n📄 Sample papers:');
    const samples = db.prepare('SELECT id, title, year, source FROM papers ORDER BY RANDOM() LIMIT 5').all() as any[];
    for (const s of samples) {
      console.log(`   • [${s.source}] (${s.year || '?'}) ${(s.title || '').substring(0, 90)}`);
    }
  }

  if (strainCount > 0) {
    console.log('\n🌿 Sample strains:');
    const samples = db.prepare('SELECT canonical_name, type, breeder FROM strains ORDER BY RANDOM() LIMIT 5').all() as any[];
    for (const s of samples) {
      console.log(`   • ${s.canonical_name} (${s.type || 'unknown'}) — ${s.breeder || 'Unknown'}`);
    }
  }

  db.close();
  console.log('\n✅ Database population complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
