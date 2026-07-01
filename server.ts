import http from 'http';
import { app, attachFrontend } from './src/app.ts';
import { env } from './src/config/env.ts';
import { logger } from './src/lib/logger.ts';

async function main() {
  await attachFrontend();

  const server = http.createServer(app);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT }, 'Hemp-OS API server started');
  });

  function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down');
    server.close(err => {
      if (err) {
        logger.error({ err }, 'Shutdown error');
        process.exit(1);
      }
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  logger.error(err);
  process.exit(1);
});
