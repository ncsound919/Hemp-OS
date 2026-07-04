import { runDeterministicPipeline } from '../../brain_kernel';
import { AgentResult, AgentConfig } from './agent-types';

let agentId: string;
let agentType: string;
let taskId: string;
let workspaceId: string;
let timeoutMs: number;

// Send progress updates
function sendProgress(progress: number): void {
  if (process.send) {
    process.send({ type: 'progress', progress });
  }
}

// Send result
function sendResult(result: AgentResult): void {
  if (process.send) {
    process.send({ type: 'result', result });
  }
}

// Send error
function sendError(error: string): void {
  if (process.send) {
    process.send({ type: 'error', error });
  }
}

// Handle incoming messages
process.on('message', async (msg: any) => {
  // Heartbeat ping
  if (msg?.type === 'ping') {
    process.send?.({ type: 'pong' });
    return;
  }

  // Termination signal
  if (msg?.type === 'terminate') {
    process.exit(0);
    return;
  }

  // Startup config
  if (msg?.type === 'start') {
    const payload = msg.payload as {
      agentId: string;
      agentType: string;
      taskId: string;
      workspaceId: string;
      query: string;
      context: any;
      timeoutMs: number;
    };

    agentId = payload.agentId;
    agentType = payload.agentType;
    taskId = payload.taskId;
    workspaceId = payload.workspaceId;
    timeoutMs = payload.timeoutMs;

    // Start execution
    try {
      const result = await executeAgent(
        payload.agentType as any,
        payload.query,
        payload.context
      );
      
      // Send result back to parent
      sendResult(result);
      process.exit(0);
    } catch (error) {
      sendError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
});

// Execute the agent based on type
async function executeAgent(
  type: string,
  query: string,
  context: any
): Promise<AgentResult> {
  const startTime = Date.now();

  // All agent types use the deterministic pipeline
  // with different query modes
  let mode: 'clinical' | 'mechanistic' | 'hypothesis' | 'cultivator' | 'notebook' = 'mechanistic';

  switch (type) {
    case 'semantic':
      mode = 'clinical';
      break;
    case 'simulation':
      mode = 'mechanistic';
      break;
    case 'verification':
      mode = 'hypothesis';
      break;
    case 'design':
      mode = 'cultivator';
      break;
    case 'distillation':
      mode = 'notebook';
      break;
    default:
      mode = 'mechanistic';
  }

  sendProgress(20);

  // Run the deterministic pipeline
  const trace = await runDeterministicPipeline(query, {
    studies: context.studies || [],
    omics: context.omics || [],
    imaging: context.imaging || [],
    memories: context.memories || [],
    aiClient: context.aiClient || null,
  });

  sendProgress(80);

  // Extract artifacts from the trace
  const artifacts = extractArtifacts(trace, type);

  sendProgress(100);

  const executionTimeMs = Date.now() - startTime;

  return {
    taskId,
    agentType: type as any,
    trace,
    artifacts,
    confidence: trace.confidence / 100,
    executionTimeMs,
    status: 'completed',
  };
}

// Extract meaningful artifacts from the trace
function extractArtifacts(
  trace: any,
  agentType: string
): { type: string; content: any; references: string[] }[] {
  const artifacts = [];

  // Always include the summary
  if (trace.summary) {
    artifacts.push({
      type: 'summary',
      content: trace.summary,
      references: trace.steps?.filter((s: any) => s.status === 'Success').map((s: any) => s.agentId) || [],
    });
  }

  // Include simulation results if present
  const simStep = trace.steps?.find((s: any) => s.agentId === 'simulation_agent');
  if (simStep?.output) {
    artifacts.push({
      type: 'simulation',
      content: simStep.output,
      references: ['simulation_agent'],
    });
  }

  // Include graph nodes if generated
  const graphStep = trace.steps?.find((s: any) => s.agentId === 'structuring_agent');
  if (graphStep?.output) {
    artifacts.push({
      type: 'graph-node',
      content: graphStep.output,
      references: ['structuring_agent'],
    });
  }

  // For design agent, add design artifact
  if (agentType === 'design' && trace.suggestedAction) {
    artifacts.push({
      type: 'design',
      content: {
        suggestedAction: trace.suggestedAction,
        goalDecomposition: trace.goalDecomposition,
        plannedWorkflow: trace.plannedWorkflow,
      },
      references: ['interface_agent'],
    });
  }

  return artifacts;
}
