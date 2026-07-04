import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/AppError.ts';

const mockEnv = vi.hoisted(() => ({
  ALLOWED_OLLAMA_HOSTS: ['http://localhost:11434'] as string[],
}));
vi.mock('../../config/env.ts', () => ({
  env: mockEnv,
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

import { OllamaService } from '../../services/ollama.service.ts';

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function textResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => { throw new Error('not json'); },
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.ALLOWED_OLLAMA_HOSTS = ['http://localhost:11434'];
    mockFetch.mockReset();
    service = new OllamaService();
  });

  describe('constructor', () => {
    it('should create with default allowed host', () => {
      expect(service).toBeDefined();
    });

    it('should throw if no allowed hosts configured', () => {
      mockEnv.ALLOWED_OLLAMA_HOSTS = [];
      expect(() => new OllamaService()).toThrow(AppError);
    });
  });

  describe('health', () => {
    it('should return ok status with model count', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'llama3' }, { name: 'mistral' }] }));
      const result = await service.health();
      expect(result.ok).toBe(true);
      expect(result.modelCount).toBe(2);
      expect(result.baseUrl).toContain('localhost');
    });

    it('should return 0 model count when models array is empty', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ models: [] }));
      const result = await service.health();
      expect(result.modelCount).toBe(0);
    });

    it('should return 0 model count when models is missing', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const result = await service.health();
      expect(result.modelCount).toBe(0);
    });
  });

  describe('getTags', () => {
    it('should return tags data', async () => {
      const tagsData = { models: [{ name: 'llama3', size: 1000 }] };
      mockFetch.mockResolvedValueOnce(jsonResponse(tagsData));
      const result = await service.getTags();
      expect(result).toEqual(tagsData);
    });
  });

  describe('showModel', () => {
    it('should return model info', async () => {
      const modelInfo = { modelfamily: 'llama', parameters: '7B' };
      mockFetch.mockResolvedValueOnce(jsonResponse(modelInfo));
      const result = await service.showModel({ model: 'llama3' });
      expect(result).toEqual(modelInfo);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/show'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw when model is empty', async () => {
      await expect(service.showModel({ model: '' })).rejects.toThrow(AppError);
    });
  });

  describe('pullModel', () => {
    it('should send pull request', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'success' }));
      const result = await service.pullModel({ model: 'llama3' });
      expect(result).toEqual({ status: 'success' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe('llama3');
      expect(body.stream).toBe(false);
    });

    it('should throw when model is empty', async () => {
      await expect(service.pullModel({ model: '' })).rejects.toThrow(AppError);
    });
  });

  describe('deleteModel', () => {
    it('should send delete request', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      await service.deleteModel({ model: 'llama3' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/delete'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should throw when model is empty', async () => {
      await expect(service.deleteModel({ model: '' })).rejects.toThrow(AppError);
    });
  });

  describe('generate', () => {
    it('should send generate request with defaults', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ response: 'hello' }));
      const result = await service.generate({ model: 'llama3', prompt: 'hi' });
      expect(result).toEqual({ response: 'hello' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.stream).toBe(false);
    });

    it('should throw when model is missing', async () => {
      await expect(service.generate({ model: '', prompt: 'hi' })).rejects.toThrow(AppError);
    });

    it('should throw when prompt is missing', async () => {
      await expect(service.generate({ model: 'llama3', prompt: '' })).rejects.toThrow(AppError);
    });
  });

  describe('chat', () => {
    it('should send chat request with stream false', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: { role: 'assistant', content: 'hi' } }));
      const result = await service.chat({
        model: 'llama3',
        messages: [{ role: 'user', content: 'hello' }],
      });
      expect(result.message.content).toBe('hi');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.stream).toBe(false);
    });

    it('should throw when model is missing', async () => {
      await expect(service.chat({ model: '', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(AppError);
    });

    it('should throw when messages is empty', async () => {
      await expect(service.chat({ model: 'llama3', messages: [] })).rejects.toThrow(AppError);
    });

    it('should throw when messages is not an array', async () => {
      await expect(service.chat({ model: 'llama3', messages: 'invalid' as any })).rejects.toThrow(AppError);
    });
  });

  describe('chatStream', () => {
    it('should return raw response for streaming', async () => {
      const streamResponse = jsonResponse({ message: { role: 'assistant', content: 'streaming' } });
      mockFetch.mockResolvedValueOnce(streamResponse);
      const result = await service.chatStream({
        model: 'llama3',
        messages: [{ role: 'user', content: 'hello' }],
      });
      expect(result).toBeDefined();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.stream).toBe(true);
    });

    it('should throw when model is missing', async () => {
      await expect(service.chatStream({ model: '', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(AppError);
    });
  });

  describe('embeddings', () => {
    it('should return embedding data', async () => {
      const embedData = { embedding: [0.1, 0.2, 0.3] };
      mockFetch.mockResolvedValueOnce(jsonResponse(embedData));
      const result = await service.embeddings({ model: 'nomic-embed-text', input: 'hello' });
      expect(result).toEqual(embedData);
    });

    it('should throw when model is missing', async () => {
      await expect(service.embeddings({ model: '', input: 'hello' })).rejects.toThrow(AppError);
    });

    it('should throw when input is missing', async () => {
      await expect(service.embeddings({ model: 'nomic', input: '' })).rejects.toThrow(AppError);
    });
  });

  describe('openAiChatCompletions', () => {
    it('should proxy to OpenAI-compatible endpoint', async () => {
      const completionData = { choices: [{ message: { content: 'done' } }] };
      mockFetch.mockResolvedValueOnce(jsonResponse(completionData));
      const result = await service.openAiChatCompletions({
        model: 'llama3',
        messages: [{ role: 'user', content: 'hi' }],
      });
      expect(result).toEqual(completionData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/chat/completions'),
        expect.anything()
      );
    });
  });

  describe('custom URL', () => {
    it('should use custom url when provided', async () => {
      mockEnv.ALLOWED_OLLAMA_HOSTS = ['http://localhost:11434', 'http://remote-host:11434'];
      mockFetch.mockResolvedValueOnce(jsonResponse({ models: [] }));
      await service.health('http://remote-host:11434');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('remote-host'),
        expect.anything()
      );
    });

    it('should reject disallowed host', async () => {
      await expect(service.health('http://evil.com:11434')).rejects.toThrow(AppError);
    });
  });

  describe('error handling', () => {
    it('should throw AppError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500, { error: 'server error' }));
      await expect(service.getTags()).rejects.toThrow(AppError);
    });

    it('should handle non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce(textResponse(500, 'plain text error'));
      await expect(service.getTags()).rejects.toThrow(AppError);
    });

    it('should handle malformed JSON error body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('not-json'),
      } as unknown as Response);
      await expect(service.getTags()).rejects.toThrow(AppError);
    });
  });
});
