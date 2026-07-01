import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { apiRateLimiter } from '../middleware/rateLimiter.ts';
import { getTagsSchema, ollamaChatSchema } from '../schemas/ollama.schema.ts';
import { getTags, chat } from '../controllers/ollama.controller.ts';

export const ollamaRouter = Router();

ollamaRouter.get('/tags', apiRateLimiter, validate(getTagsSchema), getTags);
ollamaRouter.post('/chat', apiRateLimiter, validate(ollamaChatSchema), chat);
