import { Request, Response } from 'express';
import { AiService } from '../services/ai.service.ts';
import { asyncHandler } from '../lib/asyncHandler.ts';

const aiService = new AiService();

export const assist = asyncHandler(async (req: Request, res: Response) => {
  const { prompt, graph, currentResults, selectedBiomassName } = req.body;

  const text = await aiService.assist({ prompt, graph, currentResults, selectedBiomassName });
  res.json({ success: true, text });
});
