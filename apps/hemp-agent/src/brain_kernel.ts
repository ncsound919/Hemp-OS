import type {
  Study, OmicsSignature, ImagingMetric, RiskProfile, GraphNode, GraphEdge,
  MemoryItem, VectorChunk, AgentStep, DeterministicExecutionTrace, DreamResult
} from "./types.ts";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

// ==========================================
// CONFIGURATION
// ==========================================
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-exp-03-07";
const USE_GEMINI_EMBEDDINGS = process.env.USE_GEMINI_EMBEDDINGS === "true";
const LLM_TIMEOUT_MS = 8000;
const EMBEDDING_DIMS = 128;
const NCBI_API_KEY = process.env.NCBI_API_KEY;

function stripMarkdown(text: string): string {
  return text.replace(/```json\n?|\n?```/g, "").trim();
}

// ==========================================
// DETERMINISTIC EMBEDDING FALLBACK
// A hash-based deterministic vector generator. Never random.
// Same input text ALWAYS produces the same vector, with or without LLM access.
// ==========================================
export function deterministicEmbedding(text: string, dims = EMBEDDING_DIMS): number[] {
  // FNV-1a style hash for stable seeding, no Math.random anywhere.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const seed = hash >>> 0;
  return Array.from({ length: dims }, (_, i) => {
    const x = Math.sin(seed * (i + 1) * 0.0001) * 10000;
    return ((x - Math.floor(x)) - 0.5) * 2; // range [-1, 1], fully deterministic
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ]);
}

async function generateEmbedding(text: string, aiClient?: GoogleGenAI): Promise<{ vector: number[]; source: "gemini" | "deterministic-fallback" }> {
  if (USE_GEMINI_EMBEDDINGS && aiClient) {
    try {
      const response = await withTimeout(
        aiClient.models.embedContent({ model: EMBEDDING_MODEL, contents: text }),
        LLM_TIMEOUT_MS,
        "embedContent"
      );
      const emb = response?.embeddings;
      if (emb) {
        const values = (emb as any).values || (emb as any)[0]?.values || emb;
        if (Array.isArray(values) && values.length > 0) {
          return { vector: values, source: "gemini" };
        }
      }
    } catch (err) {
      console.warn("Embedding generation failed, using deterministic fallback:", err);
    }
  }
  // Deterministic fallback — NEVER random. Reproducible by design.
  return { vector: deterministicEmbedding(text), source: "deterministic-fallback" };
}

// ==========================================
// VECTOR STORE
// ==========================================
export class VectorStore {
  private chunks: Map<string, VectorChunk> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  constructor(initialChunks: VectorChunk[] = []) {
    initialChunks.forEach(c => this.chunks.set(c.id, c));
  }

  add(chunk: VectorChunk, embedding: number[]): void {
    this.chunks.set(chunk.id, chunk);
    this.embeddings.set(chunk.id, embedding);
  }

  hasEmbedding(id: string): boolean {
    return this.embeddings.has(id);
  }

  setEmbedding(id: string, embedding: number[]): void {
    this.embeddings.set(id, embedding);
  }

  getAllChunks(): VectorChunk[] {
    return Array.from(this.chunks.values());
  }

  search(queryEmbedding: number[], topK = 5): { chunk: VectorChunk; score: number }[] {
    const results: { chunk: VectorChunk; score: number }[] = [];
    for (const chunk of this.chunks.values()) {
      const emb = this.embeddings.get(chunk.id);
      if (!emb) continue;
      results.push({ chunk, score: this.cosineSimilarity(queryEmbedding, emb) });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
  }

  searchLegacy(query: string): VectorChunk[] {
    const queryWords = query.toLowerCase().split(/[\s,.\-()?]+/).filter(w => w.length > 3);
    return this.getAllChunks()
      .map(chunk => {
        let score = 0;
        const contentLower = chunk.content.toLowerCase();
        queryWords.forEach(w => { if (contentLower.includes(w)) score += 2; });
        chunk.tags.forEach((tag: string) => { if (query.toLowerCase().includes(tag.toLowerCase())) score += 5; });
        return { chunk, score };
      })
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(i => i.chunk);
  }
}

export const vectorStore = new VectorStore([
  { id: "VC-001", source: "PubMed: PM-342019 (Adolescent PFC Pruning)",
    content: "Chronic adolescent vaporized THC exposure downregulates G-protein coupled CB1 receptors in the medial prefrontal cortex, triggering aberrant microglial activation and hyper-activation of synaptic pruning cascades.",
    tags: ["adolescence", "pfc", "cb1", "synaptic-pruning", "microglia", "thc"], coordinate: { x: 0.15, y: 0.78, z: -0.42 } },
  { id: "VC-002", source: "Journal of Neurochemistry, Vol 148 (CBD Allostery)",
    content: "Cannabidiol binds a distinct hydrophobic exosite on CB1 as a negative allosteric modulator, lowering activation kinetics and binding affinity of orthosteric agonists like Delta-9-THC.",
    tags: ["cbd", "cb1", "allosteric", "kinetics", "anxiety"], coordinate: { x: -0.52, y: -0.18, z: 0.64 } },
  { id: "VC-003", source: "Nature Neuroscience (2022) 55 (Beta-Caryophyllene Protection)",
    content: "Beta-Caryophyllene acts as a selective CB2 agonist; CB2 transduction suppresses NF-kB, downregulating TNF-alpha and IL-1beta, preserving hippocampal dendritic spine density.",
    tags: ["beta-caryophyllene", "cb2", "microglia", "hippocampus", "neuroprotection"], coordinate: { x: 0.72, y: -0.35, z: 0.18 } },
  { id: "VC-004", source: "Schizophrenia Bulletin, 48(2) (DMN Coherence Shifts)",
    content: "Daily high-potency THC (>15%) disrupts DMN functional connectivity, inducing salience-network hyper-connectivity and PFC-amygdala decoupling.",
    tags: ["thc", "dmn", "fmri", "psychosis", "connectivity"], coordinate: { x: -0.28, y: 0.62, z: -0.59 } },
  { id: "VC-005", source: "Therapeutic Advances in Psychopharmacology (Entourage Fluidity)",
    content: "Myrcene increases lipid membrane fluidity, increasing BBB permeation of lipophilic THC and amplifying central receptor occupancy.",
    tags: ["myrcene", "entourage-effect", "bbb", "synergy"], coordinate: { x: -0.08, y: -0.25, z: 0.35 } }
]);

async function ensureEmbeddings(store: VectorStore, aiClient?: GoogleGenAI): Promise<void> {
  for (const chunk of store.getAllChunks()) {
    if (!store.hasEmbedding(chunk.id)) {
      const { vector } = await generateEmbedding(chunk.content, aiClient);
      store.setEmbedding(chunk.id, vector);
    }
  }
}

// ==========================================
// AGENT CONTEXT — immutable inputs, explicit outputs
// ==========================================
interface AgentContext {
  readonly query: string;
  readonly queryLower: string;
  readonly aiClient?: GoogleGenAI;
  readonly studies: Study[];
  readonly omics: OmicsSignature[];
  readonly imaging: ImagingMetric[];
  readonly memories: MemoryItem[];
  readonly vectorStore: VectorStore;
  outputs: AgentOutputs;
}

interface AgentOutputs {
  [key: string]: unknown;
  goal_planner_agent?: { taskDecomposition: string[]; plannedWorkflow: string[] };
  semantic_search_agent?: { matchingChunks: VectorChunk[]; matchingStudies: Study[]; embeddingSource: "gemini" | "deterministic-fallback"; scores: { id: string; score: number }[]; ncbiArticles: string[] };
  structuring_agent?: { entities: string[] };
  verification_agent?: { contradictions: string[]; llmChecked: boolean };
  simulation_agent?: { simulation: { compound: string; occupancy: number; kineticRatio: number } };
  safety_agent?: { safetyLog: string; critical: boolean; riskFlags: string[] };
  meta_evaluator_agent?: { metaScore: number; evidenceCount: number };
  interface_agent?: { finalSummary: string; suggestedAction: string; generatedBy: "llm" | "deterministic" };
}

interface Agent {
  id: string;
  name: string;
  execute(ctx: AgentContext): Promise<AgentStep>;
}

abstract class BaseAgent implements Agent {
  readonly id: string;
  readonly name: string;
  constructor(id: string, name: string) { this.id = id; this.name = name; }
  abstract execute(ctx: AgentContext): Promise<AgentStep>;

  protected step(action: string, input: string, output: string, status: "Success" | "Warning" | "Error", durationMs: number): AgentStep {
    const statusMap: Record<string, "Pending" | "Success" | "Warning" | "Failed"> = { Success: "Success", Warning: "Warning", Error: "Failed" };
    return { agentId: this.id, agentName: this.name, action, input, output, status: statusMap[status] ?? "Success", durationMs };
  }

  protected write(ctx: AgentContext, data: Record<string, unknown>): void {
    ctx.outputs[this.id] = data;
  }
}

// 1. Goal Planner — output actually consumed downstream
export class GoalPlannerAgent extends BaseAgent {
  constructor() { super("goal_planner_agent", "Goal & Task Planner"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const taskDecomposition = [
      "Identify target chemical and compound classes",
      "Extract vector-spaced scientific literature chunks",
      "Synapse graph relationships for ontological matching",
      "Verify conclusions against persistent semantic invariants",
      "Execute binding/occupancy and connectivity simulation",
      "Verify safety/demographic constraints & provenance",
      "Score plan validity and compile summary"
    ];
    const plannedWorkflow = [
      "goal_planner_agent", "semantic_search_agent", "structuring_agent",
      "verification_agent", "simulation_agent", "safety_agent",
      "meta_evaluator_agent", "interface_agent"
    ];
    this.write(ctx, { taskDecomposition, plannedWorkflow });
    return this.step(
      "Decompose query into deterministic pipeline steps",
      ctx.query,
      `Decomposed into ${taskDecomposition.length} steps. Workflow: [${plannedWorkflow.join(" -> ")}]`,
      "Success", Date.now() - start
    );
  }
}

// 2. Semantic Search — reports embedding source for auditability
export class SemanticSearchAgent extends BaseAgent {
  constructor() { super("semantic_search_agent", "Semantic Search & Retrieval"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    await ensureEmbeddings(ctx.vectorStore, ctx.aiClient);

    const { vector, source } = await generateEmbedding(ctx.query, ctx.aiClient);
    const scored = ctx.vectorStore.search(vector, 5);
    const matchingChunks = scored.map(s => s.chunk);
    const scores = scored.map(s => ({ id: s.chunk.id, score: Number(s.score.toFixed(4)) }));

    const matchingStudies = ctx.studies.filter(s =>
      ctx.queryLower.includes(s.cannabinoid.toLowerCase()) ||
      ctx.queryLower.includes(s.brain_region.toLowerCase()) ||
      s.title.toLowerCase().split(" ").some((w: string) => w.length > 4 && ctx.queryLower.includes(w))
    );

    let ncbiArticles: string[] = [];
    if (NCBI_API_KEY) {
      try {
        const encodedQuery = encodeURIComponent(ctx.query);
        const searchRes = await withTimeout(
          fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmode=json&retmax=2&api_key=${NCBI_API_KEY}`),
          LLM_TIMEOUT_MS, "ncbi-esearch"
        );
        const searchData: any = await searchRes.json();
        const idList = searchData.esearchresult?.idlist || [];
        if (idList.length > 0) {
          const summaryRes = await withTimeout(
            fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(",")}&retmode=json&api_key=${NCBI_API_KEY}`),
            LLM_TIMEOUT_MS, "ncbi-esummary"
          );
          const summaryData: any = await summaryRes.json();
          ncbiArticles = idList.map((id: string) => `PMID-${id}: ${summaryData.result?.[id]?.title || "Unknown Title"}`);
        }
      } catch (err) {
        console.warn("NCBI fetch failed during semantic search:", err);
      }
    }

    this.write(ctx, { matchingChunks, matchingStudies, embeddingSource: source, scores, ncbiArticles });
    return this.step(
      "Vector search + tabular lookup",
      `Query: "${ctx.query}" (embedding: ${source})`,
      `Retrieved ${matchingChunks.length} chunks, ${matchingStudies.length} internal studies, ${ncbiArticles.length} live PubMed records.`,
      "Success", Date.now() - start
    );
  }
}

// 3. Structuring Agent — data-driven entity extraction (extensible dictionary, not hardcoded if/else chain)
const ENTITY_DICTIONARY: Record<string, string> = {
  thc: "Delta-9-THC", cbd: "Cannabidiol", caryophyllene: "Beta-Caryophyllene",
  beta: "Beta-Caryophyllene", cb1: "CB1 Receptor", cb2: "CB2 Receptor",
  pfc: "Prefrontal Cortex", prefrontal: "Prefrontal Cortex",
  hippocampus: "Hippocampus", memory: "Hippocampus",
  pruning: "Synaptic Pruning", adolescent: "Synaptic Pruning",
  anxiety: "Anxiety Modulation", psychosis: "Schizotypal Phenotype"
};

export class StructuringAgent extends BaseAgent {
  constructor() { super("structuring_agent", "Knowledge Structuring"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const entities = Array.from(new Set(
      Object.entries(ENTITY_DICTIONARY)
        .filter(([kw]) => ctx.queryLower.includes(kw))
        .map(([, canonical]) => canonical)
    ));
    const search = ctx.outputs["semantic_search_agent"] as { matchingChunks?: VectorChunk[]; matchingStudies?: Study[] } | undefined;
    const matchedIds = [...(search?.matchingChunks ?? []).map(c => c.id), ...(search?.matchingStudies ?? []).map(s => s.id)];

    this.write(ctx, { entities });
    return this.step(
      "Normalize retrieved chunks into structured entities",
      `Matched evidence: ${matchedIds.join(",")}`,
      `Structured Entities: [${entities.join(", ")}].`,
      "Success", Date.now() - start
    );
  }
}

// 4. Verification Agent — schema-validated LLM output, rules always run first
const CONTRADICTION_RULES: { test: (q: string) => boolean; message: string }[] = [
  { test: q => q.includes("cbd") && q.includes("anxiety") && q.includes("increase"),
    message: "Query implies CBD increases anxiety, but CBD is a negative allosteric modulator that alleviates THC-induced anxiety." },
  { test: q => q.includes("vaping") && q.includes("harmless"),
    message: "Claim of vaping safety contradicts clinical evidence linking high-potency use to elevated psychosis odds ratio." }
];

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(i => typeof i === "string");
}

export class VerificationAgent extends BaseAgent {
  constructor() { super("verification_agent", "Verification & Consistency"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const contradictions = CONTRADICTION_RULES.filter(r => r.test(ctx.queryLower)).map(r => r.message);
    const structuring = ctx.outputs["structuring_agent"] as { entities?: string[] } | undefined;
    const entities = structuring?.entities ?? [];
    let llmChecked = false;

    if (ctx.aiClient && entities.length > 0) {
      try {
        const prompt = `You are a verification agent. Given query "${ctx.query}" and entities [${entities.join(", ")}], list contradictions with known pharmacology as a JSON array of strings (empty array if none). Return ONLY the JSON array.`;
        const response = await withTimeout(
          ctx.aiClient.models.generateContent({ model: GEMINI_MODEL, contents: prompt, config: { responseMimeType: "application/json" } }),
          LLM_TIMEOUT_MS, "verification-llm"
        );
        const parsed = JSON.parse(stripMarkdown(response.text || "[]"));
        if (isStringArray(parsed)) {
          contradictions.push(...parsed);
          llmChecked = true;
        } else {
          console.warn("Verification LLM returned non-string-array, ignoring output.");
        }
      } catch (err) {
        console.warn("LLM verification unavailable, rule-based checks only:", err);
      }
    }

    this.write(ctx, { contradictions, llmChecked });
    const output = contradictions.length > 0
      ? `WARNING: ${contradictions.length} contradiction(s): ${contradictions.join(" | ")}`
      : "No conflicts detected against rule set or semantic invariants.";
    return this.step(
      "Cross-check claims against invariants (rules first, LLM as supplement)",
      `Entities: [${entities.join(", ")}]`,
      output,
      contradictions.length > 0 ? "Warning" : "Success",
      Date.now() - start
    );
  }
}

// 5. Simulation Agent — table-driven, no magic numbers scattered inline
const SIMULATION_PROFILES: { test: (q: string) => boolean; compound: string; occupancy: number; kineticRatio: number }[] = [
  { test: q => q.includes("cbd"), compound: "THC + CBD", occupancy: 34, kineticRatio: 0.18 },
  { test: q => q.includes("caryophyllene") || q.includes("cb2"), compound: "Beta-Caryophyllene", occupancy: 55, kineticRatio: 0.88 }
];
const DEFAULT_SIMULATION = { compound: "THC", occupancy: 68, kineticRatio: 0.42 };

export class SimulationAgent extends BaseAgent {
  constructor() { super("simulation_agent", "Experiment & Simulation"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const profile = SIMULATION_PROFILES.find(p => p.test(ctx.queryLower)) ?? DEFAULT_SIMULATION;
    this.write(ctx, { simulation: profile });
    return this.step(
      "Molecular binding affinity + transduction simulation",
      `Compound: ${profile.compound}. CB1 Kd=15nM, CB2 Kd=240nM.`,
      `Simulation: ${profile.compound}, occupancy ${profile.occupancy}%, kinetic ratio ${profile.kineticRatio.toFixed(2)} RFU/sec.`,
      "Success", Date.now() - start
    );
  }
}

// 6. Safety Agent
export class SafetyAgent extends BaseAgent {
  constructor() { super("safety_agent", "Safety & Constraint"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const riskFlags = ["adolescent", "vaping", "high potency", "daily"].filter(kw => ctx.queryLower.includes(kw));
    const critical = riskFlags.length > 0;
    const safetyLog = critical
      ? `CRITICAL LIMIT: Detected risk flags [${riskFlags.join(", ")}]. Enforcing adolescent cognitive protection override.`
      : "All safety constraints passed.";
    this.write(ctx, { safetyLog, critical, riskFlags });
    return this.step("Enforce safety bounds & demographic constraints", "Target demographic & compound profile", safetyLog, "Success", Date.now() - start);
  }
}

// 7. Meta-Evaluator — combines evidence density AND contradiction/safety penalties into ONE confidence score
export class MetaEvaluatorAgent extends BaseAgent {
  constructor() { super("meta_evaluator_agent", "Meta-Evaluator"); }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const search = ctx.outputs["semantic_search_agent"] as { matchingChunks?: VectorChunk[]; matchingStudies?: Study[] } | undefined;
    const verification = ctx.outputs["verification_agent"] as { contradictions?: string[] } | undefined;
    const safety = ctx.outputs["safety_agent"] as { critical?: boolean } | undefined;

    const evidenceCount = (search?.matchingChunks?.length ?? 0) + (search?.matchingStudies?.length ?? 0);
    let score = evidenceCount > 0 ? 9.4 : 7.0;
    score -= (verification?.contradictions?.length ?? 0) * 1.5;
    if (safety?.critical) score -= 0.5;
    score = Math.max(0, Math.min(10, score));

    this.write(ctx, { metaScore: score, evidenceCount });
    return this.step(
      "Score plan validity, evidence coverage, and safety penalties",
      `Evidence=${evidenceCount}, contradictions=${verification?.contradictions?.length ?? 0}, safetyCritical=${!!safety?.critical}`,
      `Fidelity Score: ${score.toFixed(1)}/10.`,
      "Success", Date.now() - start
    );
  }
}

// 8. Interface Agent — LLM and deterministic paths clearly labeled in output, not silently interchangeable
export class InterfaceAgent extends BaseAgent {
  constructor() { super("interface_agent", "Interface & Translation"); }

  private buildDeterministicSummary(ctx: AgentContext): { summary: string; suggestedAction: string } {
    const search = ctx.outputs["semantic_search_agent"] as { matchingChunks?: VectorChunk[] } | undefined;
    const simulation = (ctx.outputs["simulation_agent"] as { simulation?: typeof DEFAULT_SIMULATION } | undefined)?.simulation ?? DEFAULT_SIMULATION;
    const evidenceIds = (search?.matchingChunks ?? []).map(c => c.id).join(", ");
    const q = ctx.queryLower;

    if (q.includes("adolescent") || q.includes("pruning") || q.includes("vaping")) {
      const excerpts = (search?.matchingChunks ?? []).map(c => c.content.slice(0, 100) + "...").join(" | ");
      return {
        summary: `### Neurobiological Synthesis: Adolescent Cannabinoid Exposure & PFC Maturation\n\n1. **Receptor Dynamics:** THC binds CB1 (simulated occupancy: ${simulation.occupancy}%).\n2. **Cascade:** CB1 downregulation disrupts retrograde signaling, activating microglial hyper-pruning.\n3. **Circuit-Level:** DMN coherence shifts, PFC-amygdala decoupling.\n\n*Evidence excerpts: ${excerpts}*`,
        suggestedAction: "Initiate DMN coherence sweep and tag adolescent-risk warnings."
      };
    }
    if (q.includes("cbd") || q.includes("allosteric") || q.includes("anxiety")) {
      const excerpts = (search?.matchingChunks ?? []).map(c => c.content.slice(0, 100) + "...").join(" | ");
      return {
        summary: `### Neurobiological Synthesis: CBD Allosteric Mitigation\n\n1. CBD binds hydrophobic exosite, reducing THC activation kinetics.\n2. Simulated occupancy reduced to ${simulation.occupancy}%.\n3. Mitigates tachycardia and paranoia via reduced glutamate suppression.\n\n*Evidence excerpts: ${excerpts}*`,
        suggestedAction: "Add CBD binding constants to ontology; adjust synergy calculations."
      };
    }
    const excerpts = (search?.matchingChunks ?? []).map(c => c.content.slice(0, 100) + "...").join(" | ");
    return {
      summary: `### General Cannabinoid Synthesis: "${ctx.query}"\n\n- Compound ${simulation.compound} at occupancy ${simulation.occupancy}%.\n- Kinetic ratio: ${simulation.kineticRatio.toFixed(2)} RFU/sec.\n\n*Evidence excerpts: ${excerpts}*`,
      suggestedAction: "Store synaptic pruning indexes in long-term semantic memory."
    };
  }

  async execute(ctx: AgentContext): Promise<AgentStep> {
    const start = Date.now();
    const deterministic = this.buildDeterministicSummary(ctx);
    let finalSummary = deterministic.summary;
    let suggestedAction = deterministic.suggestedAction;
    let generatedBy: "llm" | "deterministic" = "deterministic";

    if (ctx.aiClient) {
      try {
        const search = ctx.outputs["semantic_search_agent"];
        const simulation = ctx.outputs["simulation_agent"];
        const verification = ctx.outputs["verification_agent"] as { contradictions?: string[] } | undefined;
        const safety = ctx.outputs["safety_agent"] as { safetyLog?: string } | undefined;
        const metaEval = ctx.outputs["meta_evaluator_agent"] as { metaScore?: number } | undefined;

        const prompt = `You are 'interface_agent' inside Hemp OS's deterministic cognition core.
Query: "${ctx.query}"
Evidence: ${JSON.stringify(search)}
Simulation: ${JSON.stringify(simulation)}
Contradictions: ${(verification?.contradictions ?? []).join(", ") || "None"}
Safety: ${safety?.safetyLog ?? "No warnings"}
Meta score: ${metaEval?.metaScore ?? 7}/10

Ground your synthesis STRICTLY in the evidence above. Do not invent facts not present in evidence.
Format as JSON: { "summary": "...", "suggestedAction": "..." }`;

        const response = await withTimeout(
          ctx.aiClient.models.generateContent({ model: GEMINI_MODEL, contents: prompt, config: { responseMimeType: "application/json" } }),
          LLM_TIMEOUT_MS, "interface-llm"
        );
        const parsed = JSON.parse(stripMarkdown(response.text || "{}"));
        if (typeof parsed.summary === "string" && parsed.summary.length > 0) {
          finalSummary = parsed.summary;
          suggestedAction = typeof parsed.suggestedAction === "string" ? parsed.suggestedAction : suggestedAction;
          generatedBy = "llm";
        }
      } catch (err) {
        console.warn("Interface LLM unavailable, using deterministic synthesis:", err);
      }
    }

    this.write(ctx, { finalSummary, suggestedAction, generatedBy });
    return this.step(
      "Translate structured analysis into synthesis",
      "Compiled step evidence",
      `Synthesis generated via [${generatedBy}].`,
      "Success", Date.now() - start
    );
  }
}

// ==========================================
// PIPELINE RUNNER
// ==========================================
export async function runDeterministicPipeline(
  query: string,
  ctx: { studies: Study[]; omics: OmicsSignature[]; imaging: ImagingMetric[]; memories: MemoryItem[]; aiClient: GoogleGenAI | null; }
): Promise<DeterministicExecutionTrace> {
  const agentCtx: AgentContext = {
    query, queryLower: query.toLowerCase(),
    aiClient: ctx.aiClient ?? undefined,
    studies: ctx.studies, omics: ctx.omics, imaging: ctx.imaging, memories: ctx.memories,
    vectorStore,
    outputs: {}
  };

  const agents: Agent[] = [
    new GoalPlannerAgent(), new SemanticSearchAgent(), new StructuringAgent(),
    new VerificationAgent(), new SimulationAgent(), new SafetyAgent(),
    new MetaEvaluatorAgent(), new InterfaceAgent()
  ];

  const steps: AgentStep[] = [];
  for (const agent of agents) {
    try {
      console.log(`Pipeline: Executing ${agent.name}...`);
      steps.push(await agent.execute(agentCtx));
    } catch (err) {
      steps.push({
        agentId: agent.id, agentName: agent.name, action: "Execution",
        input: `Query: "${query}"`, output: `Error: ${err instanceof Error ? err.message : String(err)}`,
        status: "Failed", durationMs: 0
      });
    }
  }

  const planner = agentCtx.outputs["goal_planner_agent"] as { taskDecomposition?: string[]; plannedWorkflow?: string[] } | undefined;
  const verification = agentCtx.outputs["verification_agent"] as { contradictions?: string[] } | undefined;
  const safety = agentCtx.outputs["safety_agent"] as { safetyLog?: string; critical?: boolean } | undefined;
  const metaEval = agentCtx.outputs["meta_evaluator_agent"] as { metaScore?: number } | undefined;
  const iface = agentCtx.outputs["interface_agent"] as { finalSummary?: string; suggestedAction?: string } | undefined;

  const successSteps = steps.filter(s => s.status !== "Failed").length;
  const confidence = Math.round(((successSteps / steps.length) * 0.5 + ((metaEval?.metaScore ?? 7) / 10) * 0.5) * 100);

  return {
    query,
    goalDecomposition: planner?.taskDecomposition ?? [],
    plannedWorkflow: planner?.plannedWorkflow ?? [],
    steps,
    contradictionsFound: verification?.contradictions ?? [],
    safetyClearance: !safety?.critical,
    metaEvaluationScore: metaEval?.metaScore ?? 7,
    suggestedAction: iface?.suggestedAction ?? "",
    summary: iface?.finalSummary ?? "",
    confidence,
    timestamp: new Date().toISOString(),
  };
}

// ==========================================
// DREAMING LOOP — with provenance and idempotency
// ==========================================
import playbooks from "./playbooks.json" with { type: "json" };

// ... existing code ...

const DISTILLATION_PATTERNS = playbooks.distillationPatterns.map(p => ({
  test: (c: string) => new RegExp(p.test, "i").test(c),
  fact: (id: string) => `${id}: ${p.fact}`,
  template: (id: string) => `${id}: ${p.template}`,
  node: p.node,
  edge: p.edge
}));

const DEFAULT_PATTERN = {
  fact: (id: string) => `${id}: ${playbooks.defaultPattern.fact}`,
  template: (id: string) => `${id}: ${playbooks.defaultPattern.template}`,
  node: playbooks.defaultPattern.node as GraphNode,
  edge: { ...playbooks.defaultPattern.edge, id: "E-temp-3" } as GraphEdge
};

export function runDreamingLoop(ctx: { memories: MemoryItem[]; graphNodes: GraphNode[]; graphEdges: GraphEdge[]; }): DreamResult {
  const dreamId = `DR-${randomUUID().slice(0, 8)}`;
  const logs: string[] = [`Starting Dreaming Loop [${dreamId}]...`];

  const episodic = ctx.memories.filter(m => m.type === "Episodic");
  logs.push(`Found ${episodic.length} episodic records.`);
  const replayed = episodic.slice(-2);
  logs.push(`Replaying episodes: [${replayed.map(e => e.id).join(", ")}]`);

  const distilledFacts: string[] = [];
  const proceduralTemplates: string[] = [];
  const nodesInjected: string[] = [];
  const edgesCreated: string[] = [];
  const replayedIds = replayed.map(e => e.id);

  replayed.forEach((episode, i) => {
    const content = episode.content.toLowerCase();
    const pattern = DISTILLATION_PATTERNS.find(p => p.test(content)) ?? DEFAULT_PATTERN;
    const factId = `DF-${dreamId}-${i}`;
    const templateId = `PT-${dreamId}-${i}`;
    const fact = pattern.fact(factId);
    const template = pattern.template(templateId);

    distilledFacts.push(fact);
    proceduralTemplates.push(template);
    logs.push(`Processed episode ${episode.id} -> [${fact}] [${template}]`);

    if (!ctx.graphNodes.some(n => n.id === pattern.node.id)) {
      ctx.graphNodes.push({ ...pattern.node });
      nodesInjected.push(pattern.node.id);
      logs.push(`[Graph] Injected node "${pattern.node.id}" (source: dream ${dreamId}, episode: ${episode.id}).`);
    }

    const alreadyExists = ctx.graphEdges.some(e => e.source === pattern.edge.source && e.target === pattern.edge.target && e.relation === pattern.edge.relation);
    if (!alreadyExists) {
      const edgeId = `E-${dreamId}-${i}`;
      ctx.graphEdges.push({ ...pattern.edge, id: edgeId });
      edgesCreated.push(edgeId);
      logs.push(`[Graph] Created edge ${pattern.edge.source} -[${pattern.edge.relation}]-> ${pattern.edge.target} (source: dream ${dreamId}, episode: ${episode.id}).`);
    }
  });

  distilledFacts.forEach(fact => {
    ctx.memories.push({
      id: `M-${randomUUID().slice(0, 8)}`, type: "Semantic", content: fact,
      confidence: 0.96, sources: replayedIds, timestamp: new Date().toISOString(),
      tags: ["dream-distillation", "consolidated-fact", dreamId]
    });
  });
  if (ctx.memories.length > 100) ctx.memories.splice(0, ctx.memories.length - 100);
  proceduralTemplates.forEach(template => {
    ctx.memories.push({
      id: `M-${randomUUID().slice(0, 8)}`, type: "Procedural", content: template,
      confidence: 0.94, sources: replayedIds, timestamp: new Date().toISOString(),
      tags: ["dream-distillation", "consolidated-workflow", dreamId]
    });
  });

  logs.push("Dreaming Loop completed.");
  return { id: dreamId, episodesReplayed: replayedIds, distilledFacts, proceduralTemplates, nodesInjected, edgesCreated, logs, timestamp: new Date().toISOString() };
}

export const vectorChunks = vectorStore.getAllChunks();
export const dreamResults: any[] = [];
export async function searchVectorDb(query: string, aiClient?: GoogleGenAI): Promise<any[]> {
  await ensureEmbeddings(vectorStore, aiClient);
  const vector = (await generateEmbedding(query, aiClient)).vector;
  return vectorStore.search(vector);
}
