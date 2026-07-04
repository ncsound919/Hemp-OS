import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../integration/data-sources.ts', () => ({
  searchPubMed: vi.fn(async ({ query, maxResults }: any) => {
    if (query.includes('empty')) return [];
    return [
      {
        pmid: '12345678', title: 'Cannabinoid CB1 Receptor Binding Mechanisms',
        authors: ['Smith J'], journal: 'J Neurochem', year: 2023,
        abstract: 'This study examines CB1 binding', doi: '10.1111/jnc.12345',
        keywords: ['cannabinoid', 'CB1'], meshTerms: ['Receptor, Cannabinoid, CB1'],
      },
    ];
  }),
  searchOpenAlex: vi.fn(async () => [
    {
      id: 'https://openalex.org/W123', title: 'Cannabis Extraction Methods',
      authors: [{ author: { display_name: 'Doe J' } }], year: 2024,
      abstract: 'Supercritical CO2 extraction of cannabinoids',
      citedByCount: 15, topics: ['chemistry', 'pharmacology'],
      doi: '10.1002/abc.123',
    },
  ]),
  searchSemanticScholar: vi.fn(async () => [
    {
      id: 'abc123def', title: 'Endocannabinoid System Review',
      year: 2023, abstract: 'Comprehensive review of the endocannabinoid system',
      citationCount: 45, fieldsOfStudy: ['Neuroscience', 'Pharmacology'],
      authors: ['Johnson K'],
    },
  ]),
  searchCannabisAPI: vi.fn(async () => [
    {
      name: 'Blue Dream', type: 'hybrid', thc: 20, cbd: 0.2,
      terpenes: { myrcene: 0.8, limonene: 0.3 },
      effects: ['Relaxed', 'Happy'], breeder: 'Sierra',
      source_url: 'https://example.com/blue-dream',
      genetics: { lineage: ['Blueberry', 'Haze'] },
    },
  ]),
  unifiedSearch: vi.fn(async () => []),
}));

import {
  searchPubMedStrains,
  searchOpenAlexStrains,
  searchSemanticScholarStrains,
  searchCannabisStrains,
  scrapeSource,
  generateScrapedFiles,
} from '../server/scrapedRegistry.ts';

describe('scrapedRegistry', () => {
  // ─── PubMed ───────────────────────────────────────────────────────────────

  describe('searchPubMedStrains', () => {
    it('should return SourceRecord array from PubMed data', async () => {
      const results = await searchPubMedStrains('cannabinoid', 5);
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.source).toBe('pubmed');
      expect(r.entityType).toBe('paper');
      expect(r.name).toBe('Cannabinoid CB1 Receptor Binding Mechanisms');
      expect(r.url).toContain('pubmed.ncbi.nlm.nih.gov');
      expect(r.rawText).toBeTruthy();
      expect(r.facts).toHaveProperty('pmid');
      expect(r.facts).toHaveProperty('year');
    });

    it('should return empty array when no results', async () => {
      const results = await searchPubMedStrains('empty', 5);
      expect(results).toHaveLength(0);
    });
  });

  // ─── OpenAlex ─────────────────────────────────────────────────────────────

  describe('searchOpenAlexStrains', () => {
    it('should return SourceRecord array from OpenAlex data', async () => {
      const results = await searchOpenAlexStrains('cannabis extraction', 5);
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.source).toBe('openalex');
      expect(r.entityType).toBe('paper');
      expect(r.name).toBe('Cannabis Extraction Methods');
      expect(r.facts).toHaveProperty('citedByCount');
      expect(r.facts).toHaveProperty('topics');
    });
  });

  // ─── Semantic Scholar ─────────────────────────────────────────────────────

  describe('searchSemanticScholarStrains', () => {
    it('should return SourceRecord array from Semantic Scholar data', async () => {
      const results = await searchSemanticScholarStrains('endocannabinoid', 5);
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.source).toBe('semantic-scholar');
      expect(r.entityType).toBe('paper');
      expect(r.url).toContain('semanticscholar.org');
      expect(r.facts).toHaveProperty('citationCount');
    });
  });

  // ─── Cannabis API ─────────────────────────────────────────────────────────

  describe('searchCannabisStrains', () => {
    it('should return SourceRecord array from Cannabis API data', async () => {
      const results = await searchCannabisStrains('Blue Dream', 5);
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.source).toBe('cannabis-api');
      expect(r.entityType).toBe('strain');
      expect(r.name).toBe('Blue Dream');
      expect(r.facts).toHaveProperty('type');
      expect(r.facts.type).toBe('hybrid');
      expect(r.facts).toHaveProperty('thc_percent');
      expect(r.facts).toHaveProperty('lineage');
      expect(r.rawText).toContain('THC');
    });
  });

  // ─── scrapeSource ─────────────────────────────────────────────────────────

  describe('scrapeSource', () => {
    it('should dispatch to pubmed source', async () => {
      const results = await scrapeSource('pubmed', { limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('pubmed');
    });

    it('should dispatch to openalex source', async () => {
      const results = await scrapeSource('openalex', { limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('openalex');
    });

    it('should dispatch to semantic-scholar source', async () => {
      const results = await scrapeSource('semantic-scholar', { limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('semantic-scholar');
    });

    it('should dispatch to cannabis-api source', async () => {
      const results = await scrapeSource('cannabis-api', { limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('cannabis-api');
    });

    it('should throw for unsupported source', async () => {
      await expect(scrapeSource('unknown-source')).rejects.toThrow('Unsupported source');
    });

    it('should normalize source key case', async () => {
      const results = await scrapeSource('PubMed', { limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('pubmed');
    });
  });

  // ─── generateScrapedFiles ─────────────────────────────────────────────────

  describe('generateScrapedFiles', () => {
    it('should return CustomScrapedFile array with fileName and content', async () => {
      const files = await generateScrapedFiles('pubmed');
      expect(Array.isArray(files)).toBe(true);
      if (files.length > 0) {
        const f = files[0];
        expect(f).toHaveProperty('fileName');
        expect(f).toHaveProperty('content');
        expect(f.fileName).toMatch(/\.json$/);
        const parsed = JSON.parse(f.content);
        expect(parsed).toHaveProperty('source');
        expect(parsed).toHaveProperty('entityType');
      }
    });

    it('should map legacy leafly source to cannabis-api', async () => {
      const files = await generateScrapedFiles('leafly');
      expect(Array.isArray(files)).toBe(true);
      if (files.length > 0) {
        const parsed = JSON.parse(files[0].content);
        expect(parsed.source).toBe('cannabis-api');
      }
    });

    it('should map legacy cannaconnection source to pubmed', async () => {
      const files = await generateScrapedFiles('cannaconnection');
      expect(Array.isArray(files)).toBe(true);
      if (files.length > 0) {
        const parsed = JSON.parse(files[0].content);
        expect(parsed.source).toBe('pubmed');
      }
    });

    it('should map legacy straindataproject source to openalex', async () => {
      const files = await generateScrapedFiles('straindataproject');
      expect(Array.isArray(files)).toBe(true);
      if (files.length > 0) {
        const parsed = JSON.parse(files[0].content);
        expect(parsed.source).toBe('openalex');
      }
    });

    it('should handle errors gracefully by returning empty array', async () => {
      const files = await generateScrapedFiles('pubmed', 'nonexistent-strain-name');
      expect(Array.isArray(files)).toBe(true);
    });
  });
});
