import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { apiRateLimiter } from '../middleware/rateLimiter.ts';
import {
  listDriveSchema,
  createFolderSchema,
  uploadDriveSchema,
} from '../schemas/drive.schema.ts';
import {
  listDriveFiles,
  createDriveFolder,
  uploadDriveFile,
  findDriveItem,
} from '../controllers/drive.controller.ts';

export const driveRouter = Router();

driveRouter.get('/list', apiRateLimiter, validate(listDriveSchema), listDriveFiles);
driveRouter.post('/create-folder', apiRateLimiter, validate(createFolderSchema), createDriveFolder);
driveRouter.post('/upload', apiRateLimiter, validate(uploadDriveSchema), uploadDriveFile);
driveRouter.post('/find', apiRateLimiter, findDriveItem);
