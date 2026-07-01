import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { scrapeSchema, ingestSchema } from '../schemas/ingest.schema.ts';
import { scrape, ingestDocument, searchStrains, getStrainProfile, seedStrains } from '../controllers/ingest.controller.ts';

export const ingestRouter = Router();

ingestRouter.post('/scrape', validate(scrapeSchema), scrape);
ingestRouter.post('/drive/ingest', validate(ingestSchema), ingestDocument);
ingestRouter.get('/strains/search', searchStrains);
ingestRouter.get('/strains/profile/:name', getStrainProfile);
ingestRouter.post('/strains/seed', seedStrains);

