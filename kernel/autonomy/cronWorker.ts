/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// kernel/autonomy/cronWorker.ts
// -----------------------------------------------------------------------------
// A REAL server-side scheduler, replacing the browser-hosted illusion in
// useCronDaemon.ts (setInterval + localStorage, which stops existing the
// moment the tab closes).
//
// This worker:
//   1. Lives in the Node process itself (started from server.ts), so it keeps
//      running as long as the server process is alive - no browser required.
//   2. Reads/writes job state from the SAME persistence layer the /api/cron
//      REST routes use (assumed: a JobStore backed by the app's DB/file store),
//      so the dashboard and the daemon see one source of truth instead of
//      per-browser localStorage.
//   3. Calls KernelExecutor.runProcess() DIRECTLY - no HTTP round-trip to
//      itself - and captures REAL execution duration via Date.now(), instead
//      of the frontend's `Math.random() * 800 + 300` fabricated telemetry.
//   4. Applies exponential backoff + auto-disable after repeated failures,
//      since Layer 5 "Reflexive Diagnostics" was claimed in the README but not
//      found anywhere in the tree during this audit.
//
// Assumptions made explicit (adjust import paths/shapes to match the real
// JobStore/ProcessGraph persistence once confirmed):
//   - A `JobStore` module exposes CRUD matching what /api/cron currently uses.
//   - Each CronJob record includes: id, schedule (cron string), graphId,
//     biomassId, enabled, consecutiveFailures, lastRunAt, lastStatus.
// =============================================================================

import cron, { ScheduledTask } from 'node-cron';
import { KernelExecutor } from '../workflow/executor.ts';
import { logger } from '../../src/lib/logger.ts';
import { jobStore, CronJob } from './jobStore.ts'; // assumed shared persistence
import { processGraphStore } from './processGraphStore.ts'; // assumed
import { biomassStore } from './biomassStore.ts'; // assumed

interface WorkerConfig {
  maxConsecutiveFailures: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}

const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  maxConsecutiveFailures: 5,
  baseBackoffMs: 30_000,
  maxBackoffMs: 30 * 60_000,
};

export class CronDaemon {
  private static tasks = new Map<string, ScheduledTask>();
  private static config: WorkerConfig = DEFAULT_WORKER_CONFIG;
  private static started = false;

  static configure(cfg: Partial<WorkerConfig>) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...cfg };
  }

  /**
   * Boots the daemon. Called once from server.ts main(), independent of any
   * browser session. Loads all enabled jobs from the shared store and
   * schedules them via node-cron, which runs on the Node event loop itself.
   */
  static async start(): Promise<void> {
    if (this.started) {
      logger.warn('[CronDaemon] start() called twice; ignoring.');
      return;
    }
    this.started = true;

    const jobs = await jobStore.listEnabled();
    logger.info({ count: jobs.length }, '[CronDaemon] Loading enabled jobs from persistent store');

    for (const job of jobs) {
      this.scheduleJob(job);
    }

    logger.info('[CronDaemon] Started. Running independent of any browser tab.');
  }

  /** Gracefully stops all scheduled tasks. Call from server.ts shutdown handler. */
  static stop(): void {
    for (const [id, task] of this.tasks) {
      task.stop();
      logger.info({ jobId: id }, '[CronDaemon] Stopped task');
    }
    this.tasks.clear();
    this.started = false;
  }

  /** Registers or re-registers a single job. Called on boot and whenever the API creates/updates a job. */
  static scheduleJob(job: CronJob): void {
    if (!cron.validate(job.schedule)) {
      logger.error({ jobId: job.id, schedule: job.schedule }, '[CronDaemon] Invalid cron expression, skipping');
      return;
    }

    this.unscheduleJob(job.id);

    if (!job.enabled) return;

    const task = cron.schedule(job.schedule, () => {
      void this.executeJob(job.id);
    });

    this.tasks.set(job.id, task);
    logger.info({ jobId: job.id, schedule: job.schedule }, '[CronDaemon] Scheduled job');
  }

  /** Removes a job's scheduled task without deleting it from the store. */
  static unscheduleJob(jobId: string): void {
    const existing = this.tasks.get(jobId);
    if (existing) {
      existing.stop();
      this.tasks.delete(jobId);
    }
  }

  /**
   * Executes one job run directly against the kernel — no HTTP call, no
   * frontend involvement, real telemetry only.
   */
  private static async executeJob(jobId: string): Promise<void> {
    const job = await jobStore.getById(jobId);
    if (!job || !job.enabled) return;

    // Backoff gate: if consecutiveFailures > 0, skip this tick unless enough
    // time has passed (exponential backoff), instead of hammering a broken graph.
    if (job.consecutiveFailures > 0) {
      const backoff = Math.min(
        this.config.baseBackoffMs * 2 ** (job.consecutiveFailures - 1),
        this.config.maxBackoffMs
      );
      const elapsed = job.lastRunAt ? Date.now() - new Date(job.lastRunAt).getTime() : Infinity;
      if (elapsed < backoff) {
        logger.debug({ jobId, elapsed, backoff }, '[CronDaemon] Skipping run, still in backoff window');
        return;
      }
    }

    const startedAt = Date.now();
    logger.info({ jobId }, '[CronDaemon] Executing job');

    try {
      const [graph, biomass] = await Promise.all([
        processGraphStore.getById(job.graphId),
        biomassStore.getById(job.biomassId),
      ]);

      if (!graph) throw new Error(`ProcessGraph ${job.graphId} not found`);
      if (!biomass) throw new Error(`Biomass ${job.biomassId} not found`);

      // Direct in-process call — this is the actual "kernel is law" gate now
      // enforced on autonomous runs too, since validateXInput() is wired
      // into runProcess() itself (see executor.patched.ts).
      const result = KernelExecutor.runProcess(graph, biomass);

      const durationMs = Date.now() - startedAt; // REAL measured duration, not Math.random()

      await jobStore.recordRun(job.id, {
        status: 'success',
        durationMs,
        massBalancePass: result.massBalanceReport.massBalanceCheckPass,
        finalMassKg: result.massBalanceReport.finalMassKg,
        runId: result.manifest.runId,
        timestamp: new Date().toISOString(),
      });

      await jobStore.resetFailures(job.id);

      logger.info(
        { jobId, durationMs, massBalancePass: result.massBalanceReport.massBalanceCheckPass },
        '[CronDaemon] Job completed'
      );

      // Auto-flag (do not silently ignore) a job whose kernel run technically
      // succeeded but failed its own physical mass-balance check - this is a
      // process/config problem, not an exception, and deserves separate
      // surfacing rather than being reported as a clean "success".
      if (!result.massBalanceReport.massBalanceCheckPass) {
        logger.warn({ jobId }, '[CronDaemon] Job ran but failed mass balance check');
        await jobStore.flagForReview(job.id, 'mass_balance_failed');
      }
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      logger.error({ jobId, err: err.message, durationMs }, '[CronDaemon] Job execution failed');

      const updated = await jobStore.recordRun(job.id, {
        status: 'failure',
        durationMs,
        error: err.message,
        timestamp: new Date().toISOString(),
      });

      await jobStore.incrementFailures(job.id);

      if (updated.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        logger.error(
          { jobId, failures: updated.consecutiveFailures },
          '[CronDaemon] Max consecutive failures reached — auto-disabling job'
        );
        await jobStore.setEnabled(job.id, false);
        this.unscheduleJob(job.id);
      }
    }
  }
}
