import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp-os.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS cron_jobs (
    id TEXT PRIMARY KEY,
    schedule TEXT NOT NULL,
    graphId TEXT NOT NULL,
    biomassId TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    consecutiveFailures INTEGER DEFAULT 0,
    lastRunAt TEXT,
    lastStatus TEXT
  )
`);

export interface CronJob {
  id: string;
  schedule: string;
  graphId: string;
  biomassId: string;
  enabled: boolean;
  consecutiveFailures: number;
  lastRunAt: string | null;
  lastStatus: string | null;
}

export const jobStore = {
  listEnabled: async (): Promise<CronJob[]> => {
    const rows = db.prepare('SELECT * FROM cron_jobs WHERE enabled = 1').all() as CronJob[];
    return rows.map((r) => ({ ...r, enabled: !!r.enabled }));
  },
  getById: async (id: string): Promise<CronJob | null> => {
    const row = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as CronJob | undefined;
    return row ? { ...row, enabled: !!row.enabled } : null;
  },
  recordRun: async (id: string, run: any): Promise<any> => {
    db.prepare('UPDATE cron_jobs SET lastRunAt = ?, lastStatus = ? WHERE id = ?').run(
      run.timestamp,
      run.status,
      id
    );
    return db.prepare('SELECT consecutiveFailures FROM cron_jobs WHERE id = ?').get(id);
  },
  resetFailures: async (id: string) => {
    db.prepare('UPDATE cron_jobs SET consecutiveFailures = 0 WHERE id = ?').run(id);
  },
  incrementFailures: async (id: string) => {
    db.prepare('UPDATE cron_jobs SET consecutiveFailures = consecutiveFailures + 1 WHERE id = ?').run(id);
  },
  flagForReview: async (id: string, reason: string) => {
    db.prepare('UPDATE cron_jobs SET lastStatus = ? WHERE id = ?').run(reason, id);
  },
  setEnabled: async (id: string, enabled: boolean) => {
    db.prepare('UPDATE cron_jobs SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
  },
};
