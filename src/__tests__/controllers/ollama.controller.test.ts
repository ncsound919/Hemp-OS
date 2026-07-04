import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { mockGetTags, mockChat } = vi.hoisted(() => ({
  mockGetTags: vi.fn(),
  mockChat: vi.fn(),
}));

vi.mock('../../services/ollama.service.ts', () => ({
  OllamaService: vi.fn().mockImplementation(function () {
    (this as any).getTags = mockGetTags;
    (this as any).chat = mockChat;
  }),
}));

vi.mock('../../lib/asyncHandler.ts', () => ({
  asyncHandler: (fn: any) => fn,
}));

import { getTags, chat } from '../../controllers/ollama.controller';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { query: {}, body: {}, headers: {}, ...overrides } as Request;
}

function mockRes(): Response {
  return { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() } as unknown as Response;
}

describe('ollama.controller', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getTags', () => {
    it('should return tags from ollama service', async () => {
      const tags = { models: [{ name: 'llama3' }] };
      mockGetTags.mockResolvedValue(tags);
      const res = mockRes();
      await getTags(mockReq({ query: { url: 'http://localhost:11434' } }), res);
      expect(mockGetTags).toHaveBeenCalledWith('http://localhost:11434');
      expect(res.json).toHaveBeenCalledWith(tags);
    });

    it('should pass undefined url when not provided', async () => {
      mockGetTags.mockResolvedValue({ models: [] });
      const res = mockRes();
      await getTags(mockReq({ query: {} }), res);
      expect(mockGetTags).toHaveBeenCalledWith(undefined);
    });
  });

  describe('chat', () => {
    it('should pass body to ollama service and return response', async () => {
      const body = { model: 'llama3', messages: [{ role: 'user', content: 'hi' }] };
      const response = { message: { role: 'assistant', content: 'hello' } };
      mockChat.mockResolvedValue(response);
      const res = mockRes();
      await chat(mockReq({ body }), res);
      expect(mockChat).toHaveBeenCalledWith(body);
      expect(res.json).toHaveBeenCalledWith(response);
    });

    it('should propagate errors from ollama service', async () => {
      mockChat.mockRejectedValue(new Error('connection refused'));
      const res = mockRes();
      await expect(chat(mockReq({ body: { model: 'x', messages: [] } }), res)).rejects.toThrow('connection refused');
    });
  });
});
