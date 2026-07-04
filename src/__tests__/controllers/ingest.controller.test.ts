import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockScrapeWithLogs = vi.hoisted(() => vi.fn());
const mockSearchStrains = vi.hoisted(() => vi.fn());
const mockGetStrainByCanonicalName = vi.hoisted(() => vi.fn());
const mockCountStrains = vi.hoisted(() => vi.fn());
const mockUpsertStrain = vi.hoisted(() => vi.fn());
const mockIngest = vi.hoisted(() => vi.fn());

vi.mock('../../services/scrape.service.ts', () => ({
  ScrapeService: vi.fn().mockImplementation(function () {
    this.scrapeWithLogs = mockScrapeWithLogs;
  }),
  LocalStrainRepository: vi.fn().mockImplementation(function () {
    this.searchStrains = mockSearchStrains;
    this.getStrainByCanonicalName = mockGetStrainByCanonicalName;
    this.countStrains = mockCountStrains;
    this.upsertStrain = mockUpsertStrain;
  }),
}));

vi.mock('../../services/ingestion.service.ts', () => ({
  IngestionService: vi.fn().mockImplementation(function () {
    this.ingest = mockIngest;
  }),
}));

vi.mock('../../components/breedLab/data.ts', () => ({
  INITIAL_STRAINS: [
    { id: 's1', name: 'OG Kush', type: 'hybrid', thc: 20, cbd: 0.1 },
    { id: 's2', name: 'Granddaddy Purple', type: 'indica', thc: 18, cbd: 0.2 },
  ],
}));

vi.mock('fs', () => ({
  default: { existsSync: vi.fn(() => true), mkdirSync: vi.fn() },
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

import { searchStrains, getStrainProfile, seedStrains, ingestDocument } from '../../controllers/ingest.controller.ts';

function mockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    on: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    write: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    writableEnded: false,
    flushHeaders: vi.fn(),
  };
  return res as unknown as Response;
}

describe('ingest.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCountStrains.mockReturnValue(0);
  });

  describe('searchStrains', () => {
    it('should return empty array for short query', async () => {
      const req = mockReq({ query: { q: '' } });
      const res = mockRes();

      await searchStrains(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith({ success: true, strains: [] });
    });

    it('should search and return matching strains', async () => {
      mockSearchStrains.mockReturnValue([{ canonicalName: 'OG Kush' }]);
      const req = mockReq({ query: { q: 'kush', limit: '5' } });
      const res = mockRes();

      await searchStrains(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        strains: [{ canonicalName: 'OG Kush' }],
      });
      expect(mockSearchStrains).toHaveBeenCalledWith('kush', 5);
    });

    it('should default limit to 10', async () => {
      mockSearchStrains.mockReturnValue([]);
      const req = mockReq({ query: { q: 'test' } });
      const res = mockRes();

      await searchStrains(req, res, vi.fn());

      expect(mockSearchStrains).toHaveBeenCalledWith('test', 10);
    });

    it('should cap limit at 50', async () => {
      mockSearchStrains.mockReturnValue([]);
      const req = mockReq({ query: { q: 'test', limit: '100' } });
      const res = mockRes();

      await searchStrains(req, res, vi.fn());

      expect(mockSearchStrains).toHaveBeenCalledWith('test', 50);
    });

    it('should handle non-numeric limit gracefully', async () => {
      mockSearchStrains.mockReturnValue([]);
      const req = mockReq({ query: { q: 'test', limit: 'abc' } });
      const res = mockRes();

      await searchStrains(req, res, vi.fn());

      expect(mockSearchStrains).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('getStrainProfile', () => {
    it('should return strain when found', async () => {
      mockGetStrainByCanonicalName.mockReturnValue({ canonicalName: 'OG Kush', thc: 20 });
      const req = mockReq({ params: { name: 'OG Kush' } });
      const res = mockRes();

      await getStrainProfile(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        strain: { canonicalName: 'OG Kush', thc: 20 },
      });
    });

    it('should return 404 when strain not found', async () => {
      mockGetStrainByCanonicalName.mockReturnValue(null);
      const req = mockReq({ params: { name: 'Nonexistent' } });
      const res = mockRes();

      await getStrainProfile(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when name is empty', async () => {
      const req = mockReq({ params: { name: '' } });
      const res = mockRes();

      await getStrainProfile(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('seedStrains', () => {
    it('should seed strains when database is empty', async () => {
      mockCountStrains.mockReturnValue(0);
      const req = mockReq({ query: {} });
      const res = mockRes();

      await seedStrains(req, res, vi.fn());

      expect(mockUpsertStrain).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 2 })
      );
    });

    it('should skip seeding when database has strains and no force', async () => {
      mockCountStrains.mockReturnValue(5);
      const req = mockReq({ query: {} });
      const res = mockRes();

      await seedStrains(req, res, vi.fn());

      expect(mockUpsertStrain).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 5 })
      );
    });

    it('should re-seed when force=true', async () => {
      mockCountStrains.mockReturnValue(5);
      const req = mockReq({ query: { force: 'true' } });
      const res = mockRes();

      await seedStrains(req, res, vi.fn());

      expect(mockUpsertStrain).toHaveBeenCalledTimes(2);
    });

    it('should handle individual upsert failures gracefully', async () => {
      mockCountStrains.mockReturnValue(0);
      mockUpsertStrain.mockImplementationOnce(() => { throw new Error('db locked'); });
      mockUpsertStrain.mockImplementationOnce(() => {});
      const req = mockReq({ query: {} });
      const res = mockRes();

      await seedStrains(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
          warnings: expect.arrayContaining([expect.stringContaining('OG Kush')]),
        })
      );
    });
  });

  describe('ingestDocument', () => {
    it('should return 401 without authorization header', async () => {
      const req = mockReq({ body: { fileId: 'f1', fileName: 'doc.pdf', mimeType: 'application/pdf' } });
      const res = mockRes();

      await ingestDocument(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const req = mockReq({
        body: { fileId: 'f1' },
        headers: { authorization: 'Bearer token123' },
      });
      const res = mockRes();

      await ingestDocument(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call ingestion service and return result', async () => {
      const mockResult = {
        metadata: { id: 'f1', title: 'doc.pdf', author: '', date: '2026-01-01', sizeBytes: 100, mimeType: 'application/pdf' },
        text: 'extracted text',
        chapters: [],
        citations: [],
        indexedTopics: [],
      };
      mockIngest.mockResolvedValueOnce(mockResult);

      const req = mockReq({
        body: { fileId: 'f1', fileName: 'doc.pdf', mimeType: 'application/pdf' },
        headers: { authorization: 'Bearer token123' },
      });
      const res = mockRes();

      await ingestDocument(req, res, vi.fn());

      expect(mockIngest).toHaveBeenCalledWith('token123', 'f1', 'doc.pdf', 'application/pdf');
      expect(res.json).toHaveBeenCalledWith({ success: true, ...mockResult });
    });

    it('should extract bearer token from authorization header', async () => {
      mockIngest.mockResolvedValueOnce({
        metadata: {}, text: '', chapters: [], citations: [], indexedTopics: [],
      });

      const req = mockReq({
        body: { fileId: 'f1', fileName: 'doc.pdf', mimeType: 'application/pdf' },
        headers: { authorization: 'Bearer my-secret-token' },
      });
      const res = mockRes();

      await ingestDocument(req, res, vi.fn());

      expect(mockIngest).toHaveBeenCalledWith('my-secret-token', 'f1', 'doc.pdf', 'application/pdf');
    });

    it('should handle raw token without Bearer prefix', async () => {
      mockIngest.mockResolvedValueOnce({
        metadata: {}, text: '', chapters: [], citations: [], indexedTopics: [],
      });

      const req = mockReq({
        body: { fileId: 'f1', fileName: 'doc.pdf', mimeType: 'application/pdf' },
        headers: { authorization: 'raw-token-value' },
      });
      const res = mockRes();

      await ingestDocument(req, res, vi.fn());

      expect(mockIngest).toHaveBeenCalledWith('raw-token-value', 'f1', 'doc.pdf', 'application/pdf');
    });
  });
});
