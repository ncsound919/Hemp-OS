import path from 'path';
import fs from 'fs/promises';
import { mkdirSync } from 'fs';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.ts';

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

export class LocalStrainRepository {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('Failed to create database directory:', e);
    }
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
    return (this.db.prepare(`SELECT COUNT(*) as c FROM strains`).get() as { c: number }).c;
  }

  searchStrains(query: string, limit: number = 5): any[] {
    const searchTerm = `%${query}%`;
    return this.db.prepare(`
      SELECT * FROM strains 
      WHERE canonical_name LIKE ? 
         OR type LIKE ? 
         OR description LIKE ? 
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit);
  }

  getStrainByCanonicalName(name: string): any {
    return this.db.prepare(`SELECT * FROM strains WHERE canonical_name = ?`).get(name);
  }

  getAllStrains(): any[] {
    return this.db.prepare(`SELECT * FROM strains`).all();
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
        if (!res.ok) {continue;}
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
      } catch { /* download failed, skip */ }
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
    if (!this.state.running) {this.state.running = true;}
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
    if (!this.state.running || this.state.paused || this.state.inFlight) {return;}
    if (this.repo.countStrains() >= this.state.targetStrainCount) {
      await this.pause();
      return;
    }

    this.state.inFlight = true;
    this.state.lastError = null;
    this.abortController = new AbortController();

    try {
      for (const adapter of this.adapters) {
        if (!this.state.running || this.state.paused || this.state.stopping) {break;}

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

export class ScrapeService {
  async scrapeWithLogs(target: string, query: string, sendLog: (msg: string) => void, sendStrain: (strain: any) => void, signal?: AbortSignal) {
    const sleep = (ms: number) => new Promise((resolve, reject) => {
      if (signal?.aborted) {return reject(new Error('Scrape aborted by client'));}
      const timeout = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Scrape aborted by client'));
      });
    });

    sendLog(`[INIT] Starting strain data retrieval for "${query || 'Pineapple Express'}" from ${target}`);
    await sleep(300);

    const queryClean = query ? query.trim() : 'Pineapple Express';
    let strainObj: any = null;

    // Use Gemini with Google Search grounding to retrieve real strain data
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        sendLog(`[GEMINI] Querying Google Search grounding for real strain data: "${queryClean}"`);

        const ai = new GoogleGenAI({
          apiKey: env.GEMINI_API_KEY,
        });

        const genRes = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `Provide comprehensive, accurate, real-world cannabis strain profile details for the strain "${queryClean}". Include lineage, typical cannabinoid percentages (THC, CBD, CBG, CBN), terpene levels (myrcene, limonene, caryophyllene, pinene, linalool), effects, flavors, breeder, flowering time, height, environment, yield, and medical indications. Only include verified information — if data is unknown, omit it rather than guessing.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const textOutput = genRes.text;
        if (!textOutput) {
          throw new Error('Gemini returned empty response');
        }

        sendLog(`[GEMINI] Grounding data received, parsing to structured format`);
        await sleep(300);

        const formatRes = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `Parse the following research text about the strain "${queryClean}" and format it into the exact JSON schema requested.

          Research Text:
          ${textOutput}
          `,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'Slugified lowercase id, e.g. "pineapple_express"' },
                name: { type: Type.STRING, description: 'Canonical strain name, e.g. "Pineapple Express"' },
                type: { type: Type.STRING, description: 'Must be one of: "Type I (THC Dominant)", "Type II (Mixed Ratio)", "Type III (CBD Dominant)", "Type IV (CBG Dominant)"' },
                thc: { type: Type.NUMBER, description: 'Average THC wt% as number (e.g. 19.5)' },
                cbd: { type: Type.NUMBER, description: 'Average CBD wt% as number (e.g. 0.8)' },
                cbg: { type: Type.NUMBER, description: 'Average CBG wt% as number (e.g. 1.2)' },
                cbn: { type: Type.NUMBER, description: 'Average CBN wt% as number (e.g. 0.1)' },
                terpenes: {
                  type: Type.OBJECT,
                  properties: {
                    myrcene: { type: Type.NUMBER },
                    limonene: { type: Type.NUMBER },
                    caryophyllene: { type: Type.NUMBER },
                    pinene: { type: Type.NUMBER },
                    linalool: { type: Type.NUMBER },
                  },
                  required: ['myrcene', 'limonene', 'caryophyllene', 'pinene', 'linalool'],
                },
                classification: { type: Type.STRING, description: 'Must be one of: "Indica", "Sativa", "Hybrid", "Indica-dominant Hybrid", "Sativa-dominant Hybrid"' },
                lineage: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Parent strains' },
                origin: { type: Type.STRING, description: 'Short history description' },
                landraceBackground: { type: Type.STRING, description: 'Landrace genetic background' },
                effects: { type: Type.ARRAY, items: { type: Type.STRING } },
                flavors: { type: Type.ARRAY, items: { type: Type.STRING } },
                breeder: { type: Type.STRING },
                medicalIndications: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['id', 'name', 'type', 'thc', 'cbd', 'cbg', 'cbn', 'terpenes', 'classification'],
            },
          },
        });

        if (formatRes.text) {
          strainObj = JSON.parse(formatRes.text.trim());
          sendLog(`[PARSED] Strain data successfully structured from search grounding`);
        }
      } catch (geminiErr: any) {
        sendLog(`[ERROR] AI search grounding failed: ${geminiErr.message}. Cannot retrieve strain data without valid API key or network access.`);
        { const e = new Error(`Strain data retrieval failed: ${geminiErr.message}`); throw e; };
      }
    } else {
      sendLog(`[ERROR] GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in your environment to search for real strain data.`);
      sendLog(`[INFO] Falling back to OpenAlex academic search for strain "${queryClean}"...`);

      try {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(`cannabis strain ${queryClean}`)}&per-page=5&sort=relevance_score:desc`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'HempOS/1.0 (research; strain-data-retrieval)' },
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const paper = data.results[0];
            strainObj = {
              id: `openalex_${Date.now()}`,
              name: queryClean.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              type: 'Type I (THC Dominant)',
              thc: 0,
              cbd: 0,
              cbg: 0,
              cbn: 0,
              terpenes: { myrcene: 0, limonene: 0, caryophyllene: 0, pinene: 0, linalool: 0 },
              classification: 'Hybrid',
              lineage: [],
              origin: `Referenced in academic literature: "${paper.title}" (${paper.publication_year || 'unknown year'})`,
              landraceBackground: '',
              effects: [],
              flavors: [],
              breeder: '',
              medicalIndications: [],
              isOpenAlexFallback: true,
            };
            sendLog(`[LITERATURE] Found academic reference: "${paper.title}" - ${paper.publication_year || 'unknown year'}`);
          }
        }
      } catch { /* download failed, skip */ }

      if (!strainObj) {
        throw new Error('Cannot retrieve strain data: GEMINI_API_KEY is not configured and no academic references found. Please set GEMINI_API_KEY in environment configuration.');
      }
    }

    // Save to local SQLite database
    try {
      sendLog(`[SQLITE] Saving strain "${strainObj.name}" to local database...`);
      const dbPath = path.join(process.cwd(), 'data', 'hemp_os.db');
      const strainRepo = new LocalStrainRepository(dbPath);

      const typeStr = strainObj.classification?.toLowerCase().includes('indica') ? 'indica'
        : strainObj.classification?.toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';
      const record: NormalizedStrainRecord = {
        canonicalName: strainObj.name,
        aliases: [strainObj.name.toLowerCase().replace(/\s+/g, '-')],
        type: typeStr as any,
        breeder: strainObj.breeder || 'Unknown',
        description: strainObj.origin || strainObj.landraceBackground || '',
        effects: strainObj.effects || [],
        flavors: strainObj.flavors || [],
        terpenes: Object.keys(strainObj.terpenes || {}),
        cannabinoids: {
          thc: strainObj.thc ?? 0,
          cbd: strainObj.cbd ?? 0,
          cbg: strainObj.cbg ?? 0,
          cbn: strainObj.cbn ?? 0,
        },
        source: target,
        sourceId: strainObj.id,
        sourceUrl: null,
        raw: strainObj,
      };

      strainRepo.upsertStrain(record);
      sendLog(`[SQLITE] Strain saved successfully`);
    } catch (sqlErr: any) {
      sendLog(`[WARN] Failed to save to database: ${sqlErr.message}`);
    }

    sendLog(`[DONE] Retrieval complete. Strain ID: ${strainObj.id}`);
    sendStrain(strainObj);
  }

  async scrape(target: string, query: string) {
    const searchTerm = query || 'cannabis strain genetics';
    const storageDir = path.join(process.cwd(), 'data', 'ingested_strains');
    await fs.mkdir(storageDir, { recursive: true });

    const url = `https://api.openalex.org/works?search=${encodeURIComponent(searchTerm)}&per-page=10`;
    const response = await fetch(url);

    if (!response.ok) {
      { const e = new Error(`OpenAlex API responded with status: ${response.status}`); throw e; };
    }

    const data = await response.json();

    const ingestedPapers = data.results.map((work: any) => ({
      id: work.id,
      title: work.title,
      publication_year: work.publication_year,
      authors: work.authorships?.map((a: any) => a.author.display_name).join(', ') || 'Unknown',
      abstract: work.abstract_inverted_index ? 'Abstract available (indexed).' : 'No abstract.',
      source: target,
      url: work.id,
    }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ingested_batch_${timestamp}.json`;
    const filePath = path.join(storageDir, filename);

    await fs.writeFile(filePath, JSON.stringify(ingestedPapers, null, 2), 'utf8');

    return {
      count: ingestedPapers.length,
      savedTo: filePath,
      data: ingestedPapers,
    };
  }
}

