/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProcessGraph, ProcessStage } from '../core/types.ts';

/**
 * Validates a process graph structure, ensuring it is a directed acyclic graph (DAG)
 * and has valid connections.
 */
export function validateProcessGraph(graph: ProcessGraph): string[] {
  const errors: string[] = [];
  const stageIds = new Set(graph.stages.map(s => s.id));

  // Check connections refer to real stages
  for (const conn of graph.connections) {
    if (!stageIds.has(conn.from)) {
      errors.push(`Connection origin stage "${conn.from}" does not exist in graph stages.`);
    }
    if (!stageIds.has(conn.to)) {
      errors.push(`Connection destination stage "${conn.to}" does not exist in graph stages.`);
    }
  }

  // Detect cycles and sort stages
  try {
    topologicalSort(graph);
  } catch (e: any) {
    errors.push(`Cyclic dependency or invalid connections: ${e.message}`);
  }

  return errors;
}

/**
 * Sorts the stages topologically to execute them in physical process order.
 */
export function topologicalSort(graph: ProcessGraph): ProcessStage[] {
  const sorted: ProcessStage[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  // Map of stageId -> connected destination stageIds
  const adjList = new Map<string, string[]>();
  for (const stage of graph.stages) {
    adjList.set(stage.id, []);
  }
  for (const conn of graph.connections) {
    const list = adjList.get(conn.from) || [];
    list.push(conn.to);
    adjList.set(conn.from, list);
  }

  const visit = (stageId: string) => {
    if (visiting.has(stageId)) {
      throw new Error(`Cycle detected at stage "${stageId}"`);
    }
    if (!visited.has(stageId)) {
      visiting.add(stageId);
      const destinations = adjList.get(stageId) || [];
      for (const dest of destinations) {
        visit(dest);
      }
      visiting.delete(stageId);
      visited.add(stageId);
      const stageObj = graph.stages.find(s => s.id === stageId);
      if (stageObj) {
        sorted.unshift(stageObj); // Add to the beginning to get correct topological order
      }
    }
  };

  for (const stage of graph.stages) {
    if (!visited.has(stage.id)) {
      visit(stage.id);
    }
  }

  return sorted;
}
