import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  ScrapeService,
  LocalStrainRepository,
  NormalizedStrainRecord,
} from '../services/scrape.service.ts';
import { IngestionService } from '../services/ingestion.service.ts';
import { INITIAL_STRAINS } from '../components/breedLab/data.ts';
import { Strain } from '../components/breedLab/types.ts';
import { asyncHandler } from '../lib/asyncHandler.ts';

// ---------------------------------------------------------------------------
// Service singletons
// ---------------------------------------------------------------------------

const scrapeService = new ScrapeService();
const ingestionService = new IngestionService();

const dbPath = path.join(process.cwd(), 'data', 'hemp_os.db');

// Ensure data directory exists synchronously at startup, before the repo
// tries to open/create the sqlite file.
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`\u2705 Created data directory: ${dataDir}`);
}

const strainRepo = new LocalStrainRepository(dbPath);

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type StrainType = 'indica' | 'sativa' | 'hybrid';

interface ScrapeRequestBody {
  target: string;
  query?: string;
}

interface IngestRequestBody {
  fileId: string;
  fileName: string;
  mimeType: string;
}

interface ApiSuccess<T extends object = {}> {
  success: true;
  [key: string]: unknown;
}

interface ApiError {
  success: false;
  error: string;
  details?: unknown;
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// SSRF-safe URL validator
// ---------------------------------------------------------------------------

const ALLOWED_SCRAPE_HOSTS = new Set(['seedfinder.eu', 'leafly.com']);

/**
 * Validates that `target` is an http(s) URL pointing at an explicitly
 * allow-listed hostname. Note: this guards against obviously malicious
 * targets (localhost, internal IPs, arbitrary domains) but does NOT protect
 * against DNS-rebinding attacks. For production hardening, resolve the
 * hostname and verify the resulting IP is not in a private/reserved range
 * immediately before each outbound request.
 */
function isAllowedTarget(target: unknown): target is string {
  if (typeof target !== 'string' || target.length === 0) return false;
  try {
    const url = new URL(target);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ALLOWED_SCRAPE_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SSE helper: centralizes "is the connection still open?" checks so callers
// can't accidentally write to a closed response.
// ---------------------------------------------------------------------------

function createSseWriter(res: Response) {
  const write = (payload: unknown) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  return {
    sendLog: (msg: string) => write({ log: msg }),
    sendStrain: (strain: NormalizedStrainRecord) => write({ strain }),
    sendDone: () => {
      if (!res.writableEnded) res.write('data: [DONE]\n\n');
    },
  };
}

// ---------------------------------------------------------------------------
// POST /scrape
// ---------------------------------------------------------------------------

export const scrape = asyncHandler(async (req: Request, res: Response) => {
  const { target, query } = req.body as ScrapeRequestBody;

  if (!isAllowedTarget(target)) {
    res.status(400).json({
      success: false,
      error: 'Invalid or unauthorized target. Only seedfinder.eu and leafly.com are allowed.',
    } satisfies ApiError);
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Flush headers immediately so the client's EventSource opens right away,
  // even before the first log line is produced.
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const { sendLog, sendStrain, sendDone } = createSseWriter(res);

  // Use an AbortController instead of a plain boolean flag. A boolean
  // captured by value at call time will never reflect the `close` event
  // firing later; scrapeService needs a *live* reference (e.g. via
  // `controller.signal.aborted` or an `on('abort', ...)` listener) to
  // actually stop in-flight work.
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    await scrapeService.scrapeWithLogs(
      target,
      query ?? '',
      sendLog,
      sendStrain,
      controller.signal
    );
    sendDone();
  } catch (error: any) {
    console.error('Scrape error:', error);
    sendLog(`\u274c [SCRAPE_ERR] ${error.message}`);
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /ingest
// ---------------------------------------------------------------------------

function parseBearerToken(header: string | string[] | undefined): string | null {
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1] : value; // fall back to raw header if not "Bearer x"
}

export const ingestDocument = asyncHandler(async (req: Request, res: Response) => {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ success: false, error: 'Authorization token required' } satisfies ApiError);
    return;
  }

  const { fileId, fileName, mimeType } = (req.body ?? {}) as Partial<IngestRequestBody>;
  if (!fileId || !fileName || !mimeType) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: fileId, fileName, mimeType',
    } satisfies ApiError);
    return;
  }

  const result = await ingestionService.ingest(token, fileId, fileName, mimeType);
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------------------
// GET /strains/search
// ---------------------------------------------------------------------------

const MAX_SEARCH_LIMIT = 50;
const DEFAULT_SEARCH_LIMIT = 10;
const MIN_QUERY_LENGTH = 1;

export const searchStrains = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.query.q ?? '').toString().trim();

  let limit = parseInt((req.query.limit ?? '').toString(), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_SEARCH_LIMIT;
  limit = Math.min(limit, MAX_SEARCH_LIMIT); // anti-abuse cap

  if (query.length < MIN_QUERY_LENGTH) {
    res.json({ success: true, strains: [] });
    return;
  }

  const results = strainRepo.searchStrains(query, limit);
  res.json({ success: true, strains: results });
});

// ---------------------------------------------------------------------------
// GET /strains/:name
// ---------------------------------------------------------------------------

export const getStrainProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const trimmed = name?.trim();
  if (!trimmed) {
    res.status(400).json({ success: false, error: 'Name parameter is required' } satisfies ApiError);
    return;
  }

  const result = strainRepo.getStrainByCanonicalName(trimmed);
  if (!result) {
    res.status(404).json({ success: false, error: 'Strain not found' } satisfies ApiError);
    return;
  }

  res.json({ success: true, strain: result });
});

// ---------------------------------------------------------------------------
// POST /strains/seed
// ---------------------------------------------------------------------------

function resolveStrainType(rawType: string | undefined): StrainType {
  const typeLower = (rawType ?? '').toLowerCase();
  if (typeLower.includes('indica')) return 'indica';
  if (typeLower.includes('sativa')) return 'sativa';
  return 'hybrid';
}

function toNormalizedRecord(strain: Strain): NormalizedStrainRecord {
  return {
    canonicalName: strain.name,
    aliases: [strain.name.toLowerCase().replace(/\s+/g, '-')],
    type: resolveStrainType(strain.type),
    breeder: strain.seedFinderInfo?.breeder || 'Hemp OS Lab',
    description: strain.origin || strain.landraceBackground || '',
    effects: strain.leaflyInfo?.effects || [],
    flavors: strain.leaflyInfo?.flavors || [],
    terpenes: Object.keys(strain.terpenes || {}),
    cannabinoids: {
      thc: strain.thc ?? 0,
      cbd: strain.cbd ?? 0,
      cbg: strain.cbg ?? 0,
      cbn: strain.cbn ?? 0,
    },
    source: 'seedfinder.eu',
    sourceId: strain.id,
    sourceUrl: null,
    raw: strain,
  };
}

export const seedStrains = asyncHandler(async (req: Request, res: Response) => {
  const force = req.query.force === 'true';
  const existingCount = strainRepo.countStrains();
  if (existingCount > 0 && !force) {
    res.json({
      success: true,
      message: `Database already contains ${existingCount} strains. Use force=true to re-seed/update them.`,
      count: existingCount,
    });
    return;
  }

  let seededCount = 0;
  const errors: string[] = [];

  for (const strain of INITIAL_STRAINS) {
    try {
      strainRepo.upsertStrain(toNormalizedRecord(strain));
      seededCount++;
    } catch (err: any) {
      const errorMsg = `Failed to seed strain "${strain.name}": ${err.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      // Continue with next strain \u2014 we want to seed as many as possible.
    }
  }

  if (seededCount === 0) {
    res.status(500).json({
      success: false,
      error: 'Seeding completely failed. No strains were inserted.',
      details: errors,
    } satisfies ApiError);
    return;
  }

  const response: ApiSuccess & { warnings?: string[] } = {
    success: true,
    message: `Successfully seeded ${seededCount} out of ${INITIAL_STRAINS.length} strains.`,
    count: seededCount,
    total: INITIAL_STRAINS.length,
  };
  if (errors.length > 0) {
    response.warnings = errors;
  }

  res.json(response);
});
