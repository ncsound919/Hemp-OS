/**
 * Chart Data Service
 *
 * Prepares structured data for interactive charts and visualizations.
 * Outputs datasets ready for Recharts, D3, or any charting library.
 */

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

export interface ChartDataset {
  type: 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'treemap' | 'heatmap';
  title: string;
  description: string;
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
  metadata?: Record<string, any>;
}

export class ChartDataService {
  /**
   * THC distribution across all strains (histogram)
   */
  getTHCDistribution(): ChartDataset {
    const buckets = [
      { min: 0, max: 5, label: '0-5%' },
      { min: 5, max: 10, label: '5-10%' },
      { min: 10, max: 15, label: '10-15%' },
      { min: 15, max: 18, label: '15-18%' },
      { min: 18, max: 20, label: '18-20%' },
      { min: 20, max: 22, label: '20-22%' },
      { min: 22, max: 25, label: '22-25%' },
      { min: 25, max: 100, label: '25%+' },
    ];

    const counts = buckets.map(b => {
      const r = db.prepare(`
        SELECT COUNT(*) as c FROM strains
        WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) >= ? 
        AND CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) < ?
      `).get(b.min, b.max) as any;
      return r.c;
    });

    return {
      type: 'bar',
      title: 'THC Distribution Across Strains',
      description: 'How many strains fall into each THC potency range',
      labels: buckets.map(b => b.label),
      datasets: [{ label: 'Number of Strains', data: counts, color: '#22c55e' }],
      metadata: { total: counts.reduce((a, b) => a + b, 0), unit: '% THC' },
    };
  }

  /**
   * Strain type breakdown (indica/sativa/hybrid)
   */
  getStrainTypeDistribution(): ChartDataset {
    const types = db.prepare(`
      SELECT type, COUNT(*) as c FROM strains GROUP BY type ORDER BY c DESC
    `).all() as any[];

    return {
      type: 'pie',
      title: 'Strain Type Distribution',
      description: 'Breakdown of Indica, Sativa, and Hybrid strains in the database',
      labels: types.map(t => t.type.charAt(0).toUpperCase() + t.type.slice(1)),
      datasets: [{ label: 'Strains', data: types.map(t => t.c) }],
      metadata: { total: types.reduce((s, t) => s + t.c, 0) },
    };
  }

  /**
   * Top THC strains
   */
  getTopTHCStrains(limit = 20): ChartDataset {
    const strains = db.prepare(`
      SELECT canonical_name, CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc
      FROM strains WHERE thc > 0
      ORDER BY thc DESC LIMIT ?
    `).all(limit) as any[];

    return {
      type: 'bar',
      title: `Top ${limit} Strains by THC Content`,
      description: 'The highest-THC strains in our database',
      labels: strains.map(s => s.canonical_name.length > 18 ? `${s.canonical_name.substring(0, 16)  }...` : s.canonical_name),
      datasets: [{ label: 'THC %', data: strains.map(s => parseFloat(s.thc) || 0), color: '#a855f7' }],
      metadata: { unit: '% THC' },
    };
  }

  /**
   * Monthly market price trends
   */
  getMarketPriceTrend(state?: string): ChartDataset {
    const where = state ? 'WHERE LOWER(mp.state) = LOWER(?)' : '';
    const params = state ? [state] : [];

    const trends = db.prepare(`
      SELECT mp.year, mp.month,
        ROUND(AVG(mp.highq_price), 2) as high,
        ROUND(AVG(mp.medq_price), 2) as med,
        ROUND(AVG(mp.lowq_price), 2) as low
      FROM market_prices mp
      ${where}
      GROUP BY mp.year, mp.month
      ORDER BY mp.year, mp.month
    `).all(...params) as any[];

    return {
      type: 'line',
      title: state ? `${state} Cannabis Price Trends` : 'National Average Cannabis Price Trends',
      description: 'Average price per ounce by quality tier over time',
      labels: trends.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`),
      datasets: [
        { label: 'High Quality', data: trends.map(t => t.high), color: '#22c55e' },
        { label: 'Medium Quality', data: trends.map(t => t.med), color: '#3b82f6' },
        { label: 'Low Quality', data: trends.map(t => t.low), color: '#f59e0b' },
      ],
      metadata: { unit: 'USD/oz', source: 'priceofweed.com (2013-2015)' },
    };
  }

  /**
   * State price comparison (map-ready data)
   */
  getStatePriceComparison(): ChartDataset {
    const states = db.prepare(`
      SELECT LOWER(s.name) as state, s.abbreviation,
        ROUND(AVG(mp.highq_price), 2) as avgHigh
      FROM market_states s
      JOIN market_prices mp ON LOWER(s.name) = LOWER(mp.state)
      GROUP BY s.name ORDER BY avgHigh DESC
    `).all() as any[];

    return {
      type: 'bar',
      title: 'Average High-Quality Price by State',
      description: 'Comparison of high-quality cannabis prices across US states',
      labels: states.map(s => s.abbreviation),
      datasets: [{ label: 'Avg $/oz', data: states.map(s => s.avgHigh), color: '#06b6d4' }],
      metadata: { unit: 'USD/oz', sortedBy: 'price descending' },
    };
  }

  /**
   * Strain cannabinoid profile (radar chart ready)
   */
  getCannabinoidProfile(strainName: string): ChartDataset | null {
    const strain = db.prepare(`
      SELECT cannabinoids_json FROM strains WHERE canonical_name = ?
    `).get(strainName) as any;

    if (!strain) {return null;}

    const c = JSON.parse(strain.cannabinoids_json);
    const names = ['THC', 'CBD', 'CBG', 'CBN'];
    const values = [c.thc || 0, c.cbd || 0, c.cbg || 0, c.cbn || 0];

    return {
      type: 'radar',
      title: `${strainName} Cannabinoid Profile`,
      description: 'Relative cannabinoid concentrations',
      labels: names,
      datasets: [{ label: strainName, data: values, color: '#22c55e' }],
      metadata: { unit: '% dry weight' },
    };
  }

  /**
   * Legal status vs price comparison
   */
  getLegalStatusPriceComparison(): ChartDataset {
    const data = db.prepare(`
      SELECT s.legal_status as status,
        ROUND(AVG(mp.highq_price), 2) as avgHigh,
        ROUND(AVG(mp.medq_price), 2) as avgMed,
        COUNT(DISTINCT s.name) as states
      FROM market_states s
      JOIN market_prices mp ON LOWER(s.name) = LOWER(mp.state)
      GROUP BY s.legal_status
      ORDER BY avgHigh DESC
    `).all() as any[];

    return {
      type: 'bar',
      title: 'Price by Legal Status',
      description: 'How legal status affects cannabis pricing',
      labels: data.map(d => d.status.replace('-', ' / ')),
      datasets: [
        { label: 'High Quality', data: data.map(d => d.avgHigh), color: '#22c55e' },
        { label: 'Medium Quality', data: data.map(d => d.avgMed), color: '#3b82f6' },
      ],
      metadata: { unit: 'USD/oz' },
    };
  }

  /**
   * Papers by publication year
   */
  getPapersByYear(): ChartDataset {
    const data = db.prepare(`
      SELECT year, COUNT(*) as c
      FROM papers WHERE year > 0
      GROUP BY year ORDER BY year
    `).all() as any[];

    return {
      type: 'line',
      title: 'Scientific Papers by Publication Year',
      description: 'Number of cannabis research papers in our database by year',
      labels: data.map(d => String(d.year)),
      datasets: [{ label: 'Papers', data: data.map(d => d.c), color: '#3b82f6' }],
      metadata: { total: data.reduce((s, d) => s + d.c, 0) },
    };
  }

  /**
   * Strain effects word cloud data
   */
  getEffectsFrequency(): ChartDataset {
    const strains = db.prepare('SELECT effects_json FROM strains WHERE effects_json IS NOT NULL').all() as any[];
    const freq = new Map<string, number>();

    for (const s of strains) {
      try {
        const effects = JSON.parse(s.effects_json) as string[];
        for (const e of effects) {
          const key = e.charAt(0).toUpperCase() + e.slice(1).toLowerCase();
          freq.set(key, (freq.get(key) || 0) + 1);
        }
      } catch { /* skip */ }
    }

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

    return {
      type: 'bar',
      title: 'Most Common Strain Effects',
      description: 'How frequently each effect appears across all strains',
      labels: sorted.map(([e]) => e),
      datasets: [{ label: 'Strains', data: sorted.map(([, c]) => c), color: '#f59e0b' }],
      metadata: { totalStrains: strains.length },
    };
  }

  /**
   * Get all chart datasets for a dashboard
   */
  getDashboardCharts(): Record<string, ChartDataset> {
    return {
      thcDistribution: this.getTHCDistribution(),
      strainTypes: this.getStrainTypeDistribution(),
      topTHC: this.getTopTHCStrains(15),
      marketTrend: this.getMarketPriceTrend(),
      statePrices: this.getStatePriceComparison(),
      legalStatusPrices: this.getLegalStatusPriceComparison(),
      papersTimeline: this.getPapersByYear(),
      effectsFrequency: this.getEffectsFrequency(),
    };
  }
}

export const chartDataService = new ChartDataService();
