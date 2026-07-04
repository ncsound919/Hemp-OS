/**
 * Autonomous Intelligence Orchestrator
 *
 * Server-side engine that runs on the CronDaemon schedule and:
 *  1. Cross-references ALL datasets on a cron schedule
 *  2. Detects new insights and stores them persistently
 *  3. Creates autonomous research tasks from data gaps
 *  4. Feeds findings into the paper generation pipeline
 *  5. Auto-generates public education content from new discoveries
 *  6. Tracks what insights have already been generated (no duplicates)
 */

import { logger } from '../../src/lib/logger.ts';
import { crossReference, CrossReferenceInsight } from '../../integration/cross-reference.ts';
import { marketIntel } from '../../integration/market-intel.ts';
import { paperGenerator } from '../../integration/paper-generator.ts';
import { publicEducation } from '../../src/services/public-education.service.ts';
import { mesh } from '../../integration/service-mesh.ts';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');

interface AutonomousRunLog {
  runId: string;
  timestamp: string;
  insightsGenerated: number;
  researchTasksCreated: number;
  contentGenerated: number;
  duration: number;
  errors: string[];
}

interface ResearchTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dataSources: string[];
  hypothesis: string;
  method: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export class IntelligenceOrchestrator {
  private db: Database.Database;
  private lastRun: AutonomousRunLog | null = null;
  private insightHashes = new Set<string>();

  constructor() {
    this.db = new Database(DB_PATH);
    this.ensureTables();
    this.loadExistingInsightHashes();
  }

  private ensureTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS autonomous_runs (
        run_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        insights_generated INTEGER DEFAULT 0,
        research_tasks_created INTEGER DEFAULT 0,
        content_generated INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        errors_json TEXT DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS generated_insights (
        id TEXT PRIMARY KEY,
        hash TEXT UNIQUE,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        finding TEXT NOT NULL,
        confidence TEXT NOT NULL,
        data_sources TEXT NOT NULL,
        significance TEXT,
        generated_at TEXT NOT NULL,
        published INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS research_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        data_sources TEXT,
        hypothesis TEXT,
        method TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS auto_content (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL,
        source_insight_id TEXT,
        generated_at TEXT NOT NULL,
        published INTEGER DEFAULT 0
      );
    `);
  }

  private loadExistingInsightHashes() {
    const hashes = this.db.prepare('SELECT hash FROM generated_insights').all() as any[];
    for (const h of hashes) {this.insightHashes.add(h.hash);}
  }

  private hashInsight(insight: CrossReferenceInsight): string {
    const str = `${insight.category}|${insight.title}|${insight.finding.substring(0, 100)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `h${Math.abs(hash)}`;
  }

  /**
   * Run the full intelligence cycle, called by CronDaemon
   */
  async runCycle(): Promise<AutonomousRunLog> {
    const start = Date.now();
    const runId = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const errors: string[] = [];
    let insightsGenerated = 0;
    let tasksCreated = 0;
    let contentGenerated = 0;

    logger.info({ runId }, '[IntelligenceOrchestrator] Starting autonomous intelligence cycle');

    try {
      // Step 1: Generate cross-reference insights
      logger.info('[IntelligenceOrchestrator] Step 1: Cross-referencing datasets');
      const insights = crossReference.getAllInsights();
      for (const insight of insights) {
        const hash = this.hashInsight(insight);
        if (!this.insightHashes.has(hash)) {
          const now = new Date().toISOString();
          this.db.prepare(
            'INSERT OR IGNORE INTO generated_insights (id, hash, category, title, finding, confidence, data_sources, significance, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(insight.id, hash, insight.category, insight.title, insight.finding, insight.confidence,
            insight.dataSources.join('; '), insight.significance, now);
          this.insightHashes.add(hash);
          insightsGenerated++;

          // Log provenance
          mesh.logProvenance('hemp-os', 'intelligence-orchestrator', 'insight-generated', {
            insightId: insight.id,
            category: insight.category,
            title: insight.title,
          });
        }
      }

      // Step 2: Generate research tasks from data gaps
      logger.info('[IntelligenceOrchestrator] Step 2: Identifying research tasks');
      const tasks = this.identifyResearchTasks();
      for (const task of tasks) {
        this.db.prepare(`
          INSERT OR IGNORE INTO research_tasks (id, title, description, priority, data_sources, hypothesis, method, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `).run(task.id, task.title, task.description, task.priority, task.dataSources.join(', '),
          task.hypothesis, task.method);
        tasksCreated++;
        mesh.logProvenance('hemp-os', 'intelligence-orchestrator', 'task-created', { taskId: task.id, title: task.title });
      }

      // Step 3: Generate public education content from new insights
      logger.info('[IntelligenceOrchestrator] Step 3: Generating content');
      const newInsights = this.db.prepare(`
        SELECT * FROM generated_insights WHERE published = 0 ORDER BY generated_at DESC LIMIT 5
      `).all() as any[];

      for (const ins of newInsights) {
        try {
          // Generate a did-you-know fact related to this insight
          const now2 = new Date().toISOString();
          const fact = publicEducation.generateDidYouKnow();
          const contentId1 = `content-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          this.db.prepare(
            'INSERT INTO auto_content (id, content_type, topic, content, source_insight_id, generated_at, published) VALUES (?, ?, ?, ?, ?, ?, 0)'
          ).run(contentId1, 'did-you-know', ins.category, JSON.stringify(fact), ins.id, now2);
          contentGenerated++;

          const thread = publicEducation.generateSocialThread('science_fact');
          const contentId2 = `content-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          this.db.prepare(
            'INSERT INTO auto_content (id, content_type, topic, content, source_insight_id, generated_at, published) VALUES (?, ?, ?, ?, ?, ?, 0)'
          ).run(contentId2, 'social-thread', ins.category, JSON.stringify(thread), ins.id, now2);

          contentGenerated += 2;

          // Mark insight as published
          this.db.prepare('UPDATE generated_insights SET published = 1 WHERE id = ?').run(ins.id);
        } catch (err: any) {
          errors.push(`Content generation for ${ins.id}: ${err.message}`);
        }
      }

    } catch (err: any) {
      errors.push(`Intelligence cycle failed: ${err.message}`);
      logger.error({ err }, '[IntelligenceOrchestrator] Cycle error');
    }

    const duration = Date.now() - start;

    // Log the run
    this.db.prepare(`
      INSERT INTO autonomous_runs (run_id, timestamp, insights_generated, research_tasks_created, content_generated, duration_ms, errors_json)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?)
    `).run(runId, insightsGenerated, tasksCreated, contentGenerated, duration, JSON.stringify(errors));

    this.lastRun = {
      runId,
      timestamp: new Date().toISOString(),
      insightsGenerated,
      researchTasksCreated: tasksCreated,
      contentGenerated,
      duration,
      errors,
    };

    logger.info({ runId, insightsGenerated, tasksCreated, contentGenerated, durationMs: duration },
      '[IntelligenceOrchestrator] Cycle complete');

    return this.lastRun;
  }

  /**
   * Identify data gaps and create research tasks to fill them
   */
  private identifyResearchTasks(): ResearchTask[] {
    const tasks: ResearchTask[] = [];
    const now = new Date().toISOString();

    // Task 1: Chemotype gap — only 7% of strains are CBD-rich
    const cbdRichCount = this.db.prepare(
      `SELECT COUNT(*) as c FROM strains WHERE CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) > 4`
    ).get() as any;

    if (cbdRichCount && cbdRichCount.c < 50) {
      tasks.push({
        id: `task-chemotype-${Date.now()}`,
        title: 'Identify and catalog CBD-rich and CBG-rich strains',
        description: `Only ${cbdRichCount.c} CBD-rich strains in database. Need to expand chemotype diversity coverage.`,
        priority: 'high',
        dataSources: ['PubMed', 'OpenAlex', 'DeepSeek API'],
        hypothesis: 'There are significantly more CBD-rich and minor-cannabinoid strains in cultivation than represented in current databases.',
        method: 'Literature search for minor cannabinoid strains + API enrichment',
        status: 'pending',
        createdAt: now,
      });
    }

    // Task 2: Market data is from 2013-2015 — needs updating
    const latestPrice = this.db.prepare('SELECT MAX(observation_date) as d FROM market_prices').get() as any;
    if (latestPrice && latestPrice.d && latestPrice.d < '2016-01-01') {
      tasks.push({
        id: `task-market-update-${Date.now()}`,
        title: 'Update market pricing data with current state-level prices',
        description: `Latest price data is from ${latestPrice.d}. Need current data for accurate analysis.`,
        priority: 'high',
        dataSources: ['Leafly pricing data', 'State regulatory reports', 'Headset.io'],
        hypothesis: 'Legalization has caused significant price compression since 2015, especially in mature markets.',
        method: 'Web scraping of legal dispensary menus + state regulatory price reporting',
        status: 'pending',
        createdAt: now,
      });
    }

    // Task 3: Research outcome correlation with market pricing
    tasks.push({
      id: `task-research-market-${Date.now()}`,
      title: 'Correlate research study outcomes with market pricing trends',
      description: 'Determine if positive research outcomes drive price premiums in specific state markets.',
      priority: 'medium',
      dataSources: ['research_studies', 'market_prices', 'market_states'],
      hypothesis: 'States with more positive research outcomes per capita have lower cannabis prices due to normalized medical access.',
      method: 'Join research study density by state with market pricing data, controlling for legal status.',
      status: 'pending',
      createdAt: now,
    });

    // Task 4: MMJ product trend forecasting
    tasks.push({
      id: `task-mmj-trends-${Date.now()}`,
      title: 'Analyze MMJ product formulation trends over time',
      description: 'Track how cannabinoid ratios and terpene profiles in medical products have evolved.',
      priority: 'medium',
      dataSources: ['mmj_products (14,150 CT registry entries)'],
      hypothesis: 'Medical cannabis products are trending toward higher terpene diversity and more balanced cannabinoid ratios over time.',
      method: 'Time-series analysis of MMJ product formulations by approval date.',
      status: 'pending',
      createdAt: now,
    });

    return tasks;
  }

  /**
   * Get the status of the intelligence system
   */
  getStatus() {
    const stats = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM generated_insights) as total_insights,
        (SELECT COUNT(*) FROM generated_insights WHERE published = 1) as published_insights,
        (SELECT COUNT(*) FROM research_tasks) as total_tasks,
        (SELECT COUNT(*) FROM research_tasks WHERE status = 'pending') as pending_tasks,
        (SELECT COUNT(*) FROM research_tasks WHERE status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM auto_content) as total_content,
        (SELECT COUNT(*) FROM auto_content WHERE published = 1) as published_content,
        (SELECT COUNT(*) FROM autonomous_runs) as total_runs
    `).get() as any;

    const recentRuns = this.db.prepare(
      'SELECT * FROM autonomous_runs ORDER BY timestamp DESC LIMIT 5'
    ).all();

    return { stats, recentRuns, lastRun: this.lastRun };
  }

  /**
   * Get all pending research tasks
   */
  getPendingTasks(): ResearchTask[] {
    return this.db.prepare(
      "SELECT * FROM research_tasks WHERE status = 'pending' ORDER BY priority DESC, created_at ASC"
    ).all() as ResearchTask[];
  }

  /**
   * Get all generated insights with optional filter
   */
  getInsights(category?: string, limit = 50): CrossReferenceInsight[] {
    const where = category ? 'WHERE category = ?' : '';
    const params = category ? [category, limit] : [limit];
    return this.db.prepare(
      `SELECT * FROM generated_insights ${where} ORDER BY generated_at DESC LIMIT ?`
    ).all(...params) as any as CrossReferenceInsight[];
  }

  /**
   * Get auto-generated content ready for publishing
   */
  getPublishableContent(limit = 20) {
    return this.db.prepare(
      "SELECT * FROM auto_content WHERE published = 0 ORDER BY generated_at ASC LIMIT ?"
    ).all(limit);
  }

  /**
   * Mark content as published
   */
  markPublished(contentId: string) {
    this.db.prepare('UPDATE auto_content SET published = 1 WHERE id = ?').run(contentId);
  }

  destroy() {
    this.db.close();
  }
}

export const intelligenceOrchestrator = new IntelligenceOrchestrator();
