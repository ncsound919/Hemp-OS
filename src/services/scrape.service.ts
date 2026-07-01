import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import Database from 'better-sqlite3';

export interface NormalizedStrainRecord {
  canonicalName: string;
  aliases: string[];
  type?: 'indica' | 'sativa' | 'hybrid' | 'unknown';
  breeder?: string | null;
  description?: string | null;
  effects?: string[];
  flavors?: string[];
  terpenes?: string[];
  cannabinoids?: Record<string, number | string>;
  lineage?: string[];
  source: string;
  sourceId: string;
  sourceUrl?: string | null;
  imageUrls?: string[];
  raw?: unknown;
}

export interface FetchBatchResult {
  items: NormalizedStrainRecord[];
  nextCursor?: string | null;
}

export interface StrainSourceAdapter {
  name: string;
  fetchBatch(args: { cursor?: string | null; limit: number; signal?: AbortSignal }): Promise<FetchBatchResult>;
}

type HarvesterState = {
  running: boolean;
  paused: boolean;
  stopping: boolean;
  inFlight: boolean;
  targetStrainCount: number;
  totalStrains: number;
  lastRunAt: string | null;
  lastError: string | null;
  activeSource: string | null;
};

class LocalStrainRepository {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init() {
    this.db.exec(`
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
  }

  countStrains(): number {
    return this.db.prepare(`SELECT COUNT(*) as c FROM strains`).get().c as number;
  }

  getAdapterCursor(source: string): string | null {
    const row = this.db.prepare(`SELECT cursor FROM adapter_state WHERE source = ?`).get(source) as any;
    return row?.cursor ?? null;
  }

  setAdapterCursor(source: string, cursor: string | null) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO adapter_state (source, cursor, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(source) DO UPDATE SET cursor=excluded.cursor, updated_at=excluded.updated_at
    `).run(source, cursor, now);
  }

  saveHarvesterState(state: HarvesterState) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO harvester_state (singleton_key, state_json, updated_at)
      VALUES ('main', ?, ?)
      ON CONFLICT(singleton_key) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at
    `).run(JSON.stringify(state), now);
  }

  loadHarvesterState(): HarvesterState | null {
    const row = this.db.prepare(`SELECT state_json FROM harvester_state WHERE singleton_key='main'`).get() as any;
    return row ? JSON.parse(row.state_json) : null;
  }

  upsertStrain(item: NormalizedStrainRecord): number {
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO strains (
          canonical_name, type, breeder, description, lineage_json,
          effects_json, flavors_json, terpenes_json, cannabinoids_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(canonical_name) DO UPDATE SET
          type = COALESCE(excluded.type, strains.type),
          breeder = COALESCE(excluded.breeder, strains.breeder),
          description = COALESCE(excluded.description, strains.description),
          lineage_json = CASE
            WHEN excluded.lineage_json IS NOT NULL AND excluded.lineage_json != '[]'
            THEN excluded.lineage_json ELSE strains.lineage_json END,
          effects_json = CASE
            WHEN excluded.effects_json IS NOT NULL AND excluded.effects_json != '[]'
            THEN excluded.effects_json ELSE strains.effects_json END,
          flavors_json = CASE
            WHEN excluded.flavors_json IS NOT NULL AND excluded.flavors_json != '[]'
            THEN excluded.flavors_json ELSE strains.flavors_json END,
          terpenes_json = CASE
            WHEN excluded.terpenes_json IS NOT NULL AND excluded.terpenes_json != '[]'
            THEN excluded.terpenes_json ELSE strains.terpenes_json END,
          cannabinoids_json = CASE
            WHEN excluded.cannabinoids_json IS NOT NULL AND excluded.cannabinoids_json != '{}'
            THEN excluded.cannabinoids_json ELSE strains.cannabinoids_json END,
          updated_at = excluded.updated_at
      `).run(
        item.canonicalName.trim(),
        item.type || null,
        item.breeder || null,
        item.description || null,
        JSON.stringify(item.lineage || []),
        JSON.stringify(item.effects || []),
        JSON.stringify(item.flavors || []),
        JSON.stringify(item.terpenes || []),
        JSON.stringify(item.cannabinoids || {}),
        now,
        now
      );

      const strain = this.db.prepare(`SELECT id FROM strains WHERE canonical_name = ?`).get(item.canonicalName.trim()) as any;
      const strainId = strain.id as number;

      for (const alias of new Set([item.canonicalName, ...(item.aliases || [])].map(v => v.trim()).filter(Boolean))) {
        this.db.prepare(`
          INSERT OR IGNORE INTO strain_aliases (strain_id, alias) VALUES (?, ?)
        `).run(strainId, alias);
      }

      this.db.prepare(`
        INSERT INTO source_records (source, source_id, strain_id, source_url, raw_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_id) DO UPDATE SET
          strain_id = excluded.strain_id,
          source_url = excluded.source_url,
          raw_json = excluded.raw_json,
          updated_at = excluded.updated_at
      `).run(
        item.source,
        item.sourceId,
        strainId,
        item.sourceUrl || null,
        JSON.stringify(item.raw ?? item),
        now,
        now
      );

      return strainId;
    });

    return tx() as number;
  }

  addMediaAsset(args: {
    strainId: number;
    source: string;
    localPath: string;
    originalUrl?: string | null;
    sha1: string;
    mimeType?: string | null;
  }) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR IGNORE INTO media_assets (
        strain_id, source, local_path, original_url, sha1, mime_type, ocr_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      args.strainId,
      args.source,
      args.localPath,
      args.originalUrl || null,
      args.sha1,
      args.mimeType || null,
      now,
      now
    );
  }
}

class MediaIngestionService {
  constructor(private mediaRoot: string, private repo: LocalStrainRepository) {}

  private sha1(buf: Buffer) {
    return crypto.createHash('sha1').update(buf).digest('hex');
  }

  async downloadImages(strainId: number, strainName: string, source: string, urls: string[] = []) {
    const safeName = strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dir = path.join(this.mediaRoot, `${strainId}-${safeName}`);
    await fs.mkdir(dir, { recursive: true });

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        const sha1 = this.sha1(buf);
        const ext = (res.headers.get('content-type') || 'image/jpeg').split('/')[1]?.split(';')[0] || 'jpg';
        const filePath = path.join(dir, `${sha1}.${ext}`);
        await fs.writeFile(filePath, buf);
        this.repo.addMediaAsset({
          strainId,
          source,
          localPath: filePath,
          originalUrl: url,
          sha1,
          mimeType: res.headers.get('content-type'),
        });
      } catch {}
    }
  }
}

export class StrainHarvesterService {
  private state: HarvesterState;
  private timer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(
    private repo: LocalStrainRepository,
    private media: MediaIngestionService,
    private adapters: StrainSourceAdapter[],
    private tickMs = 15_000
  ) {
    this.state = repo.loadHarvesterState() || {
      running: false,
      paused: false,
      stopping: false,
      inFlight: false,
      targetStrainCount: 10000,
      totalStrains: repo.countStrains(),
      lastRunAt: null,
      lastError: null,
      activeSource: null,
    };
  }

  getStatus() {
    this.state.totalStrains = this.repo.countStrains();
    return this.state;
  }

  async start(targetStrainCount = this.state.targetStrainCount) {
    this.state.running = true;
    this.state.paused = false;
    this.state.stopping = false;
    this.state.targetStrainCount = targetStrainCount;
    this.repo.saveHarvesterState(this.state);

    if (!this.timer) {
      this.timer = setInterval(() => void this.tick(), this.tickMs);
    }

    void this.tick();
    return this.getStatus();
  }

  async pause() {
    this.state.paused = true;
    this.repo.saveHarvesterState(this.state);
    return this.getStatus();
  }

  async resume() {
    if (!this.state.running) this.state.running = true;
    this.state.paused = false;
    this.repo.saveHarvesterState(this.state);
    void this.tick();
    return this.getStatus();
  }

  async stop() {
    this.state.stopping = true;
    this.state.running = false;
    this.state.paused = false;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.state.inFlight = false;
    this.state.activeSource = null;
    this.repo.saveHarvesterState(this.state);
    return this.getStatus();
  }

  private async tick() {
    if (!this.state.running || this.state.paused || this.state.inFlight) return;
    if (this.repo.countStrains() >= this.state.targetStrainCount) {
      await this.pause();
      return;
    }

    this.state.inFlight = true;
    this.state.lastError = null;
    this.abortController = new AbortController();

    try {
      for (const adapter of this.adapters) {
        if (!this.state.running || this.state.paused || this.state.stopping) break;

        this.state.activeSource = adapter.name;
        this.repo.saveHarvesterState(this.state);

        const cursor = this.repo.getAdapterCursor(adapter.name);
        const batch = await adapter.fetchBatch({
          cursor,
          limit: 50,
          signal: this.abortController.signal,
        });

        for (const item of batch.items) {
          const strainId = this.repo.upsertStrain(item);
          if (item.imageUrls?.length) {
            await this.media.downloadImages(strainId, item.canonicalName, item.source, item.imageUrls);
          }
        }

        this.repo.setAdapterCursor(adapter.name, batch.nextCursor || null);

        if (this.repo.countStrains() >= this.state.targetStrainCount) {
          await this.pause();
          break;
        }
      }

      this.state.lastRunAt = new Date().toISOString();
    } catch (err: any) {
      this.state.lastError = err?.message || 'Unknown harvester error';
    } finally {
      this.abortController = null;
      this.state.inFlight = false;
      this.state.activeSource = null;
      this.state.totalStrains = this.repo.countStrains();
      this.repo.saveHarvesterState(this.state);
    }
  }
}
