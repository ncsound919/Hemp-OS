import { describe, it, expect } from 'vitest';
import {
  getTagsSchema,
  ollamaChatSchema,
} from '../../schemas/ollama.schema.ts';
import { kernelProcessSchema } from '../../schemas/kernel.schema.ts';
import { scrapeSchema, ingestSchema } from '../../schemas/ingest.schema.ts';
import {
  authHeaderSchema,
  listDriveSchema,
  createFolderSchema,
  uploadDriveSchema,
} from '../../schemas/drive.schema.ts';
import { aiAssistSchema } from '../../schemas/ai.schema.ts';

describe('Ollama Schemas', () => {
  describe('getTagsSchema', () => {
    it('accepts empty optional url', () => {
      const result = getTagsSchema.safeParse({ body: {}, params: {}, headers: {}, query: {} });
      expect(result.success).toBe(true);
    });

    it('accepts valid url', () => {
      const result = getTagsSchema.safeParse({ body: {}, params: {}, headers: {}, query: { url: 'http://localhost:11434' } });
      expect(result.success).toBe(true);
    });

    it('rejects invalid url', () => {
      const result = getTagsSchema.safeParse({ body: {}, params: {}, headers: {}, query: { url: 'not-a-url' } });
      expect(result.success).toBe(false);
    });
  });

  describe('ollamaChatSchema', () => {
    const validBody = {
      model: 'llama3',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };

    it('accepts minimal valid body', () => {
      const result = ollamaChatSchema.safeParse({
        body: validBody,
        query: {},
        params: {},
        headers: {},
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty model', () => {
      const result = ollamaChatSchema.safeParse({
        body: { ...validBody, model: '' },
        query: {},
        params: {},
        headers: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty messages array', () => {
      const result = ollamaChatSchema.safeParse({
        body: { ...validBody, messages: [] },
        query: {},
        params: {},
        headers: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid message role', () => {
      const result = ollamaChatSchema.safeParse({
        body: { ...validBody, messages: [{ role: 'invalid', content: 'Hi' }] },
        query: {},
        params: {},
        headers: {},
      });
      expect(result.success).toBe(false);
    });

    it('accepts all optional fields', () => {
      const result = ollamaChatSchema.safeParse({
        body: {
          ...validBody,
          stream: true,
          format: 'json',
          options: { temperature: 0.7 },
          tools: [{ type: 'function' }],
          keep_alive: '5m',
          url: 'http://localhost:11434',
        },
        query: {},
        params: {},
        headers: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts numeric keep_alive', () => {
      const result = ollamaChatSchema.safeParse({
        body: { ...validBody, keep_alive: 300 },
        query: {},
        params: {},
        headers: {},
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Kernel Schema', () => {
  const validBody = {
    graph: {
      stages: [
        { id: 's1', type: 'extraction', config: { temp: 60 } },
      ],
    },
    biomass: { name: 'hemp' },
  };

  it('accepts minimal valid body', () => {
    const result = kernelProcessSchema.safeParse({
      body: validBody,
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty stages', () => {
    const result = kernelProcessSchema.safeParse({
      body: { ...validBody, graph: { stages: [] } },
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid stage type', () => {
    const result = kernelProcessSchema.safeParse({
      body: {
        ...validBody,
        graph: { stages: [{ id: 's1', type: 'invalid', config: {} }] },
      },
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional stage name', () => {
    const result = kernelProcessSchema.safeParse({
      body: {
        ...validBody,
        graph: {
          stages: [{ id: 's1', name: 'Stage 1', type: 'extraction', config: {} }],
        },
      },
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(true);
  });
});

describe('Ingest Schemas', () => {
  describe('scrapeSchema', () => {
    it('accepts empty body', () => {
      const result = scrapeSchema.safeParse({ body: {} });
      expect(result.success).toBe(true);
    });

    it('accepts target and query', () => {
      const result = scrapeSchema.safeParse({ body: { target: 'leafly', query: 'OG Kush' } });
      expect(result.success).toBe(true);
    });
  });

  describe('ingestSchema', () => {
    const validBody = { fileId: 'abc', fileName: 'doc.pdf', mimeType: 'application/pdf' };

    it('accepts valid body', () => {
      const result = ingestSchema.safeParse({
        body: validBody,
        headers: { authorization: 'Bearer token123' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing fileId', () => {
      const result = ingestSchema.safeParse({
        body: { fileName: 'doc.pdf', mimeType: 'application/pdf' },
        headers: { authorization: 'Bearer token123' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing authorization', () => {
      const result = ingestSchema.safeParse({ body: validBody, headers: {} });
      expect(result.success).toBe(false);
    });
  });
});

describe('Drive Schemas', () => {
  describe('authHeaderSchema', () => {
    it('accepts non-empty string', () => {
      expect(authHeaderSchema.safeParse('Bearer tok').success).toBe(true);
    });

    it('rejects empty string', () => {
      expect(authHeaderSchema.safeParse('').success).toBe(false);
    });
  });

  describe('listDriveSchema', () => {
    it('accepts with folderId', () => {
      const result = listDriveSchema.safeParse({
        body: {},
        params: {},
        query: { folderId: 'folder-123' },
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts without folderId', () => {
      const result = listDriveSchema.safeParse({
        body: {},
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing auth', () => {
      const result = listDriveSchema.safeParse({
        body: {},
        params: {},
        query: {},
        headers: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createFolderSchema', () => {
    it('accepts valid body', () => {
      const result = createFolderSchema.safeParse({
        body: { name: 'Test Folder' },
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = createFolderSchema.safeParse({
        body: { name: '' },
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional parentId', () => {
      const result = createFolderSchema.safeParse({
        body: { name: 'Sub', parentId: 'parent-1' },
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('uploadDriveSchema', () => {
    const validUpload = { name: 'file.txt', content: 'hello world' };

    it('accepts valid upload', () => {
      const result = uploadDriveSchema.safeParse({
        body: validUpload,
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(true);
    });

    it('defaults mimeType to text/plain', () => {
      const result = uploadDriveSchema.safeParse({
        body: validUpload,
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.mimeType).toBe('text/plain');
      }
    });

    it('rejects empty content', () => {
      const result = uploadDriveSchema.safeParse({
        body: { ...validUpload, content: '' },
        params: {},
        query: {},
        headers: { authorization: 'tok' },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AI Schema', () => {
  it('accepts minimal body', () => {
    const result = aiAssistSchema.safeParse({
      body: { prompt: 'What is distillation?' },
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty prompt', () => {
    const result = aiAssistSchema.safeParse({
      body: { prompt: '' },
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = aiAssistSchema.safeParse({
      body: {
        prompt: 'Help',
        graph: { stages: [] },
        currentResults: { yield: 95 },
        selectedBiomassName: 'OG Kush',
      },
      query: {},
      params: {},
      headers: {},
    });
    expect(result.success).toBe(true);
  });
});
