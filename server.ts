import http from 'http';
import { app, attachFrontend } from './src/app.ts';
import { env } from './src/config/env.ts';
import { logger } from './src/lib/logger.ts';
import { CronDaemon } from './kernel/autonomy/cronWorker.ts';
import { intelligenceOrchestrator } from './kernel/autonomy/intelligence-orchestrator.ts';
import cron from 'node-cron';

async function main() {
  await attachFrontend();

  const server = http.createServer(app);

  server.listen(env.PORT, '0.0.0.0', async () => {
    logger.info({ port: env.PORT }, 'Hemp-OS API server started');

    // Start the autonomous job scheduler
    await CronDaemon.start();

    // Start the intelligence orchestrator: cross-references all datasets,
    // generates novel insights, creates research tasks, and auto-produces
    // content — runs on the server independent of any browser session.
    logger.info('[Server] Starting Autonomous Intelligence Orchestrator (cycle every 6h)');

    // Run initial intelligence cycle after a 10-second delay to let the system warm up
    setTimeout(() => {
      intelligenceOrchestrator.runCycle().then(result => {
        logger.info({ result }, '[Server] Initial intelligence cycle complete');
      });
    }, 10_000);

    // Schedule recurring intelligence cycles every 6 hours
    // Cron: '0 */6 * * *' = at minute 0 of every 6th hour
    cron.schedule('0 */6 * * *', () => {
      logger.info('[Server] Starting scheduled intelligence cycle');
      intelligenceOrchestrator.runCycle().then(result => {
        logger.info({ result }, '[Server] Scheduled intelligence cycle complete');
      });
    });

    // Also run a light cycle every hour to check for new data
    cron.schedule('0 * * * *', () => {
      logger.debug('[Server] Running hourly data check');
      // Re-run analysis to pick up any new data that was added
      intelligenceOrchestrator.runCycle().catch(err => {
        logger.warn({ err }, '[Server] Hourly cycle warning');
      });
    });
  });

  function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down');
    CronDaemon.stop();
    intelligenceOrchestrator.destroy();
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
