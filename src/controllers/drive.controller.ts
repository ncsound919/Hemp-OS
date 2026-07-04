import { Request, Response } from 'express';
import { DriveService } from '../services/drive.service.ts';
import { asyncHandler } from '../lib/asyncHandler.ts';

const driveService = new DriveService();

export const listDriveFiles = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization!;
  const folderId = req.query.folderId as string;
  const files = await driveService.listFiles(token, folderId);
  res.json({ success: true, files });
});

export const createDriveFolder = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization!;
  const folder = await driveService.createFolder(token, req.body);
  res.json({ success: true, folder });
});

export const uploadDriveFile = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization!;
  const file = await driveService.uploadText(token, req.body);
  res.json({ success: true, file });
});

export const findDriveItem = asyncHandler(async (req: Request, res: Response) => {
  // Implement search
  const token = req.headers.authorization!;
  // This wasn't fully detailed in the service but was in the original server
  res.status(501).json({ error: 'Not implemented' });
});
