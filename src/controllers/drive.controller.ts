import { Request, Response } from 'express';
import { DriveService } from '../services/drive.service.ts';

const driveService = new DriveService();

export async function listDriveFiles(req: Request, res: Response) {
  const token = req.headers.authorization!;
  const folderId = req.query.folderId as string;
  const files = await driveService.listFiles(token, folderId);
  res.json({ success: true, files });
}

export async function createDriveFolder(req: Request, res: Response) {
  const token = req.headers.authorization!;
  const folder = await driveService.createFolder(token, req.body);
  res.json({ success: true, folder });
}

export async function uploadDriveFile(req: Request, res: Response) {
  const token = req.headers.authorization!;
  const file = await driveService.uploadText(token, req.body);
  res.json({ success: true, file });
}

export async function findDriveItem(req: Request, res: Response) {
  // Implement search
  const token = req.headers.authorization!;
  // This wasn't fully detailed in the service but was in the original server
  res.status(501).json({ error: 'Not implemented' });
}
