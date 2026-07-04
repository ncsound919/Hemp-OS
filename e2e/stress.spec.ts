import { test, expect, type APIRequestContext } from '@playwright/test';
import { startTestServer } from './test-server';
import type { Server } from 'http';

let server: Server;
let request: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  server = await startTestServer(3457);
  request = await playwright.request.newContext({ baseURL: 'http://localhost:3457' });
});

test.afterAll(async () => {
  await request.dispose();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test.describe('Stress — Concurrent Operations', () => {
  test('5 concurrent draft creations all succeed', async () => {
    const topics = ['stress A', 'stress B', 'stress C', 'stress D', 'stress E'];
    const responses = await Promise.all(
      topics.map(topic =>
        request.post('/api/integration/papers/draft', { data: { topic } })
      )
    );
    expect(responses).toHaveLength(5);
    for (const res of responses) {
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.draftId).toBeTruthy();
    }
    const draftIds: string[] = [];
    for (const res of responses) {
      const body = await res.json();
      draftIds.push(body.draftId);
    }
    for (const id of draftIds) {
      await request.delete(`/api/integration/papers/draft/${id}`);
    }
  });

  test('10 concurrent RPC health calls do not error', async () => {
    const calls = Array.from({ length: 10 }, () =>
      request.post('/api/integration/rpc/health', { data: {} })
    );
    const results = await Promise.all(calls);
    for (const res of results) {
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });
});

test.describe('Stress — Large Payloads', () => {
  test('topic with 5000+ characters is accepted', async () => {
    const longTopic = 'cannabinoid research ' + 'x'.repeat(5000);
    const res = await request.post('/api/integration/papers/draft', {
      data: { topic: longTopic },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    await request.delete(`/api/integration/papers/draft/${body.draftId}`);
  });

  test('batch search with 20 queries', async () => {
    const queries = Array.from({ length: 20 }, (_, i) => `cannabinoid query ${i}`);
    const res = await request.post('/api/integration/batch-search', {
      data: { queries, maxPerQuery: 2 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

test.describe('Stress — Provenance Growth', () => {
  test('emit 30 events then verify provenance log', async () => {
    const events = Array.from({ length: 30 }, (_, i) => ({
      source: 'hemp-os' as const,
      type: `stress:event-${i}`,
      payload: { index: i },
    }));
    for (const evt of events) {
      const res = await request.post('/api/integration/events', { data: evt });
      expect(res.status()).toBe(200);
    }

    const provRes = await request.get('/api/integration/provenance');
    expect(provRes.status()).toBe(200);
    const provBody = await provRes.json();
    expect(provBody.count).toBeGreaterThanOrEqual(30);
  });

  test('provenance filtering still works after many events', async () => {
    const filtered = await request.get('/api/integration/provenance?source=hemp-os&limit=5');
    expect(filtered.status()).toBe(200);
    const body = await filtered.json();
    expect(body.log.length).toBeLessThanOrEqual(5);
    for (const entry of body.log) {
      expect(entry.sourceSystem).toBe('hemp-os');
    }
  });
});

test.describe('Stress — Rapid Sequential Operations', () => {
  test('10 rapid create-generate-delete cycles', async () => {
    for (let i = 0; i < 10; i++) {
      const createRes = await request.post('/api/integration/papers/draft', {
        data: { topic: `rapid cycle ${i}` },
      });
      expect(createRes.status()).toBe(200);
      const { draftId } = await createRes.json();

      const genRes = await request.post('/api/integration/papers/generate', {
        data: { draftId },
      });
      expect(genRes.status()).toBe(200);
      const genBody = await genRes.json();
      expect(genBody.success).toBe(true);

      const delRes = await request.delete(`/api/integration/papers/draft/${draftId}`);
      expect(delRes.status()).toBe(200);
    }
  });
});

test.describe('Stress — Draft Eviction', () => {
  test('creating 95+ drafts triggers eviction of oldest', async () => {
    const draftIds: string[] = [];
    for (let i = 0; i < 95; i++) {
      const res = await request.post('/api/integration/papers/draft', {
        data: { topic: `eviction test draft ${i}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      draftIds.push(body.draftId);
    }
    expect(draftIds.length).toBe(95);

    await request.post('/api/integration/papers/draft', {
      data: { topic: 'eviction trigger final' },
    });

    for (const id of draftIds) {
      await request.delete(`/api/integration/papers/draft/${id}`).catch(() => {});
    }
  });
});

test.describe('Stress — Input Validation Under Load', () => {
  test('malformed JSON bodies return 400', async () => {
    const res = await request.post('/api/integration/papers/draft', {
      data: null as any,
    });
    expect(res.status()).toBe(400);
  });

  test('empty events return 400', async () => {
    const res = await request.post('/api/integration/events', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('extremely long source string is rejected', async () => {
    const longSource = 'a'.repeat(1000);
    const res = await request.post('/api/integration/events', {
      data: { source: longSource, type: 'test' },
    });
    expect(res.status()).toBe(400);
  });
});
