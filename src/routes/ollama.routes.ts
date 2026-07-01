import { Router } from 'express';
import { getTags, chat } from '../controllers/ollama.controller.ts';

export const ollamaRouter = Router();

ollamaRouter.get('/tags', getTags);
ollamaRouter.post('/chat', chat);
