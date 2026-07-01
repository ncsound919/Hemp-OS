import { Request, Response } from 'express';
import { KernelService } from '../services/kernel.service';

const kernelService = new KernelService();

export async function runKernelProcess(req: Request, res: Response) {
  const { graph, biomass } = req.body;
  const results = kernelService.runProcess(graph, biomass);
  res.json({ success: true, results });
}

export async function verifyKernel(_req: Request, res: Response) {
  const report = kernelService.verify();
  res.json({ success: true, report });
}

export async function listProfiles(_req: Request, res: Response) {
  const profiles = kernelService.listProfiles();
  res.json({ success: true, profiles });
}
