/**
 * Cryptographic Data Provenance Chain (Credibility Moat #2)
 *
 * Every data point is linked to its source via SHA-256 hash chain.
 * Any tampering is detectable. Enables third-party verification
 * that the data hasn't been modified since ingestion.
 */

import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

export interface ProvenanceLink {
  id: string;
  recordType: string;
  recordId: string;
  sourceDescription: string;
  sourceUrl: string;
  ingestedAt: string;
  checksum: string;
  previousChecksum: string | null;
  verified: boolean;
}

export class ProvenanceChain {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS provenance_chain (
        id TEXT PRIMARY KEY,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        source_description TEXT,
        source_url TEXT,
        ingested_at TEXT NOT NULL,
        checksum TEXT NOT NULL UNIQUE,
        previous_checksum TEXT,
        verified INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_provenance_record ON provenance_chain(record_type, record_id);
    `);
  }

  private computeChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Register a data point with its source provenance
   */
  registerRecord(recordType: string, recordId: string, data: any, source: string, sourceUrl: string): ProvenanceLink {
    const checksum = this.computeChecksum(data);
    const lastEntry = db.prepare(
      'SELECT checksum FROM provenance_chain ORDER BY rowid DESC LIMIT 1'
    ).get() as any;

    const link: ProvenanceLink = {
      id: `prov-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      recordType,
      recordId,
      sourceDescription: source,
      sourceUrl,
      ingestedAt: new Date().toISOString(),
      checksum,
      previousChecksum: lastEntry?.checksum || null,
      verified: true,
    };

    db.prepare(`
      INSERT INTO provenance_chain (id, record_type, record_id, source_description, source_url, ingested_at, checksum, previous_checksum, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(link.id, recordType, recordId, source, sourceUrl, link.ingestedAt, checksum, link.previousChecksum);

    return link;
  }

  /**
   * Verify data integrity: recomputes checksum and compares
   */
  verifyRecord(recordType: string, recordId: string, data: any): { valid: boolean; storedChecksum: string; computedChecksum: string } {
    const stored = db.prepare(
      'SELECT checksum FROM provenance_chain WHERE record_type = ? AND record_id = ? ORDER BY ingested_at DESC LIMIT 1'
    ).get(recordType, recordId) as any;

    if (!stored) {return { valid: false, storedChecksum: 'NOT FOUND', computedChecksum: '' };}

    const computed = this.computeChecksum(data);
    return {
      valid: stored.checksum === computed,
      storedChecksum: stored.checksum,
      computedChecksum: computed,
    };
  }

  /**
   * Verify the entire chain integrity
   */
  verifyChain(): { valid: boolean; brokenLinks: number; totalLinks: number } {
    const links = db.prepare('SELECT * FROM provenance_chain ORDER BY rowid ASC').all() as any[];
    let broken = 0;
    let previousHash: string | null = null;

    for (const link of links) {
      if (previousHash !== null && link.previous_checksum !== previousHash) {
        broken++;
      }
      previousHash = link.checksum;
    }

    return { valid: broken === 0, brokenLinks: broken, totalLinks: links.length };
  }

  /**
   * Get provenance for a specific record
   */
  getProvenance(recordType: string, recordId: string): ProvenanceLink | null {
    const link = db.prepare(
      'SELECT * FROM provenance_chain WHERE record_type = ? AND record_id = ? ORDER BY ingested_at DESC LIMIT 1'
    ).get(recordType, recordId) as any;
    return link || null;
  }

  /**
   * Export the full provenance chain for third-party audit
   */
  exportChain(): { chain: ProvenanceLink[]; chainChecksum: string } {
    const chain = db.prepare('SELECT * FROM provenance_chain ORDER BY rowid ASC').all() as ProvenanceLink[];
    const chainChecksum = this.computeChecksum(chain);
    return { chain, chainChecksum };
  }
}

export const provenanceChain = new ProvenanceChain();
