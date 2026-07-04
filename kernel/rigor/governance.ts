/**
 * Scientific Governance System
 *
 * Manages advisory board, community contributors, and institutional
 * partnerships with formal oversight logging.
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

export interface Advisor {
  id: string;
  name: string;
  expertise: string;
  affiliation: string;
  scope: string;
  appointedAt: string;
  lastReview: string | null;
  status: 'active' | 'inactive';
}

export interface Contributor {
  id: string;
  name: string;
  affiliation: string;
  area: string;
  accessLevel: string;
  joinedAt: string;
  contributions: number;
}

export class Governance {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS advisory_board (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        expertise TEXT,
        affiliation TEXT,
        scope TEXT,
        appointed_at TEXT,
        last_review TEXT,
        status TEXT DEFAULT 'active'
      );
      CREATE TABLE IF NOT EXISTS community_contributors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        affiliation TEXT,
        area TEXT,
        access_level TEXT,
        joined_at TEXT,
        contributions INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS institutional_partnerships (
        id TEXT PRIMARY KEY,
        institution_name TEXT NOT NULL,
        partnership_type TEXT,
        principal_investigator TEXT,
        active_from TEXT,
        active_until TEXT,
        status TEXT DEFAULT 'active'
      );
      CREATE TABLE IF NOT EXISTS governance_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
      );
    `);
  }

  appointAdvisor(name: string, expertise: string, affiliation: string, scope: string): Advisor {
    const id = `adv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO advisory_board (id, name, expertise, affiliation, scope, appointed_at, status) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), \'active\')')
      .run(id, name, expertise, affiliation, scope);
    this.log('appoint_advisor', `Appointed ${name} as advisor for ${scope}`);
    return { id, name, expertise, affiliation, scope, appointedAt: new Date().toISOString(), lastReview: null, status: 'active' };
  }

  onboardContributor(name: string, affiliation: string, area: string, accessLevel: string): Contributor {
    const id = `con-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO community_contributors (id, name, affiliation, area, access_level, joined_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))')
      .run(id, name, affiliation, area, accessLevel);
    return { id, name, affiliation, area, accessLevel, joinedAt: new Date().toISOString(), contributions: 0 };
  }

  addPartnership(institution: string, type: string, pi: string) {
    const id = `inst-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO institutional_partnerships (id, institution_name, partnership_type, principal_investigator, active_from, status) VALUES (?, ?, ?, ?, datetime(\'now\'), \'active\')')
      .run(id, institution, type, pi);
    this.log('add_partnership', `Partnered with ${institution} (${type}, PI: ${pi})`);
    return { id, institution, type, pi };
  }

  recordContribution(id: string) {
    db.prepare('UPDATE community_contributors SET contributions = contributions + 1 WHERE id = ?').run(id);
  }

  private log(action: string, details: string) {
    db.prepare('INSERT INTO governance_log (id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, datetime(\'now\'))')
      .run(`log-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`, action, 'governance', details);
  }

  getAdvisors(): Advisor[] { return db.prepare('SELECT * FROM advisory_board ORDER BY appointed_at DESC').all() as Advisor[]; }
  getContributors(): Contributor[] { return db.prepare('SELECT * FROM community_contributors ORDER BY contributions DESC').all() as Contributor[]; }
  getPartnerships() { return db.prepare('SELECT * FROM institutional_partnerships WHERE status = \'active\' ORDER BY active_from DESC').all(); }
  getStats() {
    return {
      advisors: (db.prepare('SELECT COUNT(*) as c FROM advisory_board WHERE status = \'active\'').get() as any).c,
      contributors: (db.prepare('SELECT COUNT(*) as c FROM community_contributors').get() as any).c,
      partnerships: (db.prepare('SELECT COUNT(*) as c FROM institutional_partnerships WHERE status = \'active\'').get() as any).c,
    };
  }
}

export const governance = new Governance();
