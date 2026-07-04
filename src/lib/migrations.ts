import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Migration {
  id: string;
  description: string;
  up: (db: Database.Database) => void;
}

export class MigrationRunner {
  private db: Database.Database;
  private migrations: Migration[] = [];

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureMetaTable();
  }

  private ensureMetaTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  register(migration: Migration) {
    this.migrations.push(migration);
  }

  registerMany(migrations: Migration[]) {
    for (const m of migrations) {
      this.register(m);
    }
  }

  pending(): Migration[] {
    const applied = new Set(
      this.db.prepare('SELECT id FROM _migrations').all().map((r: any) => r.id),
    );
    return this.migrations.filter((m) => !applied.has(m.id));
  }

  applied(): string[] {
    return this.db.prepare('SELECT id FROM _migrations ORDER BY id').all().map((r: any) => r.id);
  }

  runPending(): { applied: number; total: number; errors: string[] } {
    const pending = this.pending();
    const errors: string[] = [];
    let applied = 0;

    for (const migration of pending) {
      try {
        const tx = this.db.transaction(() => {
          migration.up(this.db);
          this.db.prepare('INSERT INTO _migrations (id, description) VALUES (?, ?)').run(
            migration.id,
            migration.description,
          );
        });
        tx();
        applied++;
      } catch (err: any) {
        errors.push(`Migration ${migration.id} failed: ${err.message}`);
      }
    }

    return { applied, total: pending.length, errors };
  }

  runAll(): { applied: number; errors: string[] } {
    const result = this.runPending();
    return { applied: result.applied, errors: result.errors };
  }
}

// Define all migrations here
export function getMigrations(): Migration[] {
  return [
    {
      id: '001_initial_strains',
      description: 'Create initial strain tables',
      up: (db) => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS strains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            canonical_name TEXT NOT NULL UNIQUE,
            type TEXT,
            breeder TEXT,
            description TEXT,
            lineage_json TEXT,
            effects_json TEXT,
            flavors_json TEXT,
            terpenes_json TEXT,
            cannabinoids_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS strain_aliases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strain_id INTEGER NOT NULL,
            alias TEXT NOT NULL,
            UNIQUE(strain_id, alias)
          );
          CREATE TABLE IF NOT EXISTS source_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            source_id TEXT NOT NULL,
            strain_id INTEGER NOT NULL,
            source_url TEXT,
            raw_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(source, source_id)
          );
          CREATE TABLE IF NOT EXISTS media_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strain_id INTEGER NOT NULL,
            source TEXT NOT NULL,
            local_path TEXT NOT NULL,
            original_url TEXT,
            sha1 TEXT NOT NULL,
            mime_type TEXT,
            ocr_status TEXT NOT NULL DEFAULT 'pending',
            ocr_text TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(sha1)
          );
        `);
      },
    },
    {
      id: '002_harvester_state',
      description: 'Add harvester and adapter state tables',
      up: (db) => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS adapter_state (
            source TEXT PRIMARY KEY,
            cursor TEXT,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS harvester_state (
            singleton_key TEXT PRIMARY KEY,
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);
      },
    },
    {
      id: '003_simulation_log',
      description: 'Add simulation run log for provenance',
      up: (db) => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS simulation_runs (
            id TEXT PRIMARY KEY,
            biomass_name TEXT NOT NULL,
            stages_json TEXT NOT NULL,
            results_json TEXT,
            mass_balance_pass INTEGER NOT NULL DEFAULT 0,
            kernel_version TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
        `);
      },
    },
  ];
}

// Initialize migrations for a given database path
export function initializeDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const runner = new MigrationRunner(db);
  runner.registerMany(getMigrations());

  const result = runner.runAll();
  if (result.errors.length > 0) {
    console.error('Database migration errors:', result.errors);
  }

  return db;
}
