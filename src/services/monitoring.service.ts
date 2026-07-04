/**
 * Real-Time System Monitoring (Grafana-Ready Metrics)
 *
 * Exposes Prometheus-formatted metrics and structured health data
 * for integration with Grafana, Datadog, or any monitoring stack.
 *
 * Tracks: pipeline runs, database sizes, API latency, error rates,
 * data freshness, model accuracy, and system resource usage.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { pipelineOrch } from '../../kernel/autonomy/pipeline-orchestrator.ts';
import { predictionValidator } from '../../kernel/rigor/prediction-validator.ts';
import { provenanceChain } from '../../kernel/rigor/provenance-chain.ts';
import { governance } from '../../kernel/rigor/governance.ts';
import { labPartnerships } from '../../kernel/rigor/lab-partnerships.ts';
import { enterpriseForms } from '../../integration/enterprise-forms.ts';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

export interface MetricPoint {
  name: string;
  value: number;
  unit: string;
  labels?: Record<string, string>;
  timestamp: string;
}

export class MonitoringService {
  /**
   * Collect all system metrics at once
   */
  collectAll(): MetricPoint[] {
    const metrics: MetricPoint[] = [];
    const now = new Date().toISOString();

    // Database size
    const dbSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
    metrics.push({ name: 'hemp_os_db_size_bytes', value: dbSize, unit: 'bytes', timestamp: now });

    // Table record counts
    const tables = ['strains', 'papers', 'market_prices', 'mmj_products', 'research_studies',
      'strain_grow_data', 'market_states', 'pipeline_runs', 'generated_insights', 'auto_content'];
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as any;
        metrics.push({ name: `hemp_os_records_${table}`, value: count.c, unit: 'records', timestamp: now });
      } catch { /* table may not exist */ }
    }

    // Pipeline statistics
    const pipeStats = pipelineOrch.getStats() as any;
    if (pipeStats) {
      metrics.push({ name: 'hemp_os_pipeline_runs', value: pipeStats.total_runs || 0, unit: 'runs', timestamp: now });
      metrics.push({ name: 'hemp_os_pipeline_insights', value: pipeStats.total_insights || 0, unit: 'insights', timestamp: now });
      metrics.push({ name: 'hemp_os_pipeline_papers', value: pipeStats.total_papers || 0, unit: 'papers', timestamp: now });
    }

    // Model accuracy
    const accuracy = predictionValidator.computeAccuracy('extraction.v2.0.0');
    metrics.push({ name: 'hemp_os_model_accuracy_pct', value: 100 - accuracy.meanPercentError, unit: '%', timestamp: now });
    metrics.push({ name: 'hemp_os_model_samples_validated', value: accuracy.samplesValidated, unit: 'samples', timestamp: now });

    // Provenance chain
    const chain = provenanceChain.verifyChain();
    metrics.push({ name: 'hemp_os_provenance_links', value: chain.totalLinks, unit: 'links', timestamp: now });
    metrics.push({ name: 'hemp_os_provenance_broken', value: chain.brokenLinks, unit: 'links', timestamp: now });

    // Governance
    const gov = governance.getStats();
    metrics.push({ name: 'hemp_os_advisors', value: gov.advisors, unit: 'advisors', timestamp: now });
    metrics.push({ name: 'hemp_os_contributors', value: gov.contributors, unit: 'contributors', timestamp: now });
    metrics.push({ name: 'hemp_os_partnerships', value: gov.partnerships, unit: 'partnerships', timestamp: now });

    // Lab partnerships
    const labStats = labPartnerships.getPartnershipStats() as any;
    if (labStats) {
      metrics.push({ name: 'hemp_os_active_labs', value: labStats.active_labs || 0, unit: 'labs', timestamp: now });
      metrics.push({ name: 'hemp_os_lab_samples', value: labStats.total_samples || 0, unit: 'samples', timestamp: now });
    }

    // Enterprise forms
    const forms = enterpriseForms.getStats();
    let totalForms = 0;
    for (const [, count] of Object.entries(forms)) {totalForms += count as number;}
    metrics.push({ name: 'hemp_os_enterprise_forms', value: totalForms, unit: 'submissions', timestamp: now });

    return metrics;
  }

  /**
   * Export metrics in Prometheus text format
   */
  toPrometheus(metrics: MetricPoint[]): string {
    let output = '# HELP hemp_os Hemp OS system metrics\n';
    output += '# TYPE hemp_os gauge\n\n';
    for (const m of metrics) {
      output += `${m.name}{unit="${m.unit}"} ${m.value}\n`;
    }
    return output;
  }

  /**
   * Get data freshness: when each dataset was last updated
   */
  getDataFreshness() {
    const freshness: Record<string, string | null> = {};

    const queries: [string, string][] = [
      ['strains', 'SELECT MAX(updated_at) as d FROM strains'],
      ['papers', 'SELECT MAX(created_at) as d FROM papers'],
      ['market_prices', 'SELECT MAX(observation_date) as d FROM market_prices'],
      ['mmj_products', 'SELECT MAX(approval_date) as d FROM mmj_products'],
      ['research_studies', 'SELECT MAX(study_year) as d FROM research_studies'],
      ['pipeline_runs', 'SELECT MAX(completed_at) as d FROM pipeline_runs'],
      ['autonomous_runs', 'SELECT MAX(timestamp) as d FROM autonomous_runs'],
    ];

    for (const [name, sql] of queries) {
      try {
        const row = db.prepare(sql).get() as any;
        freshness[name] = row?.d || null;
      } catch { freshness[name] = null; }
    }

    return freshness;
  }

  /**
   * Comprehensive system health check
   */
  getHealth(): { status: string; checks: Record<string, { status: string; detail: string }> } {
    const checks: Record<string, { status: string; detail: string }> = {};

    // Database
    try {
      db.prepare('SELECT 1').get();
      checks.database = { status: 'healthy', detail: 'SQLite responsive' };
    } catch {
      checks.database = { status: 'failing', detail: 'Database unreachable' };
    }

    // Disk space
    try {
      const dbStats = fs.statSync(DB_PATH);
      const dbSizeMB = (dbStats.size / 1024 / 1024).toFixed(1);
      checks.disk = { status: 'healthy', detail: `Database ${dbSizeMB} MB` };
    } catch {
      checks.disk = { status: 'unknown', detail: 'Cannot read database file' };
    }

    // Pipeline
    try {
      const pipeStats = pipelineOrch.getStats() as any;
      if (pipeStats.total_runs > 0) {
        checks.pipeline = { status: 'healthy', detail: `${pipeStats.total_runs} runs, ${pipeStats.total_insights} insights` };
      } else {
        checks.pipeline = { status: 'idle', detail: 'No pipeline runs yet' };
      }
    } catch {
      checks.pipeline = { status: 'unknown', detail: 'Pipeline module loaded' };
    }

    // Provenance
    try {
      const chain = provenanceChain.verifyChain();
      checks.provenance = chain.valid
        ? { status: 'healthy', detail: `${chain.totalLinks} links intact` }
        : { status: 'degraded', detail: `${chain.brokenLinks} broken links` };
    } catch {
      checks.provenance = { status: 'unknown', detail: 'Not verified' };
    }

    // Model accuracy
    try {
      const accuracy = predictionValidator.computeAccuracy('extraction.v2.0.0');
      checks.models = {
        status: accuracy.grade !== 'F' ? 'healthy' : 'degraded',
        detail: `Grade ${accuracy.grade}, ${accuracy.samplesValidated} samples, ${accuracy.meanPercentError.toFixed(1)}% error`,
      };
    } catch {
      checks.models = { status: 'unknown', detail: 'Not validated' };
    }

    // Governance
    try {
      const gov = governance.getStats();
      checks.governance = { status: 'healthy', detail: `${gov.advisors} advisors, ${gov.partnerships} partnerships` };
    } catch {
      checks.governance = { status: 'unknown', detail: 'Governance not initialized' };
    }

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    return { status: allHealthy ? 'healthy' : 'degraded', checks };
  }
}

export const monitoring = new MonitoringService();
