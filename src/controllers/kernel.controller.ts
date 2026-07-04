import { Request, Response } from 'express';
import { KernelService } from '../services/kernel.service';
import { asyncHandler } from '../lib/asyncHandler.ts';

const kernelService = new KernelService();

export const runKernelProcess = asyncHandler(async (req: Request, res: Response) => {
  const { graph, biomass } = req.body;
  const results = kernelService.runProcess(graph, biomass);
  res.json({ success: true, results });
});

export const verifyKernel = asyncHandler(async (_req: Request, res: Response) => {
  const report = kernelService.verify();
  res.json({ success: true, report });
});

export const listProfiles = asyncHandler(async (_req: Request, res: Response) => {
  const profiles = kernelService.listProfiles();
  res.json({ success: true, profiles });
});
