import { Request, Response } from 'express';
import { OllamaService } from '../services/ollama.service.ts';
import { asyncHandler } from '../lib/asyncHandler.ts';

const ollamaService = new OllamaService();

export const getTags = asyncHandler(async (req: Request, res: Response) => {
  const url = req.query.url as string;
  const tags = await ollamaService.getTags(url);
  res.json(tags);
});

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const response = await ollamaService.chat(req.body);
  res.json(response);
});
