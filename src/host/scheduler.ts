// A daemon for running scheduled tasks.

type Task = () => Promise<void>;

class SchedulerDaemon {
  private tasks: Map<string, { task: Task; interval: number }> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();

  schedule(id: string, task: Task, interval: number) {
    this.tasks.set(id, { task, interval });
  }

  start() {
    this.tasks.forEach(({ task, interval }, id) => {
      const timer = setInterval(task, interval);
      this.timers.set(id, timer);
    });
  }

  stop() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
  }
}

export const scheduler = new SchedulerDaemon();
