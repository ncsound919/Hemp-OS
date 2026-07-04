/**
 * DuckDB Analytical Query Layer
 *
 * Supplements SQLite for heavy analytical workloads:
 *  - Market pricing aggregations (22K+ records)
 *  - Research study statistical analysis (12K+ records)
 *  - Cross-dataset joins across multiple tables
 *  - Window functions, complex GROUP BYs
 *
 * DuckDB is optimized for OLAP (columnar) queries and can
 * query SQLite databases directly without data migration.
 */

import Database from 'better-sqlite3';
import path from 'path';

const SQLITE_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');

export interface AnalyticalQuery {
  name: string;
  description: string;
  sql: string;
}

export class DuckDBAnalytics {
  private sqlite: Database.Database;
  private duckdb: any = null;
  private duckdbAvailable = false;

  constructor() {
    this.sqlite = new Database(SQLITE_PATH);
    this.initDuckDB();
  }

  private async initDuckDB() {
    try {
      // duckdb uses CommonJS exports
      const duckdbMod = await import('duckdb');
      const DuckDB = duckdbMod.default || duckdbMod;
      this.duckdb = new DuckDB.Database(':memory:');
      this.duckdbAvailable = true;
      this.duckdb.exec(`ATTACH '${SQLITE_PATH}' AS hemp_os (TYPE SQLITE)`);
    } catch (e) {
      this.duckdbAvailable = false;
    }
  }

  isAvailable(): boolean { return this.duckdbAvailable; }

  /**
   * Heavy analytical query: market price trends with moving averages
   */
  getMarketTrendsMA(): AnalyticalQuery {
    return {
      name: 'Market Price Moving Averages',
      description: 'State-level cannabis pricing with 3-month moving averages for trend smoothing',
      sql: `SELECT state, observation_date, highq_price,
            AVG(highq_price) OVER (PARTITION BY state ORDER BY observation_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as ma_3mo
            FROM market_prices WHERE highq_price IS NOT NULL`,
    };
  }

  /**
   * Cross-reference: study outcomes per condition with statistical significance
   */
  getStudyConditionAnalysis(): AnalyticalQuery {
    return {
      name: 'Research Study Outcomes by Condition',
      description: 'Counts of positive/negative/inconclusive studies per medical condition with percentage breakdowns',
      sql: `SELECT TRIM(value) as condition,
            COUNT(*) as total,
            SUM(CASE WHEN result_no_finetune = 'Positive' THEN 1 ELSE 0 END) as positive,
            SUM(CASE WHEN result_no_finetune = 'Negative' THEN 1 ELSE 0 END) as negative,
            SUM(CASE WHEN result_no_finetune = 'Inconclusive' THEN 1 ELSE 0 END) as inconclusive,
            ROUND(AVG(CASE WHEN result_no_finetune = 'Positive' THEN 1.0 ELSE 0.0 END) * 100, 1) as pct_positive
            FROM research_studies, json_each('["' || REPLACE(study_conditions, ';', '","') || '"]')
            WHERE study_conditions != '' AND result_no_finetune IN ('Positive', 'Negative', 'Inconclusive')
            GROUP BY condition HAVING total >= 10
            ORDER BY total DESC`,
    };
  }

  /**
   * Analytical query: strain cannabinoid ratios with chemotype classification
   */
  getStrainChemotypeAnalysis(): AnalyticalQuery {
    return {
      name: 'Strain Chemotype Classification',
      description: 'Classifies strains into Type I (THC-dominant), Type II (mixed), Type III (CBD-dominant) per chemical profile',
      sql: `SELECT
            CASE
              WHEN CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0 AND CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) = 0 THEN 'Type I (THC-dominant)'
              WHEN CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) > 4 THEN 'Type III (CBD-dominant)'
              WHEN CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 5 AND CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) > 2 THEN 'Type II (Mixed)'
              ELSE 'Other'
            END as chemotype,
            COUNT(*) as count,
            ROUND(AVG(CAST(json_extract(cannabinoids_json, '$.thc') AS REAL)), 1) as avg_thc,
            ROUND(AVG(CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL)), 1) as avg_cbd
            FROM strains
            WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0
            GROUP BY chemotype
            ORDER BY count DESC`,
    };
  }

  /**
   * Run a raw SQL query against the attached database via DuckDB
   */
  query(sql: string): any[] {
    if (!this.duckdbAvailable) {
      // Fallback to SQLite if DuckDB not available
      return this.sqlite.prepare(sql).all();
    }
    return this.duckdb.query(sql);
  }

  /**
   * Pre-built heavy analytical queries
   */
  getPrebuiltQueries(): AnalyticalQuery[] {
    return [
      this.getMarketTrendsMA(),
      this.getStudyConditionAnalysis(),
      this.getStrainChemotypeAnalysis(),
    ];
  }

  destroy() {
    this.sqlite.close();
    if (this.duckdb) {this.duckdb.close();}
  }
}

export const analytics = new DuckDBAnalytics();
