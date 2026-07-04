/**
 * Adoption & Deployment Metrics
 *
 * Tracks system adoption, usage, and deployment statistics
 * to demonstrate real-world use and community growth.
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

export class AdoptionMetrics {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deployment_log (
        id TEXT PRIMARY KEY,
        deployment_type TEXT NOT NULL,
        description TEXT,
        timestamp TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS usage_stats (
        metric TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_name TEXT,
        status TEXT,
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER,
        results_summary TEXT
      );
    `);
  }

  recordDeployment(type: string, description: string) {
    db.prepare('INSERT INTO deployment_log (id, deployment_type, description, timestamp) VALUES (?, ?, ?, datetime(\'now\'))')
      .run(`dep-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, type, description);
  }

  incrementMetric(name: string) {
    db.prepare("INSERT INTO usage_stats (metric, value, updated_at) VALUES (?, 1, datetime('now')) ON CONFLICT(metric) DO UPDATE SET value = value + 1, updated_at = datetime('now')")
      .run(name);
  }

  recordWorkflow(name: string, status: string, durationMs: number, summary: string) {
    db.prepare('INSERT INTO workflow_runs (id, workflow_name, status, started_at, completed_at, duration_ms, results_summary) VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'), ?, ?)')
      .run(`wf-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, name, status, durationMs, summary);
  }

  getMetrics() {
    return {
      deployments: db.prepare('SELECT deployment_type, COUNT(*) as count FROM deployment_log GROUP BY deployment_type').all(),
      usage: db.prepare('SELECT * FROM usage_stats ORDER BY value DESC').all(),
      recentWorkflows: db.prepare('SELECT * FROM workflow_runs ORDER BY started_at DESC LIMIT 10').all(),
      totalWorkflows: (db.prepare('SELECT COUNT(*) as c FROM workflow_runs').get() as any).c,
      totalDeployments: (db.prepare('SELECT COUNT(*) as c FROM deployment_log').get() as any).c,
    };
  }
}

export const adoptionMetrics = new AdoptionMetrics();
