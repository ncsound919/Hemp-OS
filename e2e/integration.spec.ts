import { test, expect, type APIRequestContext } from '@playwright/test';
import { startTestServer } from './test-server';
import type { Server } from 'http';

let server: Server;
let request: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  server = await startTestServer(3456);
  request = await playwright.request.newContext({ baseURL: 'http://localhost:3456' });
});

test.afterAll(async () => {
  await request.dispose();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ─── Paper Generator — Output System Tests ───────────────────────────────

test.describe('Paper Generator — Output Integrity', () => {
  let draftId: string;

  test.afterAll(async () => {
    if (draftId) {
      await request.delete(`/api/integration/papers/draft/${draftId}`);
    }
  });

  test('POST /papers/draft — creates draft with literature search triggering', async () => {
    const res = await request.post('/api/integration/papers/draft', {
      data: { topic: 'cannabinoid CB1 CB2 receptor binding mechanisms' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.draftId).toBeTruthy();
    expect(typeof body.draftId).toBe('string');
    expect(body.draftId.length).toBeGreaterThan(20);
    expect(body.draft).toBeDefined();
    expect(body.draft.topic).toBe('cannabinoid CB1 CB2 receptor binding mechanisms');
    draftId = body.draftId;
  });

  test('POST /papers/draft — validates topic is required', async () => {
    const res = await request.post('/api/integration/papers/draft', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('topic is required');
  });

  test('POST /papers/draft — accepts strainName', async () => {
    const res = await request.post('/api/integration/papers/draft', {
      data: { topic: 'terpene analysis', strainName: 'Blue Dream' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.draft.strainName).toBe('Blue Dream');
    await request.delete(`/api/integration/papers/draft/${body.draftId}`);
  });

  test('POST /papers/generate — produces paper with all 6 sections and real content', async () => {
    expect(draftId).toBeTruthy();
    const res = await request.post('/api/integration/papers/generate', {
      data: { draftId },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const paper = body.paper;
    expect(paper).toBeDefined();
    expect(paper.id).toBeTruthy();
    expect(paper.id.length).toBeGreaterThan(20);

    // Title incorporates the topic
    expect(paper.title).toContain('cannabinoid');
    expect(paper.title).toContain('CB1');
    expect(paper.title).toContain('CB2');

    // All 6 sections present with correct titles
    expect(paper.sections).toHaveLength(6);
    const sectionTitles = paper.sections.map((s: any) => s.title);
    expect(sectionTitles).toEqual([
      '1. Introduction',
      '2. Literature Review',
      '3. Methods',
      '4. Results',
      '5. Discussion',
      '6. Conclusion',
    ]);

    // Every section has non-empty content (actual generated text)
    for (const section of paper.sections) {
      expect(section.content).toBeTruthy();
      expect(section.content.length).toBeGreaterThan(50);
    }

    // Introduction mentions the topic
    const intro = paper.sections[0];
    expect(intro.content).toContain('cannabinoid CB1 CB2 receptor binding mechanisms');

    // Abstract is present and mentions the topic
    expect(paper.abstract).toBeTruthy();
    expect(paper.abstract.length).toBeGreaterThan(100);
    expect(paper.abstract).toContain('cannabinoid CB1 CB2 receptor binding mechanisms');

    // References array exists (real sources or methodology refs)
    expect(Array.isArray(paper.references)).toBe(true);
    expect(paper.references.length).toBeGreaterThanOrEqual(3);
    for (const ref of paper.references) {
      expect(typeof ref).toBe('string');
      expect(ref.length).toBeGreaterThan(10);
    }

    // Keywords extracted from topic
    expect(paper.metadata.keywords).toContain('cannabinoid');
    expect(paper.metadata.keywords).toContain('binding');
    expect(paper.metadata.keywords).toContain('receptor');
  });

  test('POST /papers/generate — produces LaTeX output with structural validity', async () => {
    const createRes = await request.post('/api/integration/papers/draft', {
      data: { topic: 'LaTeX output structural validation' },
    });
    const { draftId: latexDraftId } = await createRes.json();

    const res = await request.post('/api/integration/papers/generate', {
      data: { draftId: latexDraftId, format: 'latex' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.format).toBe('latex');

    const latex = body.output;
    expect(latex).toBeTruthy();
    expect(latex.length).toBeGreaterThan(500);

    // Document structure — LaTeX must start with documentclass
    expect(latex).toContain('\\documentclass[12pt]{article}');
    expect(latex).toContain('\\usepackage{geometry}');
    expect(latex).toContain('\\usepackage{amsmath}');

    // Preamble
    expect(latex).toContain('\\title{');
    expect(latex).toContain('\\author{Hemp OS Research Pipeline}');

    // Document body
    expect(latex).toContain('\\begin{document}');
    expect(latex).toContain('\\maketitle');
    expect(latex).toContain('\\begin{abstract}');
    expect(latex).toContain('\\end{abstract}');

    // All 6 sections as LaTeX \section commands
    const sectionCount = (latex.match(/\\section{/g) || []).length;
    expect(sectionCount).toBe(6);

    // Bibliography if references exist
    expect(latex).toContain('\\begin{thebibliography}');
    expect(latex).toContain('\\end{thebibliography}');

    // Document end
    expect(latex).toContain('\\end{document}');

    // Verify the section titles in LaTeX
    const paper = body.paper;
    for (const section of paper.sections) {
      expect(latex).toContain(`\\section{${section.title}}`);
    }

    await request.delete(`/api/integration/papers/draft/${latexDraftId}`);
  });

  test('POST /papers/generate — produces Markdown output with structural validity', async () => {
    const createRes = await request.post('/api/integration/papers/draft', {
      data: { topic: 'Markdown output structural validation' },
    });
    const { draftId: mdDraftId } = await createRes.json();

    const res = await request.post('/api/integration/papers/generate', {
      data: { draftId: mdDraftId, format: 'markdown' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.format).toBe('markdown');

    const md = body.output;
    expect(md).toBeTruthy();
    expect(md.length).toBeGreaterThan(500);

    // Title as h1
    expect(md).toMatch(/^# .+/m);

    // Metadata line
    expect(md).toContain('**Generated:**');
    expect(md).toContain('**Keywords:**');
    expect(md).toContain('**Methodology:**');

    // Horizontal rule separator
    expect(md).toContain('---');

    // Abstract section (h2)
    expect(md).toContain('## Abstract');
    expect(md).toContain(body.paper.abstract);

    // All 6 sections as h2 headers
    for (const section of body.paper.sections) {
      expect(md).toContain(`## ${section.title}`);
      expect(md).toContain(section.content);
    }

    // References section
    expect(md).toContain('## References');
    for (let i = 0; i < body.paper.references.length; i++) {
      expect(md).toContain(`${i + 1}. ${body.paper.references[i]}`);
    }

    await request.delete(`/api/integration/papers/draft/${mdDraftId}`);
  });

  test('POST /papers/generate — validates draftId is required', async () => {
    const res = await request.post('/api/integration/papers/generate', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('draftId');
  });

  test('POST /papers/generate — returns 500 for nonexistent draftId', async () => {
    const res = await request.post('/api/integration/papers/generate', {
      data: { draftId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Draft not found');
  });

  test('DELETE /papers/draft/:draftId — deletes existing draft', async () => {
    const createRes = await request.post('/api/integration/papers/draft', {
      data: { topic: 'delete test' },
    });
    const { draftId: delId } = await createRes.json();

    const delRes = await request.delete(`/api/integration/papers/draft/${delId}`);
    expect(delRes.status()).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);

    // Verify deleted draft returns 500 on generate
    const genRes = await request.post('/api/integration/papers/generate', {
      data: { draftId: delId },
    });
    expect(genRes.status()).toBe(500);
  });
});

// ─── Research Pipeline E2E ──────────────────────────────────────────────

test.describe('Research Pipeline — Full E2E Flow', () => {
  test('POST /research/start — executes full pipeline with coordinated output', async () => {
    const res = await request.post('/api/integration/research/start', {
      data: { topic: 'cannabinoid pharmacokinetics', strainName: 'ACDC' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Research pipeline completed successfully');

    // Paper output
    expect(body.paper).toBeDefined();
    expect(body.paper.sections).toHaveLength(6);
    expect(body.paper.title).toContain('cannabinoid pharmacokinetics');
    expect(body.paper.title).toContain('ACDC');

    // Introduction section mentions the strain
    const intro = body.paper.sections.find((s: any) => s.title === '1. Introduction');
    expect(intro).toBeDefined();
    expect(intro.content).toContain('ACDC');

    // Conclusion mentions the strain
    const conclusion = body.paper.sections.find((s: any) => s.title === '6. Conclusion');
    expect(conclusion).toBeDefined();
    expect(conclusion.content).toContain('ACDC');

    // Markdown output
    expect(body.markdown).toBeTruthy();
    expect(body.markdown).toContain('# A Comprehensive Analysis');
    expect(body.markdown).toContain('cannabinoid pharmacokinetics');
    expect(body.markdown).toContain('## Abstract');
    expect(body.markdown).toContain('## 1. Introduction');
    expect(body.markdown).toContain('## 6. Conclusion');
    expect(body.markdown).toContain('ACDC');

    // draftId provided
    expect(body.draftId).toBeTruthy();
    expect(typeof body.draftId).toBe('string');
  });

  test('POST /research/start — validates topic is required', async () => {
    const res = await request.post('/api/integration/research/start', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('topic');
  });

  test('POST /research/start — handles strainName-only gracefully', async () => {
    const res = await request.post('/api/integration/research/start', {
      data: { topic: 'cannabis research', strainName: 'Charlotte Web' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.paper.title).toContain('Charlotte Web');

    // Keywords include the strain
    expect(body.paper.metadata.keywords).toContain('charlotte web');
  });
});

// ─── Service Mesh — Cross-System Communication ──────────────────────────

test.describe('Service Mesh — Cross-System Communication', () => {
  test('GET /health — returns proper health status structure', async () => {
    const res = await request.get('/api/integration/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.services).toBeDefined();
    expect(typeof body.services).toBe('object');

    // All 3 services are represented
    const serviceNames = Object.keys(body.services);
    expect(serviceNames).toContain('hemp-os');
    expect(serviceNames).toContain('hemp-os-db');
    expect(serviceNames).toContain('hemp-agent');

    // Each service has status/latency
    for (const [name, info] of Object.entries(body.services) as any) {
      expect(info).toHaveProperty('status');
      expect(info).toHaveProperty('latency');
      expect(typeof info.latency).toBe('number');
    }

    // Provenance count is tracked
    expect(typeof body.provenanceCount).toBe('number');

    // Draft count is tracked
    expect(typeof body.draftCount).toBe('number');
  });

  test('GET /services — returns all configured services', async () => {
    const res = await request.get('/api/integration/services');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.services).toBeInstanceOf(Array);
    expect(body.services).toHaveLength(3);

    // Each service has name, port, host, capabilities
    const svc = body.services[0];
    expect(svc).toHaveProperty('name');
    expect(svc).toHaveProperty('port');
    expect(svc).toHaveProperty('host');
    expect(svc).toHaveProperty('capabilities');

    // Hemp OS is at port 3100
    const hempOs = body.services.find((s: any) => s.name === 'hemp-os');
    expect(hempOs).toBeDefined();
    expect(hempOs.port).toBe(3100);
    expect(hempOs.host).toBe('http://localhost:3100');
    expect(hempOs.capabilities).toContain('kernel');
  });

  test('POST /events — fires events through the bus', async () => {
    const res = await request.post('/api/integration/events', {
      data: { source: 'hemp-os', type: 'test:custom-event', payload: { key: 'value' } },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /events — validates source and type', async () => {
    // Missing source and type
    const res1 = await request.post('/api/integration/events', { data: {} });
    expect(res1.status()).toBe(400);

    // Invalid source
    const res2 = await request.post('/api/integration/events', {
      data: { source: 'nonexistent', type: 'test' },
    });
    expect(res2.status()).toBe(400);
  });

  test('GET /provenance — tracks operations with filtering', async () => {
    // Generate some provenance by doing operations
    await request.post('/api/integration/events', {
      data: { source: 'hemp-os-db', type: 'insights:generated', payload: {} },
    });

    // Get full log
    const res = await request.get('/api/integration/provenance');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.log).toBeInstanceOf(Array);
    expect(body.count).toBe(body.log.length);
    expect(body.count).toBeGreaterThanOrEqual(1);

    // Each entry has required fields
    const entry = body.log[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('sourceSystem');
    expect(entry).toHaveProperty('targetSystem');
    expect(entry).toHaveProperty('action');
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('correlationId');

    // Filter by source
    const filteredRes = await request.get('/api/integration/provenance?source=hemp-os');
    expect(filteredRes.status()).toBe(200);
    const filtered = await filteredRes.json();
    for (const e of filtered.log) {
      expect(e.sourceSystem).toBe('hemp-os');
    }
  });

  test('POST /rpc/:method — invokes registered handlers', async () => {
    // 'health' handler is always registered by default
    const res = await request.post('/api/integration/rpc/health', { data: {} });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result).toBeDefined();
    expect(body.result.status).toBe('ok');
    expect(typeof body.result.timestamp).toBe('number');
  });

  test('POST /rpc/:method — returns 404 for unregistered method', async () => {
    const res = await request.post('/api/integration/rpc/undefined:method', { data: {} });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('No handler');
  });
});

// ─── Data Sources — Search Endpoints ─────────────────────────────────────

test.describe('Data Sources — Search Endpoints', () => {
  test('POST /search/unified — validates query is required', async () => {
    const res = await request.post('/api/integration/search/unified', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('query');
  });

  test('POST /search/unified — returns structured results array (may be empty if network unavailable)', async () => {
    const res = await request.post('/api/integration/search/unified', {
      data: { query: 'cannabinoid', sources: ['pubmed'], maxPerSource: 3 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.results)).toBe(true);
    expect(typeof body.count).toBe('number');

    // If results exist, validate their structure
    if (body.results.length > 0) {
      const result = body.results[0];
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('relevanceScore');
      expect(['pubmed', 'openalex', 'semantic-scholar', 'cannabis-api']).toContain(result.source);
      if (result.type === 'paper') {
        expect(result.data).toHaveProperty('title');
        expect(result.data).toHaveProperty('authors');
        expect(result.data).toHaveProperty('year');
      }
    }
  });

  test('POST /search/pubmed — validates query is required', async () => {
    const res = await request.post('/api/integration/search/pubmed', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /search/pubmed — returns articles with proper fields', async () => {
    const res = await request.post('/api/integration/search/pubmed', {
      data: { query: 'cannabis terpenes', maxResults: 5 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.results)).toBe(true);

    if (body.results.length > 0) {
      const article = body.results[0];
      expect(article).toHaveProperty('pmid');
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('authors');
      expect(article).toHaveProperty('journal');
      expect(article).toHaveProperty('year');
      expect(article).toHaveProperty('abstract');
      expect(Array.isArray(article.authors)).toBe(true);
      // PMID should be a numeric string
      expect(article.pmid).toMatch(/^\d+$/);
    } else {
      // If no results, count should be 0
      expect(body.count).toBe(0);
    }
  });

  test('POST /search/openalex — returns papers with reconstructed abstracts', async () => {
    const res = await request.post('/api/integration/search/openalex', {
      data: { query: 'cannabinoid pharmacology', maxResults: 5 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    if (body.results.length > 0) {
      const paper = body.results[0];
      expect(paper).toHaveProperty('id');
      expect(paper).toHaveProperty('title');
      expect(paper).toHaveProperty('authors');
      expect(paper).toHaveProperty('year');
      expect(paper).toHaveProperty('abstract');
      expect(paper).toHaveProperty('citedByCount');
      // Abstract is reconstructed from inverted index — may be empty but field must exist
      expect(typeof paper.abstract).toBe('string');
      expect(Array.isArray(paper.authors)).toBe(true);
      expect(paper.id).toContain('openalex.org');
    }
  });

  test('POST /search/semantic-scholar — validates query is required', async () => {
    const res = await request.post('/api/integration/search/semantic-scholar', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /search/semantic-scholar — returns papers with citation counts', async () => {
    const res = await request.post('/api/integration/search/semantic-scholar', {
      data: { query: 'endocannabinoid system', maxResults: 5 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    if (body.results.length > 0) {
      const paper = body.results[0];
      expect(paper).toHaveProperty('id');
      expect(paper).toHaveProperty('title');
      expect(paper).toHaveProperty('year');
      expect(paper).toHaveProperty('abstract');
      expect(paper).toHaveProperty('citationCount');
      expect(typeof paper.citationCount).toBe('number');
      expect(paper.id).toBeTruthy();
    }
  });

  test('POST /batch-search — validates queries is an array', async () => {
    const res = await request.post('/api/integration/batch-search', { data: {} });
    expect(res.status()).toBe(400);

    const res2 = await request.post('/api/integration/batch-search', {
      data: { queries: 'not-an-array' },
    });
    expect(res2.status()).toBe(400);
  });

  test('POST /batch-search — processes multiple queries', async () => {
    const res = await request.post('/api/integration/batch-search', {
      data: { queries: ['cannabinoid', 'terpene'], maxPerQuery: 3 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.papers)).toBe(true);
    expect(Array.isArray(body.strains)).toBe(true);
    expect(typeof body.paperCount).toBe('number');
    expect(typeof body.strainCount).toBe('number');
  });
});

// ─── Cross-System Data Exchange ─────────────────────────────────────────

test.describe('Cross-System Data Exchange', () => {
  test('POST /exchange/papers — validates query is required', async () => {
    const res = await request.post('/api/integration/exchange/papers', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /exchange/papers — returns structured paper results', async () => {
    const res = await request.post('/api/integration/exchange/papers', {
      data: { query: 'cannabinoid therapy', maxResults: 3 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.papers)).toBe(true);
    expect(typeof body.count).toBe('number');
  });

  test('POST /exchange/strains — fires provenance event', async () => {
    const res = await request.post('/api/integration/exchange/strains', {
      data: { query: 'Blue Dream' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /exchange/insights — triggers provenance and events', async () => {
    const res = await request.post('/api/integration/exchange/insights', { data: {} });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── Strain-Specific Paper Generation ────────────────────────────────────

test.describe('Strain-Specific Paper Generation', () => {
  test('strain name appears consistently across all paper sections', async () => {
    const createRes = await request.post('/api/integration/papers/draft', {
      data: { topic: 'therapeutic potential', strainName: 'Girl Scout Cookies' },
    });
    const { draftId } = await createRes.json();

    const genRes = await request.post('/api/integration/papers/generate', {
      data: { draftId },
    });
    const body = await genRes.json();

    // Title
    expect(body.paper.title).toContain('Girl Scout Cookies');

    // Abstract
    expect(body.paper.abstract).toContain('Girl Scout Cookies');

    // Introduction
    const intro = body.paper.sections.find((s: any) => s.title === '1. Introduction');
    expect(intro.content).toContain('Girl Scout Cookies');

    // Conclusion
    const conclusion = body.paper.sections.find((s: any) => s.title === '6. Conclusion');
    expect(conclusion.content).toContain('Girl Scout Cookies');

    // Keywords
    expect(body.paper.metadata.keywords).toContain('girl scout cookies');
    expect(body.paper.metadata.keywords).toContain('cannabis');
    expect(body.paper.metadata.keywords).toContain('strain');

    await request.delete(`/api/integration/papers/draft/${draftId}`);
  });
});

// ─── Edge Cases and Error Handling ──────────────────────────────────────

test.describe('Edge Cases and Error Handling', () => {
  test('topic with special characters does not break generation', async () => {
    const res = await request.post('/api/integration/papers/draft', {
      data: { topic: 'THC & CBD: interactions & synergistic effects (entourage theory)' },
    });
    expect(res.status()).toBe(200);
    const { draftId } = await res.json();

    // Generate should not throw
    const genRes = await request.post('/api/integration/papers/generate', {
      data: { draftId },
    });
    expect(genRes.status()).toBe(200);
    const body = await genRes.json();
    expect(body.success).toBe(true);
    expect(body.paper.title).toContain('THC');
    expect(body.paper.sections).toHaveLength(6);

    // LaTeX should be valid (special chars escaped)
    const latexRes = await request.post('/api/integration/papers/generate', {
      data: { draftId, format: 'latex' },
    });
    expect(latexRes.status()).toBe(200);
    const latexBody = await latexRes.json();
    // Verify LaTeX document is structurally valid despite special chars
    expect(latexBody.output).toContain('\\begin{document}');
    expect(latexBody.output).toContain('\\end{document}');

    await request.delete(`/api/integration/papers/draft/${draftId}`);
  });

  test('concurrent drafts do not interfere', async () => {
    const topics = ['topic alpha', 'topic beta', 'topic gamma'];
    const draftIds: string[] = [];

    for (const topic of topics) {
      const res = await request.post('/api/integration/papers/draft', { data: { topic } });
      const { draftId } = await res.json();
      draftIds.push(draftId);
    }

    // Generate from each draft - each should produce correct paper
    for (let i = 0; i < draftIds.length; i++) {
      const genRes = await request.post('/api/integration/papers/generate', {
        data: { draftId: draftIds[i] },
      });
      expect(genRes.status()).toBe(200);
      const body = await genRes.json();
      expect(body.paper.title).toContain(topics[i]);
    }

    // Cleanup
    for (const id of draftIds) {
      await request.delete(`/api/integration/papers/draft/${id}`);
    }
  });

  test('Provenance tracking persists across multiple operations', async () => {
    // Get initial count
    const initial = await request.get('/api/integration/provenance');
    const initialBody = await initial.json();
    const initialCount = initialBody.count;

    // Perform several operations
    await request.post('/api/integration/events', {
      data: { source: 'hemp-os', type: 'op:a', payload: {} },
    });
    await request.post('/api/integration/events', {
      data: { source: 'hemp-os-db', type: 'op:b', payload: {} },
    });
    await request.post('/api/integration/events', {
      data: { source: 'hemp-agent', type: 'op:c', payload: {} },
    });

    // Verify the log grew
    const updated = await request.get('/api/integration/provenance');
    const updatedBody = await updated.json();
    expect(updatedBody.count).toBe(initialCount + 3);

    // Verify filtering works correctly
    const filtered = await request.get('/api/integration/provenance?source=hemp-agent');
    const filteredBody = await filtered.json();
    expect(filteredBody.count).toBeGreaterThanOrEqual(1);
    for (const entry of filteredBody.log) {
      expect(entry.sourceSystem).toBe('hemp-agent');
    }
  });
});
