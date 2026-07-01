import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { getTagsSchema, ollamaChatSchema } from '../schemas/ollama.schema.ts';
import { getTags, chat } from '../controllers/ollama.controller.ts';

export const ollamaRouter = Router();

ollamaRouter.get('/tags', validate(getTagsSchema), getTags);
ollamaRouter.post('/chat', validate(ollamaChatSchema), chat);
