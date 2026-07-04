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

const mockEmbeddings = vi.hoisted(() => vi.fn());
vi.mock('../../services/ollama.service.ts', () => ({
  OllamaService: vi.fn().mockImplementation(function () {
    this.embeddings = mockEmbeddings;
  }),
}));

import { IngestionService } from '../../services/ingestion.service.ts';

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  } as unknown as Response;
}

function errorResponse(status: number): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(`HTTP ${status}`),
  } as unknown as Response;
}

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.ALLOWED_OLLAMA_HOSTS = ['http://localhost:11434'];
    mockFetch.mockReset();
    mockEmbeddings.mockReset();
    service = new IngestionService();
  });

  describe('ingest', () => {
    const baseArgs = {
      token: 'Bearer test-token',
      fileId: 'file-123',
      fileName: 'test-document.pdf',
      mimeType: 'application/pdf',
    };

    it('should reject PDF files with clear error (must convert to Google Docs first)', async () => {
      await expect(
        service.ingest(baseArgs.token, baseArgs.fileId, baseArgs.fileName, baseArgs.mimeType),
      ).rejects.toThrow('Unsupported mime type');
    });

    it('should generate embeddings via OllamaService for supported types', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Some doc content'));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1, 0.2, 0.3] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'doc.txt',
        'text/plain',
      );

      expect(mockEmbeddings).toHaveBeenCalledWith({
        model: 'nomic-embed-text',
        input: expect.any(String),
      });
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle alternative embeddings response format', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Some doc content'));
      mockEmbeddings.mockResolvedValueOnce({ embeddings: [[0.4, 0.5]] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'doc.txt',
        'text/plain',
      );

      expect(result.embedding).toEqual([0.4, 0.5]);
    });

    it('should handle embedding failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Some doc content'));
      mockEmbeddings.mockRejectedValueOnce(new Error('connection refused'));

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'doc.txt',
        'text/plain',
      );

      expect(result.embedding).toBeUndefined();
    });

    it('should export Google Docs as plain text', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Google Doc content here'));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'doc.gdoc',
        'application/vnd.google-apps.document'
      );

      expect(result.text).toBe('Google Doc content here');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/export?mimeType=text/plain'),
        expect.objectContaining({ headers: { Authorization: baseArgs.token } })
      );
    });

    it('should handle Google Doc export failure', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(403));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'doc.gdoc',
        'application/vnd.google-apps.document'
      );

      expect(result.text).toContain('Failed to export Google Doc');
    });

    it('should download plain text files', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Plain text content'));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(baseArgs.token, baseArgs.fileId, 'readme.txt', 'text/plain');

      expect(result.text).toBe('Plain text content');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('?alt=media'),
        expect.objectContaining({ headers: { Authorization: baseArgs.token } })
      );
    });

    it('should handle plain text download failure', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(baseArgs.token, baseArgs.fileId, 'readme.txt', 'text/plain');

      expect(result.text).toContain('Failed to download plain text');
    });

    it('should extract citations from text', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Some text [Smith et al., 2023] and more [Jones et al., 2024]'));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'paper.txt',
        'text/plain',
      );

      expect(result.citations).toContain('[Smith et al., 2023]');
      expect(result.citations).toContain('[Jones et al., 2024]');
    });

    it('should provide fallback citations when none found', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('No citations here'));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'test.txt',
        'text/plain',
      );

      expect(result.citations).toContain('[Hemp-OS Research, 2026]');
      expect(result.citations).toContain('[Standard Phytochem, 2023]');
    });

    it('should set date to today', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Some content'));
      mockEmbeddings.mockResolvedValueOnce({ embedding: [0.1] });

      const result = await service.ingest(
        baseArgs.token,
        baseArgs.fileId,
        'test.txt',
        'text/plain',
      );

      const today = new Date().toISOString().substring(0, 10);
      expect(result.metadata.date).toBe(today);
    });
  });
});
