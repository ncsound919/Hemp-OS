import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockDbUpdate, mockDbDelete } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbDelete: vi.fn(),
}));

vi.mock('../src/db/index.ts', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
  },
  sql: { template: vi.fn() },
}));

const drizzleMock = vi.hoisted(() => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((a: any, b: any) => ({ field: a, value: b })),
  desc: vi.fn(),
  asc: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  or: vi.fn(),
  isNotNull: vi.fn((a: any) => ({ field: a, op: 'isNotNull' })),
  sql: vi.fn(),
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

import { InsightEngine, ContextManager, getInsightEngine } from '../src/analytics/insightEngine.ts';

describe('ContextManager', () => {
  it('should return a valid context frame', () => {
    const cm = new ContextManager();
    const frame = cm.getFrame();
    expect(frame).toHaveProperty('globalTrends');
    expect(frame).toHaveProperty('regulatorySignals');
    expect(frame).toHaveProperty('medicalConsensus');
    expect(frame).toHaveProperty('chemicalArchetypes');
    expect(frame).toHaveProperty('marketShifts');
    expect(frame).toHaveProperty('usagePatterns');
    expect(frame).toHaveProperty('updatedAt');
  });

  it('should have predetermined chemical archetypes', () => {
    const cm = new ContextManager();
    const frame = cm.getFrame();
    expect(frame.chemicalArchetypes.sedative).toContain('myrcene');
    expect(frame.chemicalArchetypes.uplifting).toContain('limonene');
  });

  it('should update updatedAt on each call', () => {
    const cm = new ContextManager();
    const frame1 = cm.getFrame();
    const frame2 = cm.getFrame();
    expect(frame2.updatedAt.getTime()).toBeGreaterThanOrEqual(frame1.updatedAt.getTime());
  });
});

describe('InsightEngine', () => {
  let engine: InsightEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new InsightEngine();
  });

  describe('parseTerpeneProfile', () => {
    const parse = (text: string | null) => (engine as any).parseTerpeneProfile(text);

    it('should parse standard terpene profile string', () => {
      const result = parse('Myrcene: 0.85%, Limonene: 0.40%, Caryophyllene: 0.32%');
      expect(result).toEqual({ myrcene: 0.85, limonene: 0.40, caryophyllene: 0.32 });
    });

    it('should handle semicolons as separators', () => {
      const result = parse('Myrcene: 0.50%; Pinene: 0.30%');
      expect(result).toEqual({ myrcene: 0.50, pinene: 0.30 });
    });

    it('should return empty object for null input', () => {
      const result = parse(null);
      expect(result).toEqual({});
    });

    it('should return empty object for empty string', () => {
      const result = parse('');
      expect(result).toEqual({});
    });

    it('should skip malformed entries', () => {
      const result = parse('Myrcene: 0.85%, UnknownFormat, Pinene: 0.30%');
      expect(result).toEqual({ myrcene: 0.85, pinene: 0.30 });
    });

    it('should trim whitespace from terpene names', () => {
      const result = parse('  Myrcene  : 0.50%, Beta-Caryophyllene: 0.25%');
      expect(result.myrcene).toBe(0.5);
      expect(result['beta-caryophyllene']).toBe(0.25);
    });

    it('should handle hyphenated terpene names', () => {
      const result = parse('beta-Caryophyllene: 0.45%');
      expect(result['beta-caryophyllene']).toBe(0.45);
    });

    it('should handle very small percentages', () => {
      const result = parse('Linalool: 0.05%');
      expect(result.linalool).toBe(0.05);
    });
  });

  describe('pearson correlation', () => {
    const pearson = (x: number[], y: number[]) => (engine as any).pearson(x, y);

    it('should return 1 for perfectly correlated data', () => {
      expect(pearson([1, 2, 3], [4, 5, 6])).toBeCloseTo(1, 5);
    });

    it('should return -1 for perfectly negatively correlated data', () => {
      expect(pearson([1, 2, 3], [6, 5, 4])).toBeCloseTo(-1, 5);
    });

    it('should return 0 for uncorrelated data', () => {
      expect(pearson([1, 2, 3], [2, 2, 2])).toBeCloseTo(0, 10);
    });

    it('should handle single element arrays', () => {
      expect(pearson([5], [10])).toBe(0);
    });

    it('should return intermediate values for partial correlation', () => {
      const r = pearson([1, 2, 3, 4, 5], [1, 3, 2, 5, 4]);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThan(1);
    });

    it('should handle large values without overflow', () => {
      const x = Array.from({ length: 100 }, (_, i) => i * 1000);
      const y = Array.from({ length: 100 }, (_, i) => i * 1000 + 500);
      const r = pearson(x, y);
      expect(r).toBeCloseTo(1, 3);
    });
  });

  describe('cosineSimilarity', () => {
    const cs = (a: number[], b: number[]) => (engine as any).cosineSimilarity(a, b);

    it('should return 1 for identical vectors', () => {
      expect(cs([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      expect(cs([1, 0], [0, 1])).toBe(0);
    });

    it('should return intermediate value for partial overlap', () => {
      const r = cs([1, 2], [2, 1]);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThan(1);
    });

    it('should handle zero vectors', () => {
      expect(cs([0, 0, 0], [1, 2, 3])).toBe(0);
    });

    it('should handle single-element vectors', () => {
      expect(cs([5], [5])).toBeCloseTo(1, 5);
      expect(cs([5], [-5])).toBe(-1);
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect((engine as any).capitalize('hello')).toBe('Hello');
    });

    it('should not change already capitalized word', () => {
      expect((engine as any).capitalize('Hello')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect((engine as any).capitalize('a')).toBe('A');
    });

    it('should handle empty string', () => {
      expect((engine as any).capitalize('')).toBe('');
    });
  });

  describe('loadStrainsWithTerpenes', () => {
    it('should map database rows to StrainData format', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1, name: 'Blue Dream', type: 'hybrid',
              thcMax: 2000, cbdMax: 50, thcMin: null, cbdMin: null,
              terpeneProfile: 'Myrcene: 0.80%, Pinene: 0.20%',
              effects: 'Relaxed, Happy', medicalUses: 'Pain, Stress',
              createdAt: new Date('2024-01-01'),
            },
          ]),
        }),
      });

      const result = await (engine as any).loadStrainsWithTerpenes();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Dream');
      expect(result[0].terpenes).toHaveProperty('myrcene');
      expect(result[0].effects).toContain('relaxed');
      expect(result[0].medicalUses).toContain('pain');
    });
  });

  describe('loadStudies', () => {
    it('should map database rows to StudyData format', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([
          {
            id: 1, title: 'Test Study', abstract: 'An abstract',
            authors: 'Smith J', year: 2023, journal: 'J Test',
            doi: '10.1234/test', topicTags: 'pharmacology, clinical',
            population: 'Human', dose: '10mg', route: 'Oral',
            outcomes: 'Significant reduction', createdAt: new Date(),
          },
        ]),
      });

      const result = await (engine as any).loadStudies();
      expect(result).toHaveLength(1);
      expect(result[0].topicTags).toContain('pharmacology');
      expect(result[0].title).toBe('Test Study');
    });

    it('should handle null topicTags', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([
          {
            id: 2, title: 'Study 2', abstract: null,
            authors: null, year: null, journal: null,
            doi: null, topicTags: null, population: null,
            dose: null, route: null, outcomes: null, createdAt: null,
          },
        ]),
      });

      const result = await (engine as any).loadStudies();
      expect(result[0].topicTags).toEqual([]);
    });
  });

  describe('studyMentions', () => {
    it('should check if study mentions both terms', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([
          { title: 'CBD and Anxiety Study', abstract: 'CBD reduces anxiety symptoms' },
        ]),
      });
      const result = await (engine as any).studyMentions('cbd', 'anxiety');
      expect(result).toBe(true);
    });

    it('should return false if terms not found', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([
          { title: 'THC Study', abstract: 'THC binds CB1 receptors' },
        ]),
      });
      const result = await (engine as any).studyMentions('quantum', 'physics');
      expect(result).toBe(false);
    });
  });

  describe('insightExists', () => {
    it('should return true if insight exists', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });
      const result = await (engine as any).insightExists('Test Insight');
      expect(result).toBe(true);
    });

    it('should return false if insight does not exist', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const result = await (engine as any).insightExists('Nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getInsightEngine', () => {
    it('should return a singleton instance', () => {
      const instance1 = getInsightEngine();
      const instance2 = getInsightEngine();
      expect(instance1).toBe(instance2);
    });

    it('should return an InsightEngine instance', () => {
      const instance = getInsightEngine();
      expect(instance).toBeInstanceOf(InsightEngine);
    });
  });
});


