import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';

import { healthRouter } from './routes/health.routes';
import { kernelRouter } from './routes/kernel.routes';
import { driveRouter } from './routes/drive.routes';
import { aiRouter } from './routes/ai.routes';
import { ollamaRouter } from './routes/ollama.routes';
import { ingestRouter } from './routes/ingest.routes';

export const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map(s => s.trim()),
}));
app.use(express.json({ limit: env.BODY_LIMIT_JSON }));
app.use(express.urlencoded({ extended: false }));
app.use(requestIdMiddleware);

app.use('/health', healthRouter);
app.use('/api/kernel', kernelRouter);
app.use('/api/drive', driveRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api/ingest', ingestRouter);
app.post('/api/scrape', (req, res, next) => {
  req.url = '/scrape';
  ingestRouter(req, res, next);
});


export async function attachFrontend() {
  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
}
