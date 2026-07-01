import { Request, Response } from 'express';
import { OllamaService } from '../services/ollama.service.ts';

const ollamaService = new OllamaService();

export async function getTags(req: Request, res: Response) {
  const url = req.query.url as string;
  const tags = await ollamaService.getTags(url);
  res.json(tags);
}

export async function chat(req: Request, res: Response) {
  const response = await ollamaService.chat(req.body);
  res.json(response);
}
