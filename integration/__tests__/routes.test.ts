import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { integrationRouter } from '../routes.js';
import { mesh } from '../service-mesh.js';
import { paperGenerator } from '../paper-generator.js';

// Mock external data sources to avoid HTTP calls
vi.mock('../data-sources.js', () => ({
  unifiedSearch: vi.fn(async () => []),
  batchSearchAndConvert: vi.fn(async () => ({ papers: [], strains: [] })),
  searchPubMed: vi.fn(async () => []),
  searchOpenAlex: vi.fn(async () => []),
  searchSemanticScholar: vi.fn(async () => []),
}));

// Mock mesh RPC to avoid real HTTP calls
vi.mock('../service-mesh.js', () => {
  const rpcHandlers = new Map<string, (...args: any[]) => any>();
  rpcHandlers.set('health', async () => ({ status: 'ok', timestamp: Date.now() }));

  return {
    mesh: {
      rpc: vi.fn(async (method: string) => {
        const handler = rpcHandlers.get(method);
        if (!handler) {throw new Error(`No handler for: ${method}`);}
        return handler({ id: '1', source: 'hemp-os', target: 'hemp-os', method, params: {}, timestamp: Date.now() });
      }),
      logProvenance: vi.fn(),
      fireEvent: vi.fn(),
      checkAllHealth: vi.fn(async () => ({
        'hemp-os': { status: 'healthy', latency: 10 },
        'hemp-os-db': { status: 'healthy', latency: 15 },
        'hemp-agent': { status: 'healthy', latency: 20 },
      })),
      getProvenanceLog: vi.fn(() => []),
      getServices: vi.fn(() => new Map()),
      rpcHandlers,
    },
  };
});

// We need to re-import after mocks to get mocked versions
const { mesh: mockedMesh } = await import('../service-mesh.js');
const { paperGenerator: mockedPaperGen } = await import('../paper-generator.js');

describe('Integration Routes (E2E)', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/integration', integrationRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Reset mocks
    vi.mocked(mockedMesh.logProvenance).mockClear();
    vi.mocked(mockedMesh.fireEvent).mockClear();
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(resolve));
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await fetch(`${baseUrl}/api/integration/health`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.services).toBeDefined();
    });
  });

  describe('GET /services', () => {
    it('should return list of services', async () => {
      const res = await fetch(`${baseUrl}/api/integration/services`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.services).toBeInstanceOf(Array);
      expect(body.services.length).toBe(3);
    });
  });

  describe('POST /events', () => {
    it('should fire an event', async () => {
      const res = await fetch(`${baseUrl}/api/integration/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'hemp-os',
          type: 'test:event',
          payload: { key: 'value' },
        }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should reject invalid source', async () => {
      const res = await fetch(`${baseUrl}/api/integration/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'invalid',
          type: 'test',
          payload: {},
        }),
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing source/type', async () => {
      const res = await fetch(`${baseUrl}/api/integration/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /provenance', () => {
    it('should return provenance log', async () => {
      const res = await fetch(`${baseUrl}/api/integration/provenance`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.log).toBeInstanceOf(Array);
    });
  });

  describe('POST /search/unified', () => {
    it('should reject missing query', async () => {
      const res = await fetch(`${baseUrl}/api/integration/search/unified`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('should return results array', async () => {
      const res = await fetch(`${baseUrl}/api/integration/search/unified`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'cannabis' }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.results).toBeInstanceOf(Array);
    });
  });

  describe('POST /papers/draft', () => {
    it('should create a paper draft', async () => {
      const res = await fetch(`${baseUrl}/api/integration/papers/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cannabinoid research' }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.draftId).toBeTruthy();
    });

    it('should reject missing topic', async () => {
      const res = await fetch(`${baseUrl}/api/integration/papers/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /papers/generate', () => {
    it('should generate a paper from a draft', async () => {
      // First create a draft
      const draftRes = await fetch(`${baseUrl}/api/integration/papers/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'test' }),
      });
      const { draftId } = await draftRes.json();

      const res = await fetch(`${baseUrl}/api/integration/papers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.paper).toBeDefined();
      expect(body.output).toBeTruthy();
      expect(body.format).toBe('markdown');
    });

    it('should generate LaTeX format', async () => {
      const draftRes = await fetch(`${baseUrl}/api/integration/papers/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'test' }),
      });
      const { draftId } = await draftRes.json();

      const res = await fetch(`${baseUrl}/api/integration/papers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, format: 'latex' }),
      });
      const body = await res.json();
      expect(body.format).toBe('latex');
      expect(body.output).toContain('\\documentclass');
    });

    it('should reject missing draftId', async () => {
      const res = await fetch(`${baseUrl}/api/integration/papers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /papers/draft/:draftId', () => {
    it('should delete a draft', async () => {
      const draftRes = await fetch(`${baseUrl}/api/integration/papers/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'delete me' }),
      });
      const { draftId } = await draftRes.json();

      const res = await fetch(`${baseUrl}/api/integration/papers/draft/${draftId}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /research/start', () => {
    it('should run the full research pipeline', async () => {
      const res = await fetch(`${baseUrl}/api/integration/research/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cannabinoid therapy' }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.paper).toBeDefined();
      expect(body.paper.sections.length).toBe(6);
      expect(body.markdown).toBeTruthy();
      expect(body.draftId).toBeTruthy();
    });

    it('should reject missing topic', async () => {
      const res = await fetch(`${baseUrl}/api/integration/research/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('should log provenance for pipeline start and completion', async () => {
      await fetch(`${baseUrl}/api/integration/research/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'test' }),
      });

      expect(mockedMesh.logProvenance).toHaveBeenCalledWith(
        'hemp-os',
        'research-pipeline',
        'start',
        expect.objectContaining({ topic: 'test' })
      );
      expect(mockedMesh.logProvenance).toHaveBeenCalledWith(
        'hemp-os',
        'research-pipeline',
        'complete',
        expect.objectContaining({ paperId: expect.any(String) })
      );
    });
  });

  describe('POST /exchange/papers', () => {
    it('should reject missing query', async () => {
      const res = await fetch(`${baseUrl}/api/integration/exchange/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /batch-search', () => {
    it('should reject non-array queries', async () => {
      const res = await fetch(`${baseUrl}/api/integration/batch-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: 'not-array' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /rpc/:method', () => {
    it('should return 404 for unknown method', async () => {
      const res = await fetch(`${baseUrl}/api/integration/rpc/nonexistent:method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });

    it('should invoke registered handler', async () => {
      const res = await fetch(`${baseUrl}/api/integration/rpc/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
