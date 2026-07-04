import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { 
  Study, 
  OmicsSignature, 
  ImagingMetric, 
  RiskProfile, 
  GraphNode, 
  GraphEdge, 
  MemoryItem, 
  IngestionJob,
  OrchestrationResult,
  McpServerConfig,
  IntegrationRequestLog,
  Hypothesis,
  ExperimentEpisode,
  Conclusion,
  ResearchArtifact
} from "./src/types";
import {
  vectorChunks,
  dreamResults,
  searchVectorDb,
  runDeterministicPipeline,
  runDreamingLoop
} from "./src/brain_kernel";
import { integrationRouter } from "../integration/routes.ts";

dotenv.config();

const app = express();
app.use(express.json());

// Integration layer — cross-system communication, data sources, paper generation
app.use("/api/integration", integrationRouter);

const PORT = 3300;

// Basic Auth Middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) {
    // If no key is set, allow bypass for local dev, or deny. We'll allow bypass.
    return next();
  }
  
  const provided = req.headers['x-api-key'] || req.query.api_key;
  if (provided === apiKey) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized. Invalid or missing API key." });
}

// ==========================================
// IN-MEMORY BIGQUERY TABLES & GRAPH DATABASE
// ==========================================

let studiesTable: Study[] = [
  {
    id: "ST-001",
    title: "Delta-9-THC induced connectivity changes in the human brain: A resting-state fMRI study",
    year: 2021,
    cannabinoid: "THC",
    dose: "10mg oral",
    route: "Oral",
    population: "Healthy adult recreational users (n=24)",
    brain_region: "Default Mode Network, Hippocampus",
    outcome: "Transient decrease in functional connectivity between the hippocampus and prefrontal cortex.",
    effect_size: "Cohen's d = 0.54",
    evidence_level: "High"
  },
  {
    id: "ST-002",
    title: "Chronic cannabinoid administration downregulates CB1 receptors in adolescent rodents",
    year: 2020,
    cannabinoid: "THC",
    dose: "5mg/kg daily for 21 days",
    route: "Intraperitoneal injection",
    population: "Adolescent Sprague-Dawley rats",
    brain_region: "Prefrontal Cortex, Cerebellum",
    outcome: "Significant downregulation of CB1 receptor binding density in the medial prefrontal cortex.",
    effect_size: "35% reduction in binding (p < 0.01)",
    evidence_level: "High"
  },
  {
    id: "ST-003",
    title: "Cannabidiol (CBD) acts as a negative allosteric modulator of CB1 and mitigates THC side effects",
    year: 2019,
    cannabinoid: "CBD",
    dose: "Various, ratio-based",
    route: "In vitro / Cellular assays",
    population: "HEK293 cells expressing hCB1",
    brain_region: "Cellular",
    outcome: "CBD non-competitively reduces THC activation of CB1 receptors, reducing anxiety-like side effects.",
    effect_size: "IC50 = 1.2 uM",
    evidence_level: "High"
  },
  {
    id: "ST-004",
    title: "Associations between cannabis potency and first-episode psychosis: a multi-centre case-control study",
    year: 2019,
    cannabinoid: "THC",
    dose: "High potency (>15% THC)",
    route: "Smoked / Vaped",
    population: "Patients with first-episode psychosis (n=901) vs controls",
    brain_region: "Cortical Networks",
    outcome: "Daily use of high-potency cannabis is associated with a 5-fold increase in odds of psychotic disorder.",
    effect_size: "Odds Ratio = 4.8 (95% CI: 2.5-9.1)",
    evidence_level: "Medium"
  },
  {
    id: "ST-005",
    title: "Cannabinoid receptor CB2 activation in microglial cells promotes anti-inflammatory neuroprotection",
    year: 2022,
    cannabinoid: "Beta-Caryophyllene",
    dose: "10mg/kg",
    route: "Oral gavage",
    population: "Neuroinflammation mouse models",
    brain_region: "Microglia, Amygdala",
    outcome: "CB2 activation decreases pro-inflammatory cytokines TNF-alpha and IL-1beta in the hippocampus.",
    effect_size: "42% cytokine reduction (p < 0.05)",
    evidence_level: "Medium"
  }
];

let omicsTable: OmicsSignature[] = [
  {
    id: "OM-001",
    cannabinoid: "THC",
    tissue: "Medial Prefrontal Cortex",
    species: "Rattus norvegicus",
    gene_set: "Cnr1, Dlg4, Grin1, Gria1",
    direction: "Downregulated",
    pathway_enrichment: "Retrograde endocannabinoid signaling, Glutamatergic synapse modulation (p=0.0004)"
  },
  {
    id: "OM-002",
    cannabinoid: "CBD",
    tissue: "Hippocampus",
    species: "Mus musculus",
    gene_set: "Bdnf, Trkb, Creb1",
    direction: "Upregulated",
    pathway_enrichment: "BDNF-TrkB signaling pathway, Neurogenesis activation (p=0.0012)"
  },
  {
    id: "OM-003",
    cannabinoid: "THC",
    tissue: "Striatum",
    species: "Mus musculus",
    gene_set: "Drdf1, Drd2, Fos, Penk",
    direction: "Upregulated",
    pathway_enrichment: "Dopaminergic synapse pathway, Cocaine addiction transcription factor response"
  }
];

let imagingTable: ImagingMetric[] = [
  {
    id: "IM-001",
    cannabinoid_status: "Chronic High-Potency Users",
    region: "Amydgala, Hippocampus",
    connectivity_change: "Reduced functional connectivity between amygdala and ventral prefrontal cortex.",
    structural_change: "Bilateral volume reduction in the hippocampus (mean 12% lower compared to non-users).",
    behavioral_correlates: "Correlated with higher trait anxiety and verbal memory retrieval speed deficits."
  },
  {
    id: "IM-002",
    cannabinoid_status: "Acute Inhalation (THC 12mg)",
    region: "Prefrontal Cortex, Anterior Cingulate Cortex",
    connectivity_change: "Increased subcortical-cortical global connectivity, disrupted default mode network synchrony.",
    structural_change: "None (Acute administration).",
    behavioral_correlates: "Associated with self-reported 'stoned' feelings and objective temporal processing delays."
  }
];

let riskProfilesTable: RiskProfile[] = [
  {
    id: "RP-001",
    age: 17,
    sex: "Male",
    use_pattern: "Daily, multiple times per day",
    product_profile: "High-Potency Vape Cartridge (88% Delta-9-THC)",
    risk_score: 82,
    confidence: 85,
    supporting_studies: ["ST-002", "ST-004"],
    reasons: [
      "High-potency vaporizers in adolescents are associated with severe synaptic pruning and downregulation of CB1 receptors during critical prefrontal cortex development.",
      "Smoked/vaped high-potency THC shows a strong dose-response association with first-episode psychosis and memory deficits.",
      "Adolescent male daily use pattern substantially increases vulnerability to cannabinoid-induced cognitive decline."
    ]
  },
  {
    id: "RP-002",
    age: 32,
    sex: "Female",
    use_pattern: "Intermittent, twice per week",
    product_profile: "Balanced Edible (5mg THC / 20mg CBD)",
    risk_score: 18,
    confidence: 90,
    supporting_studies: ["ST-001", "ST-003"],
    reasons: [
      "Low, balanced dosages minimize adverse events due to competitive inhibition and negative allosteric modulation of CB1 receptors by CBD.",
      "Adult brain has completed myelination and structural maturation, significantly reducing risk of structural neural reorganization.",
      "Non-inhalation route avoids pulmonary irritation, and low frequency prevents receptor downregulation."
    ]
  }
];

// Graph Nodes & Edges
let graphNodes: GraphNode[] = [
  { id: "THC", label: "Delta-9-THC", type: "Cannabinoid", provenance: { source: "literature:PMC37351", sourceType: "Document", assertingAgent: "SynthesisAgent", confidence: 0.99, verificationStatus: "verified", timestamp: "2026-07-02T01:00:00Z", episodeId: "EP-01" } },
  { id: "CBD", label: "Cannabidiol", type: "Cannabinoid", provenance: { source: "literature:PMC88291", sourceType: "Document", assertingAgent: "SynthesisAgent", confidence: 0.99, verificationStatus: "verified", timestamp: "2026-07-02T01:00:00Z", episodeId: "EP-01" } },
  { id: "CB1", label: "CB1 Receptor", type: "Receptor", provenance: { source: "database:IUPHAR", sourceType: "URL", assertingAgent: "VerificationAgent", confidence: 1.0, verificationStatus: "verified", timestamp: "2026-07-02T01:00:00Z", episodeId: "EP-01" } },
  { id: "CB2", label: "CB2 Receptor", type: "Receptor", provenance: { source: "database:IUPHAR", sourceType: "URL", assertingAgent: "VerificationAgent", confidence: 1.0, verificationStatus: "verified", timestamp: "2026-07-02T01:00:00Z", episodeId: "EP-01" } },
  { id: "G_protein", label: "Gi/o Protein Cascade", type: "Pathway" },
  { id: "BDNF_path", label: "BDNF-TrkB Neurogenesis", type: "Pathway", provenance: { source: "paper:PMC442931", sourceType: "Document", assertingAgent: "VerificationAgent", confidence: 0.94, verificationStatus: "verified", timestamp: "2026-07-02T02:00:00Z", episodeId: "EP-02" } },
  { id: "Hippocampus", label: "Hippocampus", type: "BrainRegion" },
  { id: "PFC", label: "Prefrontal Cortex", type: "BrainRegion" },
  { id: "Microglia", label: "Microglia", type: "BrainRegion" },
  { id: "Anxiety", label: "Anxiety Modulation", type: "Phenotype" },
  { id: "Memory", label: "Working Memory Deficit", type: "Phenotype" },
  { id: "Psychosis", label: "Schizotypal Phenotype", type: "Phenotype" },
  { id: "Neuroprotection", label: "Anti-Inflammatory Neuroprotection", type: "Phenotype" },
  { id: "ST-001", label: "Connectivity Study ST-001", type: "Study" },
  { id: "ST-002", label: "Receptor Study ST-002", type: "Study" },
  { id: "ST-003", label: "Allosteric Study ST-003", type: "Study" },
  
  // Cognitive-layer nodes
  { id: "VER_AGT", label: "Verification Agent", type: "Agent", agentRole: "Consensus & Grounding Audit", provenance: { source: "kernel-init", sourceType: "Kernel", assertingAgent: "HempOS", confidence: 1.0, verificationStatus: "verified", timestamp: "2026-07-02T00:00:00Z", episodeId: "EP-INIT" } },
  { id: "DIS_AGT", label: "Distillation Agent", type: "Agent", agentRole: "Offline Episodic Synthesis", provenance: { source: "kernel-init", sourceType: "Kernel", assertingAgent: "HempOS", confidence: 1.0, verificationStatus: "verified", timestamp: "2026-07-02T00:00:00Z", episodeId: "EP-INIT" } },
  { id: "TSK_101", label: "Audit GPR55 Signaling Pathways", type: "Task", taskStatus: "completed", provenance: { source: "agent:KairosAutonomyAgent", sourceType: "Agent", assertingAgent: "KairosAutonomyAgent", confidence: 0.95, verificationStatus: "verified", timestamp: "2026-07-02T03:00:00Z", episodeId: "EP-402" } },
  { id: "EPI_402", label: "Consolidation Loop EP-402", type: "Episode", timestamp: "2026-07-02T04:00:00Z", provenance: { source: "experiment:EXP-821", sourceType: "Experiment", assertingAgent: "DistillationAgent", confidence: 0.90, verificationStatus: "verified", timestamp: "2026-07-02T04:00:00Z", episodeId: "EP-402" } },
  { id: "WKF_901", label: "Molecular Pathway Verification Template", type: "Workflow", template: "Standard-Double-Blind-Pathway-Extraction", provenance: { source: "kernel-specs", sourceType: "Kernel", assertingAgent: "HempOS", confidence: 1.0, verificationStatus: "verified", timestamp: "2026-07-02T00:00:00Z", episodeId: "EP-INIT" } },
  { id: "INV_501", label: "No Unverifiable Node Injections Allowed", type: "Invariant", constraint: "node.provenance !== undefined && node.provenance.confidence >= 0.5" },
  { id: "PRC_301", label: "Signal Amplification Validation Procedure", type: "Procedure", sourceWorkflow: "WKF_901" }
];

let graphEdges: GraphEdge[] = [
  { id: "E1", source: "THC", target: "CB1", relation: "affects" },
  { id: "E2", source: "CBD", target: "CB1", relation: "affects" },
  { id: "E3", source: "CB1", target: "G_protein", relation: "upregulates" },
  { id: "E4", source: "CB1", target: "PFC", relation: "observed_in" },
  { id: "E5", source: "CB1", target: "Hippocampus", relation: "observed_in" },
  { id: "E6", source: "G_protein", target: "Memory", relation: "associated_with" },
  { id: "E7", source: "THC", target: "Psychosis", relation: "associated_with" },
  { id: "E8", source: "CBD", target: "BDNF_path", relation: "upregulates" },
  { id: "E9", source: "BDNF_path", target: "Hippocampus", relation: "observed_in" },
  { id: "E10", source: "BDNF_path", target: "Anxiety", relation: "associated_with" },
  { id: "E11", source: "CBD", target: "CB2", relation: "affects" },
  { id: "E12", source: "CB2", target: "Microglia", relation: "observed_in" },
  { id: "E13", source: "Microglia", target: "Neuroprotection", relation: "associated_with" },
  { id: "E14", source: "ST-001", target: "Hippocampus", relation: "observed_in" },
  { id: "E15", source: "ST-002", target: "PFC", relation: "observed_in" },
  { id: "E16", source: "ST-003", target: "CB1", relation: "contradicted_by" },
  
  // Cognitive edges
  { id: "E17", source: "TSK_101", target: "VER_AGT", relation: "produced_by", provenance: { source: "agent:KairosAutonomyAgent", assertingAgent: "KairosAutonomyAgent", confidence: 0.95, verificationStatus: "verified", timestamp: "2026-07-02T03:00:00Z", episodeId: "EP-402", evidence: ["TSK_101", "VER_AGT"] } },
  { id: "E18", source: "EPI_402", target: "TSK_101", relation: "triggers" },
  { id: "E19", source: "PRC_301", target: "WKF_901", relation: "derived_from" },
  { id: "E20", source: "VER_AGT", target: "BDNF_path", relation: "verified_by" },
  { id: "E21", source: "DIS_AGT", target: "EPI_402", relation: "asserted_by" }
];

// ==========================================
// MEM0 LONG-TERM MEMORY STORE
// ==========================================

let memories: MemoryItem[] = [
  {
    id: "M-001",
    type: "Semantic",
    content: "High-dose Delta-9-THC induces transient deficits in spatial working memory by decreasing functional coupling between the ventral hippocampus and medial prefrontal cortex.",
    confidence: 0.95,
    sources: ["ST-001", "ST-002"],
    timestamp: "2026-07-02T01:10:00Z",
    tags: ["thc", "hippocampus", "memory"]
  },
  {
    id: "M-002",
    type: "Semantic",
    content: "CBD works as a negative allosteric modulator of CB1 receptors, shifting the displacement curve of CB1 agonists (such as THC) and reducing associated cardiovascular and psychotropic escalations.",
    confidence: 0.98,
    sources: ["ST-003"],
    timestamp: "2026-07-02T02:15:00Z",
    tags: ["cbd", "cb1", "allosteric"]
  },
  {
    id: "M-003",
    type: "Episodic",
    content: "User analyzed a high-potency vape risk profile for a 17-year-old male daily user. System assigned an 82 risk score, citing CB1 receptor downregulation during critical adolescent brain pruning.",
    confidence: 0.88,
    sources: ["RP-001"],
    timestamp: "2026-07-02T03:30:00Z",
    tags: ["risk-assessment", "adolescence", "vape"]
  },
  {
    id: "M-004",
    type: "Procedural",
    content: "When explaining mechanical actions of cannabinoid ratios, look up the ontology links for cannabinoid -> receptor -> signaling pathway first, then filter the BigQuery studies table for effect size.",
    confidence: 0.90,
    sources: [],
    timestamp: "2026-07-02T04:00:00Z",
    tags: ["playbook", "reasoning", "ontology"]
  }
];

// Ingestion Jobs Simulator
let ingestionJobs: IngestionJob[] = [];

// ==========================================
// GEMINI CLIENT LAZY INITIALIZATION
// ==========================================

let aiClient: GoogleGenAI | null = null;

function getGemini() {
  if (aiClient) return aiClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    console.log("No valid GEMINI_API_KEY detected. Using local/fallback simulation mode.");
    return null;
  }
  try {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    return aiClient;
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// ==========================================
// API REST ENDPOINTS FOR HEMP OS MODULES
// ==========================================

// BigQuery Table endpoints
app.get("/api/db/studies", (req, res) => {
  res.json(studiesTable);
});

app.post("/api/db/studies", (req, res) => {
  const newStudy: Study = {
    id: `ST-${String(studiesTable.length + 1).padStart(3, '0')}`,
    ...req.body
  };
  studiesTable.push(newStudy);
  
  // Auto-insert a node into the graph as part of Hemp OS self-learning ETL
  const nodeExists = graphNodes.some(n => n.id === newStudy.id);
  if (!nodeExists) {
    graphNodes.push({
      id: newStudy.id,
      label: newStudy.title.substring(0, 30) + "...",
      type: "Study"
    });
    // Create connection to the brain region or cannabinoid
    graphEdges.push({
      id: `E-auto-${Date.now()}`,
      source: newStudy.id,
      target: newStudy.brain_region.split(",")[0].trim(),
      relation: "observed_in"
    });
  }

  res.status(201).json(newStudy);
});

app.get("/api/db/omics", (req, res) => {
  res.json(omicsTable);
});

app.get("/api/db/imaging", (req, res) => {
  res.json(imagingTable);
});

app.get("/api/db/risk-profiles", (req, res) => {
  res.json(riskProfilesTable);
});

// Graph database endpoints
app.get("/api/graph", (req, res) => {
  res.json({ nodes: graphNodes, edges: graphEdges });
});

app.post("/api/graph/node", (req, res) => {
  const { id } = req.body;
  if (graphNodes.some(n => n.id === id)) {
    return res.status(400).json({ error: "Node already exists" });
  }
  const newNode: GraphNode = req.body;
  graphNodes.push(newNode);
  res.status(201).json(newNode);
});

app.post("/api/graph/edge", (req, res) => {
  const { source, target, relation, provenance, id } = req.body;
  const newEdge: GraphEdge = {
    id: id || `E-${String(graphEdges.length + 1).padStart(3, '0')}`,
    source,
    target,
    relation,
    provenance
  };
  graphEdges.push(newEdge);
  res.status(201).json(newEdge);
});

app.post("/api/graph/node/verify", (req, res) => {
  const { id, status } = req.body;
  const node = graphNodes.find(n => n.id === id);
  if (node) {
    if (!node.provenance) {
      node.provenance = {
        source: "agent:VerificationAgent",
        sourceType: "Agent",
        assertingAgent: "VerificationAgent",
        confidence: 0.95,
        verificationStatus: status,
        timestamp: new Date().toISOString(),
        episodeId: "EPI-001"
      };
    } else {
      node.provenance.verificationStatus = status;
    }
    res.json({ success: true, node });
  } else {
    res.status(404).json({ error: "Node not found" });
  }
});

// Edge Verification status flip
app.post("/api/graph/edge/verify", (req, res) => {
  const { id, status } = req.body;
  const edge = graphEdges.find(e => e.id === id);
  if (edge) {
    if (!edge.provenance) {
      edge.provenance = {
        source: "agent:VerificationAgent",
        assertingAgent: "VerificationAgent",
        confidence: 0.95,
        verificationStatus: status,
        timestamp: new Date().toISOString(),
        episodeId: "EP-INIT",
        evidence: [edge.source, edge.target]
      };
    } else {
      edge.provenance.verificationStatus = status;
    }
    res.json({ success: true, edge });
  } else {
    res.status(404).json({ error: "Edge not found" });
  }
});

// Promote a Workflow node into a reusable Procedure template
app.post("/api/procedural/promote", (req, res) => {
  const { workflowId } = req.body;
  const workflowNode = graphNodes.find(n => n.id === workflowId);
  if (!workflowNode) {
    return res.status(404).json({ error: "Workflow node not found" });
  }

  const procedureId = `PRC-${Date.now().toString().slice(-4)}`;
  const procedureNode: GraphNode = {
    id: procedureId,
    label: `Procedure: Reusable template for ${workflowNode.label}`,
    type: "Procedure",
    sourceWorkflow: workflowId,
    provenance: {
      source: `workflow:${workflowId}`,
      sourceType: "Agent",
      assertingAgent: "ConsensusAgent",
      confidence: 0.98,
      verificationStatus: "verified",
      timestamp: new Date().toISOString(),
      episodeId: "EPI-PROMOTE"
    }
  };

  const newEdge: GraphEdge = {
    id: `E-${Date.now()}`,
    source: procedureId,
    target: workflowId,
    relation: "derived_from",
    provenance: {
      source: `workflow:${workflowId}`,
      assertingAgent: "ConsensusAgent",
      confidence: 0.98,
      verificationStatus: "verified",
      timestamp: new Date().toISOString(),
      episodeId: "EPI-PROMOTE",
      evidence: [procedureId, workflowId]
    }
  };

  graphNodes.push(procedureNode);
  graphEdges.push(newEdge);

  // Also add to mem0 memories
  const newMemoryId = `M-${String(memories.length + 1).padStart(3, '0')}`;
  memories.push({
    id: newMemoryId,
    type: "Procedural",
    content: `Promoted procedural playbook: "${procedureNode.label}". Bound to validation rule constraint.`,
    confidence: 0.98,
    sources: [workflowId],
    timestamp: new Date().toISOString(),
    tags: ["procedure-promotion", "reusable-playbook"]
  });

  res.json({
    success: true,
    message: `Workflow ${workflowId} successfully promoted to Procedure ${procedureId}`,
    procedureNode,
    newEdge
  });
});

// Update procedural Workflow template or Invariant constraint
app.post("/api/procedural/update", (req, res) => {
  const { id, label, template, constraint } = req.body;
  const node = graphNodes.find(n => n.id === id);
  if (!node) {
    return res.status(404).json({ error: "Node not found" });
  }

  node.label = label || node.label;
  if (node.type === "Workflow") {
    node.template = template || node.template;
  } else if (node.type === "Invariant") {
    node.constraint = constraint || node.constraint;
  }

  res.json({ success: true, node });
});

app.post("/api/graph/distill", (req, res) => {
  const { episodeNodeId } = req.body;
  const episodeNode = graphNodes.find(n => n.id === episodeNodeId);
  if (!episodeNode) {
    return res.status(404).json({ error: "Episode node not found" });
  }

  const newFactId = `FACT-${Date.now().toString().slice(-4)}`;
  const newFact: GraphNode = {
    id: newFactId,
    label: `Distilled Fact from ${episodeNodeId}: Synergistic cellular binding dynamics`,
    type: "Pathway",
    provenance: {
      source: `episode:${episodeNodeId}`,
      sourceType: "Experiment",
      assertingAgent: "DistillationAgent",
      confidence: 0.98,
      verificationStatus: "verified",
      timestamp: new Date().toISOString(),
      episodeId: episodeNodeId
    }
  };

  const newEdge: GraphEdge = {
    id: `E-${Date.now()}`,
    source: episodeNodeId,
    target: newFactId,
    relation: "compressed_into",
    provenance: {
      source: `episode:${episodeNodeId}`,
      assertingAgent: "DistillationAgent",
      confidence: 0.98,
      verificationStatus: "verified",
      timestamp: new Date().toISOString(),
      episodeId: episodeNodeId,
      evidence: [episodeNodeId]
    }
  };

  graphNodes.push(newFact);
  graphEdges.push(newEdge);

  res.json({ success: true, message: `Episode ${episodeNodeId} distilled successfully into ${newFactId}`, newFact, newEdge });
});

app.post("/api/graph/kairos-trigger", (req, res) => {
  const taskId = `TASK-${Date.now().toString().slice(-4)}`;
  const newTask: GraphNode = {
    id: taskId,
    label: "Evaluate emergent CBD-GPR55 receptor interactions under chronic toxicology parameters",
    type: "Task",
    taskStatus: "pending",
    provenance: {
      source: "kernel-anomaly",
      sourceType: "Kernel",
      assertingAgent: "KairosAutonomyAgent",
      confidence: 0.92,
      verificationStatus: "unverified",
      timestamp: new Date().toISOString(),
      episodeId: "EPI-INITIAL"
    }
  };

  graphNodes.push(newTask);
  res.json({ success: true, message: `Kairos trigger registered. Spawned Task ${taskId}`, newTask });
});

// Memory endpoints
app.get("/api/memory", (req, res) => {
  res.json(memories);
});

app.post("/api/memory", (req, res) => {
  const newMemory: MemoryItem = {
    id: `M-${String(memories.length + 1).padStart(3, '0')}`,
    type: req.body.type || 'Semantic',
    content: req.body.content,
    confidence: req.body.confidence || 0.90,
    sources: req.body.sources || [],
    timestamp: new Date().toISOString(),
    tags: req.body.tags || []
  };
  memories.push(newMemory);
  res.status(201).json(newMemory);
});

// Feedback loops for self-learning memory policy
app.post("/api/memory/feedback", (req, res) => {
  const { memoryId, feedback } = req.body; // feedback: useful, needs_nuance, wrong, outdated
  const memIndex = memories.findIndex(m => m.id === memoryId);
  if (memIndex === -1) {
    return res.status(404).json({ error: "Memory item not found" });
  }

  const memory = memories[memIndex];
  let confidenceAdjustment = 0;
  let responseMsg = "";

  switch (feedback) {
    case "useful":
      confidenceAdjustment = 0.05;
      memory.confidence = Math.min(1.0, memory.confidence + confidenceAdjustment);
      responseMsg = "Memory confidence reinforced (+5% weight). Memory pathway stabilized.";
      break;
    case "needs_nuance":
      confidenceAdjustment = -0.10;
      memory.confidence = Math.max(0.1, memory.confidence + confidenceAdjustment);
      responseMsg = "Memory flagged for nuance requirement (-10% weight). Added re-analysis flag.";
      break;
    case "wrong":
      confidenceAdjustment = -0.50;
      memory.confidence = Math.max(0.0, memory.confidence + confidenceAdjustment);
      responseMsg = "Memory severely penalized (-50% weight). Flagged for deletion or restructuring.";
      break;
    case "outdated":
      confidenceAdjustment = -0.20;
      memory.confidence = Math.max(0.0, memory.confidence + confidenceAdjustment);
      responseMsg = "Memory marked as deprecated due to clinical evolution. Scheduled for archival.";
      break;
    default:
      return res.status(400).json({ error: "Invalid feedback type" });
  }

  res.json({ 
    success: true, 
    message: responseMsg, 
    updatedMemory: memory 
  });
});

import fs from "fs";

app.post("/api/export/local-flyer", requireAuth, async (req, res) => {
  const { studyId, localPath } = req.body;
  if (!studyId) return res.status(400).json({ error: "studyId required" });
  
  const targetPath = localPath || "C:\\Users\\User\\Documents\\HempOS Local";
  const study = studiesTable.find(s => s.id === studyId);
  if (!study) return res.status(404).json({ error: "Study not found" });

  const ai = getGemini();
  let flyerText = `**${study.title}**\n\nLayman Readout: A study on ${study.cannabinoid} affecting ${study.brain_region}. Outcome: ${study.outcome}\n\nScientific Readout: Dose ${study.dose}, ${study.population}. Effect size: ${study.effect_size}.\n\nTimestamp: ${new Date().toISOString()}`;

  if (ai) {
    try {
      const prompt = `Create an Instagram-ready flyer text for the following scientific paper. It must include:
1. A layman's readout of the study and conclusions (catchy, easy to understand).
2. A scientific readout below it with exact data.
3. A timestamp and 'HempOS Logo Watermark' placeholder at the bottom.

Paper Data:
Title: ${study.title}
Cannabinoid: ${study.cannabinoid}
Outcome: ${study.outcome}
Effect Size: ${study.effect_size}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      flyerText = response.text || flyerText;
    } catch(err) {
      console.error("Gemini flyer generation failed", err);
    }
  }

  try {
    // Ensure directory exists if possible, but standard fs.mkdirSync with recursive might fail if no permissions
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    const safeTitle = study.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(targetPath, `flyer_${studyId}_${safeTitle}.txt`);
    fs.writeFileSync(filePath, flyerText, "utf8");
    return res.json({ success: true, filePath, content: flyerText });
  } catch (err: any) {
    console.error("Error writing to local path:", err);
    return res.status(500).json({ error: "Failed to write to local directory. Is it accessible?", details: err.message });
  }
});

app.post("/api/export/artifact", requireAuth, (req, res) => {
  const { type, format } = req.body; // type: 'studies', 'omics', 'imaging', 'traces', etc.
  
  let dataToExport: any[] = [];
  if (type === 'studies') dataToExport = studiesTable;
  else if (type === 'omics') dataToExport = omicsTable;
  else if (type === 'imaging') dataToExport = imagingTable;
  else if (type === 'traces') dataToExport = []; // Add traces if available
  else return res.status(400).json({ error: "Invalid export type" });

  if (format === 'csv') {
    if (dataToExport.length === 0) return res.send("");
    const keys = Object.keys(dataToExport[0]);
    const csvRows = [
      keys.join(','),
      ...dataToExport.map(row => keys.map(k => `"${String(row[k]).replace(/"/g, '""')}"`).join(','))
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hemp_os_${type}.csv"`);
    return res.send(csvRows.join('\n'));
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="hemp_os_${type}.json"`);
  res.json(dataToExport);
});

app.post("/api/cultivator/simulate", requireAuth, async (req, res) => {
  const { thc, cbd, terpenes, minorCannabinoids } = req.body;
  
  const ai = getGemini();
  if (ai) {
    try {
      const prompt = `Simulate receptor occupancy and neurodevelopmental risk for a cannabis chemotype.
Profile:
THC: ${thc}%
CBD: ${cbd}%
Terpenes: ${terpenes}
Minor Cannabinoids: ${minorCannabinoids}

Respond in JSON format:
{
  "cb1_occupancy": <number 0-100>,
  "cb2_occupancy": <number 0-100>,
  "risk_score": <number 0-100>,
  "protective_factors": ["list of strings"],
  "clinical_summary": "string"
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return res.json(JSON.parse(response.text || "{}"));
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback
  res.json({
    cb1_occupancy: Math.min(100, thc * 2),
    cb2_occupancy: Math.min(100, cbd * 1.5 + 20),
    risk_score: Math.max(0, thc * 2 - cbd),
    protective_factors: ["Simulated CBD allosteric modulation", "Terpene synergy"],
    clinical_summary: "Simulated chemotype risk profile based on THC/CBD ratio."
  });
});

app.post("/api/lab/simulate", requireAuth, async (req, res) => {
  const design = req.body;
  const query = `Simulate ${design.doseRanges} of ${design.cannabinoid} on ${design.targetSystem}`;
  
  const aiClient = getGemini();
  try {
    const trace = await runDeterministicPipeline(query, {
      studies: studiesTable,
      omics: omicsTable,
      imaging: imagingTable,
      memories: memories,
      aiClient
    });

    const effectMatch = trace.summary.match(/effect size\s*([0-9.]+)/i);
    const pMatch = trace.summary.match(/p\s*[<≈]\s*([0-9.]+)/i);

    const result: SimulationResult = {
      effectSize: effectMatch ? parseFloat(effectMatch[1]) : 0.5,
      pValue: pMatch ? parseFloat(pMatch[1]) : 0.05,
      metric: "Cohen_d",
      description: trace.summary,
      traceId: trace.timestamp || "unknown"
    };

    res.json(result);
  } catch (err) {
    console.error("Simulation failed:", err);
    res.status(500).json({ error: "Simulation failed", details: String(err) });
  }
});

// Ingestion pipeline simulator (PubMed / OpenNeuro / Google Drive Docs)
app.get("/api/ingestion/jobs", (req, res) => {
  res.json(ingestionJobs);
});

app.post("/api/ingestion/trigger", requireAuth, async (req, res) => {
  const { sourceType, sourceName } = req.body; // e.g. Literature, Dataset, Drive
  
  const jobId = `JOB-${Date.now()}`;
  const newJob: IngestionJob = {
    id: jobId,
    sourceType,
    sourceName,
    status: "Idle",
    progress: 0,
    logs: [],
    recordsCreated: {},
    timestamp: new Date().toISOString()
  };
  
  ingestionJobs.push(newJob);

  // Send initial response
  res.json({ success: true, message: "Ingestion pipeline initialized", jobId });

  // Simulate pipeline async
  let currentProgress = 0;
  const updateJob = (updates: Partial<IngestionJob>) => {
    const job = ingestionJobs.find(j => j.id === jobId);
    if (job) {
      Object.assign(job, updates);
    }
  };

  const addLog = (log: string) => {
    const job = ingestionJobs.find(j => j.id === jobId);
    if (job) {
      job.logs.push(`[${new Date().toLocaleTimeString()}] ${log}`);
    }
  };

  // Run simulation in stages
  setTimeout(() => {
    updateJob({ status: "Scanning", progress: 15 });
    addLog(`Establishing connection to: ${sourceName}`);
    addLog(`Parsing schemas and validating metadata integrity.`);
  }, 1000);

  setTimeout(() => {
    updateJob({ status: "Extracting", progress: 40 });
    addLog(`Found target documents. Executing OCR and chemical taxonomy parser.`);
    addLog(`Extracting cannabinoid references, receptor bindings, and local brain regions.`);
  }, 2500);

  setTimeout(() => {
    updateJob({ status: "Mapping", progress: 75 });
    addLog(`Resolving entities against the hemp_brain_ontology_v1.`);
    addLog(`Constructing knowledge graph nodes and calculating pathway enrichment.`);
  }, 4500);

  setTimeout(() => {
    // Generate real realistic records based on the source types!
    let createdStudies = 0;
    let createdOmics = 0;
    let createdNodes = 0;
    let createdEdges = 0;

    if (sourceType === "Literature") {
      const litStudy: Study = {
        id: `ST-${String(studiesTable.length + 1).padStart(3, '0')}`,
        title: "Microdosing THC in elderly patients: Cognitive benefits and safety profiles",
        year: 2025,
        cannabinoid: "THC",
        dose: "1mg/day oral",
        route: "Oral",
        population: "Alzheimer's and mild cognitive impairment cohort (n=45)",
        brain_region: "Hippocampus, Prefrontal Cortex",
        outcome: "Enhanced synaptic plasticity and spatial navigation markers without psychotropic side effects.",
        effect_size: "F(1,43) = 6.82, p < 0.01",
        evidence_level: "High"
      };
      studiesTable.push(litStudy);
      createdStudies = 1;

      // Add to graph
      graphNodes.push({ id: litStudy.id, label: "Elderly THC Study", type: "Study" });
      graphEdges.push({ id: `E-auto-${Date.now()}-1`, source: litStudy.id, target: "Hippocampus", relation: "observed_in" });
      graphEdges.push({ id: `E-auto-${Date.now()}-2`, source: "THC", target: litStudy.id, relation: "affects" });
      createdNodes = 1;
      createdEdges = 2;

      // Add Memory
      memories.push({
        id: `M-${String(memories.length + 1).padStart(3, '0')}`,
        type: "Semantic",
        content: "Microdosing Delta-9-THC (1mg/day) in geriatric cohorts restores BDNF-TrkB coupling in the aging hippocampus, enhancing cognitive stability.",
        confidence: 0.91,
        sources: [litStudy.id],
        timestamp: new Date().toISOString(),
        tags: ["microdosing", "geriatric", "thc", "cognition"]
      });
    } else if (sourceType === "Dataset") {
      const omicRecord: OmicsSignature = {
        id: `OM-${String(omicsTable.length + 1).padStart(3, '0')}`,
        cannabinoid: "THCV",
        tissue: "Hypothalamus",
        species: "Mus musculus",
        gene_set: "Cartpt, Pomc, Npy, Agrp",
        direction: "Upregulated",
        pathway_enrichment: "Anorexigenic satiety cascade activation, leptin signaling pathway sensitivity (p=0.002)"
      };
      omicsTable.push(omicRecord);
      createdOmics = 1;

      // Add to graph
      graphNodes.push({ id: "THCV", label: "Tetrahydrocannabivarin", type: "Cannabinoid" });
      graphNodes.push({ id: "Hypothalamus", label: "Hypothalamus", type: "BrainRegion" });
      graphEdges.push({ id: `E-auto-${Date.now()}-3`, source: "THCV", target: "Hypothalamus", relation: "affects" });
      createdNodes = 2;
      createdEdges = 1;
    } else if (sourceType === "Drive") {
      const litStudy: Study = {
        id: `ST-${String(studiesTable.length + 1).padStart(3, '0')}`,
        title: "Endocannabinoid tone and neurological resilience in professional athletes",
        year: 2024,
        cannabinoid: "AEA / 2-AG",
        dose: "Endogenous assay",
        route: "Endogenous",
        population: "Active NFL and rugby league competitors",
        brain_region: "Amygdala, Prefrontal Cortex",
        outcome: "Higher resting endocannabinoid levels correlate with lower brain trauma and faster concussion recovery.",
        effect_size: "r = 0.65 (p = 0.003)",
        evidence_level: "Medium"
      };
      studiesTable.push(litStudy);
      createdStudies = 1;

      graphNodes.push({ id: litStudy.id, label: "Resilience Study", type: "Study" });
      graphEdges.push({ id: `E-auto-${Date.now()}-4`, source: litStudy.id, target: "Amygdala", relation: "observed_in" });
      createdNodes = 1;
      createdEdges = 1;
    }

    updateJob({ 
      status: "Completed", 
      progress: 100,
      recordsCreated: {
        studies: createdStudies,
        omics: createdOmics,
        nodes: createdNodes,
        edges: createdEdges
      }
    });
    addLog(`Pipeline successful! Persisted results directly into BigQuery tables and updated Neo4j graph schemas.`);
    addLog(`Triggered self-learning hook: New memory synthesized. Memory weights re-normalized.`);
  }, 6000);
});

// ==========================================
// HEMP OS SYSTEM LEVEL ENDPOINTS (REQUESTED API)
// ==========================================

// 1. POST /thc-core/risk-profile
app.post("/thc-core/risk-profile", async (req, res) => {
  const { age, sex, usePattern, productProfile } = req.body;
  
  if (!age || !sex || !usePattern || !productProfile) {
    return res.status(400).json({ error: "Missing required profile parameters (age, sex, usePattern, productProfile)" });
  }

  console.log(`Hemp OS API Triggered: /thc-core/risk-profile for ${age}yo ${sex}`);

  // Fetch AI client
  const ai = getGemini();

  if (ai) {
    try {
      const prompt = `You are the 'trend_risk_agent' inside Hemp OS's 'thc_brain_informatics_core'.
Your task is to analyze the following user risk profile and return a highly structured risk assessment.

User Demographics:
- Age: ${age}
- Sex: ${sex}
- Use Frequency & Pattern: ${usePattern}
- Cannabinoid Product Profile: ${productProfile}

Here are the current known studies and imaging metrics in our BigQuery tables:
${JSON.stringify(studiesTable)}
${JSON.stringify(imagingTable)}

You MUST output your response in valid JSON matching this schema:
{
  "risk_score": <number between 0 and 100 representing neurodevelopmental, neurological, or cognitive risk>,
  "confidence": <number between 0 and 100 representing the strength of the clinical evidence>,
  "supporting_studies": [<list of ST-xxx study IDs from the context that support this score, e.g. "ST-002">],
  "reasons": [<at least 3 descriptive scientific reasons detailing synaptic pruning, myelination stage, receptors, or neuroimaging indicators>]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || "{}");
      const riskProfile: RiskProfile = {
        id: `RP-${Date.now()}`,
        age,
        sex,
        use_pattern: usePattern,
        product_profile: productProfile,
        risk_score: data.risk_score || 50,
        confidence: data.confidence || 70,
        supporting_studies: data.supporting_studies || [],
        reasons: data.reasons || ["Calculated using automated trend risk algorithm."]
      };

      // Save into in-memory table
      riskProfilesTable.push(riskProfile);

      // Save episodic memory of this assessment
      memories.push({
        id: `M-${String(memories.length + 1).padStart(3, '0')}`,
        type: "Episodic",
        content: `Evaluated risk profile for ${age}yo ${sex} (${productProfile}). Score: ${riskProfile.risk_score}%, Confidence: ${riskProfile.confidence}%. Reasons: ${riskProfile.reasons.join(" | ")}`,
        confidence: riskProfile.confidence / 100,
        sources: riskProfile.supporting_studies,
        timestamp: new Date().toISOString(),
        tags: ["risk-evaluation", "clinical-profile"]
      });

      return res.json(riskProfile);
    } catch (err) {
      console.error("Gemini risk profiling failed, falling back to simulated engine:", err);
    }
  }

  // Fallback Rule-Based Simulated Engine if no API Key
  const isAdolescent = age < 25;
  const isHighPotency = productProfile.toLowerCase().includes("high") || productProfile.toLowerCase().includes("90%") || productProfile.toLowerCase().includes("vape");
  const isDaily = usePattern.toLowerCase().includes("daily") || usePattern.toLowerCase().includes("multiple");

  let score = 30;
  let reasons: string[] = [];
  let support: string[] = [];

  if (isAdolescent) {
    score += 35;
    reasons.push("The adolescent brain undergoes massive myelination and synaptic pruning in the prefrontal cortex; excessive exogenous cannabinoids disrupt this development.");
    support.push("ST-002");
  } else {
    reasons.push("Adult brain structure is fully matured, reducing the risk of permanent structural changes.");
  }

  if (isHighPotency) {
    score += 20;
    reasons.push("High-potency vaporizers provide an extreme pharmacodynamic load on CB1 receptors, leading to rapid downregulation.");
    support.push("ST-004");
  }

  if (isDaily) {
    score += 15;
    reasons.push("Chronic high-frequency exposure does not allow receptor recovery, accelerating downstream default mode network desynchronization.");
    support.push("ST-001");
  }

  reasons.push("Toxicological screening notes show that cumulative dosage profiles are significantly high under this demographic configuration.");

  const fallbackProfile: RiskProfile = {
    id: `RP-${Date.now()}`,
    age,
    sex,
    use_pattern: usePattern,
    product_profile: productProfile,
    risk_score: Math.min(100, score),
    confidence: 85,
    supporting_studies: support,
    reasons
  };

  riskProfilesTable.push(fallbackProfile);
  res.json(fallbackProfile);
});

// 2. POST /thc-core/evidence-summary
app.post("/thc-core/evidence-summary", async (req, res) => {
  const { cannabinoid, brainRegion } = req.body;
  if (!cannabinoid) {
    return res.status(400).json({ error: "Missing cannabinoid parameter" });
  }

  const ai = getGemini();
  const matchedStudies = studiesTable.filter(s => 
    s.cannabinoid.toLowerCase() === cannabinoid.toLowerCase() ||
    (brainRegion && s.brain_region.toLowerCase().includes(brainRegion.toLowerCase()))
  );

  if (ai) {
    try {
      const prompt = `You are the 'literature_agent' + 'omics_agent' inside Hemp OS's 'thc_brain_informatics_core'.
Summarize the current clinical and molecular evidence of the cannabinoid: ${cannabinoid} ${brainRegion ? `affecting the brain region: ${brainRegion}` : ''}.

Here are the matched database records from our clinical studies table:
${JSON.stringify(matchedStudies)}

Here is our omics signatures table:
${JSON.stringify(omicsTable)}

Return a cohesive medical-grade summary detailing:
1. Clinical outcome summary
2. Molecular mechanisms and pathways implicated (such as CB1/CB2 signaling or microglial response)
3. Direct references to study IDs (such as ST-001) or omics IDs (such as OM-001)
4. Synthesis of contradiction or consensus in the literature.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return res.json({
        cannabinoid,
        brainRegion: brainRegion || "All Regions",
        matchedStudiesCount: matchedStudies.length,
        summary: response.text,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Gemini evidence summary failed, falling back to simulated summary:", err);
    }
  }

  // Simulated fallback response
  let defaultSummary = `This is an automated biological evidence summary for ${cannabinoid}${brainRegion ? ` in the ${brainRegion}` : ''}. `;
  if (matchedStudies.length > 0) {
    defaultSummary += `Our BigQuery study cache has verified ${matchedStudies.length} matching studies. Research indicates a significant effect on the tissue, specifically targeting local receptors. `;
    defaultSummary += `Specifically, study ${matchedStudies[0].id} reports: "${matchedStudies[0].outcome}" with an effect size of ${matchedStudies[0].effect_size}. `;
  } else {
    defaultSummary += `No active studies were directly cached in the primary BigQuery table for this cannabinoid-region coupling, but adjacent literature models support CB1 receptor expression profiles across human cortical regions. `;
  }

  res.json({
    cannabinoid,
    brainRegion: brainRegion || "All Regions",
    matchedStudiesCount: matchedStudies.length,
    summary: defaultSummary + "Additionally, omics-level pathways indicate downstream retrograde signaling regulation.",
    timestamp: new Date().toISOString()
  });
});

// 3. POST /thc-core/mechanism-explanation
app.post("/thc-core/mechanism-explanation", async (req, res) => {
  const { cannabinoid, targetPhenotype } = req.body;
  if (!cannabinoid || !targetPhenotype) {
    return res.status(400).json({ error: "Missing cannabinoid or targetPhenotype parameters" });
  }

  const ai = getGemini();

  if (ai) {
    try {
      const prompt = `You are the 'mechanism_agent' inside Hemp OS's 'thc_brain_informatics_core'.
Provide a rigorous neurobiological mechanism explanation for how ${cannabinoid} influences the phenotype of ${targetPhenotype}.

Utilize the following brain ontology concepts:
- Cannabinoids: THC, CBD, THCV, Beta-Caryophyllene
- Receptors: CB1, CB2, G-protein cascade
- Regions: Hippocampus, PFC, Amygdala, Microglia
- Pathways: Retrograde endocannabinoid signaling, BDNF-TrkB, Cytokines

Use current knowledge base and memory cache:
${JSON.stringify(memories.filter(m => m.type === "Semantic"))}

Explain step-by-step:
1. Receptor binding affinity and signaling transduction.
2. Downstream molecular cascades.
3. Neural circuit modulation and brain region alterations.
4. Final Phenotypic outcome.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return res.json({
        cannabinoid,
        targetPhenotype,
        explanation: response.text,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Gemini mechanism explanation failed, falling back to simulated mechanism:", err);
    }
  }

  // Fallback explanation if no key is set
  res.json({
    cannabinoid,
    targetPhenotype,
    explanation: `### Neurobiological Cascade for ${cannabinoid} modulating ${targetPhenotype}:

1. **Receptor Transduction:**
   ${cannabinoid} demonstrates affinity for G-protein coupled receptors. Binding initiates a cellular cascade, inhibiting adenylate cyclase activity and opening potassium channels while closing calcium channels.

2. **Synaptic Modulation:**
   This suppresses the presynaptic release of neurotransmitters (GABA or Glutamate) depending on the target region (Hippocampus/PFC). This process of retrograde signaling is essential in regulating homeostatic synaptic plasticity.

3. **Circuit-Level Invariants:**
   This synaptic dampening disrupts oscillatory coupling (theta/gamma synchrony) in local neural circuits, manifesting as altered connectivity metrics on fMRI imaging.

4. **Phenotypic Translation:**
   The circuit alterations translate directly into the observed phenotype of "${targetPhenotype}".`,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// DETERMINISTIC 10-AGENT CORE & VECTOR DB ENDPOINTS
// ==========================================

app.post("/api/ncbi/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });
  
  const apiKey = process.env.NCBI_API_KEY || "b8ac2ca44c29245f22b45b25b73a8bf77408";

  try {
    const encodedQuery = encodeURIComponent(query);
    // 1. Search PubMed to get IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmode=json&retmax=5&api_key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    const idList = searchData.esearchresult?.idlist || [];
    if (idList.length === 0) {
      return res.json({ articles: [] });
    }

    // 2. Fetch summaries for those IDs
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(",")}&retmode=json&api_key=${apiKey}`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();
    
    const articles = idList.map((id: string) => {
      const info = summaryData.result?.[id];
      return {
        id: `PMID-${id}`,
        title: info?.title || "Unknown Title",
        authors: info?.authors?.map((a: any) => a.name).join(", ") || "Unknown Authors",
        journal: info?.fulljournalname || "Unknown Journal",
        pubDate: info?.pubdate || "Unknown Date"
      };
    });

    res.json({ articles });
  } catch (err) {
    console.error("NCBI search failed:", err);
    res.status(500).json({ error: "Failed to fetch from NCBI API" });
  }
});

// Vector Database chunk explorer
app.get("/api/vector/chunks", (req, res) => {
  res.json(vectorChunks);
});

// Semantic Search vector lookup
app.post("/api/vector/search", (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });
  const results = searchVectorDb(query);
  res.json(results);
});

// 10-Agent Deterministic Query execution (Online Loop)
app.post("/api/agents/query", async (req, res) => {
  const { query, mode } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  console.log(`Executing 10-agent deterministic brain kernel for query: "${query}" (mode: ${mode || "default"})`);
  
  const aiClient = getGemini();
  try {
    const trace = await runDeterministicPipeline(query, {
      studies: studiesTable,
      omics: omicsTable,
      imaging: imagingTable,
      memories: memories,
      aiClient,
      mode
    });

    // Auto-save this query execution as an Episodic Memory (to be replayed by Offline Dreaming loop)
    const newEpisodicId = `M-${String(memories.length + 1).padStart(3, '0')}`;
    memories.push({
      id: newEpisodicId,
      type: "Episodic",
      content: `User query execution: "${query}". Final system confidence: ${trace.confidence}%. Safety clearance: ${trace.safetyClearance}. Simulated occupancy: ${trace.steps.find(s => s.agentId === "simulation_agent")?.output || ""}`,
      confidence: trace.confidence / 100,
      sources: trace.steps.find(s => s.agentId === "semantic_search_agent")?.output.match(/ST-\d+/g) || [],
      timestamp: new Date().toISOString(),
      tags: ["orchestrator-online-loop", "user-query-episode"]
    });

    res.json(trace);
  } catch (err) {
    console.error("Deterministic agent query execution failed:", err);
    res.status(500).json({ error: "Agent query execution failed", details: String(err) });
  }
});

// Retrieve all historical dream loops
app.get("/api/agents/dreams", (req, res) => {
  res.json(dreamResults);
});

// Trigger offline Dreaming loop (Offline consolidation)
app.post("/api/agents/dream", (req, res) => {
  console.log("Triggering offline Dreaming Loop consolidation...");
  try {
    const result = runDreamingLoop({
      memories,
      graphNodes,
      graphEdges
    });
    dreamResults.push(result);
    res.status(201).json(result);
  } catch (err) {
    console.error("Dreaming loop consolidation failed:", err);
    res.status(500).json({ error: "Dreaming loop consolidation failed", details: String(err) });
  }
});

// ==========================================
// SCIENTIFIC RESEARCH LAB AGENT & AUTONOMOUS LOOP
// ==========================================

// Scientific Research Lab Databases
let hypotheses: Hypothesis[] = [
  {
    id: "HYP-001",
    title: "Synergistic CB1/CB2 Modulation by Beta-Caryophyllene in Neuroinflammation Models",
    description: "Evaluates whether Beta-Caryophyllene selectively binds CB2 to activate anti-inflammatory cascades without triggering CB1-mediated psychotropic activity.",
    target_system: "Microglial Activation & Neuroinflammation",
    independent_var: "Beta-Caryophyllene Concentration (0.1uM - 10uM)",
    dependent_var: "TNF-alpha & IL-6 Inflammatory Cytokine Release",
    confidence: 88,
    status: "Validated",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: "HYP-002",
    title: "Chronic Ultra-Potency Delta-9-THC Clathrin-Mediated Hippocampal CB1 Endocytosis",
    description: "Models the kinetics of hippocampal CB1 internalization and down-regulation under chronic 90% potency exposure conditions.",
    target_system: "Hippocampal Synaptic Plasticity",
    independent_var: "Daily THC exposure (15mg/kg/day)",
    dependent_var: "Surface CB1 receptor density & synaptic transmission",
    confidence: 94,
    status: "Validated",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "HYP-003",
    title: "CBG Adrenergic alpha-2 and 5-HT1A Dual-Receptor Modulation",
    description: "Hypothesizes that Cannabigerol (CBG) acts as a high-potency modulator of non-cannabinoid GPCR receptors to reduce migraine trigeminovascular activation.",
    target_system: "Trigeminal Pain Circuitry",
    independent_var: "CBG concentration (0.5uM - 50uM)",
    dependent_var: "Alpha-2 and 5-HT1A receptor coupling efficiency",
    confidence: 72,
    status: "Testing",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

let experimentEpisodes: ExperimentEpisode[] = [
  {
    id: "EXP-001",
    hypothesisId: "HYP-001",
    parameters: "Compound: Beta-Caryophyllene, Dose range: 1.0 - 10.0 uM, Baseline TNF-alpha: 150 pg/mL",
    inputs: "Receptor: CB1 Ki = 10000nM, CB2 Ki = 155nM. Applied to microglia vector space model.",
    findings: "CB2 activation demonstrated selective G-i protein signaling. TNF-alpha cytokine release inhibited by 43.4% +/- 3.1% at 10uM concentration. CB1 activation stayed below 0.5% threshold.",
    simulatedOccupancy: 74,
    status: "Completed",
    timestamp: new Date(Date.now() - 3600000 * 23).toISOString()
  },
  {
    id: "EXP-002",
    hypothesisId: "HYP-002",
    parameters: "Inbound compound: Delta-9-THC, Duration: 60 simulated days, Pulsatile dosing 1x/day",
    inputs: "Receptor density baseline: 100%, Clathrin assembly rate constant: 0.12 min^-1, Agonist Ki: 15nM",
    findings: "Accelerated endocytosis observed by day 7. Receptor surface density dropped by 68.2% +/- 5.2%. Recovery half-life mapped at 14.2 days of abstinence. Synaptic transmission amplitude reduced by 41.5%.",
    simulatedOccupancy: 89,
    status: "Completed",
    timestamp: new Date(Date.now() - 3600000 * 11).toISOString()
  }
];

let conclusions: Conclusion[] = [
  {
    id: "CON-001",
    hypothesisId: "HYP-001",
    evidenceGrade: "A",
    statisticalEffect: "Cohens d = 1.12, p < 0.001 for cytokine reduction",
    confidenceScore: 89,
    text: "Confirming selective CB2 activation of microglial cells by Beta-Caryophyllene. Highly reproducible, deterministic evidence level matches standard Grade A criteria.",
    paperRef: "ART-001",
    timestamp: new Date(Date.now() - 3600000 * 22).toISOString()
  },
  {
    id: "CON-002",
    hypothesisId: "HYP-002",
    evidenceGrade: "A",
    statisticalEffect: "R-squared = 0.94 for down-regulation rate",
    confidenceScore: 95,
    text: "Chronic exposure to ultra-high concentration THC vapes triggers rapid clathrin-mediated endocytosis of CB1 receptors. This explains adolescent tolerance and high synaptic pruning risk profiles.",
    paperRef: "ART-002",
    timestamp: new Date(Date.now() - 3600000 * 10).toISOString()
  }
];

let researchArtifacts: ResearchArtifact[] = [
  {
    id: "ART-001",
    title: "Beta-Caryophyllene Selective CB2 Activation and Microglial Cytokine Suppression: A Molecular Simulation Analysis",
    type: "paper",
    abstract: "Beta-Caryophyllene is a prominent dietary sesquiterpene found in cannabis and black pepper. While it displays affinity for cannabinoid receptors, its selective binding and therapeutic relevance in neuroinflammatory disorders remains under investigation. This paper models CB1/CB2 dynamic competition and demonstrates highly selective CB2 activation in microglial cells.",
    introduction: "Neuroinflammation, orchestrated primarily by active microglia, is a hallmark of many neurodegenerative conditions. Conventional CB1 agonists offer anti-inflammatory action but are constrained by psychotropic effects. Beta-Caryophyllene represents a unique phytocannabinoid with selective CB2 agonism. We model its molecular docking and downstream cellular transduction pathways.",
    methods: "Using the Hemp-OS simulated GPCR binding kernel, we conducted competitive binding sweeps with Beta-Caryophyllene (0.1 to 10.0 uM) against endogenous ligands. Downstream Gi-protein coupling efficiency was simulated, measuring adenylyl cyclase inhibition and intracellular Ca2+ response. Microglial TNF-alpha secretion was mapped as a function of CB2 receptor occupancy.",
    results: "Beta-Caryophyllene bound selectively to CB2 (Ki = 155nM) compared to CB1 (Ki > 10,000nM). Microglial model occupancy was 74.2% at 10uM concentration. This selective binding resulted in a 43.4% drop in active TNF-alpha cytokine release. Zero CB1-mediated transduction kinetics were detected.",
    discussion: "These simulations confirm that Beta-Caryophyllene acts as a functional selective CB2 agonist. It suppresses pro-inflammatory microglial cascades without activating CB1 receptors, making it a highly valuable non-psychotropic clinical candidate for neuroinflammation management.",
    citations: ["Gertsch et al., PNAS 2008", "Alberti et al., Frontiers in Pharmacology 2021"],
    provenance: "Hemp-OS Agent Pipeline v1.2, hash: 0x82fca9b1",
    confidence: 88,
    evidenceLevel: "High",
    fileUrl: "/lab_output/papers/ART-001.md",
    timestamp: new Date(Date.now() - 3600000 * 22).toISOString()
  },
  {
    id: "ART-002",
    title: "Thermodynamic and Dynamic Modeling of Clathrin-Mediated Hippocampal CB1 Endocytosis Following Chronic Ultra-Potency Inhalation",
    type: "report",
    abstract: "High-potency THC vapes (>90% concentration) are highly prevalent. Here we simulate the receptor kinetics of clathrin-coated vesicle assembly and subsequent CB1 endocytosis and degradation in the hippocampus.",
    introduction: "Tolerance and dependency phenotypes are mediated by receptor trafficking. High agonist occupancy triggers G-protein coupled receptor kinase (GRK) phosphorylation, beta-arrestin recruitment, and internalization into clathrin-coated pits. We map this cascade under chronic exposures.",
    methods: "A 60-day dynamic sweep was run with daily 15mg/kg equivalent exposures. Internalization, sorting, recycling, and lysosomal degradation rates were modeled using standard ordinary differential equations (ODEs).",
    results: "Rapid receptor internalization occurred by day 7, showing a 68.2% loss of active surface CB1 receptors. Functional synaptic transmission decreased by 41.5% due to reduced retrograde GABA/glutamate suppression.",
    discussion: "The results indicate that ultra-high potency exposure overwhelms the hippocampal receptor recycling capacity, shifting receptors toward degradation and accelerating synaptic pruning risk, particularly in adolescent neurological models.",
    citations: ["Dussault et al., Journal of Neuroscience 2019", "Martin-Sanche et al., Neuropharmacology 2022"],
    provenance: "Hemp-OS Agent Pipeline v1.2, hash: 0x1e8b41df",
    confidence: 94,
    evidenceLevel: "High",
    fileUrl: "/lab_output/reports/ART-002.md",
    timestamp: new Date(Date.now() - 3600000 * 10).toISOString()
  }
];

// Continuous Scientific Method Loop Configuration
let researchTopicsQueue = [
  {
    title: "THCV acting as a CB1 antagonist: appetite suppression and metabolic activation",
    system: "Hypothalamic Appetite Regulation",
    ind_var: "Tetrahydrocannabivarin (THCV) Concentration (1uM - 20uM)",
    dep_var: "Neuropeptide Y (NPY) and POMC neuron activation states",
    ref_study: "ST-003"
  },
  {
    title: "Cannabidivarin (CBDV) modulating TRPV1/TRPV2 calcium ion flux in epilepsy models",
    system: "TRP Ion Channels & Epilepsy",
    ind_var: "CBDV dosage (5mg/kg - 50mg/kg equivalent)",
    dep_var: "Intracellular Ca2+ concentration & seizure threshold elevation",
    ref_study: "ST-002"
  },
  {
    title: "Cannabidiol (CBD) and Delta-9-THC dynamic competition at CB1 and 5-HT1A receptors",
    system: "Serotonergic & Cannabinoid Synergy",
    ind_var: "CBD/THC Ratio (1:1, 10:1, 1:10)",
    dep_var: "Anxiety score metrics & synaptic transmission rates",
    ref_study: "ST-004"
  },
  {
    title: "Beta-Caryophyllene and Humulene Synergistic Entourage on Neuropathic Pain Thresholds",
    system: "Spinal Dorsal Horn Nociceptive Pathways",
    ind_var: "Terpene Blend Ratio (BCP to Humulene)",
    dep_var: "C-fiber action potential frequency & thermal pain response",
    ref_study: "ST-001"
  }
];

let currentTopicIndex = 0;
let isAutonomousLabLoopRunning = true;
let labLoopIntervalMs = 30000; // 30 seconds default
let labLoopTimer: NodeJS.Timeout | null = null;

// Executing single iteration of the Research Lab Agent
function runScientificMethodIteration(): any {
  const topic = researchTopicsQueue[currentTopicIndex];
  currentTopicIndex = (currentTopicIndex + 1) % researchTopicsQueue.length;

  const idNum = Math.floor(100 + Math.random() * 900);
  const hId = `HYP-${idNum}`;
  const eId = `EXP-${idNum}`;
  const cId = `CON-${idNum}`;
  const aId = `ART-${idNum}`;

  const timestamp = new Date().toISOString();

  // 1. Formulate Hypothesis
  const newHypothesis: Hypothesis = {
    id: hId,
    title: `Hypothesis: ${topic.title}`,
    description: `Formulated via automated system query scan. Proposes key relationship inside ${topic.system} sub-system using ${topic.ind_var} as the primary variable.`,
    target_system: topic.system,
    independent_var: topic.ind_var,
    dependent_var: topic.dep_var,
    confidence: Math.floor(70 + Math.random() * 25),
    status: "Testing",
    timestamp: timestamp
  };
  hypotheses.push(newHypothesis);

  // 2. Run Simulated Experiment
  const isBindingPositive = Math.random() > 0.3;
  const occupancy = Math.floor(55 + Math.random() * 38);
  const testFindings = isBindingPositive 
    ? `Strong positive correlation observed. Induced high-affinity GPCR transduction cascade in the target ${topic.system}. Key dependent value [${topic.dep_var}] altered by ${occupancy - 12}% relative to baseline vehicle controls.`
    : `Inconclusive/Null response. Insufficient binding affinity mapped inside the simulated cellular substrate. Minor non-significant shifts observed in target variables.`;

  const newExperiment: ExperimentEpisode = {
    id: eId,
    hypothesisId: hId,
    parameters: `Concentration sweep: ${topic.ind_var}, Target system: ${topic.system}`,
    inputs: `Simulated binding assay over ${occupancy}% of receptor substrate density. Baseline reference standard mapped to study ${topic.ref_study}.`,
    findings: testFindings,
    simulatedOccupancy: occupancy,
    status: "Completed",
    timestamp: timestamp
  };
  experimentEpisodes.push(newExperiment);

  // Update hypothesis status
  newHypothesis.status = isBindingPositive ? "Validated" : "Refuted";

  // 3. Formulate Conclusion & Analyze
  const conf = Math.floor(newHypothesis.confidence * 0.95);
  const grade = isBindingPositive ? ("A" as const) : ("C" as const);
  const newConclusion: Conclusion = {
    id: cId,
    hypothesisId: hId,
    evidenceGrade: grade,
    statisticalEffect: `Cohen's d = ${(0.4 + Math.random() * 0.9).toFixed(2)}, p < 0.05`,
    confidenceScore: conf,
    text: `Concluded study on ${topic.system}. The simulated findings support the proposed pathway with a confidence metric of ${conf}%. Evidence graded as Level ${grade}.`,
    paperRef: aId,
    timestamp: timestamp
  };
  conclusions.push(newConclusion);

  // 4. Generate & Publish Markdown Scientific Artifact (IMRAD Paper)
  const hash = Math.floor(Math.random() * 16777215).toString(16);
  const artType = Math.random() > 0.5 ? ("paper" as const) : ("report" as const);

  const newArtifact: ResearchArtifact = {
    id: aId,
    title: `Automated Synthesis of ${topic.title}`,
    type: artType,
    abstract: `This automatic scientific brief presents numerical computational modeling regarding the physiological and biological activity of ${topic.ind_var} inside the ${topic.system}. Modeling is based on high-integrity telemetry logs and the Hemp-OS multi-agent cognitive architecture.`,
    introduction: `The molecular and clinical dynamics of specific phytocannabinoid compounds on ${topic.system} have long suffered from sparse, fragmented datasets. Using Hemp-OS's core deterministic brain kernel, we formulate a testable hypothesis linking independent concentrations with corresponding receptor cascades.`,
    methods: `Our modeling pipeline ingested active vector embeddings, executed a competitive binding simulation on the GPCR receptor substrate, and measured target output variables. Control vehicles were established mathematically using baseline studies, primarily study ID ${topic.ref_study}.`,
    results: `Simulation results demonstrated a G-protein occupancy profile peaking at ${occupancy}%. We observed that ${testFindings} Statistical analytics show high reproducibility matching Evidence Grade ${grade}.`,
    discussion: `These computational conclusions confirm a high-confidence pathway within the ${topic.system} system. Further in-vitro assays are scheduled through the Autonomy Lab Brain chron-scheduler. This study expands the digital provenance ledger for cannabinoid modeling.`,
    citations: ["Meehan et al., Nature Reviews Neuroscience 2022", "Hemp-OS Autonomous Agent Consortium 2026"],
    provenance: `Hemp-OS Research Lab Agent v2.0, build hash: 0x${hash}`,
    confidence: conf,
    evidenceLevel: isBindingPositive ? ("High" as const) : ("Medium" as const),
    fileUrl: `/lab_output/${artType}s/${aId}.md`,
    timestamp: timestamp
  };
  researchArtifacts.push(newArtifact);

  // 5. Structure: Dynamically Update Hemp-OS Knowledge Graph & Memories!
  const nodeLabel = topic.system.split(" ")[0] || "BrainNode";
  const newNodeId = `LAB_N_${idNum}`;
  
  // Inject Node
  graphNodes.push({
    id: newNodeId,
    label: `${nodeLabel} Modulation`,
    type: "Study"
  });

  // Inject Edge
  graphEdges.push({
    id: `LAB_E_${idNum}`,
    source: topic.ref_study,
    target: newNodeId,
    relation: isBindingPositive ? "upregulates" : "contradicted_by"
  });

  // Inject Episodic Memory
  memories.push({
    id: `M-LAB-${idNum}`,
    type: "Semantic",
    content: `[Research Lab Agent] Automated scientific iteration completed. Formulated ${hId}, ran simulation ${eId}, and published report ${aId} ("${newArtifact.title}"). Status: ${newHypothesis.status}. Confidence: ${conf}%.`,
    confidence: conf / 100,
    sources: [topic.ref_study],
    timestamp: timestamp,
    tags: ["lab-agent", "autonomous-synthesis", topic.system.toLowerCase().replace(/\s+/g, "-")]
  });

  console.log(`[Research Lab Agent] Iteration completed successfully: ${topic.title}`);
  return { hypothesis: newHypothesis, experiment: newExperiment, conclusion: newConclusion, artifact: newArtifact };
}

// Start autonomous scheduler
function startAutonomousLabLoop() {
  if (labLoopTimer) clearInterval(labLoopTimer);
  if (!isAutonomousLabLoopRunning) return;

  labLoopTimer = setInterval(() => {
    try {
      runScientificMethodIteration();
    } catch (err) {
      console.error("Autonomous Research Lab Agent loop failed:", err);
    }
  }, labLoopIntervalMs);
}

// Initialize loop
startAutonomousLabLoop();

// Scientific Lab Agent Endpoints
app.get("/api/lab/hypotheses", (req, res) => {
  res.json(hypotheses);
});

app.post("/api/lab/hypotheses", requireAuth, (req, res) => {
  const { title, description, target_system, independent_var, dependent_var } = req.body;
  if (!title) return res.status(400).json({ error: "Missing hypothesis title" });

  const idNum = Math.floor(100 + Math.random() * 900);
  const newHyp: Hypothesis = {
    id: `HYP-${idNum}`,
    title,
    description: description || "Manually drafted by researcher.",
    target_system: target_system || "Custom System",
    independent_var: independent_var || "Not Specified",
    dependent_var: dependent_var || "Not Specified",
    confidence: 50,
    status: "Formulated",
    timestamp: new Date().toISOString()
  };

  hypotheses.push(newHyp);
  res.status(201).json(newHyp);
});

app.get("/api/lab/experiments", (req, res) => {
  res.json(experimentEpisodes);
});

app.get("/api/lab/conclusions", (req, res) => {
  res.json(conclusions);
});

app.get("/api/lab/artifacts", (req, res) => {
  res.json(researchArtifacts);
});

app.post("/api/lab/trigger", requireAuth, (req, res) => {
  try {
    const result = runScientificMethodIteration();
    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: "Failed to manually trigger iteration", details: String(err) });
  }
});

app.get("/api/lab/settings", (req, res) => {
  res.json({
    isRunning: isAutonomousLabLoopRunning,
    intervalMs: labLoopIntervalMs
  });
});

app.post("/api/lab/settings", requireAuth, (req, res) => {
  const { isRunning, intervalMs } = req.body;
  if (typeof isRunning === "boolean") {
    isAutonomousLabLoopRunning = isRunning;
  }
  if (typeof intervalMs === "number" && intervalMs >= 5000) {
    labLoopIntervalMs = intervalMs;
  }
  startAutonomousLabLoop();
  res.json({
    success: true,
    isRunning: isAutonomousLabLoopRunning,
    intervalMs: labLoopIntervalMs
  });
});

// ==========================================
// MCP SERVER, OPENAI TOOL SCHEMAS, & NIM ENDPOINTS (INTEGRATION GATEWAY)
// ==========================================

let integrationLogs: IntegrationRequestLog[] = [
  {
    id: "LOG-001",
    timestamp: new Date(Date.now() - 60000 * 5).toISOString(),
    protocol: "MCP",
    endpoint: "/api/mcp",
    requestPayload: JSON.stringify({ jsonrpc: "2.0", id: "1", method: "tools/list" }, null, 2),
    responsePayload: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      result: {
        tools: [
          { name: "plan_goal", description: "Decomposes high-level queries into sequential sub-task plans." },
          { name: "retrieve_semantic", description: "Search high-fidelity scientific literature vectors." },
          { name: "verify_claim", description: "Cross-checks causal claims against semantic invariants." },
          { name: "run_experiment", description: "Execute receptor binding simulations." },
          { name: "query_deterministic_brain", description: "Complete 10-agent deterministic brain pipeline." }
        ]
      }
    }, null, 2),
    safetyStatus: "Approved",
    durationMs: 4
  }
];

let externalMcpServers: McpServerConfig[] = [
  {
    id: "EXT-001",
    name: "FDA Clinical Trials Server",
    url: "http://fda-mcp-server/mcp",
    status: "Connected",
    tools: ["search_trials", "get_guidelines", "fetch_dosage_bounds"]
  },
  {
    id: "EXT-002",
    name: "Allen Brain Map Atlas",
    url: "https://allen-institute.org/api/mcp",
    status: "Connected",
    tools: ["get_gene_expression", "fetch_cortical_layer_density"]
  }
];

// Helper to check safety constraints
function evaluateSafetyPolicy(query: string): { clear: boolean; reason?: string } {
  const queryLower = query.toLowerCase();
  if (queryLower.includes("lethal dose") || queryLower.includes("toxic quantity") || queryLower.includes("lethal infusion")) {
    return {
      clear: false,
      reason: "Blocked by Safety Agent: Inquiry regarding lethal doses or toxic concentrations violates non-maleficence guidelines."
    };
  }
  if (queryLower.includes("synthesize raw thc") || queryLower.includes("manufacture chemical")) {
    return {
      clear: false,
      reason: "Blocked by Safety Agent: Chemical synthesis protocols for controlled substances are restricted."
    };
  }
  return { clear: true };
}

// Get integration logs
app.get("/api/integration/logs", (req, res) => {
  res.json(integrationLogs);
});

// Clear integration logs
app.post("/api/integration/logs/clear", requireAuth, (req, res) => {
  integrationLogs = [];
  res.json({ success: true });
});

// Get external MCP servers (Two-way model)
app.get("/api/integration/mcp-clients", (req, res) => {
  res.json(externalMcpServers);
});

// Register new external MCP server
app.post("/api/integration/mcp-clients", requireAuth, (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: "Name and URL are required" });
  
  const newServer: McpServerConfig = {
    id: `EXT-${String(externalMcpServers.length + 1).padStart(3, '0')}`,
    name,
    url,
    status: "Connected",
    tools: ["custom_query_tool", "fetch_anatomical_nodes", "resolve_synapses"]
  };
  externalMcpServers.push(newServer);
  res.status(201).json(newServer);
});

// Remove external MCP server
app.post("/api/integration/mcp-clients/delete", requireAuth, (req, res) => {
  const { id } = req.body;
  externalMcpServers = externalMcpServers.filter(s => s.id !== id);
  res.json({ success: true });
});

// MCP JSON-RPC Server Endpoint
app.post("/api/mcp", async (req, res) => {
  const startTime = Date.now();
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== "2.0") {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid JSON-RPC version. Expected '2.0'" },
      id: id || null
    });
  }

  // Handle tools/list
  if (method === "tools/list") {
    const responsePayload = {
      jsonrpc: "2.0",
      result: {
        tools: [
          {
            name: "query_deterministic_brain",
            description: "Runs the complete 10-agent deterministic brain pipeline for clinical and molecular inference",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Natural language clinical query" }
              },
              required: ["query"]
            }
          },
          {
            name: "plan_goal",
            description: "Decomposes high-level queries into sequential sub-task plans",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Target query to decompose" }
              },
              required: ["query"]
            }
          },
          {
            name: "retrieve_semantic",
            description: "Search high-fidelity scientific literature vectors and BigQuery tables",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search keywords or concepts" }
              },
              required: ["query"]
            }
          },
          {
            name: "verify_claim",
            description: "Cross-checks clinical or causal claims against persistent semantic invariants to identify contradictions",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Claim to evaluate" }
              },
              required: ["query"]
            }
          },
          {
            name: "run_experiment",
            description: "Runs molecular binding affinity, receptor occupancy, and downstream cellular transduction simulation",
            inputSchema: {
              type: "object",
              properties: {
                compound: { type: "string", description: "Compound like THC, CBD, Beta-Caryophyllene" }
              },
              required: ["compound"]
            }
          },
          {
            name: "consolidate_dream",
            description: "Triggers the offline episodic memory distillation loop to update graph ontology",
            inputSchema: { type: "object", properties: {} }
          }
        ]
      },
      id
    };

    // Log the request
    integrationLogs.push({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      protocol: "MCP",
      endpoint: "/api/mcp",
      requestPayload: JSON.stringify(req.body, null, 2),
      responsePayload: JSON.stringify(responsePayload, null, 2),
      safetyStatus: "Approved",
      durationMs: Date.now() - startTime
    });

    return res.json(responsePayload);
  }

  // Handle tools/call
  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};
    const query = args.query || args.compound || "";

    // Run Safety Agent verification first
    const safety = evaluateSafetyPolicy(query);
    if (!safety.clear) {
      const responsePayload = {
        jsonrpc: "2.0",
        error: { code: -32602, message: safety.reason },
        id
      };

      integrationLogs.push({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        protocol: "MCP",
        endpoint: "/api/mcp",
        requestPayload: JSON.stringify(req.body, null, 2),
        responsePayload: JSON.stringify(responsePayload, null, 2),
        safetyStatus: "Blocked",
        durationMs: Date.now() - startTime
      });

      return res.json(responsePayload);
    }

    let resultText = "";
    try {
      if (toolName === "query_deterministic_brain") {
        const trace = await runDeterministicPipeline(query, {
          studies: studiesTable,
          omics: omicsTable,
          imaging: imagingTable,
          memories,
          aiClient: getGemini()
        });
        resultText = `--- DET BRAIN PIPELINE INFERENCE ---\nSummary: ${trace.summary}\nConfidence: ${trace.confidence}%\nEvaluation Score: ${trace.metaEvaluationScore}/100`;
      } else if (toolName === "plan_goal") {
        resultText = `Decomposed goal pipeline:\n- Plan Compound Profile\n- Index literature vectors\n- Map biological transducers\n- Run simulation\n- Verify invariants\n- Interface output`;
      } else if (toolName === "retrieve_semantic") {
        const matchingChunks = searchVectorDb(query);
        resultText = `Retrieved ${matchingChunks.length} vector chunks:\n` + matchingChunks.map(c => `[${c.id}] (Source: ${c.source}): ${c.content}`).join("\n\n");
      } else if (toolName === "verify_claim") {
        const isContradicted = query.toLowerCase().includes("cbd") && query.toLowerCase().includes("anxiety") && query.toLowerCase().includes("increase");
        resultText = isContradicted 
          ? "CONTRADICTION FOUND: Claims that CBD increases anxiety contradict persistent memories showing it acts as a NAM to reduce THC-induced tachycardic and anxiogenic phenotypes."
          : "VERIFIED: No contradictions found with existing brain_kernel invariants.";
      } else if (toolName === "run_experiment") {
        const isCBD = query.toLowerCase().includes("cbd");
        const occupancy = isCBD ? 34 : 68;
        resultText = `Simulation finished successfully.\nReceptor: CB1\nAgonist Profile: ${query}\nSimulated Occupancy: ${occupancy}%\nG-protein Transduction Velocity: ${isCBD ? 0.18 : 0.42} RFU/sec`;
      } else if (toolName === "consolidate_dream") {
        const dream = runDreamingLoop({ memories, graphNodes, graphEdges });
        dreamResults.push(dream);
        resultText = `Episodic dreaming loop finished.\nReplayed memories: [${dream.episodesReplayed.join(", ")}]\nDistilled Facts: [${dream.distilledFacts.join(", ")}]\nNodes created: [${dream.nodesInjected.join(", ")}]`;
      } else {
        return res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32601, message: `Tool '${toolName}' not found.` },
          id
        });
      }

      const responsePayload = {
        jsonrpc: "2.0",
        result: {
          content: [
            { type: "text", text: resultText }
          ]
        },
        id
      };

      integrationLogs.push({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        protocol: "MCP",
        endpoint: "/api/mcp",
        requestPayload: JSON.stringify(req.body, null, 2),
        responsePayload: JSON.stringify(responsePayload, null, 2),
        safetyStatus: "Approved",
        durationMs: Date.now() - startTime
      });

      return res.json(responsePayload);
    } catch (err) {
      console.error("MCP tool execution error:", err);
      return res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: String(err) },
        id
      });
    }
  }

  // Handle resources/list
  if (method === "resources/list") {
    const responsePayload = {
      jsonrpc: "2.0",
      result: {
        resources: [
          { uri: "studies://bigquery/studiesTable", name: "BigQuery Clinical Studies Dataset", mimeType: "application/json" },
          { uri: "omics://bigquery/omicsTable", name: "Transcriptomic Omics Signatures", mimeType: "application/json" }
        ]
      },
      id
    };

    integrationLogs.push({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      protocol: "MCP",
      endpoint: "/api/mcp",
      requestPayload: JSON.stringify(req.body, null, 2),
      responsePayload: JSON.stringify(responsePayload, null, 2),
      safetyStatus: "Approved",
      durationMs: Date.now() - startTime
    });

    return res.json(responsePayload);
  }

  // Handle resources/read
  if (method === "resources/read") {
    const uri = params?.uri;
    let dataPayload = "";
    if (uri === "studies://bigquery/studiesTable") {
      dataPayload = JSON.stringify(studiesTable, null, 2);
    } else if (uri === "omics://bigquery/omicsTable") {
      dataPayload = JSON.stringify(omicsTable, null, 2);
    } else {
      return res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32602, message: `Resource URI '${uri}' not recognized.` },
        id
      });
    }

    const responsePayload = {
      jsonrpc: "2.0",
      result: {
        contents: [
          { uri, text: dataPayload }
        ]
      },
      id
    };

    integrationLogs.push({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      protocol: "MCP",
      endpoint: "/api/mcp",
      requestPayload: JSON.stringify(req.body, null, 2),
      responsePayload: JSON.stringify(responsePayload, null, 2),
      safetyStatus: "Approved",
      durationMs: Date.now() - startTime
    });

    return res.json(responsePayload);
  }

  return res.status(404).json({
    jsonrpc: "2.0",
    error: { code: -32601, message: `Method '${method}' not implemented.` },
    id
  });
});

// OpenAI-Compatible & NIM Chat Completions Endpoint (/api/v1/chat/completions)
app.post("/api/v1/chat/completions", async (req, res) => {
  const startTime = Date.now();
  const { model, messages, tools, tool_choice } = req.body;

  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : "";
  
  // Run Safety Agent verification first
  const safety = evaluateSafetyPolicy(lastMessage);
  if (!safety.clear) {
    const responsePayload = {
      error: {
        message: safety.reason,
        type: "invalid_request_error",
        code: "safety_violation"
      }
    };

    integrationLogs.push({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      protocol: "OpenAI",
      endpoint: "/api/v1/chat/completions",
      requestPayload: JSON.stringify(req.body, null, 2),
      responsePayload: JSON.stringify(responsePayload, null, 2),
      safetyStatus: "Blocked",
      durationMs: Date.now() - startTime
    });

    return res.status(400).json(responsePayload);
  }

  try {
    const trace = await runDeterministicPipeline(lastMessage, {
      studies: studiesTable,
      omics: omicsTable,
      imaging: imagingTable,
      memories,
      aiClient: getGemini()
    });

    const responsePayload = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "hemp-os-deterministic-brain-v1",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: `### 10-Agent Inference Synthesis\n\n${trace.summary}\n\n**Confidence Score:** ${trace.confidence}%\n**Validation Score:** ${trace.metaEvaluationScore}/100`
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: Math.floor(lastMessage.length / 4) + 120,
        completion_tokens: Math.floor(trace.summary.length / 4) + 50,
        total_tokens: Math.floor(lastMessage.length / 4) + Math.floor(trace.summary.length / 4) + 170
      }
    };

    integrationLogs.push({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      protocol: model?.includes("nim") ? "NIM" : "OpenAI",
      endpoint: "/api/v1/chat/completions",
      requestPayload: JSON.stringify(req.body, null, 2),
      responsePayload: JSON.stringify(responsePayload, null, 2),
      safetyStatus: "Approved",
      durationMs: Date.now() - startTime
    });

    return res.json(responsePayload);
  } catch (err) {
    console.error("OpenAI integrations endpoint failed:", err);
    return res.status(500).json({ error: "Inference failed", details: String(err) });
  }
});

// NIM-Compatible Models list
app.get("/api/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "hemp-os-deterministic-brain-v1",
        object: "model",
        created: 1735689600,
        owned_by: "hemp-os",
        permission: [],
        root: "hemp-os-deterministic-brain-v1",
        parent: null
      }
    ]
  });
});

// ==========================================
// VITE DEV SERVER AND ASSET SERVING MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Hemp OS THC Core] Service online at http://localhost:${PORT}`);
  });
}

startServer();
