import { Router } from 'express';
import { assist } from '../controllers/ai.controller.ts';

export const aiRouter = Router();

aiRouter.post('/assist', assist);
