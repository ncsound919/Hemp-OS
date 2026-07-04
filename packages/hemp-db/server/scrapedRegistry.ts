// Working data source registry — replaces broken Leafly/CannaConnection scrapers
// Uses: NCBI PubMed, OpenAlex, Semantic Scholar, Cannabis Intelligence Database API

import fs from 'fs/promises';
import path from 'path';
import {
  searchPubMed,
  searchOpenAlex,
  searchSemanticScholar,
  searchCannabisAPI,
  unifiedSearch,
} from '../../integration/data-sources.ts';

export interface SourceRecord {
  source: 'pubmed' | 'openalex' | 'semantic-scholar' | 'cannabis-api';
  entityType: 'strain' | 'paper' | 'taxonomy';
  name: string;
  url: string;
  rawText: string;
  facts: Record<string, string | number | null>;
  scrapedAt: string;
}

export interface CustomScrapedFile {
  fileName: string;
  content: string;
}

function safeFilePart(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// --- PubMed Search ---

export async function searchPubMedStrains(query: string, limit = 20): Promise<SourceRecord[]> {
  const articles = await searchPubMed({ query: `${query} cannabis strain`, maxResults: limit });
  return articles.map(article => ({
    source: 'pubmed' as const,
    entityType: 'paper' as const,
    name: article.title,
    url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
    rawText: article.abstract,
    facts: {
      pmid: Number(article.pmid),
      year: article.year,
      doi: article.doi ? Number(article.doi.replace('10.', '').split('/')[0]) : null,
    },
    scrapedAt: new Date().toISOString(),
  }));
}

// --- OpenAlex Search ---

export async function searchOpenAlexStrains(query: string, limit = 20): Promise<SourceRecord[]> {
  const papers = await searchOpenAlex(`${query} cannabis cannabinoid`, limit);
  return papers.map(paper => ({
    source: 'openalex' as const,
    entityType: 'paper' as const,
    name: paper.title,
    url: paper.doi || paper.id,
    rawText: paper.abstract,
    facts: {
      year: paper.year,
      citedByCount: paper.citedByCount,
      topics: paper.topics.join(', '),
    },
    scrapedAt: new Date().toISOString(),
  }));
}

// --- Semantic Scholar Search ---

export async function searchSemanticScholarStrains(query: string, limit = 20): Promise<SourceRecord[]> {
  const papers = await searchSemanticScholar(`${query} cannabis`, limit);
  return papers.map(paper => ({
    source: 'semantic-scholar' as const,
    entityType: 'paper' as const,
    name: paper.title,
    url: `https://www.semanticscholar.org/paper/${paper.id}`,
    rawText: paper.abstract,
    facts: {
      year: paper.year,
      citationCount: paper.citationCount,
      fieldsOfStudy: paper.fieldsOfStudy.join(', '),
    },
    scrapedAt: new Date().toISOString(),
  }));
}

// --- Cannabis Intelligence Database API ---

export async function searchCannabisStrains(query: string, limit = 20): Promise<SourceRecord[]> {
  const strains = await searchCannabisAPI(query, limit);
  return strains.map(strain => ({
    source: 'cannabis-api' as const,
    entityType: 'strain' as const,
    name: strain.name,
    url: strain.source_url || `https://cannabis-intelligence-database.com/strains/${strain.name.toLowerCase().replace(/\s+/g, '-')}`,
    rawText: `Type: ${strain.type}, THC: ${strain.thc}%, CBD: ${strain.cbd}%, Effects: ${strain.effects.join(', ')}`,
    facts: {
      type: strain.type,
      thc_percent: strain.thc,
      cbd_percent: strain.cbd,
      terpenes: Object.keys(strain.terpenes).join(', '),
      effects: strain.effects.join(', '),
      breeder: strain.breeder,
      lineage: strain.genetics.lineage.join(' x '),
    },
    scrapedAt: new Date().toISOString(),
  }));
}

// --- Unified Source Dispatcher ---

export async function scrapeSource(
  sourceKey: string,
  options?: { limit?: number; query?: string }
): Promise<SourceRecord[]> {
  const normalized = sourceKey.toLowerCase().trim();
  const limit = options?.limit ?? 20;
  const query = options?.query ?? 'cannabis hemp cannabinoid';

  switch (normalized) {
    case 'pubmed':
      return searchPubMedStrains(query, limit);
    case 'openalex':
      return searchOpenAlexStrains(query, limit);
    case 'semantic-scholar':
      return searchSemanticScholarStrains(query, limit);
    case 'cannabis-api':
      return searchCannabisStrains(query, limit);
    default:
      throw new Error(`Unsupported source: ${normalized}. Use: pubmed, openalex, semantic-scholar, cannabis-api`);
  }
}

export async function archiveSourceToFolder(
  sourceKey: string,
  outDir: string,
  options?: { limit?: number; query?: string }
) {
  const records = await scrapeSource(sourceKey, options);
  await fs.mkdir(outDir, { recursive: true });

  for (const record of records) {
    const base = `${record.entityType}_${record.source}_${safeFilePart(record.name)}`;
    const filePath = path.join(outDir, `${base}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
  }

  return records.map(r => ({
    fileName: `${r.entityType}_${r.source}_${safeFilePart(r.name)}.json`,
    ...r,
  }));
}

// --- Main Entry Point (compatible with server.ts) ---

export async function generateScrapedFiles(
  sourceKey: string,
  customStrainName?: string
): Promise<CustomScrapedFile[]> {
  const normalized = sourceKey.toLowerCase().trim();

  // Determine which sources to query
  const sourceMap: Record<string, string> = {
    leafly: 'cannabis-api',       // Redirect legacy Leafly to working API
    cannaconnection: 'pubmed',    // Redirect legacy CannaConnection to PubMed
    straindataproject: 'openalex', // Redirect legacy StrainDataProject to OpenAlex
    pubmed: 'pubmed',
    openalex: 'openalex',
    'semantic-scholar': 'semantic-scholar',
    'cannabis-api': 'cannabis-api',
  };

  const actualSource = sourceMap[normalized] || 'pubmed';
  const query = customStrainName || 'cannabis hemp cannabinoid strain';

  try {
    const records = await scrapeSource(actualSource, { limit: 20, query });

    // If a specific strain was requested, also search across all sources
    if (customStrainName && customStrainName.trim().length > 0) {
      const allRecords = await unifiedSearch(customStrainName, ['pubmed', 'openalex', 'cannabis-api'], 5);
      const extraRecords: SourceRecord[] = allRecords.map(r => ({
        source: r.source as any,
        entityType: r.type as any,
        name: r.data.title || r.data.name || customStrainName,
        url: r.data.doi || r.data.source_url || '',
        rawText: r.data.abstract || '',
        facts: r.data,
        scrapedAt: new Date().toISOString(),
      }));
      records.push(...extraRecords);
    }

    return records.map(record => {
      const base = `${record.entityType}_${record.source}_${safeFilePart(record.name)}`;
      return {
        fileName: `${base}.json`,
        content: JSON.stringify(record, null, 2),
      };
    });
  } catch (err) {
    console.error(`Scrape failed for ${sourceKey}:`, err);
    // Return empty on failure — no more synthetic data generation
    return [];
  }
}
