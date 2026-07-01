import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { strictRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.ts';
import { scrapeSchema, ingestSchema } from '../schemas/ingest.schema.ts';
import { scrape, ingestDocument, searchStrains, getStrainProfile, seedStrains } from '../controllers/ingest.controller.ts';

export const ingestRouter = Router();

ingestRouter.post('/scrape', strictRateLimiter, validate(scrapeSchema), scrape);
ingestRouter.post('/drive/ingest', apiRateLimiter, validate(ingestSchema), ingestDocument);
ingestRouter.get('/strains/search', apiRateLimiter, searchStrains);
ingestRouter.get('/strains/profile/:name', getStrainProfile);
ingestRouter.post('/strains/seed', strictRateLimiter, seedStrains);

