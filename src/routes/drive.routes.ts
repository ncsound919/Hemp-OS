import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
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

driveRouter.get('/list', validate(listDriveSchema), listDriveFiles);
driveRouter.post('/create-folder', validate(createFolderSchema), createDriveFolder);
driveRouter.post('/upload', validate(uploadDriveSchema), uploadDriveFile);
driveRouter.post('/find', findDriveItem);
