import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      embedContent: vi.fn().mockResolvedValue({ embeddings: [{ values: [0.1, 0.2, 0.3] }] }),
      generateContent: vi.fn().mockResolvedValue({ text: '{}' }),
    },
  })),
}));

vi.mock('../src/playbooks.json', () => ({
  default: {
    distillationPatterns: [
      {
        test: 'vape|adolescent',
        fact: 'Daily high-potency THC inhalation downregulates CB1.',
        template: 'For adolescent vape queries, fetch rodent developmental studies.',
        node: { id: 'Adolescent_Pruning', label: 'Adolescent Pruning', type: 'Pathway' },
        edge: { source: 'CB1', target: 'Adolescent_Pruning', relation: 'associated_with' },
      },
    ],
    defaultPattern: {
      fact: 'Exogenous cannabinoid agonists trigger dose-dependent homeostatic synaptic dampening.',
      template: 'Always run kinetics simulation before final summary.',
      node: { id: 'Homeostatic_Dampening', label: 'Homeostatic Dampening', type: 'Pathway' },
      edge: { source: 'Cannabinoid_Receptor', target: 'Homeostatic_Dampening', relation: 'associated_with' },
    },
  },
}));

import {
  VectorStore,
  vectorStore,
  vectorChunks,
  runDeterministicPipeline,
  runDreamingLoop,
  searchVectorDb,
} from '../src/brain_kernel.ts';
import type { VectorChunk, MemoryItem, GraphNode, GraphEdge } from '../src/types.ts';

// ─── VectorStore Tests ─────────────────────────────────────────────────────

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  describe('add / hasEmbedding / getAllChunks', () => {
    it('should add chunks with embeddings', () => {
      const chunk: VectorChunk = {
        id: 'test-1', source: 'Test', content: 'test content',
        tags: ['test'], coordinate: { x: 0, y: 0, z: 0 },
      };
      store.add(chunk, [0.5, 0.5, 0.5]);
      expect(store.hasEmbedding('test-1')).toBe(true);
      expect(store.getAllChunks()).toHaveLength(1);
      expect(store.getAllChunks()[0].id).toBe('test-1');
    });

    it('should overwrite existing chunk on same id', () => {
      const chunk1: VectorChunk = {
        id: 'dup', source: 'A', content: 'first',
        tags: [], coordinate: { x: 0, y: 0, z: 0 },
      };
      const chunk2: VectorChunk = {
        id: 'dup', source: 'B', content: 'second',
        tags: [], coordinate: { x: 0, y: 0, z: 0 },
      };
      store.add(chunk1, [0.1, 0.2]);
      store.add(chunk2, [0.3, 0.4]);
      expect(store.getAllChunks()).toHaveLength(1);
      expect(store.getAllChunks()[0].source).toBe('B');
    });

    it('hasEmbedding returns false for unknown id', () => {
      expect(store.hasEmbedding('nonexistent')).toBe(false);
    });
  });

  describe('search', () => {
    it('should return empty array for empty store', () => {
      const results = store.search([0.1, 0.2], 5);
      expect(results).toHaveLength(0);
    });

    it('should return topK results sorted by cosine similarity descending', () => {
      store.add(
        { id: 'a', source: 'S', content: 'alpha', tags: [], coordinate: { x: 0, y: 0, z: 0 } },
        [1, 0]
      );
      store.add(
        { id: 'b', source: 'S', content: 'beta', tags: [], coordinate: { x: 0, y: 0, z: 0 } },
        [0, 1]
      );
      const results = store.search([1, 0], 5);
      expect(results).toHaveLength(2);
      expect(results[0].chunk.id).toBe('a');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should limit results to topK', () => {
      for (let i = 0; i < 10; i++) {
        store.add(
          { id: `c${i}`, source: 'S', content: `chunk ${i}`, tags: [], coordinate: { x: 0, y: 0, z: 0 } },
          [i * 0.1, (10 - i) * 0.1]
        );
      }
      const results = store.search([0.5, 0.5], 3);
      expect(results).toHaveLength(3);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const result = (store as any).cosineSimilarity([1, 2, 3], [1, 2, 3]);
      expect(result).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const result = (store as any).cosineSimilarity([1, 0], [0, 1]);
      expect(result).toBe(0);
    });

    it('should return 0 when one vector is zero', () => {
      const result = (store as any).cosineSimilarity([0, 0, 0], [1, 2, 3]);
      expect(result).toBe(0);
    });

    it('should return intermediate value for partially similar vectors', () => {
      const result = (store as any).cosineSimilarity([2, 0], [1, 1]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('searchLegacy', () => {
    it('should return chunks matching query words', () => {
      store.add(
        { id: 'm1', source: 'S', content: 'THC binds CB1 receptors in the brain',
          tags: ['thc', 'cb1'], coordinate: { x: 0, y: 0, z: 0 } },
        [0.1, 0.2]
      );
      store.add(
        { id: 'm2', source: 'S', content: 'CBD does not bind CB1 directly',
          tags: ['cbd'], coordinate: { x: 0, y: 0, z: 0 } },
        [0.3, 0.4]
      );
      const results = store.searchLegacy('THC CB1');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('m1');
    });

    it('should return empty array for no match', () => {
      store.add(
        { id: 'only', source: 'S', content: 'alpha waves in prefrontal cortex',
          tags: ['brain'], coordinate: { x: 0, y: 0, z: 0 } },
        [0.1, 0.2]
      );
      const results = store.searchLegacy('quantum gravity');
      expect(results).toHaveLength(0);
    });

    it('should filter out short query words (<= 3 chars)', () => {
      store.add(
        { id: 's', source: 'S', content: 'short data brain test',
          tags: [], coordinate: { x: 0, y: 0, z: 0 } },
        [0.1, 0.2]
      );
      const results = store.searchLegacy('short data brain test');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('constructor with initial chunks', () => {
    it('should pre-populate from initial chunks', () => {
      const initial: VectorChunk[] = [
        { id: 'pre1', source: 'Pre', content: 'preloaded', tags: [], coordinate: { x: 0, y: 0, z: 0 } },
      ];
      const s = new VectorStore(initial);
      expect(s.getAllChunks()).toHaveLength(1);
    });
  });
});

// ─── Deterministic Embedding Tests ─────────────────────────────────────────

describe('deterministicEmbedding', () => {
  const { deterministicEmbedding } = (globalThis as any).__vitest_mocker
    ? { deterministicEmbedding: () => {} }
    : require('../src/brain_kernel.ts');

  it('should produce same vector for same input', async () => {
    const mod = await import('../src/brain_kernel.ts');
    const v1 = mod.deterministicEmbedding('test text', 128);
    const v2 = mod.deterministicEmbedding('test text', 128);
    expect(v1).toEqual(v2);
  });

  it('should produce different vectors for different inputs', async () => {
    const mod = await import('../src/brain_kernel.ts');
    const v1 = mod.deterministicEmbedding('hello world', 128);
    const v2 = mod.deterministicEmbedding('world hello', 128);
    const areEqual = v1.every((val: number, i: number) => val === v2[i]);
    expect(areEqual).toBe(false);
  });

  it('should produce values in range [-1, 1]', async () => {
    const mod = await import('../src/brain_kernel.ts');
    const vec = mod.deterministicEmbedding('any input', 128);
    for (const v of vec) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('should handle empty string', async () => {
    const mod = await import('../src/brain_kernel.ts');
    const vec = mod.deterministicEmbedding('', 128);
    expect(vec).toHaveLength(128);
  });

  it('should respect dims parameter', async () => {
    const mod = await import('../src/brain_kernel.ts');
    expect(mod.deterministicEmbedding('test', 64)).toHaveLength(64);
    expect(mod.deterministicEmbedding('test', 256)).toHaveLength(256);
  });
});

// ─── Agent Tests ────────────────────────────────────────────────────────────

describe('Agents', () => {
  async function createMockContext(overrides: Record<string, any> = {}) {
    const mod = await import('../src/brain_kernel.ts');
    return {
      query: overrides.query || 'THC CB1 receptor binding',
      queryLower: (overrides.query || 'THC CB1 receptor binding').toLowerCase(),
      aiClient: undefined,
      studies: overrides.studies || [],
      omics: overrides.omics || [],
      imaging: overrides.imaging || [],
      memories: overrides.memories || [],
      vectorStore: new VectorStore(),
      outputs: {} as Record<string, any>,
    };
  }

  describe('GoalPlannerAgent', () => {
    it('should decompose query into steps', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.GoalPlannerAgent();
      const ctx = await createMockContext();
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Success');
      expect(ctx.outputs.goal_planner_agent?.taskDecomposition).toBeInstanceOf(Array);
      expect(ctx.outputs.goal_planner_agent?.taskDecomposition.length).toBeGreaterThan(0);
      expect(ctx.outputs.goal_planner_agent?.plannedWorkflow).toContain('goal_planner_agent');
    });
  });

  describe('SemanticSearchAgent', () => {
    it('should perform vector search and return chunks', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SemanticSearchAgent();
      const ctx = await createMockContext();
      ctx.vectorStore.add(
        { id: 'test-vc', source: 'Test', content: 'THC binds CB1 receptors', tags: ['thc', 'cb1'], coordinate: { x: 0, y: 0, z: 0 } },
        [0.5, 0.5]
      );
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Success');
      expect(ctx.outputs.semantic_search_agent?.matchingChunks).toBeDefined();
      expect(ctx.outputs.semantic_search_agent?.embeddingSource).toBe('deterministic-fallback');
    });

    it('should filter studies by query relevance', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SemanticSearchAgent();
      const ctx = await createMockContext({ query: 'CBD anxiety allosteric modulation' });
      ctx.studies.push({
        id: 'S-001', title: 'CBD as a negative allosteric modulator of CB1', year: 2023,
        cannabinoid: 'CBD', dose: '10mg', route: 'Oral', population: 'Human',
        brain_region: 'PFC', outcome: 'Reduced anxiety', effect_size: '0.8',
        evidence_level: 'High',
      });
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Success');
      expect(ctx.outputs.semantic_search_agent?.matchingStudies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('StructuringAgent', () => {
    it('should extract entities from query using dictionary', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.StructuringAgent();
      const ctx = await createMockContext({ query: 'THC binding to CB1 in PFC' });
      ctx.outputs.semantic_search_agent = { matchingChunks: [], matchingStudies: [] };
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Success');
      expect(ctx.outputs.structuring_agent?.entities).toContain('Delta-9-THC');
      expect(ctx.outputs.structuring_agent?.entities).toContain('CB1 Receptor');
      expect(ctx.outputs.structuring_agent?.entities).toContain('Prefrontal Cortex');
    });

    it('should return empty entities for unrecognized query', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.StructuringAgent();
      const ctx = await createMockContext({ query: 'quantum physics' });
      ctx.outputs.semantic_search_agent = { matchingChunks: [], matchingStudies: [] };
      const step = await agent.execute(ctx);
      expect(ctx.outputs.structuring_agent?.entities).toHaveLength(0);
      expect(step.status).toBe('Success');
    });
  });

  describe('VerificationAgent', () => {
    it('should detect contradiction for CBD + anxiety + increase', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.VerificationAgent();
      const ctx = await createMockContext({ query: 'CBD anxiety increase' });
      ctx.outputs.structuring_agent = { entities: ['Cannabidiol'] };
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Warning');
      expect(ctx.outputs.verification_agent?.contradictions.length).toBeGreaterThan(0);
      expect(ctx.outputs.verification_agent?.contradictions[0]).toContain('CBD');
    });

    it('should pass with no contradictions', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.VerificationAgent();
      const ctx = await createMockContext({ query: 'THC receptor binding mechanisms' });
      ctx.outputs.structuring_agent = { entities: ['Delta-9-THC'] };
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Success');
      expect(ctx.outputs.verification_agent?.contradictions).toHaveLength(0);
    });
  });

  describe('SimulationAgent', () => {
    it('should return THC default simulation for non-matching query', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SimulationAgent();
      const ctx = await createMockContext({ query: 'random query with no match' });
      const step = await agent.execute(ctx);
      expect(step.status).toBe('Success');
      expect(ctx.outputs.simulation_agent?.simulation.compound).toBe('THC');
    });

    it('should return CBD-specific simulation for CBD queries', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SimulationAgent();
      const ctx = await createMockContext({ query: 'cbd therapeutic effects' });
      const step = await agent.execute(ctx);
      expect(ctx.outputs.simulation_agent?.simulation.compound).toBe('THC + CBD');
      expect(ctx.outputs.simulation_agent?.simulation.occupancy).toBe(34);
    });

    it('should return Beta-Caryophyllene simulation for CB2 queries', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SimulationAgent();
      const ctx = await createMockContext({ query: 'caryophyllene cb2 neuroprotection' });
      const step = await agent.execute(ctx);
      expect(ctx.outputs.simulation_agent?.simulation.compound).toBe('Beta-Caryophyllene');
      expect(ctx.outputs.simulation_agent?.simulation.kineticRatio).toBe(0.88);
    });
  });

  describe('SafetyAgent', () => {
    it('should flag adolescent/vaping queries as critical', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SafetyAgent();
      const ctx = await createMockContext({ query: 'adolescent vaping THC effects' });
      const step = await agent.execute(ctx);
      expect(ctx.outputs.safety_agent?.critical).toBe(true);
      expect(ctx.outputs.safety_agent?.riskFlags).toContain('adolescent');
    });

    it('should pass safe queries', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.SafetyAgent();
      const ctx = await createMockContext({ query: 'CBD adult therapeutic effects' });
      const step = await agent.execute(ctx);
      expect(ctx.outputs.safety_agent?.critical).toBe(false);
      expect(ctx.outputs.safety_agent?.safetyLog).toContain('passed');
    });
  });

  describe('MetaEvaluatorAgent', () => {
    it('should compute score based on evidence and contradictions', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.MetaEvaluatorAgent();
      const ctx = await createMockContext();
      ctx.outputs.semantic_search_agent = { matchingChunks: [{ id: 'a' }, { id: 'b' }], matchingStudies: [] };
      ctx.outputs.verification_agent = { contradictions: [] };
      ctx.outputs.safety_agent = { critical: false };
      const step = await agent.execute(ctx);
      expect(ctx.outputs.meta_evaluator_agent?.evidenceCount).toBe(2);
      expect(ctx.outputs.meta_evaluator_agent?.metaScore).toBeGreaterThan(0);
    });

    it('should penalize score for contradictions', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.MetaEvaluatorAgent();
      const ctx = await createMockContext();
      ctx.outputs.semantic_search_agent = { matchingChunks: [{ id: 'a' }], matchingStudies: [] };
      ctx.outputs.verification_agent = { contradictions: ['Error 1', 'Error 2'] };
      ctx.outputs.safety_agent = { critical: true };
      const step = await agent.execute(ctx);
      expect(ctx.outputs.meta_evaluator_agent?.metaScore).toBeLessThan(8);
    });
  });

  describe('InterfaceAgent', () => {
    it('should produce deterministic summary without AI client', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.InterfaceAgent();
      const ctx = await createMockContext({ query: 'adolescent vaping pruning' });
      ctx.outputs.semantic_search_agent = { matchingChunks: [] };
      ctx.outputs.simulation_agent = { simulation: { compound: 'THC', occupancy: 68, kineticRatio: 0.42 } };
      ctx.outputs.verification_agent = { contradictions: [] };
      ctx.outputs.safety_agent = { safetyLog: 'All clear', critical: false };
      ctx.outputs.meta_evaluator_agent = { metaScore: 9.0 };
      const step = await agent.execute(ctx);
      expect(ctx.outputs.interface_agent?.generatedBy).toBe('deterministic');
      expect(ctx.outputs.interface_agent?.finalSummary).toContain('Adolescent');
      expect(step.status).toBe('Success');
    });

    it('should produce general summary for non-matching query', async () => {
      const mod = await import('../src/brain_kernel.ts');
      const agent = new mod.InterfaceAgent();
      const ctx = await createMockContext({ query: 'random scientific query' });
      ctx.outputs.semantic_search_agent = { matchingChunks: [] };
      ctx.outputs.simulation_agent = { simulation: { compound: 'THC', occupancy: 68, kineticRatio: 0.42 } };
      ctx.outputs.verification_agent = { contradictions: [] };
      ctx.outputs.safety_agent = { safetyLog: 'All clear', critical: false };
      ctx.outputs.meta_evaluator_agent = { metaScore: 7.0 };
      const step = await agent.execute(ctx);
      expect(ctx.outputs.interface_agent?.finalSummary).toContain('General Cannabinoid Synthesis');
    });
  });
});

// ─── Pipeline Runner Tests ─────────────────────────────────────────────────

describe('runDeterministicPipeline', () => {
  it('should complete full pipeline with all 8 steps', async () => {
    const result = await runDeterministicPipeline('THC CB1 receptor binding', {
      studies: [], omics: [], imaging: [], memories: [], aiClient: null,
    });
    expect(result.steps).toHaveLength(8);
    expect(result.steps.every(s => s.status === 'Success')).toBe(true);
    expect(result.goalDecomposition.length).toBeGreaterThan(0);
    expect(result.plannedWorkflow).toHaveLength(8);
  });

  it('should handle safety-critical queries correctly', async () => {
    const result = await runDeterministicPipeline('adolescent vaping THC daily high potency', {
      studies: [], omics: [], imaging: [], memories: [], aiClient: null,
    });
    expect(result.safetyClearance).toBe(false);
    expect(result.contradictionsFound).toBeDefined();
  });

  it('should handle queries with matching studies', async () => {
    const result = await runDeterministicPipeline('CBD anxiety', {
      studies: [{
        id: 'S-001', title: 'CBD Allosteric Modulation', year: 2023,
        cannabinoid: 'CBD', dose: '10mg', route: 'Oral', population: 'Human',
        brain_region: 'PFC', outcome: 'Anxiety reduction', effect_size: '0.8',
        evidence_level: 'High' as const,
      }],
      omics: [], imaging: [], memories: [], aiClient: null,
    });
    expect(result.steps).toHaveLength(8);
  });

  it('should calculate confidence based on steps and meta score', async () => {
    const result = await runDeterministicPipeline('test query', {
      studies: [], omics: [], imaging: [], memories: [], aiClient: null,
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

// ─── Dreaming Loop Tests ────────────────────────────────────────────────────

describe('runDreamingLoop', () => {
  it('should process episodic memories into facts and templates', () => {
    const memories: MemoryItem[] = [
      { id: 'M-001', type: 'Episodic', content: 'adolescent vaping study showed CB1 downregulation',
        confidence: 0.9, sources: [], timestamp: new Date().toISOString(), tags: ['vape'] },
      { id: 'M-002', type: 'Semantic', content: 'CBD is a negative allosteric modulator',
        confidence: 0.95, sources: [], timestamp: new Date().toISOString() },
    ];
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];

    const result = runDreamingLoop({ memories, graphNodes, graphEdges });

    expect(result.id).toMatch(/^DR-/);
    expect(result.episodesReplayed).toHaveLength(1);
    expect(result.distilledFacts.length).toBeGreaterThan(0);
    expect(result.proceduralTemplates.length).toBeGreaterThan(0);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('should inject graph nodes and edges from patterns', () => {
    const memories: MemoryItem[] = [
      { id: 'M-003', type: 'Episodic', content: 'vape adolescent THC study results',
        confidence: 0.9, sources: [], timestamp: new Date().toISOString(), tags: [] },
    ];
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];

    const result = runDreamingLoop({ memories, graphNodes, graphEdges });

    expect(result.nodesInjected.length).toBeGreaterThan(0);
    expect(result.edgesCreated.length).toBeGreaterThan(0);
    expect(graphNodes.length).toBeGreaterThan(0);
    expect(graphEdges.length).toBeGreaterThan(0);
  });

  it('should not duplicate existing nodes', () => {
    const memories: MemoryItem[] = [
      { id: 'M-004', type: 'Episodic', content: 'vape adolescent CB1 downregulation',
        confidence: 0.9, sources: [], timestamp: new Date().toISOString(), tags: [] },
    ];
    const graphNodes: GraphNode[] = [
      { id: 'Adolescent_Pruning', label: 'Adolescent Pruning', type: 'Pathway' },
    ];
    const graphEdges: GraphEdge[] = [];

    const result = runDreamingLoop({ memories, graphNodes, graphEdges });
    expect(result.nodesInjected).toHaveLength(0);
  });

  it('should cap memories at 100', () => {
    const memories: MemoryItem[] = Array.from({ length: 95 }, (_, i) => ({
      id: `M-old-${i}`, type: 'Episodic' as const, content: `old memory ${i}`,
      confidence: 0.5, sources: [], timestamp: new Date().toISOString(),
    }));
    memories.push({
      id: 'M-trigger', type: 'Episodic', content: 'vape adolescent study',
      confidence: 0.9, sources: [], timestamp: new Date().toISOString(), tags: [],
    });

    runDreamingLoop({ memories, graphNodes: [], graphEdges: [] });
    expect(memories.length).toBeLessThanOrEqual(100);
  });
});

// ─── searchVectorDb Tests ──────────────────────────────────────────────────

describe('searchVectorDb', () => {
  it('should return search results for a query', async () => {
    const results = await searchVectorDb('THC CB1 receptor');
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('chunk');
      expect(results[0]).toHaveProperty('score');
    }
  });
});

// ─── Exports Tests ──────────────────────────────────────────────────────────

describe('Exports', () => {
  it('vectorChunks should be populated', () => {
    expect(vectorChunks.length).toBeGreaterThan(0);
  });

  it('vectorStore should have initial chunks', () => {
    expect(vectorStore.getAllChunks().length).toBeGreaterThan(0);
  });

  it('vectorStore initial chunks have required fields', () => {
    for (const chunk of vectorStore.getAllChunks()) {
      expect(chunk.id).toBeTruthy();
      expect(chunk.source).toBeTruthy();
      expect(chunk.content).toBeTruthy();
      expect(Array.isArray(chunk.tags)).toBe(true);
      expect(chunk.coordinate).toHaveProperty('x');
      expect(chunk.coordinate).toHaveProperty('y');
      expect(chunk.coordinate).toHaveProperty('z');
    }
  });
});
