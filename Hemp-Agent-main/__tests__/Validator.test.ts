import { describe, it, expect } from 'vitest';
import { ProofValidator } from '../src/orchestrator/task/proof-of-work/Validator';
import type { ProofOfWork, ResearchTask } from '../src/orchestrator/types';

function makeProof(overrides: Partial<ProofOfWork> = {}): ProofOfWork {
  return {
    id: 'pow-1',
    taskId: 'task-1',
    agentId: 'agent-1',
    proof: 'test-proof-hash',
    nonce: 0,
    difficulty: 1,
    timestamp: new Date(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<ResearchTask> = {}): ResearchTask {
  return {
    id: 'task-1',
    type: 'literature-review',
    title: 'Test',
    description: '',
    status: 'pending',
    priority: 3,
    workspaceId: 'ws-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deadlines: { suggested: new Date() },
    dependencies: [],
    metadata: { retries: 0 },
    ...overrides,
  };
}

describe('ProofValidator', () => {
  const validator = new ProofValidator();

  it('should always return passed: true', async () => {
    const result = await validator.validate(makeProof(), makeTask());
    expect(result.passed).toBe(true);
  });

  it('should return empty checks array', async () => {
    const result = await validator.validate(makeProof(), makeTask());
    expect(result.checks).toEqual([]);
  });

  it('should return "Passed" reason', async () => {
    const result = await validator.validate(makeProof(), makeTask());
    expect(result.reason).toBe('Passed');
  });

  it('should accept any proof and task combination', async () => {
    const result = await validator.validate(
      makeProof({ proof: 'anything', nonce: 999 }),
      makeTask({ type: 'experiment', title: 'Different task' })
    );
    expect(result.passed).toBe(true);
  });
});
