import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { aiAssistSchema } from '../schemas/ai.schema.ts';
import { assist } from '../controllers/ai.controller.ts';

export const aiRouter = Router();
aiRouter.post('/assist', validate(aiAssistSchema), assist);

