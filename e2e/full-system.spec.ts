import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3100';

test.describe('Hemp OS Full System E2E', () => {
  test('loads the app and captures initial state', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await expect(page.locator('text=Hemp OS')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: false });
  });

  test('runs kernel simulation and captures results', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click the "Execute Run" button in the header
    const runBtn = page.locator('button:has-text("Execute Run")').first();
    await runBtn.click();

    // Wait for simulation to complete
    await page.waitForTimeout(3000);

    // Screenshot the simulation results area
    await page.screenshot({ path: 'test-results/02-kernel-simulation.png', fullPage: false });

    // Scroll down to see yield solver section
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/03-yield-results.png', fullPage: false });
  });

  test('navigates through all OS layers', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const layers = [
      { name: 'Scientific Scheduler', file: '04-scientific-scheduler' },
      { name: 'Scientific Memory', file: '05-scientific-memory' },
      { name: 'Ingestion Subsystem', file: '06-ingestion-subsystem' },
      { name: 'Scientific Filesystem', file: '07-scientific-filesystem' },
      { name: 'Security/Policy', file: '08-security-policy' },
      { name: 'Plugin/Driver', file: '09-plugin-driver' },
      { name: 'Networking', file: '10-networking' },
      { name: 'System Services', file: '11-system-services' },
      { name: 'Telemetry/Logging', file: '12-telemetry-logging' },
      { name: 'Scientific UI', file: '13-scientific-ui' },
      { name: 'Copilot Integration', file: '14-copilot-integration' },
    ];

    for (const layer of layers) {
      const btn = page.locator(`button:has-text("${layer.name}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `test-results/${layer.file}.png`, fullPage: false });
      }
    }
  });

  test('processes papers via API and shows results', async ({ request }) => {
    // Create a draft
    const draftRes = await request.post(`${BASE}/api/integration/papers/draft`, {
      data: { topic: 'cannabinoid extraction optimization using ethanol', strainName: 'Cherry Wine' },
    });
    expect(draftRes.status()).toBe(200);
    const { draftId } = await draftRes.json();

    // Generate paper
    const genRes = await request.post(`${BASE}/api/integration/papers/generate`, {
      data: { draftId },
    });
    expect(genRes.status()).toBe(200);
    const paper = await genRes.json();
    expect(paper.success).toBe(true);
    expect(paper.paper.sections).toHaveLength(6);

    // Generate LaTeX
    const latexRes = await request.post(`${BASE}/api/integration/papers/generate`, {
      data: { draftId, format: 'latex' },
    });
    expect(latexRes.status()).toBe(200);
    const latex = await latexRes.json();
    expect(latex.output).toContain('\\begin{document}');

    // Generate Markdown
    const mdRes = await request.post(`${BASE}/api/integration/papers/generate`, {
      data: { draftId, format: 'markdown' },
    });
    expect(mdRes.status()).toBe(200);
    const md = await mdRes.json();
    expect(md.output).toContain('# ');

    // Cleanup
    await request.delete(`${BASE}/api/integration/papers/draft/${draftId}`);
  });

  test('full research pipeline runs end-to-end', async ({ request }) => {
    const res = await request.post(`${BASE}/api/integration/research/start`, {
      data: { topic: 'terpene profiles in cannabis sativa', strainName: 'Blue Dream' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.paper.sections).toHaveLength(6);
    expect(body.paper.title).toContain('terpene');
    expect(body.paper.title).toContain('Blue Dream');
    expect(body.markdown).toContain('## Abstract');
  });

  test('searches academic sources', async ({ request }) => {
    // PubMed
    const pubmed = await request.post(`${BASE}/api/integration/search/pubmed`, {
      data: { query: 'cannabis cannabinoids', maxResults: 3 },
    });
    expect(pubmed.status()).toBe(200);
    const pubmedBody = await pubmed.json();
    expect(pubmedBody.success).toBe(true);

    // OpenAlex
    const openalex = await request.post(`${BASE}/api/integration/search/openalex`, {
      data: { query: 'cannabinoid pharmacology', maxResults: 3 },
    });
    expect(openalex.status()).toBe(200);
    const openalexBody = await openalex.json();
    expect(openalexBody.success).toBe(true);

    // Semantic Scholar
    const semantic = await request.post(`${BASE}/api/integration/search/semantic-scholar`, {
      data: { query: 'endocannabinoid system', maxResults: 3 },
    });
    expect(semantic.status()).toBe(200);
    const semanticBody = await semantic.json();
    expect(semanticBody.success).toBe(true);
  });

  test('kernel process API works correctly', async ({ request }) => {
    const graph = {
      stages: [
        { id: 'ext1', type: 'extraction', name: 'Ethanol Extraction', config: { solventType: 'Ethanol', solventRatio: 8, extractionTemp: -40, duration: 30 } },
        { id: 'win1', type: 'winterization', name: 'Winterization', config: { solventRatio: 5, coolingTemp: -40, coolingTime: 24, filtrationPasses: 1 } },
        { id: 'dec1', type: 'decarboxylation', name: 'Thermal Decarb', config: { temperature: 120, duration: 60 } },
        { id: 'dis1', type: 'distillation', name: 'Short Path', config: { evaporatorTemp: 185, condenserTemp: 70, vacuumPressure: 0.05, feedRate: 1.5 } },
      ],
      connections: [
        { from: 'ext1', to: 'win1' },
        { from: 'win1', to: 'dec1' },
        { from: 'dec1', to: 'dis1' },
      ],
    };
    const biomass = {
      id: 'test_01',
      name: 'Test Biomass',
      mass: 10,
      moisture: 10,
      waxContent: 4,
      potency: { thca: 14, thc: 0.25, cbda: 0.55, cbd: 0.05, cbga: 0.45, cbg: 0.05, other: 1.25 },
    };

    const res = await request.post(`${BASE}/api/kernel/process`, {
      data: { graph, biomass },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results.stages).toHaveLength(4);

    // Verify mass flows through pipeline
    const firstStage = body.results.stages[0];
    const lastStage = body.results.stages[body.results.stages.length - 1];
    expect(firstStage.outputMass).toBeGreaterThan(0);
    expect(lastStage.outputMass).toBeGreaterThan(0);
    expect(lastStage.metrics.yieldFraction).toBeGreaterThan(0);
    expect(lastStage.metrics.purityFraction).toBeGreaterThan(0);
  });

  test('service health and provenance tracking', async ({ request }) => {
    // Health
    const health = await request.get(`${BASE}/api/integration/health`);
    expect(health.status()).toBe(200);
    const healthBody = await health.json();
    expect(healthBody.status).toBe('ok');
    expect(healthBody.services).toHaveProperty('hemp-os');
    expect(healthBody.services).toHaveProperty('hemp-os-db');
    expect(healthBody.services).toHaveProperty('hemp-agent');

    // Services
    const services = await request.get(`${BASE}/api/integration/services`);
    expect(services.status()).toBe(200);
    const svcBody = await services.json();
    expect(svcBody.services).toHaveLength(3);

    // Events
    const event = await request.post(`${BASE}/api/integration/events`, {
      data: { source: 'hemp-os', type: 'e2e:test-event', payload: { test: true } },
    });
    expect(event.status()).toBe(200);

    // Provenance
    const prov = await request.get(`${BASE}/api/integration/provenance`);
    expect(prov.status()).toBe(200);
    const provBody = await prov.json();
    expect(provBody.count).toBeGreaterThan(0);
  });

  test('captures full page screenshot with simulation results', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Take a full page screenshot of Layer 1
    await page.screenshot({ path: 'test-results/15-layer1-fullpage.png', fullPage: true });
  });
});
