import { describe, it, expect } from 'vitest';
import { topologicalSort, validateProcessGraph } from '../workflow/processGraph.ts';
import type { ProcessGraph, ProcessStage } from '../core/types.ts';

const makeStage = (id: string, type: ProcessStage['type'] = 'extraction'): ProcessStage => ({
  id,
  name: id,
  type,
  modelId: `${type}.v1`,
  config: {},
});

describe('topologicalSort', () => {
  it('sorts a linear graph', () => {
    const graph: ProcessGraph = {
      stages: [
        makeStage('s3', 'distillation'),
        makeStage('s1', 'extraction'),
        makeStage('s2', 'winterization'),
      ],
      connections: [
        { from: 's1', to: 's2' },
        { from: 's2', to: 's3' },
      ],
    };
    const sorted = topologicalSort(graph);
    const ids = sorted.map(s => s.id);
    expect(ids.indexOf('s1')).toBeLessThan(ids.indexOf('s2'));
    expect(ids.indexOf('s2')).toBeLessThan(ids.indexOf('s3'));
  });

  it('sorts a diamond-shaped graph (branching + merging)', () => {
    const graph: ProcessGraph = {
      stages: [
        makeStage('start'),
        makeStage('branch_a', 'winterization'),
        makeStage('branch_b', 'decarboxylation'),
        makeStage('merge', 'distillation'),
      ],
      connections: [
        { from: 'start', to: 'branch_a' },
        { from: 'start', to: 'branch_b' },
        { from: 'branch_a', to: 'merge' },
        { from: 'branch_b', to: 'merge' },
      ],
    };
    const sorted = topologicalSort(graph);
    const ids = sorted.map(s => s.id);
    expect(ids.indexOf('start')).toBeLessThan(ids.indexOf('branch_a'));
    expect(ids.indexOf('start')).toBeLessThan(ids.indexOf('branch_b'));
    expect(ids.indexOf('branch_a')).toBeLessThan(ids.indexOf('merge'));
    expect(ids.indexOf('branch_b')).toBeLessThan(ids.indexOf('merge'));
  });

  it('returns all stages', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a'), makeStage('b'), makeStage('c')],
      connections: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
    };
    const sorted = topologicalSort(graph);
    expect(sorted).toHaveLength(3);
  });

  it('handles a graph with a single node and no edges', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('only')],
      connections: [],
    };
    const sorted = topologicalSort(graph);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('only');
  });

  it('throws on a cyclic graph', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a'), makeStage('b'), makeStage('c')],
      connections: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
    };
    expect(() => topologicalSort(graph)).toThrow('Cycle detected');
  });

  it('throws on a self-loop', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a')],
      connections: [{ from: 'a', to: 'a' }],
    };
    expect(() => topologicalSort(graph)).toThrow('Cycle detected');
  });

  it('handles disconnected subgraphs', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a'), makeStage('b'), makeStage('c')],
      connections: [{ from: 'a', to: 'b' }], // c is disconnected
    };
    const sorted = topologicalSort(graph);
    expect(sorted).toHaveLength(3);
  });
});

describe('validateProcessGraph', () => {
  it('returns empty errors for a valid graph', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a'), makeStage('b')],
      connections: [{ from: 'a', to: 'b' }],
    };
    expect(validateProcessGraph(graph)).toHaveLength(0);
  });

  it('errors on connection to nonexistent stage', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a')],
      connections: [{ from: 'a', to: 'nonexistent' }],
    };
    const errs = validateProcessGraph(graph);
    expect(errs.some(e => e.includes('nonexistent'))).toBe(true);
  });

  it('errors on connection from nonexistent stage', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('b')],
      connections: [{ from: 'ghost', to: 'b' }],
    };
    const errs = validateProcessGraph(graph);
    expect(errs.some(e => e.includes('ghost'))).toBe(true);
  });

  it('errors on cyclic graph', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a'), makeStage('b')],
      connections: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
    };
    const errs = validateProcessGraph(graph);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('returns multiple errors for multiple issues', () => {
    const graph: ProcessGraph = {
      stages: [makeStage('a')],
      connections: [
        { from: 'a', to: 'missing1' },
        { from: 'missing2', to: 'a' },
      ],
    };
    const errs = validateProcessGraph(graph);
    expect(errs.length).toBeGreaterThanOrEqual(2);
  });
});
