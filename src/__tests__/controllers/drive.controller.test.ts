import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { mockListFiles, mockCreateFolder, mockUploadText } = vi.hoisted(() => ({
  mockListFiles: vi.fn(),
  mockCreateFolder: vi.fn(),
  mockUploadText: vi.fn(),
}));

vi.mock('../../services/drive.service.ts', () => ({
  DriveService: vi.fn().mockImplementation(function () {
    (this as any).listFiles = mockListFiles;
    (this as any).createFolder = mockCreateFolder;
    (this as any).uploadText = mockUploadText;
  }),
}));

vi.mock('../../lib/asyncHandler.ts', () => ({
  asyncHandler: (fn: any) => fn,
}));

import { listDriveFiles, createDriveFolder, uploadDriveFile, findDriveItem } from '../../controllers/drive.controller';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, query: {}, headers: { authorization: 'Bearer token123' }, ...overrides } as Request;
}

function mockRes(): Response {
  return { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() } as unknown as Response;
}

describe('drive.controller', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('listDriveFiles', () => {
    it('should list files with token and folderId', async () => {
      const files = [{ id: '1', name: 'doc.pdf' }];
      mockListFiles.mockResolvedValue(files);
      const res = mockRes();
      await listDriveFiles(mockReq({ headers: { authorization: 'Bearer tok' }, query: { folderId: 'abc123' } }), res);
      expect(mockListFiles).toHaveBeenCalledWith('Bearer tok', 'abc123');
      expect(res.json).toHaveBeenCalledWith({ success: true, files });
    });

    it('should default folderId to root when not provided', async () => {
      mockListFiles.mockResolvedValue([]);
      const res = mockRes();
      await listDriveFiles(mockReq({ query: {} }), res);
      expect(mockListFiles).toHaveBeenCalledWith('Bearer token123', undefined);
    });
  });

  describe('createDriveFolder', () => {
    it('should create folder with token and body', async () => {
      const folder = { id: 'new-folder', name: 'Research' };
      mockCreateFolder.mockResolvedValue(folder);
      const res = mockRes();
      await createDriveFolder(mockReq({ body: { name: 'Research', parentId: 'root' } }), res);
      expect(mockCreateFolder).toHaveBeenCalledWith('Bearer token123', { name: 'Research', parentId: 'root' });
      expect(res.json).toHaveBeenCalledWith({ success: true, folder });
    });
  });

  describe('uploadDriveFile', () => {
    it('should upload file with token and body', async () => {
      const file = { id: 'uploaded', name: 'notes.txt' };
      mockUploadText.mockResolvedValue(file);
      const res = mockRes();
      await uploadDriveFile(mockReq({ body: { name: 'notes.txt', content: 'hello' } }), res);
      expect(mockUploadText).toHaveBeenCalledWith('Bearer token123', { name: 'notes.txt', content: 'hello' });
      expect(res.json).toHaveBeenCalledWith({ success: true, file });
    });
  });

  describe('findDriveItem', () => {
    it('should return 501 not implemented', async () => {
      const res = mockRes();
      await findDriveItem(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not implemented' });
    });
  });
});
