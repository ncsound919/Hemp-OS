import { Router } from 'express';
import { validate } from '../middleware/validate';
import { kernelProcessSchema } from '../schemas/kernel.schema';
import {
  runKernelProcess,
  verifyKernel,
  listProfiles,
} from '../controllers/kernel.controller';

export const kernelRouter = Router();

kernelRouter.post('/process', validate(kernelProcessSchema), runKernelProcess);
kernelRouter.get('/verify', verifyKernel);
kernelRouter.get('/profiles', listProfiles);
