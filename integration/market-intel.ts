/**
 * Hemp OS Market Intelligence Service
 *
 * Provides cannabis pricing analysis, state comparisons, trends,
 * and market insights using the imported Weed_Price dataset.
 * Data: 22,899 records across 51 US states (2013-2015 daily).
 *
 * Source: https://github.com/amitkaps/weed
 */

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

export interface PricePoint {
  state: string;
  highqPrice: number | null;
  medqPrice: number | null;
  lowqPrice: number | null;
  date: string;
}

export interface StateSummary {
  state: string;
  abbreviation: string;
  legalStatus: string;
  avgHighPrice: number;
  avgMedPrice: number;
  avgLowPrice: number;
  highQTransactions: number;
  medQTransactions: number;
  lowQTransactions: number;
  totalPopulation: number;
  perCapitaIncome: number;
}

export interface PriceTrend {
  month: string;
  avgHigh: number;
  avgMed: number;
  avgLow: number;
}

export class MarketIntel {
  /**
   * Get latest prices for all states
   */
  getLatestPrices(): PricePoint[] {
    return db.prepare(`
      SELECT mp.state, mp.highq_price, mp.medq_price, mp.lowq_price, mp.observation_date as date
      FROM market_prices mp
      INNER JOIN (
        SELECT state, MAX(observation_date) as max_date
        FROM market_prices GROUP BY state
      ) latest ON mp.state = latest.state AND mp.observation_date = latest.max_date
      ORDER BY mp.highq_price DESC
    `).all() as PricePoint[];
  }

  /**
   * Get full state summary with demographics
   */
  getStateSummary(state?: string): StateSummary[] {
    const where = state ? 'WHERE s.name = ?' : '';
    const params = state ? [state] : [];
    return db.prepare(`
      SELECT
        s.name as state, s.abbreviation, s.legal_status as legalStatus,
        ROUND(AVG(mp.highq_price), 2) as avgHighPrice,
        ROUND(AVG(mp.medq_price), 2) as avgMedPrice,
        ROUND(AVG(mp.lowq_price), 2) as avgLowPrice,
        SUM(mp.highq_transactions) as highQTransactions,
        SUM(mp.medq_transactions) as medQTransactions,
        SUM(mp.lowq_transactions) as lowQTransactions,
        d.total_population as totalPopulation,
        d.per_capita_income as perCapitaIncome
      FROM market_states s
      JOIN market_prices mp ON LOWER(s.name) = LOWER(mp.state)
      LEFT JOIN state_demographics d ON LOWER(d.state) = LOWER(s.name)
      ${where}
      GROUP BY s.name
      ORDER BY avgHighPrice DESC
    `).all(...params) as StateSummary[];
  }

  /**
   * Get monthly price trends for a state
   */
  getTrends(state: string, months = 12): PriceTrend[] {
    return db.prepare(`
      SELECT
        year || '-' || printf('%02d', month) as month,
        ROUND(AVG(highq_price), 2) as avgHigh,
        ROUND(AVG(medq_price), 2) as avgMed,
        ROUND(AVG(lowq_price), 2) as avgLow
      FROM market_prices
      WHERE LOWER(state) = LOWER(?)
      GROUP BY year, month
      ORDER BY year, month
      LIMIT ?
    `).all(state.toLowerCase(), months) as PriceTrend[];
  }

  /**
   * Find the cheapest and most expensive states
   */
  getMarketExtremes(): { cheapest: StateSummary | null; mostExpensive: StateSummary | null } {
    const all = this.getStateSummary();
    if (all.length === 0) {return { cheapest: null, mostExpensive: null };}
    return {
      cheapest: all.reduce((a, b) => (a.avgHighPrice < b.avgHighPrice ? a : b)),
      mostExpensive: all.reduce((a, b) => (a.avgHighPrice > b.avgHighPrice ? a : b)),
    };
  }

  /**
   * Correlation between legal status and price
   */
  getLegalStatusAnalysis() {
    return db.prepare(`
      SELECT
        s.legal_status as status,
        COUNT(DISTINCT s.name) as stateCount,
        ROUND(AVG(mp.highq_price), 2) as avgHighPrice,
        ROUND(AVG(mp.medq_price), 2) as avgMedPrice,
        SUM(mp.highq_transactions) as totalHighQTransactions,
        SUM(mp.medq_transactions) as totalMedQTransactions
      FROM market_states s
      JOIN market_prices mp ON LOWER(s.name) = LOWER(mp.state)
      GROUP BY s.legal_status
      ORDER BY avgHighPrice DESC
    `).all();
  }

  /**
   * Get price history for a specific state
   */
  getPriceHistory(state: string, limit = 100): PricePoint[] {
    return db.prepare(`
      SELECT state, highq_price as highqPrice, medq_price as medqPrice, lowq_price as lowqPrice, observation_date as date
      FROM market_prices
      WHERE LOWER(state) = LOWER(?)
      ORDER BY observation_date DESC
      LIMIT ?
    `).all(state.toLowerCase(), limit) as PricePoint[];
  }

  /**
   * Search market data across states
   */
  search(query: string): { states: StateSummary[]; trends: any } {
    const states = this.getStateSummary().filter(s =>
      s.state.toLowerCase().includes(query.toLowerCase()) ||
      s.abbreviation.toLowerCase().includes(query.toLowerCase())
    );
    return { states, trends: null };
  }

  /**
   * Get database statistics
   */
  getStats() {
    return db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM market_prices) as totalPriceRecords,
        (SELECT COUNT(*) FROM market_states) as totalStates,
        (SELECT MIN(observation_date) FROM market_prices) as earliestDate,
        (SELECT MAX(observation_date) FROM market_prices) as latestDate,
        (SELECT ROUND(AVG(highq_price), 2) FROM market_prices) as nationalAvgHigh,
        (SELECT ROUND(AVG(medq_price), 2) FROM market_prices) as nationalAvgMed,
        (SELECT SUM(highq_transactions) FROM market_prices) as totalHighQTransactions,
        (SELECT SUM(medq_transactions) FROM market_prices) as totalMedQTransactions
    `).get();
  }
}

export const marketIntel = new MarketIntel();
