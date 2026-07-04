/**
 * Strain Intelligence Engine (Upgrade #2)
 *
 * Provides real strain similarity, chemotype clustering, and
 * cross-reference analytics using actual database data.
 *
 * Replaces the mock Cytoscape.js data in App.tsx with
 * real lineage connections, cannabinoid similarity, and
 * chemotype classification from the database.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

function safeJsonParse(val: string | null | undefined, fallback: any): any {
  if (!val) {return fallback;}
  try { return JSON.parse(val); } catch { return fallback; }
}

export interface StrainNode {
  id: string;
  name: string;
  type: string;
  thc: number;
  cbd: number;
  cbg: number;
  lineage: string[];
  effects: string[];
}

export interface SimilarityEdge {
  source: string;
  target: string;
  similarity: number;
}

export interface ChemotypeCluster {
  name: string;
  strains: string[];
  avgTHC: number;
  avgCBD: number;
  count: number;
}

export class StrainIntelligence {
  /**
   * Get all strains with real data for the Cytoscape network
   */
  getStrainNetwork(): { nodes: StrainNode[]; edges: SimilarityEdge[] } {
    const raw = db.prepare(`
      SELECT canonical_name, type,
        CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc,
        CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) as cbd,
        CAST(json_extract(cannabinoids_json, '$.cbg') AS REAL) as cbg,
        effects_json, lineage_json
      FROM strains
      WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0
      ORDER BY thc DESC
    `).all() as any[];

    const nodes: StrainNode[] = raw.map(r => {
      const effects = safeJsonParse(r.effects_json, []);
      return {
        id: r.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: r.canonical_name,
        type: r.type || 'hybrid',
        thc: r.thc || 0,
        cbd: r.cbd || 0,
        cbg: r.cbg || 0,
        lineage: safeJsonParse(r.lineage_json, []),
        effects: Array.isArray(effects) ? effects : [],
      };
    });

    // Build similarity edges between strains with comparable profiles
    const edges: SimilarityEdge[] = [];
    const topStrains = nodes.slice(0, 100); // Limit to top 100 for performance

    for (let i = 0; i < topStrains.length; i++) {
      for (let j = i + 1; j < Math.min(i + 10, topStrains.length); j++) {
        const a = topStrains[i], b = topStrains[j];
        if (a.type !== b.type) {continue;} // Only connect same-type strains

        // Cannabinoid profile similarity
        const thcSim = 1 - Math.abs(a.thc - b.thc) / Math.max(a.thc, b.thc, 1);
        const cbdSim = 1 - Math.abs(a.cbd - b.cbd) / Math.max(a.cbd, b.cbd, 1);

        // Effect similarity
        const commonEffects = a.effects.filter(e => b.effects.includes(e)).length;
        const effectSim = Math.max(a.effects.length, b.effects.length) > 0
          ? commonEffects / Math.max(a.effects.length, b.effects.length) : 0;

        const similarity = (thcSim * 0.4 + cbdSim * 0.3 + effectSim * 0.3);
        if (similarity > 0.5) {
          edges.push({ source: a.id, target: b.id, similarity: Math.round(similarity * 100) / 100 });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Classify strains into chemotype clusters
   */
  getChemotypeClusters(): ChemotypeCluster[] {
    const raw = db.prepare(`
      SELECT canonical_name,
        CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc,
        CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) as cbd
      FROM strains
      WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0
    `).all() as any[];

    const clusters = new Map<string, { strains: string[]; totalTHC: number; totalCBD: number; count: number }>();

    for (const r of raw) {
      let clusterName: string;
      if (r.cbd > 4) {
        clusterName = r.thc > 5 ? 'Type II: Mixed Ratio' : 'Type III: CBD-Dominant';
      } else if (r.thc > 20) {
        clusterName = 'Type I: High THC';
      } else if (r.thc > 10) {
        clusterName = 'Type I: Moderate THC';
      } else {
        clusterName = 'Low Cannabinoid';
      }

      const existing = clusters.get(clusterName) || { strains: [], totalTHC: 0, totalCBD: 0, count: 0 };
      existing.strains.push(r.canonical_name);
      existing.totalTHC += r.thc || 0;
      existing.totalCBD += r.cbd || 0;
      existing.count++;
      clusters.set(clusterName, existing);
    }

    return [...clusters.entries()]
      .map(([name, data]) => ({
        name,
        strains: data.strains.slice(0, 20), // Top 20 per cluster
        avgTHC: Math.round((data.totalTHC / data.count) * 10) / 10,
        avgCBD: Math.round((data.totalCBD / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Find similar strains to a given strain
   */
  findSimilar(strainName: string, limit = 10): StrainNode[] {
    const target = db.prepare(`
      SELECT canonical_name, type,
        CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc,
        CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) as cbd,
        CAST(json_extract(cannabinoids_json, '$.cbg') AS REAL) as cbg,
        effects_json
      FROM strains WHERE LOWER(canonical_name) LIKE LOWER(?)
    `).get(`%${strainName}%`) as any;

    if (!target) {return [];}

    const candidates = db.prepare(`
      SELECT canonical_name, type,
        CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc,
        CAST(json_extract(cannabinoids_json, '$.cbd') AS REAL) as cbd,
        CAST(json_extract(cannabinoids_json, '$.cbg') AS REAL) as cbg,
        effects_json
      FROM strains WHERE id != ? AND CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0
    `).all(target.id || 0) as any[];

    const targetEffects = safeJsonParse(target.effects_json, []);

    const scored = candidates
      .map((c: any) => {
        const cEffects = safeJsonParse(c.effects_json, []);
        const commonEffects = targetEffects.filter((e: string) => cEffects.includes(e)).length;
        const effectSim = Math.max(targetEffects.length, cEffects.length) > 0
          ? commonEffects / Math.max(targetEffects.length, cEffects.length) : 0;
        const thcSim = 1 - Math.abs((target.thc || 0) - (c.thc || 0)) / Math.max(target.thc || 1, c.thc || 1, 1);
        const score = (thcSim * 0.5 + effectSim * 0.3 + (target.type === c.type ? 0.2 : 0));
        return { ...c, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s: any) => ({
      id: s.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: s.canonical_name, type: s.type || 'hybrid',
      thc: s.thc || 0, cbd: s.cbd || 0, cbg: s.cbg || 0,
      lineage: [], effects: safeJsonParse(s.effects_json, []),
    }));
  }

  // Get strain data ready for Cytoscape.js visualization
  getCytoscapeElements() {
    const { nodes, edges } = this.getStrainNetwork();

    const elements: any[] = [
      ...nodes.map(n => ({
        data: { id: n.id, label: n.name, type: n.type, thc: n.thc },
        classes: n.type,
      })),
      ...edges.map(e => ({
        data: { source: e.source, target: e.target, weight: e.similarity },
      })),
    ];

    return {
      elements,
      style: [
        { selector: 'node', style: { width: 'data(thc)', height: 'data(thc)', 'background-color': '#22c55e', label: 'data(label)', 'font-size': '10px', color: '#d1d1d1' } },
        { selector: 'edge', style: { width: 1, 'line-color': '#4b5563', 'curve-style': 'bezier' } },
        { selector: '.indica', style: { 'background-color': '#8b5cf6' } },
        { selector: '.sativa', style: { 'background-color': '#f59e0b' } },
        { selector: '.hybrid', style: { 'background-color': '#22c55e' } },
      ],
      layout: { name: 'cose', animate: true, idealEdgeLength: 120, nodeRepulsion: 8000 },
    };
  }
}

export const strainIntel = new StrainIntelligence();
