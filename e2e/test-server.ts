import express from 'express';
import http from 'http';

export async function startTestServer(port = 3456): Promise<http.Server> {
  const app = express();
  app.use(express.json());

  const { integrationRouter } = await import('../integration/routes.ts');
  app.use('/api/integration', integrationRouter);

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}
