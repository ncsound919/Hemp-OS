# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\full-system.spec.ts >> Hemp OS Full System E2E >> kernel process API works correctly
- Location: e2e\full-system.spec.ts:137:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Test source

```ts
  63  |     const draftRes = await request.post(`${BASE}/api/integration/papers/draft`, {
  64  |       data: { topic: 'cannabinoid extraction optimization using ethanol', strainName: 'Cherry Wine' },
  65  |     });
  66  |     expect(draftRes.status()).toBe(200);
  67  |     const { draftId } = await draftRes.json();
  68  | 
  69  |     // Generate paper
  70  |     const genRes = await request.post(`${BASE}/api/integration/papers/generate`, {
  71  |       data: { draftId },
  72  |     });
  73  |     expect(genRes.status()).toBe(200);
  74  |     const paper = await genRes.json();
  75  |     expect(paper.success).toBe(true);
  76  |     expect(paper.paper.sections).toHaveLength(6);
  77  | 
  78  |     // Generate LaTeX
  79  |     const latexRes = await request.post(`${BASE}/api/integration/papers/generate`, {
  80  |       data: { draftId, format: 'latex' },
  81  |     });
  82  |     expect(latexRes.status()).toBe(200);
  83  |     const latex = await latexRes.json();
  84  |     expect(latex.output).toContain('\\begin{document}');
  85  | 
  86  |     // Generate Markdown
  87  |     const mdRes = await request.post(`${BASE}/api/integration/papers/generate`, {
  88  |       data: { draftId, format: 'markdown' },
  89  |     });
  90  |     expect(mdRes.status()).toBe(200);
  91  |     const md = await mdRes.json();
  92  |     expect(md.output).toContain('# ');
  93  | 
  94  |     // Cleanup
  95  |     await request.delete(`${BASE}/api/integration/papers/draft/${draftId}`);
  96  |   });
  97  | 
  98  |   test('full research pipeline runs end-to-end', async ({ request }) => {
  99  |     const res = await request.post(`${BASE}/api/integration/research/start`, {
  100 |       data: { topic: 'terpene profiles in cannabis sativa', strainName: 'Blue Dream' },
  101 |     });
  102 |     expect(res.status()).toBe(200);
  103 |     const body = await res.json();
  104 |     expect(body.success).toBe(true);
  105 |     expect(body.paper.sections).toHaveLength(6);
  106 |     expect(body.paper.title).toContain('terpene');
  107 |     expect(body.paper.title).toContain('Blue Dream');
  108 |     expect(body.markdown).toContain('## Abstract');
  109 |   });
  110 | 
  111 |   test('searches academic sources', async ({ request }) => {
  112 |     // PubMed
  113 |     const pubmed = await request.post(`${BASE}/api/integration/search/pubmed`, {
  114 |       data: { query: 'cannabis cannabinoids', maxResults: 3 },
  115 |     });
  116 |     expect(pubmed.status()).toBe(200);
  117 |     const pubmedBody = await pubmed.json();
  118 |     expect(pubmedBody.success).toBe(true);
  119 | 
  120 |     // OpenAlex
  121 |     const openalex = await request.post(`${BASE}/api/integration/search/openalex`, {
  122 |       data: { query: 'cannabinoid pharmacology', maxResults: 3 },
  123 |     });
  124 |     expect(openalex.status()).toBe(200);
  125 |     const openalexBody = await openalex.json();
  126 |     expect(openalexBody.success).toBe(true);
  127 | 
  128 |     // Semantic Scholar
  129 |     const semantic = await request.post(`${BASE}/api/integration/search/semantic-scholar`, {
  130 |       data: { query: 'endocannabinoid system', maxResults: 3 },
  131 |     });
  132 |     expect(semantic.status()).toBe(200);
  133 |     const semanticBody = await semantic.json();
  134 |     expect(semanticBody.success).toBe(true);
  135 |   });
  136 | 
  137 |   test('kernel process API works correctly', async ({ request }) => {
  138 |     const graph = {
  139 |       stages: [
  140 |         { id: 'ext1', type: 'extraction', name: 'Ethanol Extraction', config: { solventType: 'Ethanol', solventRatio: 8, extractionTemp: -40, duration: 30 } },
  141 |         { id: 'win1', type: 'winterization', name: 'Winterization', config: { solventRatio: 5, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 } },
  142 |         { id: 'dec1', type: 'decarboxylation', name: 'Thermal Decarb', config: { temperature: 120, duration: 60 } },
  143 |         { id: 'dis1', type: 'distillation', name: 'Short Path', config: { evaporatorTemp: 185, condenserTemp: 70, vacuumPressure: 0.05, feedRate: 1.5 } },
  144 |       ],
  145 |       connections: [
  146 |         { from: 'ext1', to: 'win1' },
  147 |         { from: 'win1', to: 'dec1' },
  148 |         { from: 'dec1', to: 'dis1' },
  149 |       ],
  150 |     };
  151 |     const biomass = {
  152 |       id: 'test_01',
  153 |       name: 'Test Biomass',
  154 |       mass: 10,
  155 |       moisture: 10,
  156 |       waxContent: 4,
  157 |       potency: { thca: 14, thc: 0.25, cbda: 0.55, cbd: 0.05, cbga: 0.45, cbg: 0.05, other: 1.25 },
  158 |     };
  159 | 
  160 |     const res = await request.post(`${BASE}/api/kernel/process`, {
  161 |       data: { graph, biomass },
  162 |     });
> 163 |     expect(res.status()).toBe(200);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  164 |     const body = await res.json();
  165 |     expect(body.success).toBe(true);
  166 |     expect(body.results.stages).toHaveLength(4);
  167 | 
  168 |     // Verify mass flows through pipeline
  169 |     const firstStage = body.results.stages[0];
  170 |     const lastStage = body.results.stages[body.results.stages.length - 1];
  171 |     expect(firstStage.outputMass).toBeGreaterThan(0);
  172 |     expect(lastStage.outputMass).toBeGreaterThan(0);
  173 |     expect(lastStage.metrics.yieldFraction).toBeGreaterThan(0);
  174 |     expect(lastStage.metrics.purityFraction).toBeGreaterThan(0);
  175 |   });
  176 | 
  177 |   test('service health and provenance tracking', async ({ request }) => {
  178 |     // Health
  179 |     const health = await request.get(`${BASE}/api/integration/health`);
  180 |     expect(health.status()).toBe(200);
  181 |     const healthBody = await health.json();
  182 |     expect(healthBody.status).toBe('ok');
  183 |     expect(healthBody.services).toHaveProperty('hemp-os');
  184 |     expect(healthBody.services).toHaveProperty('hemp-os-db');
  185 |     expect(healthBody.services).toHaveProperty('hemp-agent');
  186 | 
  187 |     // Services
  188 |     const services = await request.get(`${BASE}/api/integration/services`);
  189 |     expect(services.status()).toBe(200);
  190 |     const svcBody = await services.json();
  191 |     expect(svcBody.services).toHaveLength(3);
  192 | 
  193 |     // Events
  194 |     const event = await request.post(`${BASE}/api/integration/events`, {
  195 |       data: { source: 'hemp-os', type: 'e2e:test-event', payload: { test: true } },
  196 |     });
  197 |     expect(event.status()).toBe(200);
  198 | 
  199 |     // Provenance
  200 |     const prov = await request.get(`${BASE}/api/integration/provenance`);
  201 |     expect(prov.status()).toBe(200);
  202 |     const provBody = await prov.json();
  203 |     expect(provBody.count).toBeGreaterThan(0);
  204 |   });
  205 | 
  206 |   test('captures full page screenshot with simulation results', async ({ page }) => {
  207 |     await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  208 |     await page.waitForTimeout(4000);
  209 | 
  210 |     // Take a full page screenshot of Layer 1
  211 |     await page.screenshot({ path: 'test-results/15-layer1-fullpage.png', fullPage: true });
  212 |   });
  213 | });
  214 | 
```