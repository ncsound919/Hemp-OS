import { Request, Response } from 'express';
import { ScrapeService } from '../services/scrape.service.ts';
import { IngestionService } from '../services/ingestion.service.ts';

const scrapeService = new ScrapeService();
const ingestionService = new IngestionService();

export async function scrape(req: Request, res: Response) {
  const { target, query } = req.body;
  const result = await scrapeService.scrape(target, query);
  res.json({ success: true, ...result });
}

export async function ingestDocument(req: Request, res: Response) {
  const token = req.headers.authorization!;
  const { fileId, fileName, mimeType } = req.body;
  const result = await ingestionService.ingest(token, fileId, fileName, mimeType);
  res.json({ success: true, ...result });
}
