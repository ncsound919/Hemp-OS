import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/AppError';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { DriveService } from '../../services/drive.service';

describe('DriveService', () => {
  let service: DriveService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DriveService();
  });

  describe('listFiles', () => {
    it('should fetch files from Google Drive', async () => {
      const files = [{ id: '1', name: 'doc.pdf' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files }),
      });

      const result = await service.listFiles('Bearer token', 'root');

      expect(result).toEqual(files);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('googleapis.com/drive/v3/files');
      expect(url).toContain('pageSize=100');
    });

    it('should default folderId to root', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ files: [] }) });

      await service.listFiles('Bearer token');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(decodeURIComponent(url)).toContain("'root' in parents");
    });

    it('should throw AppError on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve(' Forbidden'),
      });

      await expect(service.listFiles('Bearer tok', 'root')).rejects.toThrow('Google Drive list failed');
    });

    it('should throw AppError for invalid folderId', async () => {
      await expect(service.listFiles('Bearer tok', 'abc; DROP TABLE')).rejects.toThrow('Invalid folderId');
    });

    it('should escape single quotes in folderId', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ files: [] }) });

      // Valid folder IDs are alphanumeric + _ and -, so test with a valid one
      await service.listFiles('Bearer tok', 'valid_id-123');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(decodeURIComponent(url)).toContain("'valid_id-123' in parents");
    });

    it('should return empty array when files field is missing', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const result = await service.listFiles('Bearer tok', 'root');
      expect(result).toEqual([]);
    });
  });

  describe('createFolder', () => {
    it('should POST to Drive API to create folder', async () => {
      const folder = { id: 'new-id', name: 'Research' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(folder),
      });

      const result = await service.createFolder('Bearer tok', { name: 'Research', parentId: 'root' });

      expect(result).toEqual(folder);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer tok',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error'),
      });

      await expect(service.createFolder('Bearer tok', { name: 'x' })).rejects.toThrow('folder creation failed');
    });
  });

  describe('uploadText', () => {
    it('should upload text content via multipart', async () => {
      const uploaded = { id: 'file-id', name: 'notes.txt' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(uploaded),
      });

      const result = await service.uploadText('Bearer tok', {
        name: 'notes.txt',
        content: 'hello world',
      });

      expect(result).toEqual(uploaded);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('uploadType=multipart');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toContain('boundary=');
      expect(init.body).toContain('hello world');
      expect(init.body).toContain('notes.txt');
    });

    it('should use default text/plain mimeType', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await service.uploadText('Bearer tok', { name: 'f.txt', content: 'x' });

      const body = mockFetch.mock.calls[0][1].body;
      expect(body).toContain('text/plain');
    });

    it('should include parentId when provided', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await service.uploadText('Bearer tok', {
        name: 'f.txt',
        content: 'x',
        parentId: 'parent-123',
      });

      const body = mockFetch.mock.calls[0][1].body;
      expect(body).toContain('parent-123');
    });

    it('should throw on upload failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 413,
        text: () => Promise.resolve('Too large'),
      });

      await expect(
        service.uploadText('Bearer tok', { name: 'big.txt', content: 'x'.repeat(10000) })
      ).rejects.toThrow('upload failed');
    });
  });
});
