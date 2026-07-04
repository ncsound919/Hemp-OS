import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockDbUpdate, mockDbDelete } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbDelete: vi.fn(),
}));

const drizzleMock = vi.hoisted(() => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((a: any, b: any) => ({ field: a, value: b })),
  desc: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn().mockReturnValue(''),
    writeFileSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ size: 1024, isDirectory: () => false }),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(''),
  readdirSync: vi.fn().mockReturnValue([]),
  writeFileSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ size: 1024, isDirectory: () => false }),
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'PDF extracted text', numpages: 1 }),
}));

vi.mock('csv-parse/sync', () => ({
  parse: vi.fn().mockReturnValue([{ col1: 'val1', col2: 'val2' }]),
}));

vi.mock('../src/db/index.ts', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
  },
}));

vi.mock('drizzle-orm', () => drizzleMock);

const chainableMock = vi.hoisted(() => {
  return function chainableMock() {
    const fn: any = vi.fn(() => fn);
    fn.primaryKey = vi.fn(() => fn);
    fn.notNull = vi.fn(() => fn);
    fn.default = vi.fn(() => fn);
    fn.defaultNow = vi.fn(() => fn);
    fn.references = vi.fn(() => fn);
    fn.onDelete = vi.fn(() => fn);
    fn.onUpdate = vi.fn(() => fn);
    fn.unique = vi.fn(() => fn);
    fn.array = vi.fn(() => fn);
    fn.as = vi.fn(() => fn);
    fn.generatedAlwaysAs = vi.fn(() => fn);
    return fn;
  };
});

vi.mock('drizzle-orm/pg-core', () => ({
  integer: chainableMock(),
  pgTable: chainableMock(),
  serial: chainableMock(),
  text: chainableMock(),
  numeric: chainableMock(),
  timestamp: chainableMock(),
  varchar: chainableMock(),
  decimal: chainableMock(),
  boolean: chainableMock(),
  doublePrecision: chainableMock(),
  foreignKey: vi.fn(),
  primaryKey: vi.fn(),
  uniqueIndex: vi.fn(),
  index: vi.fn(),
  pgEnum: chainableMock(),
  real: chainableMock(),
  jsonb: chainableMock(),
  pgSchema: vi.fn(),
  PgTable: vi.fn(),
}));

vi.mock('../server/scrapedRegistry.ts', () => ({
  searchPubMedStrains: vi.fn().mockResolvedValue([]),
  searchOpenAlexStrains: vi.fn().mockResolvedValue([]),
  searchSemanticScholarStrains: vi.fn().mockResolvedValue([]),
  searchCannabisStrains: vi.fn().mockResolvedValue([]),
  generateScrapedFiles: vi.fn().mockResolvedValue([]),
}));

import { ingestionEngine } from '../server/ingestionEngine.ts';

describe('ingestionEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Log Management', () => {
    it('should add and retrieve logs', () => {
      ingestionEngine.addLog('info', 'Test message', 'Details');
      const logs = ingestionEngine.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const addedLog = logs.find(l => l.message === 'Test message');
      expect(addedLog).toBeDefined();
      expect(addedLog!.type).toBe('info');
      expect(addedLog!.details).toBe('Details');
    });

    it('should cap logs at 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        ingestionEngine.addLog('info', `Log ${i}`);
      }
      const logs = ingestionEngine.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should prepend newest logs', () => {
      ingestionEngine.addLog('info', 'First');
      ingestionEngine.addLog('info', 'Second');
      const logs = ingestionEngine.getLogs();
      expect(logs[0].message).toBe('Second');
      expect(logs[1].message).toBe('First');
    });

    it('should create log with id, timestamp, type, message, details', () => {
      ingestionEngine.addLog('warning', 'Warning message', 'Warning detail');
      const log = ingestionEngine.getLogs()[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('timestamp');
      expect(log.type).toBe('warning');
      expect(log.message).toBe('Warning message');
      expect(log.details).toBe('Warning detail');
    });

    it('should handle all log types', () => {
      ingestionEngine.addLog('info', 'Info');
      ingestionEngine.addLog('success', 'Success');
      ingestionEngine.addLog('warning', 'Warning');
      ingestionEngine.addLog('error', 'Error');
      const logs = ingestionEngine.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Status', () => {
    it('should return initial status (not running)', () => {
      const status = ingestionEngine.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.isPaused).toBe(false);
      expect(status.watchPath).toBeTruthy();
      expect(status).toHaveProperty('logCount');
    });
  });

  describe('localNLPParser', () => {
    const parser = (fileName: string, fileType: string, content: string) =>
      (ingestionEngine as any).localNLPParser(fileName, fileType, content);

    it('should detect strain entity from text content', () => {
      const result = parser('strain_data.json', 'json', JSON.stringify({
        name: 'Blue Dream', type: 'hybrid', thc: '20%', cbd: '0.1%',
        terpenes: 'Myrcene: 0.8%', effects: 'Relaxed',
        medicalUses: 'Pain', source: 'Test', entityType: 'strain',
        facts: { type: 'hybrid' },
      }));
      expect(result.entityType).toBe('strain');
    });

    it('should detect study entity from text content', () => {
      const result = parser('clinical_study.txt', 'txt',
        'TITLE: Clinical Trial\nAUTHORS: Smith J\nYEAR: 2024\nABSTRACT: Study results...');
      expect(result.entityType).toBe('study');
      expect(result.structured.title).toBe('Clinical Trial');
      expect(result.structured.authors).toBe('Smith J');
    });

    it('should parse TITLE from study content', () => {
      const result = parser('paper.txt', 'txt', 'TITLE: Cannabinoid Pharmacology\nABSTRACT: A study of...');
      expect(result.structured.title).toBe('Cannabinoid Pharmacology');
    });

    it('should parse DOI from study content', () => {
      const result = parser('paper.txt', 'txt', 'DOI: 10.1002/test');
      expect(result.structured.doi).toBe('10.1002/test');
    });

    it('should parse THC percentage from text', () => {
      const result = parser('strain.txt', 'txt', 'Strain sample THC: 22.5%, CBD: 0.3%');
      expect(result.structured.thcMax).toBe(22.5);
      expect(result.structured.cbdMax).toBe(0.3);
    });

    it('should fall back to default values when THC/CBD not found', () => {
      const result = parser('strain.txt', 'txt', 'Strain with no percentage data');
      expect(result.structured.thcMin).toBe(14.5);
      expect(result.structured.thcMax).toBe(18.2);
    });

    it('should detect indica from content', () => {
      const result = parser('strain.txt', 'txt', 'indica strain');
      expect(result.structured.type).toBe('indica');
    });

    it('should detect sativa from content', () => {
      const result = parser('strain.txt', 'txt', 'sativa dominant');
      expect(result.structured.type).toBe('sativa');
    });

    it('should default to hybrid for unknown strains', () => {
      const result = parser('strain.txt', 'txt', 'some random strain without type');
      expect(result.structured.type).toBe('hybrid');
    });

    it('should set confidence score for study content', () => {
      const result = parser('trial.txt', 'txt', 'TITLE: Test\nABSTRACT: A pharmacokinetics study');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('generateSyntheticStrain', () => {
    it('should generate a valid strain from a seed', () => {
      const strain = (ingestionEngine as any).generateSyntheticStrain(42);
      expect(strain).toHaveProperty('name');
      expect(strain).toHaveProperty('type');
      expect(strain).toHaveProperty('thc');
      expect(strain).toHaveProperty('cbd');
      expect(strain).toHaveProperty('terpenes');
      expect(strain).toHaveProperty('effects');
      expect(strain).toHaveProperty('medicalUses');
      expect(strain).toHaveProperty('lab');
      expect(strain.entityType).toBe('strain');
      expect(strain.source).toBe('HempOS Harvest Engine');
    });

    it('should produce deterministic strain for same seed', () => {
      const a = (ingestionEngine as any).generateSyntheticStrain(100);
      const b = (ingestionEngine as any).generateSyntheticStrain(100);
      expect(a.name).toBe(b.name);
      expect(a.type).toBe(b.type);
    });

    it('should produce different strains for different seeds', () => {
      const a = (ingestionEngine as any).generateSyntheticStrain(1);
      const b = (ingestionEngine as any).generateSyntheticStrain(999);
      expect(a.name).not.toBe(b.name);
    });

    it('should generate valid type', () => {
      for (let i = 0; i < 20; i++) {
        const strain = (ingestionEngine as any).generateSyntheticStrain(i * 100);
        expect(['indica', 'sativa', 'hybrid']).toContain(strain.type);
      }
    });

    it('should generate THC as string with %', () => {
      const strain = (ingestionEngine as any).generateSyntheticStrain(42);
      expect(strain.thc).toMatch(/^\d+\.\d+%$/);
    });

    it('should generate terpenes in expected format', () => {
      const strain = (ingestionEngine as any).generateSyntheticStrain(42);
      expect(strain.terpenes).toMatch(/\w+: \d+\.\d+%/);
    });
  });

  describe('generateSyntheticStudy', () => {
    it('should generate a valid study from a seed', () => {
      const study = (ingestionEngine as any).generateSyntheticStudy(42);
      expect(study).toHaveProperty('title');
      expect(study).toHaveProperty('authors');
      expect(study).toHaveProperty('year');
      expect(study).toHaveProperty('journal');
      expect(study).toHaveProperty('doi');
      expect(study).toHaveProperty('abstract');
      expect(study).toHaveProperty('population');
      expect(study).toHaveProperty('dose');
      expect(study).toHaveProperty('route');
      expect(study).toHaveProperty('outcomes');
      expect(study).toHaveProperty('topicTags');
    });

    it('should produce deterministic study for same seed', () => {
      const a = (ingestionEngine as any).generateSyntheticStudy(50);
      const b = (ingestionEngine as any).generateSyntheticStudy(50);
      expect(a.title).toBe(b.title);
    });

    it('should generate valid year in range 2020-2026', () => {
      for (let i = 0; i < 20; i++) {
        const study = (ingestionEngine as any).generateSyntheticStudy(i * 100);
        expect(study.year).toBeGreaterThanOrEqual(2020);
        expect(study.year).toBeLessThanOrEqual(2026);
      }
    });

    it('should generate DOI in correct format', () => {
      const study = (ingestionEngine as any).generateSyntheticStudy(42);
      expect(study.doi).toMatch(/^10\.\d+\/nn\.\d+\.\d+$/);
    });

    it('should generate a route', () => {
      const study = (ingestionEngine as any).generateSyntheticStudy(42);
      expect(typeof study.route).toBe('string');
      expect(study.route.length).toBeGreaterThan(0);
    });
  });

  describe('guessEntityType', () => {
    const guess = (name: string) => (ingestionEngine as any).guessEntityType(name);

    it('should identify strain files', () => {
      expect(guess('strain_data.json')).toBe('strain');
      expect(guess('coa_report.pdf')).toBe('strain');
      expect(guess('purple_kush.txt')).toBe('strain');
      expect(guess('haze_variety.csv')).toBe('strain');
    });

    it('should identify study files', () => {
      expect(guess('study_results.txt')).toBe('study');
      expect(guess('clinical_trial.pdf')).toBe('study');
      expect(guess('academic_paper.csv')).toBe('study');
      expect(guess('pharmacology_journal.json')).toBe('study');
    });

    it('should return unknown for unrecognized files', () => {
      expect(guess('random_notes.txt')).toBe('unknown');
      expect(guess('data_export.csv')).toBe('unknown');
    });
  });

  describe('simulateScientificExperiment', () => {
    it('should return valid experiment results', () => {
      const result = (ingestionEngine as any).simulateScientificExperiment('Test Exp', 'THC reduces anxiety');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('hypothesis');
      expect(result).toHaveProperty('sampleSize');
      expect(result).toHaveProperty('pValue');
      expect(result).toHaveProperty('clinicalOutcome');
      expect(result).toHaveProperty('activeCompounds');
      expect(result).toHaveProperty('biomarkers');
      expect(result).toHaveProperty('efficacyMetrics');
      expect(result.sampleSize).toBeGreaterThanOrEqual(40);
      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThan(1);
    });
  });

  describe('simulateBioDynamicSimulation', () => {
    it('should return valid simulation results', () => {
      const result = (ingestionEngine as any).simulateBioDynamicSimulation('THC Simulation', { dosage: '15', route: 'Inhalation' });
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('route');
      expect(result).toHaveProperty('administeredDosageMg');
      expect(result).toHaveProperty('bioavailability');
      expect(result).toHaveProperty('plasmaKineticCurves');
      expect(result).toHaveProperty('cb1Affinity');
      expect(result).toHaveProperty('cb2Affinity');
      expect(result.administeredDosageMg).toBe(15);
    });

    it('should calculate bioavailability based on route', () => {
      const sublingual = (ingestionEngine as any).simulateBioDynamicSimulation('S', { dosage: '10', route: 'Sublingual' });
      const inhalation = (ingestionEngine as any).simulateBioDynamicSimulation('I', { dosage: '10', route: 'Inhalation' });
      const oral = (ingestionEngine as any).simulateBioDynamicSimulation('O', { dosage: '10', route: 'Oral' });
      expect(sublingual.bioavailability).toBe('24.6%');
      expect(inhalation.bioavailability).toBe('45%');
      expect(oral.bioavailability).toBe('6%');
    });

    it('should default to Oral when route is unknown', () => {
      const result = (ingestionEngine as any).simulateBioDynamicSimulation('X', { dosage: '20', route: 'Unknown' });
      expect(result.bioavailability).toBe('6%');
    });
  });

  describe('Event Listeners', () => {
    it('should register and invoke event listeners', () => {
      const listener = vi.fn();
      const unsubscribe = ingestionEngine.addEventListener(listener);
      ingestionEngine.addLog('info', 'Test event');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ message: 'Test event' }));
      unsubscribe();
      ingestionEngine.addLog('info', 'After unsubscribe');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});


