// Working data source adapters — replaces broken scrapers
// Sources: NCBI PubMed, cannabis-intelligence-database API, OpenAlex, Semantic Scholar

import { StrainData, ResearchPaper } from './types.ts';

// --- NCBI PubMed via ncbijs patterns ---

interface PubMedSearchParams {
  query: string;
  maxResults?: number;
  sortBy?: 'relevance' | 'date' | 'author';
  filters?: Record<string, string>;
}

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
  meshTerms: string[];
  keywords: string[];
}

export async function searchPubMed(params: PubMedSearchParams): Promise<PubMedArticle[]> {
  const { query, maxResults = 20, sortBy = 'relevance' } = params;

  if (!query || query.trim().length === 0) {
    throw new Error('searchPubMed: query is required');
  }

  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const searchUrl = `${baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=${sortBy}&retmode=json`;

  try {
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(15000) });
    if (!searchRes.ok) {
      throw new Error(`PubMed esearch failed: HTTP ${searchRes.status}`);
    }
    const searchData = await searchRes.json() as any;
    const ids: string[] = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) {return [];}

    // Fetch summaries for all IDs
    const summaryUrl = `${baseUrl}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(15000) });
    if (!summaryRes.ok) {
      throw new Error(`PubMed esummary failed: HTTP ${summaryRes.status}`);
    }
    const summaryData = await summaryRes.json() as any;

    // Fetch abstracts for each article
    const fetchUrl = `${baseUrl}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml`;
    const fetchRes = await fetch(fetchUrl, { signal: AbortSignal.timeout(20000) });
    if (!fetchRes.ok) {
      throw new Error(`PubMed efetch failed: HTTP ${fetchRes.status}`);
    }
    const xmlText = await fetchRes.text();

    // Parse abstracts into a map for O(1) lookup
    const abstractMap = parseAbstractsFromXML(xmlText);

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
        meshTerms: [],
        keywords: [],
      };
    });
  } catch (err) {
    console.error('PubMed search error:', err);
    return [];
  }
}

function parseAbstractsFromXML(xml: string): Map<string, string> {
  const abstractMap = new Map<string, string>();
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;

  while ((match = articleRegex.exec(xml)) !== null) {
    const articleXml = match[1];
    const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const abstractMatch = articleXml.match(/<Abstract>([\s\S]*?)<\/Abstract>/);

    if (pmidMatch && abstractMatch) {
      const text = abstractMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      abstractMap.set(pmidMatch[1], text);
    }
  }

  return abstractMap;
}

// --- Cannabis Intelligence Database API ---

interface CannabisStrainAPI {
  name: string;
  type: string;
  thc: number;
  cbd: number;
  terpenes: Record<string, number>;
  effects: string[];
  genetics: { lineage: string[]; phenotype: string };
  breeder: string;
  source_url: string;
}

export async function searchCannabisAPI(
  query: string,
  limit = 20
): Promise<CannabisStrainAPI[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('searchCannabisAPI: query is required');
  }

  try {
    const res = await fetch(`https://api.loyal9.app/strains?q=${encodeURIComponent(query)}&limit=${limit}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {return [];}
    const data = await res.json() as any;
    return (data.strains || data.data || []).map((s: any) => ({
      name: s.name || s.strain_name || '',
      type: (s.type || s.category || 'hybrid').toLowerCase(),
      thc: s.thc || s.thc_percentage || 0,
      cbd: s.cbd || s.cbd_percentage || 0,
      terpenes: s.terpenes || s.terpene_profile || {},
      effects: s.effects || [],
      genetics: s.genetics || { lineage: s.lineage || [], phenotype: '' },
      breeder: s.breeder || s.brand || '',
      source_url: s.source_url || '',
    }));
  } catch (err) {
    console.error('Cannabis API search error:', err);
    return [];
  }
}

// --- OpenAlex Academic Search ---

interface OpenAlexPaper {
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

export async function searchOpenAlex(
  query: string,
  maxResults = 20
): Promise<OpenAlexPaper[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('searchOpenAlex: query is required');
  }

  try {
    const baseUrl = 'https://api.openalex.org/works';
    const params = new URLSearchParams({
      search: query,
      per_page: String(maxResults),
      sort: 'relevance_score:desc',
      select: 'id,title,authorships,publication_year,doi,primary_location,abstract_inverted_index,topics,cited_by_count',
    });

    const res = await fetch(`${baseUrl}?${params}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'HempOS/1.0 (research)' },
    });
    if (!res.ok) {return [];}
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
    console.error('OpenAlex search error:', err);
    return [];
  }
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
  if (!invertedIndex || typeof invertedIndex !== 'object') {return '';}
  const wordPositions: { word: string; pos: number }[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) {continue;}
    for (const pos of positions) {
      if (typeof pos === 'number') {
        wordPositions.push({ word, pos });
      }
    }
  }
  wordPositions.sort((a, b) => a.pos - b.pos);
  return wordPositions.map((w) => w.word).join(' ');
}

// --- Semantic Scholar Search ---

interface SemanticScholarPaper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  citationCount: number;
  fieldsOfStudy: string[];
}

export async function searchSemanticScholar(
  query: string,
  maxResults = 20
): Promise<SemanticScholarPaper[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('searchSemanticScholar: query is required');
  }

  try {
    const params = new URLSearchParams({
      query,
      limit: String(maxResults),
      fields: 'title,authors,journal,year,abstract,citationCount,fieldsOfStudy',
    });

    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {return [];}
    const data = await res.json() as any;

    return (data.data || []).map((paper: any) => ({
      id: paper.paperId || '',
      title: paper.title || '',
      authors: (paper.authors || []).map((a: any) => a.name).filter(Boolean),
      journal: paper.journal?.name || '',
      year: paper.year || 0,
      abstract: paper.abstract || '',
      citationCount: paper.citationCount || 0,
      fieldsOfStudy: paper.fieldsOfStudy || [],
    }));
  } catch (err) {
    console.error('Semantic Scholar search error:', err);
    return [];
  }
}

// --- Unified Search ---

export interface UnifiedSearchResult {
  source: 'pubmed' | 'openalex' | 'semantic-scholar' | 'cannabis-api';
  type: 'paper' | 'strain';
  data: any;
  relevanceScore: number;
}

export async function unifiedSearch(
  query: string,
  sources: ('pubmed' | 'openalex' | 'semantic-scholar' | 'cannabis-api')[] = ['pubmed', 'openalex', 'semantic-scholar'],
  maxPerSource = 10
): Promise<UnifiedSearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('unifiedSearch: query is required');
  }

  const results: UnifiedSearchResult[] = [];

  const searches = sources.map(async (source) => {
    try {
      switch (source) {
        case 'pubmed': {
          const papers = await searchPubMed({ query, maxResults: maxPerSource });
          return papers.map((p) => ({
            source: 'pubmed' as const,
            type: 'paper' as const,
            data: p,
            relevanceScore: 0.8,
          }));
        }
        case 'openalex': {
          const papers = await searchOpenAlex(query, maxPerSource);
          return papers.map((p) => ({
            source: 'openalex' as const,
            type: 'paper' as const,
            data: p,
            relevanceScore: 0.7,
          }));
        }
        case 'semantic-scholar': {
          const papers = await searchSemanticScholar(query, maxPerSource);
          return papers.map((p) => ({
            source: 'semantic-scholar' as const,
            type: 'paper' as const,
            data: p,
            relevanceScore: 0.75,
          }));
        }
        case 'cannabis-api': {
          const strains = await searchCannabisAPI(query, maxPerSource);
          return strains.map((s) => ({
            source: 'cannabis-api' as const,
            type: 'strain' as const,
            data: s,
            relevanceScore: 0.9,
          }));
        }
        default:
          return [];
      }
    } catch (err) {
      console.error(`Search failed for ${source}:`, err);
      return [];
    }
  });

  const allResults = await Promise.allSettled(searches);
  for (const result of allResults) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// --- Paper Conversion ---

export function convertPubMedToResearchPaper(article: PubMedArticle): ResearchPaper {
  return {
    title: article.title,
    authors: article.authors,
    year: article.year,
    journal: article.journal,
    doi: article.doi,
    abstract: article.abstract,
    topicTags: [...article.meshTerms, ...article.keywords],
    source: `pubmed:${article.pmid}`,
  };
}

export function convertOpenAlexToResearchPaper(paper: OpenAlexPaper): ResearchPaper {
  return {
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    journal: paper.journal,
    doi: paper.doi,
    abstract: paper.abstract,
    topicTags: paper.topics,
    source: `openalex:${paper.id}`,
  };
}

export function convertSemanticScholarToResearchPaper(paper: SemanticScholarPaper): ResearchPaper {
  return {
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    journal: paper.journal,
    abstract: paper.abstract,
    topicTags: paper.fieldsOfStudy,
    source: `semantic-scholar:${paper.id}`,
  };
}

// --- Strain Data Conversion ---

export function convertAPIStrainToStandard(apiStrain: CannabisStrainAPI): StrainData {
  const validTypes = ['indica', 'sativa', 'hybrid', 'other'];
  const strainType = validTypes.includes(apiStrain.type) ? apiStrain.type : 'other';

  return {
    name: apiStrain.name,
    type: strainType as StrainData['type'],
    thcMin: Math.max(0, apiStrain.thc - 3),
    thcMax: apiStrain.thc + 3,
    cbdMin: Math.max(0, apiStrain.cbd - 2),
    cbdMax: apiStrain.cbd + 2,
    terpeneProfile: apiStrain.terpenes || {},
    effects: apiStrain.effects || [],
    medicalUses: [],
    source: 'cannabis-intelligence-database',
  };
}

// --- Batch Ingestion ---

export async function batchSearchAndConvert(
  queries: string[],
  maxPerQuery = 10
): Promise<{ papers: ResearchPaper[]; strains: StrainData[] }> {
  if (!Array.isArray(queries) || queries.length === 0) {
    return { papers: [], strains: [] };
  }

  const papers: ResearchPaper[] = [];
  const strains: StrainData[] = [];

  for (const query of queries) {
    if (!query || query.trim().length === 0) {continue;}

    const results = await unifiedSearch(query, ['pubmed', 'openalex', 'semantic-scholar', 'cannabis-api'], maxPerQuery);

    for (const result of results) {
      if (result.type === 'paper') {
        switch (result.source) {
          case 'pubmed':
            papers.push(convertPubMedToResearchPaper(result.data));
            break;
          case 'openalex':
            papers.push(convertOpenAlexToResearchPaper(result.data));
            break;
          case 'semantic-scholar':
            papers.push(convertSemanticScholarToResearchPaper(result.data));
            break;
        }
      } else if (result.type === 'strain') {
        strains.push(convertAPIStrainToStandard(result.data));
      }
    }
  }

  return { papers, strains };
}
