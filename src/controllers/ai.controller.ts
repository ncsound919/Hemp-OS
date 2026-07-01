import { Request, Response } from 'express';
import { AiService } from '../services/ai.service.ts';

const aiService = new AiService();

export async function assist(req: Request, res: Response) {
  const { prompt, graph, currentResults, selectedBiomassName } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const text = await aiService.assist({ prompt, graph, currentResults, selectedBiomassName });
  res.json({ success: true, text });
}
