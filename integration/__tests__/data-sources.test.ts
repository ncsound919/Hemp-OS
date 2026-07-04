import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchPubMed,
  searchOpenAlex,
  searchSemanticScholar,
  searchCannabisAPI,
  unifiedSearch,
  convertPubMedToResearchPaper,
  convertOpenAlexToResearchPaper,
  convertSemanticScholarToResearchPaper,
  convertAPIStrainToStandard,
  batchSearchAndConvert,
} from '../data-sources.js';

// --- Mock fetch globally ---

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init?: any) => any) {
  globalThis.fetch = vi.fn(async (url: any, init?: any) => {
    const result = handler(typeof url === 'string' ? url : url.toString(), init);
    if (result instanceof Error) {throw result;}
    return result as Response;
  }) as any;
}

function jsonResponse(data: any, ok = true, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
    ok,
  });
}

function textResponse(text: string, ok = true, status = 200): Response {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/xml' },
    ok,
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('searchPubMed', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.includes('esearch.fcgi')) {
        return jsonResponse({
          esearchresult: { idlist: ['12345', '67890'] },
        });
      }
      if (url.includes('esummary.fcgi')) {
        return jsonResponse({
          result: {
            '12345': {
              title: 'Test Article 1',
              authors: [{ name: 'Smith J' }],
              source: 'Nature',
              pubdate: '2024 Jan',
              articleids: [{ idtype: 'doi', value: '10.1234/test' }],
            },
            '67890': {
              title: 'Test Article 2',
              authors: [{ name: 'Doe A' }],
              source: 'Science',
              pubdate: '2023 Dec',
              articleids: [],
            },
          },
        });
      }
      if (url.includes('efetch.fcgi')) {
        return textResponse(`
          <PubmedArticle>
            <MedlineCitation>
              <PMID>12345</PMID>
              <Article>
                <Abstract>
                  <AbstractText>First abstract text.</AbstractText>
                </Abstract>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>67890</PMID>
              <Article>
                <Abstract>
                  <AbstractText>Second abstract text.</AbstractText>
                </Abstract>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        `);
      }
      return jsonResponse({}, false, 404);
    });
  });

  it('should return parsed articles', async () => {
    const results = await searchPubMed({ query: 'cannabis test' });
    expect(results).toHaveLength(2);
    expect(results[0].pmid).toBe('12345');
    expect(results[0].title).toBe('Test Article 1');
    expect(results[0].abstract).toContain('First abstract text');
    expect(results[0].doi).toBe('10.1234/test');
    expect(results[1].pmid).toBe('67890');
  });

  it('should throw on empty query', async () => {
    await expect(searchPubMed({ query: '' })).rejects.toThrow('query is required');
  });

  it('should handle esearch failure gracefully', async () => {
    mockFetch((url) => {
      if (url.includes('esearch.fcgi')) {
        return jsonResponse({}, false, 500);
      }
      return jsonResponse({});
    });
    const results = await searchPubMed({ query: 'test' });
    expect(results).toEqual([]);
  });

  it('should return empty for no results', async () => {
    mockFetch(() => {
      return jsonResponse({ esearchresult: { idlist: [] } });
    });
    const results = await searchPubMed({ query: 'nonexistent' });
    expect(results).toEqual([]);
  });
});

describe('searchOpenAlex', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.includes('api.openalex.org')) {
        return jsonResponse({
          results: [
            {
              id: 'W12345',
              title: 'OpenAlex Paper',
              authorships: [{ author: { display_name: 'Author A' } }],
              publication_year: 2024,
              doi: 'https://doi.org/10.1234/oa',
              primary_location: { source: { display_name: 'Journal X' } },
              abstract_inverted_index: { This: [0], is: [1], abstract: [2] },
              topics: [{ display_name: 'Cannabis Science' }],
              cited_by_count: 42,
            },
          ],
        });
      }
      return jsonResponse({}, false, 404);
    });
  });

  it('should return parsed papers with reconstructed abstract', async () => {
    const results = await searchOpenAlex('cannabis', 5);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('OpenAlex Paper');
    expect(results[0].abstract).toBe('This is abstract');
    expect(results[0].citedByCount).toBe(42);
  });

  it('should throw on empty query', async () => {
    await expect(searchOpenAlex('')).rejects.toThrow('query is required');
  });
});

describe('searchSemanticScholar', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.includes('semanticscholar.org')) {
        return jsonResponse({
          data: [
            {
              paperId: 'S12345',
              title: 'Semantic Paper',
              authors: [{ name: 'Author B' }],
              journal: { name: 'Journal Y' },
              year: 2023,
              abstract: 'Semantic abstract.',
              citationCount: 15,
              fieldsOfStudy: ['Computer Science'],
            },
          ],
        });
      }
      return jsonResponse({}, false, 404);
    });
  });

  it('should return parsed papers', async () => {
    const results = await searchSemanticScholar('cannabis', 5);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Semantic Paper');
    expect(results[0].citationCount).toBe(15);
  });

  it('should throw on empty query', async () => {
    await expect(searchSemanticScholar('')).rejects.toThrow('query is required');
  });
});

describe('searchCannabisAPI', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.includes('loyal9.app')) {
        return jsonResponse({
          strains: [
            {
              name: 'Blue Dream',
              type: 'hybrid',
              thc: 21,
              cbd: 0.5,
              terpenes: { myrcene: 0.3, pinene: 0.2 },
              effects: ['relaxed', 'happy'],
              genetics: { lineage: ['Blueberry', 'Haze'], phenotype: '' },
              breeder: 'Grower X',
              source_url: 'https://example.com',
            },
          ],
        });
      }
      return jsonResponse({}, false, 404);
    });
  });

  it('should return parsed strains', async () => {
    const results = await searchCannabisAPI('blue dream');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Blue Dream');
    expect(results[0].type).toBe('hybrid');
    expect(results[0].thc).toBe(21);
  });

  it('should throw on empty query', async () => {
    await expect(searchCannabisAPI('')).rejects.toThrow('query is required');
  });
});

describe('unifiedSearch', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.includes('esearch.fcgi') || url.includes('esummary.fcgi')) {
        return jsonResponse({ esearchresult: { idlist: [] }, result: {} });
      }
      if (url.includes('efetch.fcgi')) {
        return textResponse('<PubmedArticle></PubmedArticle>');
      }
      if (url.includes('api.openalex.org')) {
        return jsonResponse({ results: [] });
      }
      if (url.includes('semanticscholar.org')) {
        return jsonResponse({ data: [] });
      }
      if (url.includes('loyal9.app')) {
        return jsonResponse({ strains: [] });
      }
      return jsonResponse({});
    });
  });

  it('should search all sources by default', async () => {
    const results = await unifiedSearch('test');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should search only specified sources', async () => {
    const results = await unifiedSearch('test', ['pubmed']);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should throw on empty query', async () => {
    await expect(unifiedSearch('')).rejects.toThrow('query is required');
  });

  it('should handle source failures gracefully', async () => {
    mockFetch((url) => {
      if (url.includes('esearch.fcgi')) {
        return jsonResponse({}, false, 500);
      }
      if (url.includes('api.openalex.org')) {
        return jsonResponse({ results: [] });
      }
      if (url.includes('semanticscholar.org')) {
        return jsonResponse({ data: [] });
      }
      return jsonResponse({});
    });
    const results = await unifiedSearch('test', ['pubmed', 'openalex', 'semantic-scholar']);
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('converters', () => {
  it('convertPubMedToResearchPaper', () => {
    const article = {
      pmid: '12345',
      title: 'Test',
      authors: ['Author A'],
      journal: 'Nature',
      year: 2024,
      abstract: 'Abstract text',
      doi: '10.1234/test',
      meshTerms: ['Cannabinoids'],
      keywords: ['cannabis'],
    };
    const paper = convertPubMedToResearchPaper(article);
    expect(paper.title).toBe('Test');
    expect(paper.source).toBe('pubmed:12345');
    expect(paper.topicTags).toContain('Cannabinoids');
  });

  it('convertOpenAlexToResearchPaper', () => {
    const paper = convertOpenAlexToResearchPaper({
      id: 'W12345',
      title: 'Test',
      authors: ['Author A'],
      journal: 'Nature',
      year: 2024,
      abstract: 'Abstract',
      doi: '10.1234/test',
      topics: ['Science'],
      citedByCount: 10,
    });
    expect(paper.source).toBe('openalex:W12345');
  });

  it('convertSemanticScholarToResearchPaper', () => {
    const paper = convertSemanticScholarToResearchPaper({
      id: 'S12345',
      title: 'Test',
      authors: ['Author A'],
      journal: 'Nature',
      year: 2024,
      abstract: 'Abstract',
      citationCount: 10,
      fieldsOfStudy: ['CS'],
    });
    expect(paper.source).toBe('semantic-scholar:S12345');
    expect(paper.topicTags).toContain('CS');
  });

  it('convertAPIStrainToStandard', () => {
    const strain = convertAPIStrainToStandard({
      name: 'Test Strain',
      type: 'indica',
      thc: 25,
      cbd: 1,
      terpenes: { myrcene: 0.5 },
      effects: ['relaxed'],
      genetics: { lineage: [], phenotype: '' },
      breeder: 'Grower',
      source_url: '',
    });
    expect(strain.name).toBe('Test Strain');
    expect(strain.type).toBe('indica');
    expect(strain.thcMin).toBe(22);
    expect(strain.thcMax).toBe(28);
    expect(strain.terpeneProfile.myrcene).toBe(0.5);
  });

  it('convertAPIStrainToStandard normalizes invalid type to other', () => {
    const strain = convertAPIStrainToStandard({
      name: 'Bad Type',
      type: 'invalid',
      thc: 10,
      cbd: 0,
      terpenes: {},
      effects: [],
      genetics: { lineage: [], phenotype: '' },
      breeder: '',
      source_url: '',
    });
    expect(strain.type).toBe('other');
  });
});

describe('batchSearchAndConvert', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.includes('esearch.fcgi') || url.includes('esummary.fcgi')) {
        return jsonResponse({ esearchresult: { idlist: [] }, result: {} });
      }
      if (url.includes('efetch.fcgi')) {
        return textResponse('<PubmedArticle></PubmedArticle>');
      }
      if (url.includes('api.openalex.org')) {
        return jsonResponse({ results: [] });
      }
      if (url.includes('semanticscholar.org')) {
        return jsonResponse({ data: [] });
      }
      if (url.includes('loyal9.app')) {
        return jsonResponse({ strains: [] });
      }
      return jsonResponse({});
    });
  });

  it('should return empty for empty queries', async () => {
    const results = await batchSearchAndConvert([]);
    expect(results.papers).toHaveLength(0);
    expect(results.strains).toHaveLength(0);
  });

  it('should return empty for null/undefined queries', async () => {
    const results = await batchSearchAndConvert([ '', '  ' ]);
    expect(results.papers).toHaveLength(0);
  });

  it('should process multiple queries sequentially', async () => {
    const results = await batchSearchAndConvert(['query1', 'query2'], 3);
    expect(Array.isArray(results.papers)).toBe(true);
  });
});

describe('reconstructAbstract (internal)', () => {
  it('handles null/undefined/non-object input', async () => {
    // The function is internal, but we can test via searchOpenAlex with bad data
    mockFetch(() => {
      return jsonResponse({
        results: [
          {
            id: 'W1',
            title: 'T',
            authorships: [],
            publication_year: 2024,
            doi: '',
            primary_location: null,
            abstract_inverted_index: null,
            topics: [],
            cited_by_count: 0,
          },
        ],
      });
    });
    const results = await searchOpenAlex('test');
    expect(results[0].abstract).toBe('');
  });
});
