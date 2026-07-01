/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INITIAL_STRAINS } from '../components/breedLab/data.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface StrainProfile {
  id: string;
  name: string;
  type: string;
  thc: number;
  cbd: number;
  cbg: number;
  cbn: number;
  terpenes: Record<string, number>;
  classification?: string;
  lineage?: string[];
  description?: string;
  origin?: string;
  effects?: string[];
  flavors?: string[];
}

export interface SeedResult {
  success: boolean;
  message: string;
  count?: number;
}

// ---------------------------------------------------------------------------
// Internal shapes for the raw backend/local records this adapter normalizes.
// Kept loose (fields optional) since the backend and the local fixture data
// don't share a single authoritative schema, but at least named instead of `any`.
// ---------------------------------------------------------------------------

interface RawSqlStrain {
  id: string | number;
  canonical_name?: string;
  type?: string;
  description?: string;
  cannabinoids_json?: string | Record<string, unknown>;
  terpenes_json?: string | Record<string, number>;
  effects_json?: string | string[];
  flavors_json?: string | string[];
  lineage_json?: string | string[];
}

interface RawLocalStrain {
  id?: string | number;
  name: string;
  type?: string;
  origin?: string;
  thc?: number;
  cbd?: number;
  cbg?: number;
  cbn?: number;
  terpenes?: Record<string, number>;
  lineage?: string[];
  leaflyInfo?: {
    effects?: string[];
    flavors?: string[];
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 200; // simple bound to prevent unbounded growth in long-lived sessions
const FETCH_TIMEOUT_MS = 8000;

const DEFAULT_FALLBACK: Readonly<StrainProfile> = Object.freeze({
  id: 'fallback-unknown',
  name: 'Unknown Strain',
  type: 'hybrid',
  thc: 12,
  cbd: 2,
  cbg: 1,
  cbn: 0,
  terpenes: { myrcene: 0.5 },
  classification: 'hybrid',
  effects: [],
  flavors: [],
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class StrainKnowledgeAdapter {
  private readonly fallbackStrains: RawLocalStrain[] = INITIAL_STRAINS;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  /** De-dupes concurrent identical in-flight requests (e.g. rapid typeahead keystrokes). */
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // -------------------------------------------------------------------------
  // Cache helpers
  // -------------------------------------------------------------------------

  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
  }

  private getCache<T>(key: string): T {
    return this.cache.get(key)!.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES && !this.cache.has(key)) {
      // Evict the oldest entry (Map preserves insertion order).
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /** Clears all cached entries. Exposed for tests / manual cache-busting. */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Wraps an async producer so that identical concurrent calls (same key)
   * share one underlying promise instead of firing duplicate network requests.
   */
  private async dedupe<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = producer().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  // -------------------------------------------------------------------------
  // Networking helpers
  // -------------------------------------------------------------------------

  /**
   * Fetch with a hard timeout so a hung backend never blocks the caller
   * indefinitely (important since every public method falls back to local
   * data on failure — that fallback should trigger promptly).
   */
  private async fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
      controller.abort();
    }, FETCH_TIMEOUT_MS);
    try {
      // In Node, fetch must be polyfilled or globalThis.fetch used. 
      // Assuming global fetch is available as per standard browser/modern Node environment.
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Safely parses a JSON response body, returning null instead of throwing on malformed JSON. */
  private async safeParseJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  /** Parses a value that may already be an object/array or may be a JSON string. */
  private parseMaybeJson<T>(value: unknown, fallback: T): T {
    if (value == null) return fallback;
    if (typeof value !== 'string') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Search for strains with caching, request de-duplication, and graceful
   * fallback to local fixture data if the backend is unreachable or errors.
   */
  async searchStrains(query: string, limit: number = 5): Promise<StrainProfile[]> {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5;
    const cacheKey = `search:${trimmed.toLowerCase()}:${safeLimit}`;

    if (this.isCacheValid(cacheKey)) {
      return this.getCache<StrainProfile[]>(cacheKey);
    }

    return this.dedupe(cacheKey, async () => {
      const remoteResult = await this.trySearchRemote(trimmed, safeLimit);
      const result = remoteResult ?? this.searchLocal(trimmed, safeLimit);
      this.setCache(cacheKey, result);
      return result;
    });
  }

  private async trySearchRemote(query: string, limit: number): Promise<StrainProfile[] | null> {
    try {
      const url = `${this.baseUrl}/api/ingest/strains/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) return null;

      const body = await this.safeParseJson<{ success?: boolean; strains?: RawSqlStrain[] }>(response);
      if (!body?.success || !Array.isArray(body.strains)) return null;

      return body.strains.map((s) => this.formatSqlStrain(s));
    } catch (e) {
      console.warn('Backend strain search failed, falling back to local data:', e);
      return null;
    }
  }

  private searchLocal(query: string, limit: number): StrainProfile[] {
    const lowerQuery = query.toLowerCase();
    return this.fallbackStrains
      .filter(
        (s) =>
          s.name.toLowerCase().includes(lowerQuery) ||
          (s.type || '').toLowerCase().includes(lowerQuery) ||
          (s.origin || '').toLowerCase().includes(lowerQuery) ||
          (s.leaflyInfo?.effects || []).some((e) => e.toLowerCase().includes(lowerQuery)) ||
          (s.leaflyInfo?.flavors || []).some((f) => f.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit)
      .map((s) => this.formatLocalStrain(s));
  }

  /**
   * Get a detailed strain profile by name, with caching, request
   * de-duplication, and local fallback.
   */
  async getStrainProfile(name: string): Promise<StrainProfile | null> {
    const trimmed = name?.trim();
    if (!trimmed) return null;

    const cacheKey = `profile:${trimmed.toLowerCase()}`;
    if (this.isCacheValid(cacheKey)) {
      return this.getCache<StrainProfile | null>(cacheKey);
    }

    return this.dedupe(cacheKey, async () => {
      const remote = await this.tryGetProfileRemote(trimmed);
      const result = remote ?? this.getProfileLocal(trimmed);
      // Cache misses too (as null) to avoid hammering the backend for
      // known-nonexistent strains within the TTL window.
      this.setCache(cacheKey, result);
      return result;
    });
  }

  private async tryGetProfileRemote(name: string): Promise<StrainProfile | null> {
    try {
      const url = `${this.baseUrl}/api/ingest/strains/profile/${encodeURIComponent(name)}`;
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) return null;

      const body = await this.safeParseJson<{ success?: boolean; strain?: RawSqlStrain }>(response);
      if (!body?.success || !body.strain) return null;

      return this.formatSqlStrain(body.strain);
    } catch (e) {
      console.warn(`Backend profile lookup failed for "${name}":`, e);
      return null;
    }
  }

  private getProfileLocal(name: string): StrainProfile | null {
    const lowerName = name.toLowerCase();
    const match = this.fallbackStrains.find((s) => s.name.toLowerCase() === lowerName);
    return match ? this.formatLocalStrain(match) : null;
  }

  /**
   * Trigger backend seeding of the strain database. Not cached — this is a
   * mutating/idempotent-admin action, not a read.
   */
  async autoSeed(headers?: HeadersInit): Promise<SeedResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/ingest/strains/seed`, {
        method: 'POST',
        headers: headers,
      });
      const body = await this.safeParseJson<{ success?: boolean; message?: string; count?: number }>(
        response
      );

      return {
        success: response.ok && !!body?.success,
        message: body?.message ?? (response.ok ? 'Seeded successfully' : 'Seeding failed'),
        count: body?.count,
      };
    } catch (e) {
      console.warn('Auto-seeding failed:', e);
      return { success: false, message: 'Network error during seeding' };
    }
  }

  // -------------------------------------------------------------------------
  // Formatting / normalization
  // -------------------------------------------------------------------------

  private formatSqlStrain(sqlStrain: RawSqlStrain): StrainProfile {
    try {
      const cannabinoids = this.parseMaybeJson<Record<string, unknown>>(
        sqlStrain.cannabinoids_json,
        {}
      );
      const terpenes = this.parseMaybeJson<Record<string, number>>(sqlStrain.terpenes_json, {});
      const effects = this.parseMaybeJson<string[]>(sqlStrain.effects_json, []);
      const flavors = this.parseMaybeJson<string[]>(sqlStrain.flavors_json, []);
      const lineage = this.parseMaybeJson<string[]>(sqlStrain.lineage_json, []);

      const toNumber = (v: unknown): number => {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        return Number.isFinite(n) ? n : 0;
      };

      return {
        id: `sql-strain-${sqlStrain.id}`,
        name: sqlStrain.canonical_name || 'Unknown Strain',
        type: sqlStrain.type || 'hybrid',
        thc: toNumber(cannabinoids.thc),
        cbd: toNumber(cannabinoids.cbd),
        cbg: toNumber(cannabinoids.cbg),
        cbn: toNumber(cannabinoids.cbn),
        terpenes: typeof terpenes === 'object' && terpenes !== null ? terpenes : {},
        classification: sqlStrain.type || 'hybrid',
        lineage: Array.isArray(lineage) ? lineage : [],
        origin: sqlStrain.description || '',
        effects: Array.isArray(effects) ? effects : [],
        flavors: Array.isArray(flavors) ? flavors : [],
      };
    } catch (e) {
      console.error('Error formatting SQL strain:', e);
      return this.createFallbackStrain(sqlStrain?.canonical_name || 'Malformed Strain');
    }
  }

  private formatLocalStrain(strain: RawLocalStrain): StrainProfile {
    return {
      id: `local-strain-${strain.id ?? strain.name}`,
      name: strain.name,
      type: strain.type || 'hybrid',
      thc: strain.thc ?? 0,
      cbd: strain.cbd ?? 0,
      cbg: strain.cbg ?? 0,
      cbn: strain.cbn ?? 0,
      terpenes: strain.terpenes ?? {},
      classification: strain.type || 'hybrid',
      lineage: strain.lineage ?? [],
      origin: strain.origin || '',
      effects: strain.leaflyInfo?.effects ?? [],
      flavors: strain.leaflyInfo?.flavors ?? [],
    };
  }

  private createFallbackStrain(name: string): StrainProfile {
    return {
      ...DEFAULT_FALLBACK,
      id: `fallback-${Date.now()}`,
      name,
    };
  }
}
