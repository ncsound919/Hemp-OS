// A daemon for running scheduled tasks.

type Task = () => Promise<void>;
type ErrorHandler = (id: string, error: unknown) => void;

interface ScheduledTask {
  task: Task;
  interval: number;
  running: boolean; // guards against overlapping executions of the same task
}

class SchedulerDaemon {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isRunning = false;
  private onError: ErrorHandler = (id, error) => {
    // Default: log, don't crash. Callers can override via onTaskError().
    console.error(`[SchedulerDaemon] task "${id}" threw:`, error);
  };

  /** Register (or replace) a task. If the daemon is already running, this starts it immediately. */
  schedule(id: string, task: Task, interval: number) {
    if (interval <= 0) {
      throw new Error(`SchedulerDaemon.schedule("${id}"): interval must be > 0, got ${interval}`);
    }
    // Replacing an existing task should tear down its old timer first.
    this.clearTimer(id);
    this.tasks.set(id, { task, interval, running: false });
    if (this.isRunning) {
      this.startTimer(id);
    }
  }

  /** Remove a task. Stops its timer if active. */
  unschedule(id: string): boolean {
    this.clearTimer(id);
    return this.tasks.delete(id);
  }

  start() {
    if (this.isRunning) return; // prevent duplicate timers from a second start() call
    this.isRunning = true;
    for (const id of this.tasks.keys()) {
      this.startTimer(id);
    }
  }

  stop() {
    this.isRunning = false;
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
  }

  /** Override how task errors are handled (default just logs). */
  onTaskError(handler: ErrorHandler) {
    this.onError = handler;
  }

  private startTimer(id: string) {
    const entry = this.tasks.get(id);
    if (!entry) return;
    const timer = setInterval(() => {
      void this.runOnce(id);
    }, entry.interval);
    this.timers.set(id, timer);
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  private async runOnce(id: string) {
    const entry = this.tasks.get(id);
    if (!entry) return;
    if (entry.running) return; // previous invocation still in flight — skip this tick rather than pile up
    entry.running = true;
    try {
      await entry.task();
    } catch (error) {
      this.onError(id, error);
    } finally {
      entry.running = false;
    }
  }
}

export const scheduler = new SchedulerDaemon();
export { SchedulerDaemon };

import { Router } from 'express';
import { assist } from '../controllers/ai.controller.ts';

export const aiRouter = Router();
aiRouter.post('/assist', assist);

