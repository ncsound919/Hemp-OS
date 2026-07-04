import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

vi.mock('../../config/env.ts', () => ({
  env: { GEMINI_API_KEY: 'MY_GEMINI_API_KEY' },
}));

import { LocalStrainRepository } from '../../services/scrape.service.ts';

describe('LocalStrainRepository', () => {
  let repo: LocalStrainRepository;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-repo-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    repo = new LocalStrainRepository(path.join(tmpDir, 'test.db'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch { /* expected during test */ }
  });

  it('starts with 0 strains', () => {
    expect(repo.countStrains()).toBe(0);
  });

  it('upserts and retrieves a strain', () => {
    const id = repo.upsertStrain({
      canonicalName: 'OG Kush',
      aliases: ['og-kush'],
      type: 'hybrid',
      source: 'leafly',
      sourceId: 'og-kush-1',
    });

    expect(id).toBeGreaterThan(0);
    expect(repo.countStrains()).toBe(1);

    const found = repo.getStrainByCanonicalName('OG Kush');
    expect(found).toBeDefined();
    expect(found.canonical_name).toBe('OG Kush');
    expect(found.type).toBe('hybrid');
  });

  it('upserts same strain twice (updates)', () => {
    repo.upsertStrain({
      canonicalName: 'Blue Dream',
      aliases: [],
      type: 'sativa',
      source: 'leafly',
      sourceId: 'bd-1',
    });
    repo.upsertStrain({
      canonicalName: 'Blue Dream',
      aliases: ['blue-dream'],
      type: 'hybrid',
      source: 'allbud',
      sourceId: 'bd-2',
      description: 'Updated desc',
    });

    expect(repo.countStrains()).toBe(1);
    const found = repo.getStrainByCanonicalName('Blue Dream');
    expect(found.type).toBe('hybrid');
    expect(found.description).toBe('Updated desc');
  });

  it('searches strains by name', () => {
    repo.upsertStrain({ canonicalName: 'Purple Haze', aliases: [], source: 'x', sourceId: '1' });
    repo.upsertStrain({ canonicalName: 'OG Kush', aliases: [], source: 'x', sourceId: '2' });

    const results = repo.searchStrains('purple');
    expect(results.length).toBe(1);
    expect(results[0].canonical_name).toBe('Purple Haze');
  });

  it('searches strains by type', () => {
    repo.upsertStrain({ canonicalName: 'A', aliases: [], type: 'indica', source: 'x', sourceId: '1' });
    repo.upsertStrain({ canonicalName: 'B', aliases: [], type: 'sativa', source: 'x', sourceId: '2' });

    const results = repo.searchStrains('indica');
    expect(results.length).toBe(1);
    expect(results[0].canonical_name).toBe('A');
  });

  it('returns all strains', () => {
    repo.upsertStrain({ canonicalName: 'A', aliases: [], source: 'x', sourceId: '1' });
    repo.upsertStrain({ canonicalName: 'B', aliases: [], source: 'x', sourceId: '2' });
    repo.upsertStrain({ canonicalName: 'C', aliases: [], source: 'x', sourceId: '3' });

    expect(repo.getAllStrains().length).toBe(3);
  });

  it('manages adapter cursors', () => {
    expect(repo.getAdapterCursor('leafly')).toBeNull();

    repo.setAdapterCursor('leafly', 'cursor-abc');
    expect(repo.getAdapterCursor('leafly')).toBe('cursor-abc');

    repo.setAdapterCursor('leafly', null);
    expect(repo.getAdapterCursor('leafly')).toBeNull();
  });

  it('saves and loads harvester state', () => {
    expect(repo.loadHarvesterState()).toBeNull();

    const state = {
      running: true,
      paused: false,
      stopping: false,
      inFlight: false,
      targetStrainCount: 5000,
      totalStrains: 42,
      lastRunAt: '2024-01-01T00:00:00Z',
      lastError: null,
      activeSource: 'leafly',
    };

    repo.saveHarvesterState(state);
    const loaded = repo.loadHarvesterState();
    expect(loaded).toEqual(state);
  });

  it('upserts preserves existing non-empty fields', () => {
    repo.upsertStrain({
      canonicalName: 'X',
      aliases: [],
      type: 'indica',
      description: 'Original',
      source: 'a',
      sourceId: '1',
    });

    repo.upsertStrain({
      canonicalName: 'X',
      aliases: [],
      type: 'sativa',
      source: 'b',
      sourceId: '2',
    });

    const found = repo.getStrainByCanonicalName('X');
    expect(found.type).toBe('sativa');
    expect(found.description).toBe('Original');
  });

  it('adds media assets', () => {
    const strainId = repo.upsertStrain({
      canonicalName: 'Y',
      aliases: [],
      source: 'x',
      sourceId: '1',
    });

    repo.addMediaAsset({
      strainId,
      source: 'leafly',
      localPath: '/tmp/img.jpg',
      sha1: 'abc123',
      mimeType: 'image/jpeg',
    });
  });

  it('search returns limit results', () => {
    for (let i = 0; i < 10; i++) {
      repo.upsertStrain({ canonicalName: `Strain ${i}`, aliases: [], source: 'x', sourceId: `${i}` });
    }

    const results = repo.searchStrains('Strain', 3);
    expect(results.length).toBe(3);
  });
});

