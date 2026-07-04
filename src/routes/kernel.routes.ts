import { Router } from 'express';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimiter.ts';
import { kernelProcessSchema } from '../schemas/kernel.schema';
import {
  runKernelProcess,
  verifyKernel,
  listProfiles,
} from '../controllers/kernel.controller';

export const kernelRouter = Router();

kernelRouter.post('/process', apiRateLimiter, validate(kernelProcessSchema), runKernelProcess);
kernelRouter.get('/verify', apiRateLimiter, verifyKernel);
kernelRouter.get('/profiles', apiRateLimiter, listProfiles);
