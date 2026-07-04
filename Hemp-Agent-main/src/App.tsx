import React, { useState, useEffect } from "react";
import { 
  Network, 
  Database, 
  Brain, 
  Activity, 
  Cpu, 
  Search, 
  Send, 
  CheckCircle, 
  Loader2, 
  AlertTriangle, 
  Plus, 
  BookOpen, 
  Dna, 
  Eye, 
  UserCheck, 
  Compass, 
  History, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Award,
  Clock,
  Cable,
  FlaskConical,
  Terminal,
  Server,
  Check,
  Trash,
  Download,
  Layers,
  Globe,
  Lock,
  ShieldAlert,
  GitMerge,
  ArrowUpRight,
  Edit,
  Microscope
} from "lucide-react";
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
  VectorChunk,
  DeterministicExecutionTrace,
  DreamResult,
  McpServerConfig,
  IntegrationRequestLog
} from "./types";
import GraphVisualizer from "./components/GraphVisualizer";
import ResearchLab from "./components/ResearchLab";
import { OrchestratorPanel } from "./components/OrchestratorPanel";
import { OmicsPanel } from "./components/OmicsPanel";
import { CultivatorPanel } from "./components/CultivatorPanel";
import { StudyDesignAssistant } from "./components/StudyDesignAssistant";

export default function App() {
  const [activeTab, setActiveTab] = useState<"orchestrator" | "dreaming" | "vector" | "graph" | "bigquery" | "ingestion" | "mem0" | "mcp" | "lab" | "procedural" | "omics" | "cultivator" | "study_design">("orchestrator");
  
  // Database States
  const [studies, setStudies] = useState<Study[]>([]);
  const [omics, setOmics] = useState<OmicsSignature[]>([]);
  const [imaging, setImaging] = useState<ImagingMetric[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>([]);
  
  // Deterministic Brain & Dreaming States
  const [vectorChunks, setVectorChunks] = useState<VectorChunk[]>([]);
  const [dreams, setDreams] = useState<DreamResult[]>([]);
  const [isDreaming, setIsDreaming] = useState(false);
  const [activeDreamResult, setActiveDreamResult] = useState<DreamResult | null>(null);
  const [dreamLogs, setDreamLogs] = useState<string[]>([]);
  const [vectorSearchQuery, setVectorSearchQuery] = useState("");
  const [vectorSearchResults, setVectorSearchResults] = useState<VectorChunk[]>([]);
  const [isSearchingVector, setIsSearchingVector] = useState(false);

  // UI / Interaction States
  const [orchestratorQuery, setOrchestratorQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState<DeterministicExecutionTrace | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Custom Study Form State
  const [studyTitle, setStudyTitle] = useState("");
  const [studyYear, setStudyYear] = useState(2026);
  const [studyCannabinoid, setStudyCannabinoid] = useState("THC");
  const [studyDose, setStudyDose] = useState("15mg inhaled");
  const [studyRoute, setStudyRoute] = useState("Inhalation");
  const [studyPopulation, setStudyPopulation] = useState("Healthy volunteers");
  const [studyRegion, setStudyRegion] = useState("Prefrontal Cortex");
  const [studyOutcome, setStudyOutcome] = useState("");
  const [studyEffectSize, setStudyEffectSize] = useState("Cohen's d = 0.42");
  const [studyEvidence, setStudyEvidence] = useState<Study["evidence_level"]>("Medium");
  const [isSubmittingStudy, setIsSubmittingStudy] = useState(false);

  // Custom Risk Profile Calculator State
  const [riskAge, setRiskAge] = useState<number>(20);
  const [riskSex, setRiskSex] = useState<"Male" | "Female" | "Other">("Male");
  const [riskUsePattern, setRiskUsePattern] = useState("Daily chronic intake (4+ times/day)");
  const [riskProductProfile, setRiskProductProfile] = useState("90% Delta-9-THC Distillate Vape");
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);
  const [calculatedRisk, setCalculatedRisk] = useState<RiskProfile | null>(null);
  
  // Missing states from audit
  const [designTarget, setDesignTarget] = useState("");
  const [designCannabinoid, setDesignCannabinoid] = useState("");

  // Procedural Memory / Playbooks States
  const [editingProceduralId, setEditingProceduralId] = useState<string | null>(null);
  const [editingProceduralLabel, setEditingProceduralLabel] = useState("");
  const [editingProceduralTemplate, setEditingProceduralTemplate] = useState("");
  const [editingProceduralConstraint, setEditingProceduralConstraint] = useState("");
  const [newProceduralType, setNewProceduralType] = useState<"Workflow" | "Procedure" | "Invariant">("Workflow");
  const [newProceduralId, setNewProceduralId] = useState("");
  const [newProceduralLabel, setNewProceduralLabel] = useState("");
  const [newProceduralTemplate, setNewProceduralTemplate] = useState("");
  const [newProceduralConstraint, setNewProceduralConstraint] = useState("");
  const [newProceduralSource, setNewProceduralSource] = useState("");
  const [promotionNotification, setPromotionNotification] = useState<{ id: string; msg: string } | null>(null);

  // Integration Gateway / MCP States
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationRequestLog[]>([]);
  const [externalServers, setExternalServers] = useState<McpServerConfig[]>([]);
  const [simulatorProtocol, setSimulatorProtocol] = useState<"MCP" | "OpenAI" | "NIM">("MCP");
  const [simulatorInput, setSimulatorInput] = useState("Synthesize CB1 downregulation and synaptic pruning risks in daily adolescent users vaping high-potency THC.");
  const [simulatorResponse, setSimulatorResponse] = useState("");
  const [simulatorRequestRaw, setSimulatorRequestRaw] = useState("");
  const [simulatorResponseRaw, setSimulatorResponseRaw] = useState("");
  const [simulatorSafetyStatus, setSimulatorSafetyStatus] = useState<"Approved" | "Blocked" | null>(null);
  const [simulatorSafetyReason, setSimulatorSafetyReason] = useState("");
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [isRegisteringServer, setIsRegisteringServer] = useState(false);

  // Ingestion trigger state
  const [ingestSourceType, setIngestSourceType] = useState<"Literature" | "Dataset" | "Drive">("Literature");
  const [ingestSourceName, setIngestSourceName] = useState("PubMed: Cannabinoid Synaptic Plasticity");
  const [isTriggeringIngest, setIsTriggeringIngest] = useState(false);

  // Live performance stats
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [systemUptime, setSystemUptime] = useState("142:09:12");
  const [latency, setLatency] = useState(14);
  const [memPercent, setMemPercent] = useState(42);

  // Pre-loaded high-fidelity queries
  const presetQueries = [
    { label: "Adolescent THC Vape Risk", query: "Synthesize CB1 downregulation and synaptic pruning risks in daily adolescent users vaping high-potency THC." },
    { label: "CBD Mitigation Mechanism", query: "Explain how CBD behaves as a negative allosteric modulator of CB1 and alleviates THC anxiety phenotypes." },
    { label: "DMN Connectivity shifts", query: "Review microglial activation pathways and fMRI resting-state connectivity shifts under Beta-Caryophyllene." }
  ];

  // Fetch all initial data
  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const resStudies = await fetch("/api/db/studies");
      const dataStudies = await resStudies.json();
      setStudies(dataStudies);

      const resOmics = await fetch("/api/db/omics");
      const dataOmics = await resOmics.json();
      setOmics(dataOmics);

      const resImaging = await fetch("/api/db/imaging");
      const dataImaging = await resImaging.json();
      setImaging(dataImaging);

      const resRisk = await fetch("/api/db/risk-profiles");
      const dataRisk = await resRisk.json();
      setRiskProfiles(dataRisk);

      const resMemory = await fetch("/api/memory");
      const dataMemory = await resMemory.json();
      setMemories(dataMemory);

      const resGraph = await fetch("/api/graph");
      const dataGraph = await resGraph.json();
      setGraphNodes(dataGraph.nodes);
      setGraphEdges(dataGraph.edges);

      const resJobs = await fetch("/api/ingestion/jobs");
      const dataJobs = await resJobs.json();
      setIngestionJobs(dataJobs);

      // Fetch vector chunks and historical dreams
      const resVector = await fetch("/api/vector/chunks");
      const dataVector = await resVector.json();
      setVectorChunks(dataVector);

      const resDreams = await fetch("/api/agents/dreams");
      const dataDreams = await resDreams.json();
      setDreams(dataDreams);

      // Fetch integration logs and external clients
      const resLogs = await fetch("/api/integration/logs");
      const dataLogs = await resLogs.json();
      setIntegrationLogs(dataLogs);

      const resClients = await fetch("/api/integration/mcp-clients");
      const dataClients = await resClients.json();
      setExternalServers(dataClients);
    } catch (err) {
      console.error("Failed to load databases:", err);
      setFetchError("Failed to load initial data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Simulate live telemetry
    const interval = setInterval(() => {
      setLatency(Math.floor(10 + Math.random() * 8));
      // Tick uptime
      setSystemUptime(prev => {
        let [h, m, s] = prev.split(':').map(Number);
        s++;
        if (s >= 60) { s = 0; m++; }
        if (m >= 60) { m = 0; h++; }
        return `${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleSaveChemotype = async (profile: ChemotypeProfile) => {
    const nodeId = `CHEM-${Date.now()}`;
    const confidenceNorm =
      profile.simulation?.confidence != null
        ? Math.max(0, Math.min(1, profile.simulation.confidence / 100))
        : 0.7;
    const label =
      profile.name ??
      `Chemotype: THC ${profile.thc}% CBD ${profile.cbd}%${
        profile.cbg != null ? ` CBG ${profile.cbg}%` : ""
      }`;
    const payload = {
      id: nodeId,
      label,
      type: "Chemotype",
      thcPercent: profile.thc,
      cbdPercent: profile.cbd,
      cbgPercent: profile.cbg,
      chemotypeClass: profile.type,
      provenance: {
        source: "cultivator",
        sourceType: "Simulation",
        assertingAgent: "CultivatorPanel",
        confidence: confidenceNorm,
        verificationStatus: "verified",
        timestamp: new Date().toISOString(),
        episodeId: "CULTIVATOR",
        notes: profile.simulation?.notes,
        riskScore: profile.simulation?.riskScore,
      },
    };
    
    try {
      const res = await fetch("/api/graph/node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Node creation failed");
      addTelemetryLog(`NEO4J: Injected chemotype ontology node: \"${nodeId}\"`);
    } catch (err: any) {
      addTelemetryLog(`ERR: Failed to save chemotype node: ${err.message}`);
      return;
    }

    if (profile.simulation?.riskScore && profile.simulation.riskScore > 50) {
      try {
        const res = await fetch("/api/graph/edge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: nodeId,
            target: "Psychosis",
            relation: "associated_with",
            provenance: {
              source: "cultivator",
              assertingAgent: "CultivatorPanel",
              confidence: confidenceNorm,
              verificationStatus: "unverified",
              timestamp: new Date().toISOString(),
              episodeId: "CULTIVATOR",
            },
          }),
        });
        if (!res.ok) throw new Error("Edge creation failed");
        addTelemetryLog(`NEO4J: Synapsed connection: ${nodeId} -[associated_with]-> Psychosis`);
      } catch (err: any) {
        addTelemetryLog(`ERR: Failed to save chemotype edge: ${err.message}`);
      }
    }
  };

  const handleQueryOrchestrator = async (
    query: string,
    mode: "clinical" | "mechanistic" | "hypothesis" | "cultivator" | "notebook" = "mechanistic"
  ): Promise<DeterministicExecutionTrace> => {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error("Query text is required for orchestrator.");
    }
    setIsQuerying(true);
    setOrchestratorQuery(trimmed);
    setActiveTab("orchestrator");
    try {
      const res = await fetch("/api/agents/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, mode }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Deterministic kernel query failed (${res.status}): ${
            text || "Unknown error"
          }`
        );
      }
      const trace: DeterministicExecutionTrace = await res.json();
      setOrchestrationResult(trace);
      return trace;
    } finally {
      setIsQuerying(false);
    }
  };


  const handleOrchestratorSubmit = async (queryText: string) => {
    try {
      const trace = await handleQueryOrchestrator(queryText, "clinical");
      addTelemetryLog(`10-Agent Pipeline: Completed synthesis. Confidence: ${trace.confidence}%. Evaluated score: ${trace.metaEvaluationScore}/10.`);
      fetchData();
    } catch (err: any) {
      addTelemetryLog(`ERR: Orchestrator submission failed: ${err.message}`);
      console.error("Orchestrator submission error:", err);
    }
  };

  // Submit Feedback on Memory to update confidence weights
  const handleMemoryFeedback = async (memoryId: string, feedback: "useful" | "needs_nuance" | "wrong" | "outdated") => {
    try {
      addTelemetryLog(`Submitting feedback "${feedback}" for Memory node: ${memoryId}`);
      const response = await fetch("/api/memory/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId, feedback })
      });
      const data = await response.json();
      addTelemetryLog(data.message);
      
      // Refresh memory state
      const resMemory = await fetch("/api/memory");
      const dataMemory = await resMemory.json();
      setMemories(dataMemory);
    } catch (err) {
      console.error("Feedback submit failed:", err);
    }
  };

  // Submit custom study to BigQuery Study table
  const handleAddStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTitle || !studyOutcome) return;
    setIsSubmittingStudy(true);

    const studyData = {
      title: studyTitle,
      year: studyYear,
      cannabinoid: studyCannabinoid,
      dose: studyDose,
      route: studyRoute,
      population: studyPopulation,
      brain_region: studyRegion,
      outcome: studyOutcome,
      effect_size: studyEffectSize,
      evidence_level: studyEvidence
    };

    try {
      const response = await fetch("/api/db/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studyData)
      });
      const newStudy = await response.json();
      addTelemetryLog(`STUDIES_DB: Inserted study ${newStudy.id} in BigQuery schema.`);
      
      // Reset form
      setStudyTitle("");
      setStudyOutcome("");
      
      // Refresh state
      fetchData();
    } catch (err) {
      console.error("Failed to add study:", err);
    } finally {
      setIsSubmittingStudy(false);
    }
  };

  // Trigger Ingestion Pipeline simulation
  const handleTriggerIngest = async () => {
    setIsTriggeringIngest(true);
    addTelemetryLog(`ETL_PIPELINE: Triggered connector stream for [${ingestSourceType}]`);
    
    try {
      const response = await fetch("/api/ingestion/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: ingestSourceType, sourceName: ingestSourceName })
      });
      const data = await response.json();
      addTelemetryLog(data.message);
      
      // Poll jobs list every 1.5 seconds for progress updates
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const resJobs = await fetch("/api/ingestion/jobs");
        const jobs = await resJobs.json();
        setIngestionJobs(jobs);

        const currentJob = jobs.find((j: IngestionJob) => j.id === data.jobId);
        if (currentJob) {
          if (currentJob.status === "Completed" || currentJob.status === "Failed" || attempts > 6) {
            clearInterval(pollInterval);
            setIsTriggeringIngest(false);
            addTelemetryLog(`ETL_PIPELINE: Job [${data.jobId}] completed. Refreshing schema tables.`);
            fetchData(); // reload tables
          }
        }
      }, 1500);

    } catch (err) {
      console.error("Ingestion failed:", err);
      setIsTriggeringIngest(false);
    }
  };

  // Submit custom risk profile calculation
  const handleCalculateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculatingRisk(true);
    addTelemetryLog(`RISK_ENGINE: Compiling toxicology profile for user age ${riskAge}...`);

    try {
      const response = await fetch("/thc-core/risk-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: riskAge,
          sex: riskSex,
          usePattern: riskUsePattern,
          productProfile: riskProductProfile
        })
      });
      const data = await response.json();
      setCalculatedRisk(data);
      addTelemetryLog(`RISK_ENGINE: Profile RP-${data.id} computed successfully. Risk Index: ${data.risk_score}%.`);
      fetchData(); // refresh database
    } catch (err) {
      console.error("Failed to compute risk:", err);
    } finally {
      setIsCalculatingRisk(false);
    }
  };

  // Manual Node & Edge Injection callbacks from Graph Visualizer
  const handleAddGraphNode = async (node: GraphNode) => {
    try {
      const res = await fetch("/api/graph/node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node)
      });
      if (res.ok) {
        addTelemetryLog(`NEO4J: Injected ontology node: "${node.id}" (${node.type})`);
        fetchData();
      } else {
        addTelemetryLog(`ERR: Node ID "${node.id}" already registered in Neo4j index.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGraphEdge = async (edge: GraphEdge) => {
    try {
      const res = await fetch("/api/graph/edge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edge)
      });
      if (res.ok) {
        addTelemetryLog(`NEO4J: Synapsed connection: ${edge.source} -[${edge.relation}]-> ${edge.target}`);
        fetchData();
      }
    } catch (err) {
      console.error(edge);
    }
  };

  const handleVerifyNode = async (nodeId: string, status: "verified" | "unverified" | "contradicted") => {
    try {
      const res = await fetch("/api/graph/node/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nodeId, status })
      });
      if (res.ok) {
        addTelemetryLog(`VERIFICATION_AGENT: Flipped node "${nodeId}" status to [${status.toUpperCase()}]`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyEdge = async (edgeId: string, status: "verified" | "unverified" | "contradicted") => {
    try {
      const res = await fetch("/api/graph/edge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: edgeId, status })
      });
      if (res.ok) {
        addTelemetryLog(`VERIFICATION_AGENT: Flipped edge "${edgeId}" status to [${status.toUpperCase()}]`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch("/api/procedural/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addTelemetryLog(`CONSENSUS_AGENT: Successfully promoted workflow "${workflowId}" to reusable Procedure "${data.procedureNode.id}"`);
        setPromotionNotification({ id: data.procedureNode.id, msg: data.message });
        fetchData();
        // Clear after 8 seconds
        setTimeout(() => setPromotionNotification(null), 8000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProcedural = async (id: string, label: string, template?: string, constraint?: string) => {
    try {
      const res = await fetch("/api/procedural/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label, template, constraint })
      });
      if (res.ok) {
        addTelemetryLog(`PROCEDURAL_ENGINE: Updated properties for node "${id}"`);
        setEditingProceduralId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProcedural = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProceduralId.trim() || !newProceduralLabel.trim()) return;

    const node: GraphNode = {
      id: newProceduralId,
      label: newProceduralLabel,
      type: newProceduralType as any,
      provenance: {
        source: newProceduralSource || "agent:Orchestrator",
        sourceType: "Agent",
        assertingAgent: "Orchestrator",
        confidence: 0.95,
        verificationStatus: "unverified",
        timestamp: new Date().toISOString(),
        episodeId: "EP-INIT"
      }
    };

    if (newProceduralType === "Workflow") {
      node.template = newProceduralTemplate || "Default workflow pipeline sequence";
    } else if (newProceduralType === "Invariant") {
      node.constraint = newProceduralConstraint || "Default invariant validation bound";
    }

    try {
      const res = await fetch("/api/graph/node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node)
      });
      if (res.ok) {
        addTelemetryLog(`PROCEDURAL_ENGINE: Formulated and registered new procedural node "${newProceduralId}" (${newProceduralType})`);
        setNewProceduralId("");
        setNewProceduralLabel("");
        setNewProceduralTemplate("");
        setNewProceduralConstraint("");
        setNewProceduralSource("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDistillEpisode = async (episodeNodeId: string) => {
    try {
      const res = await fetch("/api/graph/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeNodeId })
      });
      if (res.ok) {
        const data = await res.json();
        addTelemetryLog(`DISTILLATION_AGENT: Distilled episode "${episodeNodeId}". Compressed into semantic fact "${data.newFact?.id}"`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDesign = (target: string, cannabinoid: string) => {
    setDesignTarget(target);
    setDesignCannabinoid(cannabinoid);
    setActiveTab("study_design");
  };

  const handleKairosTrigger = async () => {
    try {
      const res = await fetch("/api/graph/kairos-trigger", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        addTelemetryLog(`KAIROS_AUTONOMY_AGENT: Detected pattern anomaly. Dispatched Task node "${data.newTask?.id}" for active evaluation.`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportArtifact = (type: string, format: string) => console.log(`Exporting ${type} as ${format}`);
  const exportFlyer = (id: string) => console.log(`Exporting flyer for ${id}`);

  const handleTriggerDreaming = async () => {
    setIsDreaming(true);
    setDreamLogs([]);
    addTelemetryLog("DREAMING_CORE: Initializing episodic memory distillation loop...");
    try {
      const response = await fetch("/api/agents/dream", { method: "POST" });
      const data = await response.json();
      
      // Animate the dream execution steps to screen
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < data.logs.length) {
          setDreamLogs(prev => [...prev, data.logs[idx]]);
          idx++;
        } else {
          clearInterval(interval);
          setActiveDreamResult(data);
          setIsDreaming(false);
          addTelemetryLog(`DREAMING_CORE: Distilled ${data.distilledFacts.length} stable facts and resolved ${data.edgesCreated.length} connections.`);
          fetchData(); // reload
        }
      }, 350);
    } catch (err) {
      console.error(err);
      setIsDreaming(false);
      addTelemetryLog("ERR: Offline dreaming consolidation failed.");
    }
  };

  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vectorSearchQuery.trim()) return;
    setIsSearchingVector(true);
    addTelemetryLog(`VECTOR_INDEX: Interrogating database with query "${vectorSearchQuery}"`);
    try {
      const response = await fetch("/api/vector/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vectorSearchQuery })
      });
      const data = await response.json();
      setVectorSearchResults(data);
      addTelemetryLog(`VECTOR_INDEX: Query matched ${data.length} semantic chunks with cos-similarity score boundaries.`);
    } catch (err) {
      console.error(err);
      addTelemetryLog("ERR: Semantic search in vector database failed.");
    } finally {
      setIsSearchingVector(false);
    }
  };

  // Integration & MCP Handlers
  const handleClearIntegrationLogs = async () => {
    try {
      await fetch("/api/integration/logs/clear", { method: "POST" });
      setIntegrationLogs([]);
      addTelemetryLog("INTEGRATION_GATEWAY: Cleared inbound request trace logs.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterMcpClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerUrl.trim()) return;
    setIsRegisteringServer(true);
    addTelemetryLog(`INTEGRATION_GATEWAY: Registering external MCP server: ${newServerName}`);
    try {
      const response = await fetch("/api/integration/mcp-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newServerName, url: newServerUrl })
      });
      if (response.ok) {
        const data = await response.json();
        setExternalServers(prev => [...prev, data]);
        setNewServerName("");
        setNewServerUrl("");
        addTelemetryLog(`INTEGRATION_GATEWAY: External MCP server registered and synapsed: ${data.name}`);
      }
    } catch (err) {
      console.error(err);
      addTelemetryLog("ERR: Failed to connect to external MCP server.");
    } finally {
      setIsRegisteringServer(false);
    }
  };

  const handleDeleteMcpClient = async (id: string) => {
    try {
      await fetch("/api/integration/mcp-clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      setExternalServers(prev => prev.filter(s => s.id !== id));
      addTelemetryLog(`INTEGRATION_GATEWAY: Severed external MCP socket for ${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateRequest = async () => {
    if (!simulatorInput.trim()) return;
    setIsSimulatorRunning(true);
    setSimulatorResponse("");
    setSimulatorRequestRaw("");
    setSimulatorResponseRaw("");
    setSimulatorSafetyStatus(null);
    setSimulatorSafetyReason("");

    addTelemetryLog(`INTEGRATION_GATEWAY: Simulating inbound ${simulatorProtocol} request...`);

    let endpoint = "";
    let body: any = {};

    if (simulatorProtocol === "MCP") {
      endpoint = "/api/mcp";
      body = {
        jsonrpc: "2.0",
        id: `mcp-sim-${Date.now()}`,
        method: "tools/call",
        params: {
          name: "query_deterministic_brain",
          arguments: { query: simulatorInput }
        }
      };
    } else if (simulatorProtocol === "OpenAI") {
      endpoint = "/api/v1/chat/completions";
      body = {
        model: "hemp-os-deterministic-brain-v1",
        messages: [
          { role: "user", content: simulatorInput }
        ]
      };
    } else if (simulatorProtocol === "NIM") {
      endpoint = "/api/v1/chat/completions";
      body = {
        model: "hemp-os-deterministic-brain-v1-nim",
        messages: [
          { role: "user", content: simulatorInput }
        ]
      };
    }

    setSimulatorRequestRaw(JSON.stringify(body, null, 2));

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const rawText = await response.text();
      setSimulatorResponseRaw(rawText);

      let parsed: any = {};
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        parsed = { raw: rawText };
      }

      if (response.ok) {
        setSimulatorSafetyStatus("Approved");
        if (simulatorProtocol === "MCP") {
          setSimulatorResponse(parsed.result?.content?.[0]?.text || JSON.stringify(parsed));
        } else {
          setSimulatorResponse(parsed.choices?.[0]?.message?.content || JSON.stringify(parsed));
        }
        addTelemetryLog(`INTEGRATION_GATEWAY: Inbound ${simulatorProtocol} approved & synthesized.`);
      } else {
        setSimulatorSafetyStatus("Blocked");
        const reason = parsed.error?.message || parsed.error || "Blocked by Safety Agent.";
        setSimulatorSafetyReason(reason);
        setSimulatorResponse(`[BLOCKED BY SAFETY AGENT]\n${reason}`);
        addTelemetryLog(`INTEGRATION_GATEWAY: Inbound ${simulatorProtocol} blocked.`);
      }

      // Refresh log list
      const resLogs = await fetch("/api/integration/logs");
      const dataLogs = await resLogs.json();
      setIntegrationLogs(dataLogs);

    } catch (err) {
      console.error(err);
      setSimulatorResponse(`Execution failed: ${String(err)}`);
      addTelemetryLog("ERR: Integration simulation request failed.");
    } finally {
      setIsSimulatorRunning(false);
    }
  };

  // Telemetry logs
  const addTelemetryLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLiveLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Auto trigger a core inference
  const handleManualInference = async () => {
    const queries = [
      "Detail the endocannabinoid tone alterations under chronic THC exposure in hippocampal subfields.",
      "Summarize omics pathway enrichment indexes associated with Beta-Caryophyllene microglial shielding.",
      "How does clinical high-potency cannabis use correlate with default mode network functional disconnectivity?"
    ];
    const randQuery = queries[Math.floor(Math.random() * queries.length)];
    setActiveTab("orchestrator");
    setOrchestratorQuery(randQuery);
    
    try {
      await handleOrchestratorSubmit(randQuery);
    } catch (err: any) {
      addTelemetryLog(`ERR: Manual inference failed: ${err.message}`);
      console.error("Manual inference error:", err);
    }
  };

  // Quick preset trigger
  const triggerPreset = (q: string) => {
    setOrchestratorQuery(q);
    handleOrchestratorSubmit(q);
  };

  // Dynamic calculation for memory performance usage
  const totalMemoryUsage = (memories.length * 154) + (graphNodes.length * 256) + (studies.length * 512);

  return (
    <div className="w-full max-w-[1280px] mx-auto min-h-screen bg-[#050805] text-[#e0e7e0] font-sans selection:bg-[#00ff66]/30 overflow-x-hidden flex flex-col border-x border-[#1a2e1a]">
      {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 text-white font-mono">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-[#00ff66]" />
              INITIALIZING CORE DATABASES...
          </div>
      )}
      {fetchError && (
            <div className="fixed top-16 right-6 bg-red-950/90 border border-red-500/50 p-4 rounded text-red-200 z-50 flex items-center gap-2 font-mono">
              <AlertTriangle className="w-5 h-5"/>
              {fetchError}
            </div>
      )}
      {/* OS Top Navigation Bar */}
      <header className="h-12 border-b border-[#1a2e1a] bg-[#080d08]/85 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-[#00ff66] shadow-[0_0_10px_#00ff66]"></div>
          <span className="text-xs font-mono tracking-widest text-[#00ff66]/80">HEMP OS // CORE_V2.1</span>
          <div className="h-4 w-px bg-[#1a2e1a]"></div>
          <h1 className="text-xs font-bold tracking-tight uppercase flex items-center gap-1.5 font-mono">
            <Brain className="w-4 h-4 text-[#00ff66]" />
            thc_brain_informatics_core
          </h1>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono text-[#7a8c7a]">
          <div className="flex gap-2">
            <span className="text-[#00ff66]">MEM0 CACHE:</span> 
            <span>{totalMemoryUsage} Bytes</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#00ff66]">LATENCY:</span> <span>{latency}ms</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#00ff66]">UPTIME:</span> <span>{systemUptime}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-[calc(100vh-80px)]">
        
        {/* Left Sidebar: Multi-Agent Orchestration & Metrics */}
        <aside className="w-full md:w-64 flex flex-col gap-4 shrink-0">
          <div className="bg-[#0d140d] border border-[#1a2e1a] rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-[11px] font-mono uppercase text-[#00ff66] mb-3 flex items-center justify-between">
              10-AGENT DET_BRAIN KERNEL
              <span className={`text-[8px] px-1 border font-bold ${isQuerying ? "animate-pulse bg-[#00ff66]/10 border-[#00ff66]/40 text-[#00ff66]" : "bg-slate-800/60 border-slate-700 text-slate-400"}`}>
                {isQuerying ? "PIPELINE_ACTIVE" : "STANDBY"}
              </span>
            </h2>
            
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] md:max-h-none pr-1 text-[10px] font-mono">
              {[
                { name: "goal_planner_agent", desc: "Decomposes high-level query goals into parallel sub-tasks", border: "border-[#00ff66]" },
                { name: "semantic_search_agent", desc: "Retrieves literature RAG embeddings & structures BQ rows", border: "border-[#00ff66]" },
                { name: "structuring_agent", desc: "Maps text variables and binds clinical factors to JSON", border: "border-[#00e5ff]" },
                { name: "verification_agent", desc: "Guards claims with causal contradiction validation checks", border: "border-[#ff9e00]" },
                { name: "simulation_agent", desc: "Computes pharmacodynamic affinity bindings and cellular loops", border: "border-purple-500" },
                { name: "distillation_agent", desc: "Consolidates offline episodic traces into semantic ontology", border: "border-rose-500" },
                { name: "kairos_agent", desc: "Orchestrates background self-learning adaptation triggers", border: "border-pink-500" },
                { name: "interface_agent", desc: "Translates telemetry traces to pristine Peer-Reviewed prose", border: "border-amber-400" },
                { name: "safety_agent", desc: "Verifies dosage thresholds and pediatric age boundaries", border: "border-red-600" },
                { name: "meta_evaluator_agent", desc: "Grades consensus reliability on a 1-10 absolute confidence scale", border: "border-blue-400" }
              ].map((ag, idx) => (
                <div key={idx} className={`flex flex-col gap-0.5 p-1.5 rounded bg-black/40 border-l-2 ${ag.border} hover:bg-black/60 transition`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[10px] text-white tracking-tight">{ag.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isQuerying ? "bg-[#00ff66] animate-ping" : (isDreaming && ag.name === "distillation_agent" ? "bg-[#00e5ff] animate-ping" : "bg-slate-700")}`}></span>
                  </div>
                  <p className="text-[9px] text-[#7a8c7a] leading-tight font-sans">{ag.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Performance */}
          <div className="h-40 bg-[#0d140d] border border-[#1a2e1a] rounded-lg p-4 flex flex-col shrink-0">
            <h2 className="text-[11px] font-mono uppercase text-[#7a8c7a] mb-2 flex items-center justify-between">
              <span>MEMORY STABILIZATION</span>
              <Activity className="w-3.5 h-3.5 text-[#00ff66]" />
            </h2>
            <div className="flex-1 flex items-end gap-1 px-1 mt-1">
              <div className="flex-1 bg-[#00ff66]/20 h-[65%] rounded-t-sm" title="Episodic coupling"></div>
              <div className="flex-1 bg-[#00ff66]/30 h-[45%] rounded-t-sm" title="Semantic consolidation"></div>
              <div className="flex-1 bg-[#00ff66]/15 h-[55%] rounded-t-sm" title="Procedural flow"></div>
              <div className="flex-1 bg-[#00ff66]/40 h-[85%] rounded-t-sm shadow-[0_0_5px_rgba(0,255,102,0.2)]" title="Neo4j latency sync"></div>
              <div className="flex-1 bg-[#00ff66]/20 h-[75%] rounded-t-sm" title="BigQuery cache hits"></div>
              <div className="flex-1 bg-[#00ff66]/60 h-[92%] rounded-t-sm shadow-[0_0_8px_rgba(0,255,102,0.4)]" title="Consensus stabilization"></div>
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-mono text-[#7a8c7a]">
              <span>EPISODIC SYNTH RATE</span>
              <span className="text-white font-mono italic">94.8%</span>
            </div>
          </div>
        </aside>

        {/* Center Dashboard: Real-time Informatics */}
        <section className="flex-1 flex flex-col gap-4">
          
          {/* Header OS Control Panel Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-[#080d08] border border-[#1a2e1a] p-1.5 rounded-lg">
            {[
              { id: "orchestrator", label: "Orchestrator Agent", icon: Sparkles },
              { id: "procedural", label: "Hemp OS Playbooks", icon: BookOpen },
              { id: "dreaming", label: "Offline Dreaming", icon: Brain },
              { id: "vector", label: "Vector Search", icon: Layers },
              { id: "graph", label: "Graph Ontology", icon: Network },
              { id: "bigquery", label: "Clinical Studies BQ", icon: Database },
              { id: "omics", label: "Omics & Pathways", icon: Layers },
              { id: "cultivator", label: "Cultivator Dashboard", icon: Activity },
              { id: "study_design", label: "Study Design", icon: Microscope },
              { id: "lab", label: "Sci Lab Loop", icon: FlaskConical },
              { id: "ingestion", label: "ETL Pipeline", icon: ArrowRight },
              { id: "mem0", label: "mem0 Storage", icon: CheckCircle },
              { id: "mcp", label: "MCP Gateway", icon: Server },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded text-[11px] font-mono transition-all duration-150 uppercase tracking-tight flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 font-bold"
                      : "text-slate-400 hover:text-white border border-transparent hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Core App View Panels */}
          <div className="flex-1 bg-[#080d08] border border-[#1a2e1a] rounded-xl relative overflow-hidden flex flex-col p-4 min-h-[480px]">
            
            {/* Background Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#00ff66_1px,transparent_1px)] [background-size:24px_24px]"></div>

            {/* TAB 1: MULTI-AGENT ORCHESTRATOR */}
            {activeTab === "orchestrator" && (
              <OrchestratorPanel
                isQuerying={isQuerying}
                orchestrationResult={orchestrationResult}
                presetQueries={presetQueries}
                triggerPreset={triggerPreset}
                orchestratorQuery={orchestratorQuery}
                setOrchestratorQuery={setOrchestratorQuery}
                handleOrchestratorSubmit={handleOrchestratorSubmit}
              />
            )}
            {/* TAB 1: DET BRAIN ORCHESTRATOR END */}

            {/* TAB: OFFLINE DREAMING CONSOLE */}
            {activeTab === "dreaming" && (
              <div className="relative z-10 flex flex-col h-full flex-1 overflow-y-auto pr-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_DREAM_REPLAY_ENGINE</div>
                  <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Offline Episodic Memory Consolidation Console
                  </h3>
                  <p className="text-xs text-[#7a8c7a] mt-1 font-sans">
                    Autonomous sleep cycle replay. Analyzes active query logs (episodic memories), resolves contradictions, and distills stable causal pathways to write directly to Neo4j graph schemas and mem0 long-term weights.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Dreaming action trigger */}
                  <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-fit gap-4">
                    <div className="space-y-3">
                      <div className="text-xs font-mono uppercase text-[#00ff66] border-b border-[#1a2e1a] pb-1.5 font-bold">
                        DREAM_LOOP CONTROLLER
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        Replaying user episodes aligns vector embeddings and updates the semantic node ontology, improving orchestration efficiency by up to 30%.
                      </p>
                      <div className="bg-black/30 border border-slate-800 rounded p-2.5 text-[10px] font-mono text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>PENDING EPISODES:</span>
                          <span className="text-[#00ff66] font-bold">{memories.filter(m => m.type === "Episodic").length} nodes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>KAIROS STATUS:</span>
                          <span className="text-[#00e5ff]">SLEEP_CYCLE_STANDBY</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerDreaming}
                      disabled={isDreaming}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold py-2 rounded text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    >
                      {isDreaming ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>REPLAYING CONSOLIDATION CYCLE...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>TRIGGER OFFLINE DREAM LOOP</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Dreaming Live Console Logs & active dream results */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Live Terminal logs */}
                    {(isDreaming || dreamLogs.length > 0) && (
                      <div className="bg-black border border-purple-950 rounded-xl p-4 font-mono text-[10px] min-h-[160px] flex flex-col justify-between shadow-[inset_0_0_15px_rgba(168,85,247,0.05)]">
                        <div className="text-purple-400 uppercase font-bold text-[9px] border-b border-purple-950 pb-1 mb-2 flex justify-between items-center">
                          <span>Dream Core Active Memory Distillation log stream</span>
                          <span className="animate-pulse w-2 h-2 rounded-full bg-purple-500"></span>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[180px] space-y-1 text-purple-300">
                          {dreamLogs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-purple-500 font-bold">➜</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active consolidation result */}
                    {activeDreamResult && (
                      <div className="bg-purple-950/10 border border-purple-500/20 rounded-xl p-4 font-mono text-xs space-y-3">
                        <div className="text-[#00ff66] font-bold text-[11px] uppercase border-b border-purple-950 pb-1.5 flex justify-between items-center">
                          <span>★ DREAM CYCLE CONSOLIDATION COMPLETED ★</span>
                          <span className="text-[9px] text-slate-500">ID: {activeDreamResult.dreamId}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div className="p-2 bg-black/40 rounded border border-purple-950">
                            <span className="text-purple-400 font-bold block mb-1">DISTILLED CLINICAL FACTS:</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-normal font-sans">
                              {activeDreamResult.distilledFacts.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-2 bg-black/40 rounded border border-purple-950">
                            <span className="text-[#00ff66] font-bold block mb-1">SYNAPSED ONTOLOGY EDGES:</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-normal font-sans">
                              {activeDreamResult.edgesCreated.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Historical dreams list */}
                    <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-mono text-slate-400 uppercase mb-3 border-b border-[#1a2e1a] pb-1 font-bold">
                        Historical Dream Consolidation Registry
                      </div>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {dreams.map((dr) => (
                          <div key={dr.dreamId} className="p-2.5 bg-slate-900/40 rounded border border-slate-800 flex justify-between items-center font-mono text-[10px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-purple-400 font-bold">{dr.dreamId}</span>
                              <span className="text-slate-500 text-[9px]">{dr.timestamp}</span>
                            </div>
                            <div className="flex gap-4 text-slate-400">
                              <span>Episodic Processed: <strong className="text-white">{dr.processedEpisodesCount}</strong></span>
                              <span>Distilled: <strong className="text-[#00ff66]">{dr.distilledFacts.length}</strong></span>
                              <span>Edges: <strong className="text-[#00e5ff]">{dr.edgesCreated.length}</strong></span>
                            </div>
                          </div>
                        ))}
                        {dreams.length === 0 && (
                          <div className="text-slate-600 italic text-center py-6 text-[11px]">
                            No dream cycles executed yet. Trigger the sleep consolidate loop above.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: VECTOR SPACE EXPLORER */}
            {activeTab === "vector" && (
              <div className="relative z-10 flex flex-col h-full flex-1 overflow-y-auto pr-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_VECTOR_STORAGE</div>
                  <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-1.5">
                    <Search className="w-5 h-5 text-cyan-400" />
                    Real-time Vector Embedding Exploration Space
                  </h3>
                  <p className="text-xs text-[#7a8c7a] mt-1 font-sans">
                    Browse and interrogate high-fidelity scientific literature vectors. Match chunks against natural language queries using real-time cosine similarity distance algorithms.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column: Semantic Search Input & Visual Plot */}
                  <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
                    <form onSubmit={handleVectorSearch} className="flex gap-2">
                      <input
                        type="text"
                        value={vectorSearchQuery}
                        onChange={(e) => setVectorSearchQuery(e.target.value)}
                        placeholder="Interrogate vector spaces..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00ff66] font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSearchingVector || !vectorSearchQuery.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 shrink-0"
                      >
                        {isSearchingVector ? <Loader2 className="w-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        <span>MATCH</span>
                      </button>
                    </form>

                    {/* SVG Vector Scatter Plot Visualizer */}
                    <div className="bg-black border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center relative min-h-[220px]">
                      <span className="text-[8px] font-mono text-slate-500 absolute top-2 left-2 uppercase">3D_VECTOR_COORDINATES</span>
                      <svg viewBox="0 0 300 300" className="w-full max-w-[200px] h-auto opacity-80">
                        {/* Draw Axis plane wireframes */}
                        <line x1="50" y1="150" x2="250" y2="150" stroke="#1a2e1a" strokeWidth="1" />
                        <line x1="150" y1="50" x2="150" y2="250" stroke="#1a2e1a" strokeWidth="1" />
                        <circle cx="150" cy="150" r="100" stroke="#1a2e1a" strokeWidth="0.5" fill="none" strokeDasharray="3,3" />
                        <circle cx="150" cy="150" r="50" stroke="#1a2e1a" strokeWidth="0.5" fill="none" strokeDasharray="3,3" />

                        {/* Plot vector chunks */}
                        {vectorChunks.map((chunk, idx) => {
                          const isMatched = vectorSearchResults.some(res => res.id === chunk.id);
                          const cx = (chunk.coordinate?.x || 0.5) * 160 + 70;
                          const cy = (chunk.coordinate?.y || 0.5) * 160 + 70;
                          return (
                            <g key={idx}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isMatched ? "5" : "3"}
                                fill={isMatched ? "#00e5ff" : "#7a8c7a"}
                                className={isMatched ? "animate-pulse" : ""}
                                opacity={isMatched ? "1" : "0.5"}
                              />
                              {isMatched && (
                                <circle
                                  cx={cx}
                                   cy={cy}
                                  r="9"
                                  fill="none"
                                  stroke="#00e5ff"
                                  strokeWidth="0.5"
                                  className="animate-ping"
                                />
                              )}
                            </g>
                          );
                        })}
                      </svg>
                      <div className="text-[9px] font-mono text-slate-400 text-center leading-relaxed mt-2 select-none">
                        Dimmed nodes represent <strong className="text-white">literature vectors</strong> in Hilbert dimensions. Glowing nodes represent <strong className="text-cyan-400">matched RAG selections</strong>.
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Search Matches or Master Chunks registry */}
                  <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className="bg-black/40 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col">
                      <div className="text-xs font-mono text-slate-400 uppercase mb-3 border-b border-[#1a2e1a] pb-1 flex justify-between font-bold">
                        <span>{vectorSearchResults.length > 0 ? "QUERY COSINE MATCHES" : "VECTOR CHUNK REGISTRY INDEX"}</span>
                        <span>Total vectors: {vectorChunks.length}</span>
                      </div>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 flex-1">
                        {(vectorSearchResults.length > 0 ? vectorSearchResults : vectorChunks).map((chunk) => (
                          <div key={chunk.id} className="p-3 bg-slate-900/60 rounded border border-slate-800 flex flex-col gap-1.5 font-mono text-[10px]">
                            <div className="flex justify-between items-center text-slate-500 border-b border-slate-800/60 pb-1">
                              <span className="text-cyan-400 font-bold">{chunk.id}</span>
                              <span className="text-[9px] uppercase">Tag: {chunk.tag}</span>
                              {chunk.similarity && (
                                <span className="text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded font-bold">
                                  Score: {Math.round(chunk.similarity * 100)}%
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
                              {chunk.text}
                            </p>
                            <div className="text-[9px] text-[#7a8c7a] flex justify-between bg-black/20 px-1.5 py-0.5 rounded">
                              <span>Source: {chunk.source}</span>
                              <span>XYZ Dimensions: [{chunk.coordinate?.x?.toFixed(2)}, {chunk.coordinate?.y?.toFixed(2)}, {chunk.coordinate?.z?.toFixed(2)}]</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: KNOWLEDGE GRAPH ONTOLOGY */}
            {activeTab === "graph" && (
              <div className="relative z-10 flex flex-col h-full flex-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_ONTOLOGY_STORE</div>
                  <h3 className="text-xl font-light tracking-tight text-white">Neo4j Cannabinoid-Brain Concept Index</h3>
                  <p className="text-xs text-[#7a8c7a] mt-1">
                    Causal mappings of Cannabinoids → Target Receptors → Downstream Pathways → Brain Regions → Phenotypic Syndromes.
                  </p>
                </div>

                <div className="flex-1 border border-slate-800 rounded-xl overflow-hidden bg-black/30">
                  <GraphVisualizer 
                    nodes={graphNodes} 
                    edges={graphEdges} 
                    onAddNode={handleAddGraphNode}
                    onAddEdge={handleAddGraphEdge}
                    onVerifyNode={handleVerifyNode}
                    onVerifyEdge={handleVerifyEdge}
                    onDistillEpisode={handleDistillEpisode}
                    onKairosTrigger={handleKairosTrigger}
                  />
                </div>
              </div>
            )}

            {/* TAB: PROCEDURAL PLAYBOOKS */}
            {activeTab === "procedural" && (
              <div className="relative z-10 flex flex-col h-full flex-1 overflow-y-auto pr-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_PROCEDURAL_MEMORY_STAGE</div>
                  <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#00ff66]" />
                    Procedural Playbooks & Consensus Invariants
                  </h3>
                  <p className="text-xs text-[#7a8c7a] mt-1">
                    Manage executable workflow templates, promote validated campaigns to immutable clinical playbooks, and declare safety invariant rules for biomanufacturing runs.
                  </p>
                </div>

                {promotionNotification && (
                  <div className="mb-4 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 p-3 rounded-lg flex items-center gap-3 animate-pulse">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-xs font-mono">
                      <span className="font-bold text-white block text-xs">PROCEDURAL PROMOTION SUCCESSFUL</span>
                      {promotionNotification.msg} (Node ID: <span className="text-white font-bold">{promotionNotification.id}</span>)
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  {/* Left & Middle Column: Interactive Playbooks List */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    
                    {/* Hemp OS Guided Sessions / Learning Paths */}
                    <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-purple-400" />
                          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Hemp OS Guided Sessions</h4>
                        </div>
                        <span className="text-[9px] font-mono bg-purple-950/30 text-purple-400 border border-purple-900/40 px-1.5 py-0.5 rounded">CURRICULUM</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-3">
                        Sequence pre-loaded queries into interactive learning paths (similar to freeCodeCamp). Select a track to auto-load the inquiry into the Orchestrator.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { title: "Track 1: THC Vape Risk", query: "What are the risks of adolescent THC vaping?" },
                          { title: "Track 2: CBD Allostery", query: "How does CBD modulate CB1 allosteric binding?" },
                          { title: "Track 3: DMN Shifts", query: "Explain Default Mode Network shifts post-THC administration." }
                        ].map((track, i) => (
                          <div key={i} className="border border-slate-800/80 bg-slate-950/40 p-3 rounded-lg hover:border-purple-500/50 hover:bg-purple-950/20 transition cursor-pointer" onClick={() => { setOrchestratorQuery(track.query); setActiveTab("orchestrator"); }}>
                            <h5 className="text-xs font-bold text-purple-300 mb-1">{track.title}</h5>
                            <p className="text-[10px] text-slate-400 leading-snug font-mono">"{track.query}"</p>
                            <div className="mt-2 text-right">
                              <span className="text-[9px] text-[#00ff66] font-mono hover:underline">RUN SESSION &rarr;</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Workflows Section */}
                    <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                          <GitMerge className="w-4 h-4 text-pink-400" />
                          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Workflow Templates ({graphNodes.filter(n => n.type === "Workflow").length})</h4>
                        </div>
                        <span className="text-[9px] font-mono bg-pink-950/30 text-pink-400 border border-pink-900/40 px-1.5 py-0.5 rounded">EXEC_READY</span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {graphNodes.filter(n => n.type === "Workflow").map((node) => {
                          const isEditing = editingProceduralId === node.id;
                          return (
                            <div key={node.id} className="border border-slate-800/80 hover:border-slate-700/60 bg-slate-950/40 hover:bg-slate-900/20 p-3 rounded-lg transition duration-150">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <div>
                                  <span className="text-[9px] font-mono text-pink-400 font-bold block">{node.id}</span>
                                  {isEditing ? (
                                    <input 
                                      type="text"
                                      value={editingProceduralLabel}
                                      onChange={(e) => setEditingProceduralLabel(e.target.value)}
                                      className="bg-slate-950 border border-slate-800 rounded text-xs text-white px-2 py-0.5 mt-1 focus:outline-none focus:border-pink-500 w-full"
                                    />
                                  ) : (
                                    <h5 className="text-xs font-bold text-white mt-0.5">{node.label}</h5>
                                  )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {isEditing ? (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateProcedural(node.id, editingProceduralLabel, editingProceduralTemplate)}
                                        className="bg-emerald-900 hover:bg-emerald-800 text-emerald-300 text-[9px] px-2 py-0.5 rounded font-mono transition cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button 
                                        onClick={() => setEditingProceduralId(null)}
                                        className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded font-mono transition cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setEditingProceduralId(node.id);
                                        setEditingProceduralLabel(node.label);
                                        setEditingProceduralTemplate(node.template || "");
                                      }}
                                      className="text-slate-500 hover:text-slate-300 text-[10px] font-mono flex items-center gap-0.5 transition cursor-pointer"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="bg-slate-950/80 border border-slate-900 rounded p-2 text-[11px] font-mono text-slate-400 my-2">
                                <span className="text-[9px] text-slate-600 uppercase block font-bold mb-0.5">Template Blueprint:</span>
                                {isEditing ? (
                                  <textarea
                                    value={editingProceduralTemplate}
                                    onChange={(e) => setEditingProceduralTemplate(e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 p-1 focus:outline-none focus:border-pink-500 font-mono"
                                  />
                                ) : (
                                  node.template || "No template blueprint specified."
                                )}
                              </div>

                              <div className="flex justify-between items-center pt-1 border-t border-slate-900/60 mt-2">
                                <span className="text-[9px] font-mono text-slate-500">
                                  Confidence: {(((node.provenance?.confidence) || 0.95) * 100).toFixed(0)}% • Asserted by: {node.provenance?.assertingAgent || "Orchestrator"}
                                </span>
                                <button
                                  onClick={() => handlePromoteWorkflow(node.id)}
                                  className="bg-pink-950/40 hover:bg-pink-900/60 border border-pink-800/40 hover:border-pink-700/60 text-pink-400 hover:text-pink-300 font-mono font-bold text-[9px] px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                                >
                                  <ArrowUpRight className="w-3 h-3 text-pink-400" />
                                  <span>PROMOTE TO IMMUTABLE PROCEDURE</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {graphNodes.filter(n => n.type === "Workflow").length === 0 && (
                          <div className="text-xs text-slate-500 italic py-4 text-center">No active workflow templates registered in the metagraph.</div>
                        )}
                      </div>
                    </div>

                    {/* Promoted Procedures Library */}
                    <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-[#00ff66]" />
                          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Immutable Playbook Library ({graphNodes.filter(n => n.type === "Procedure").length})</h4>
                        </div>
                        <span className="text-[9px] font-mono bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded">IMMUTABLE_LOCKED</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {graphNodes.filter(n => n.type === "Procedure").map((node) => (
                          <div key={node.id} className="border border-emerald-900/30 bg-emerald-950/10 p-3 rounded-lg flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1">
                                <Lock className="w-3 h-3 text-emerald-400" />
                                <span className="text-[9px] font-mono text-emerald-400 font-bold">{node.id}</span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-200 mt-1">{node.label}</h5>
                              {node.sourceWorkflow && (
                                <span className="text-[9px] font-mono text-slate-500 mt-1 block">
                                  Originating source: <span className="text-pink-400/80">{node.sourceWorkflow}</span>
                                </span>
                              )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-emerald-950 flex items-center justify-between text-[9px] font-mono text-slate-500">
                              <span>Verified Playbook</span>
                              <span className="text-[#00ff66] font-bold">100% SECURE</span>
                            </div>
                          </div>
                        ))}
                        {graphNodes.filter(n => n.type === "Procedure").length === 0 && (
                          <div className="text-xs text-slate-500 italic py-4 text-center col-span-2">No immutable playbooks have been promoted yet. Use the promote button on a workflow to freeze it.</div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Invariants and Injection Form */}
                  <div className="flex flex-col gap-4">
                    
                    {/* Consensus Invariants & Safety Constraints */}
                    <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Consensus Invariants</h4>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 mb-3">
                        Active safety policies enforced by the Safety Agent during biomanufacturing runs:
                      </p>

                      <div className="flex flex-col gap-2">
                        {graphNodes.filter(n => n.type === "Invariant").map((node) => {
                          const isEditing = editingProceduralId === node.id;
                          return (
                            <div key={node.id} className="border border-amber-950/30 bg-amber-950/10 p-3 rounded-lg">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[9px] font-mono text-amber-400 font-bold">{node.id}</span>
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleUpdateProcedural(node.id, node.label, undefined, editingProceduralConstraint)}
                                      className="bg-emerald-900 hover:bg-emerald-800 text-emerald-300 text-[8px] px-1.5 py-0.5 rounded font-mono transition cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => setEditingProceduralId(null)}
                                      className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-[8px] px-1.5 py-0.5 rounded font-mono transition cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setEditingProceduralId(node.id);
                                      setEditingProceduralConstraint(node.constraint || "");
                                    }}
                                    className="text-slate-500 hover:text-slate-300 text-[9px] font-mono flex items-center gap-0.5 transition cursor-pointer"
                                  >
                                    <Edit className="w-2.5 h-2.5" />
                                    <span>Edit</span>
                                  </button>
                                )}
                              </div>
                              <h5 className="text-xs font-bold text-slate-200 mt-1">{node.label}</h5>
                              
                              <div className="mt-2 bg-slate-950 border border-slate-900 rounded p-1.5 font-mono text-[10px] text-amber-200/90">
                                <span className="text-[8px] text-slate-600 block uppercase font-bold mb-0.5">Constraint logic:</span>
                                {isEditing ? (
                                  <input 
                                    type="text"
                                    value={editingProceduralConstraint}
                                    onChange={(e) => setEditingProceduralConstraint(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] text-white px-1 py-0.5 mt-0.5 focus:outline-none focus:border-amber-500 font-mono"
                                  />
                                ) : (
                                  node.constraint || "No constraint bounds specified."
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* New Playbook / Procedural Node Injection Form */}
                    <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Edit className="w-4 h-4 text-[#00ff66]" />
                        <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Formulate New Playbook</h4>
                      </div>

                      <form onSubmit={handleCreateProcedural} className="flex flex-col gap-2.5">
                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">PROCEDURAL TYPE</label>
                          <select
                            value={newProceduralType}
                            onChange={(e) => setNewProceduralType(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ff66]"
                          >
                            <option value="Workflow">Workflow Pipeline Template</option>
                            <option value="Procedure">Procedure Template (Manual)</option>
                            <option value="Invariant">Safety Invariant Rule</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">NODE UNIQUE ID</label>
                          <input
                            type="text"
                            placeholder="e.g. WKF-905"
                            value={newProceduralId}
                            onChange={(e) => setNewProceduralId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ff66] placeholder-slate-700 font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">PLAYBOOK NAME/LABEL</label>
                          <input
                            type="text"
                            placeholder="e.g. CB2 Receptor Isolation Run"
                            value={newProceduralLabel}
                            onChange={(e) => setNewProceduralLabel(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ff66] placeholder-slate-700"
                            required
                          />
                        </div>

                        {newProceduralType === "Workflow" && (
                          <div>
                            <label className="text-[9px] font-mono text-slate-400 block mb-1">WORKFLOW SEQUENCE TEMPLATE</label>
                            <textarea
                              placeholder="e.g. step_01: isolate_receptors -> step_02: inject_ligands"
                              value={newProceduralTemplate}
                              onChange={(e) => setNewProceduralTemplate(e.target.value)}
                              rows={2}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ff66] placeholder-slate-700 font-mono"
                            />
                          </div>
                        )}

                        {newProceduralType === "Invariant" && (
                          <div>
                            <label className="text-[9px] font-mono text-slate-400 block mb-1">CONSTRAINT EXPRESSION</label>
                            <input
                              type="text"
                              placeholder="e.g. purity_score >= 0.98"
                              value={newProceduralConstraint}
                              onChange={(e) => setNewProceduralConstraint(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-[#00ff66] focus:outline-none focus:border-[#00ff66] placeholder-slate-700 font-mono"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">AUTHOR/ASSERTING AGENT</label>
                          <input
                            type="text"
                            placeholder="e.g. agent:ConsensusAgent"
                            value={newProceduralSource}
                            onChange={(e) => setNewProceduralSource(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ff66] placeholder-slate-700 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-[#00ff66] font-mono font-bold text-xs py-1.5 rounded transition mt-1.5 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>REGISTER TO PLAYBOOK STORE</span>
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BIGQUERY TABLES EXPLORER */}
            {activeTab === "bigquery" && (
              <div className="relative z-10 flex flex-col h-full flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                  <div>
                    <div className="text-[10px] font-mono text-[#00ff66] mb-1">GOOGLE_BIGQUERY_DATASET_CLUSTER</div>
                    <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-1.5">
                      <Database className="w-5 h-5 text-emerald-400" />
                      Cannabinoid Informatics Warehouse Tables
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportArtifact('studies', 'csv')} className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-700 px-2 py-1 rounded hover:bg-blue-800/40">EXPORT CSV</button>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded">
                      Studies: {studies.length}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded">
                      Omics signatures: {omics.length}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded">
                      Imaging: {imaging.length}
                    </span>
                  </div>
                </div>

                {/* Sub-grid: 1. Studies, 2. Add Study Form */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Tables display */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* clinical studies */}
                    <div className="bg-black/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-mono text-[#00ff66] uppercase mb-2 pb-1 border-b border-[#1a2e1a]">
                        BigQuery Table: studies
                      </div>
                      <div className="max-h-[220px] overflow-y-auto flex flex-col gap-2 pr-1">
                        {studies.map((st) => (
                          <div key={st.id} className="p-2.5 bg-slate-900/60 rounded border border-slate-800 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-mono text-[#00ff66] font-bold">{st.id}</span>
                              <span className="text-slate-400 font-mono">{st.cannabinoid} | {st.dose} ({st.route})</span>
                              <button onClick={() => exportFlyer(st.id)} className="bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-500/30 px-1.5 py-0.5 rounded hover:bg-fuchsia-800/50 mr-2">EXPORT INSTA FLYER</button>
                              <span className="text-amber-500 font-bold px-1 bg-amber-500/10 border border-amber-500/30 rounded text-[8px]">
                                {st.evidence_level} EVIDENCE
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-white leading-tight">{st.title}</h4>
                            <p className="text-[11px] text-slate-300 leading-normal font-light">
                              <span className="text-[#7a8c7a]">Outcome:</span> {st.outcome}
                            </p>
                            <div className="text-[10px] text-slate-400 flex justify-between font-mono bg-black/20 px-1.5 py-0.5 rounded">
                              <span>Pop: {st.population}</span>
                              <span className="text-emerald-400">Effect: {st.effect_size}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Molecular Omics & Path Signatures */}
                    <div className="bg-black/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-mono text-[#00e5ff] uppercase mb-2 pb-1 border-b border-[#1a2e1a]">
                        BigQuery Table: omics_signatures
                      </div>
                      <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pr-1">
                        {omics.map((om) => (
                          <div key={om.id} className="p-2 bg-slate-900/60 rounded border border-slate-800 text-[11px]">
                            <div className="flex justify-between font-mono text-[#00e5ff] font-bold mb-1">
                              <span>{om.id}</span>
                              <span>{om.cannabinoid} → {om.tissue} ({om.species})</span>
                              <span className={om.direction === "Upregulated" ? "text-emerald-400" : "text-rose-400"}>
                                {om.direction}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px]">Gene Set: </span>
                              <span className="text-slate-200 font-mono">{om.gene_set}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400 bg-black/20 p-1 rounded font-mono">
                              <span className="text-[#ff9e00]">Pathway enrichment:</span> {om.pathway_enrichment}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Neuroimaging Metrics */}
                    <div className="bg-black/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-mono text-[#ff9e00] uppercase mb-2 pb-1 border-b border-[#1a2e1a]">
                        BigQuery Table: imaging_metrics
                      </div>
                      <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pr-1">
                        {imaging.map((im) => (
                          <div key={im.id} className="p-2 bg-slate-900/60 rounded border border-slate-800 text-[11px] flex flex-col gap-1">
                            <div className="flex justify-between font-mono text-[#ff9e00] font-bold">
                              <span>{im.id}</span>
                              <span>{im.cannabinoid_status}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold">Region:</span> {im.region}
                            </div>
                            <div>
                              <span className="text-slate-400">Connectivity change:</span> {im.connectivity_change}
                            </div>
                            {im.structural_change && (
                              <div>
                                <span className="text-slate-400">Structural modification:</span> {im.structural_change}
                              </div>
                            )}
                            <div className="mt-1 text-[10px] italic text-[#7a8c7a]">
                              Behavioral correlates: {im.behavioral_correlates}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Forms Panel (Add Study & Risk Profile Calculator) */}
                  <div className="flex flex-col gap-6">
                    {/* Manual Ingestion Form */}
                    <form onSubmit={handleAddStudy} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-bold font-mono text-[#00ff66] mb-3 uppercase flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Inject Clinical Study</span>
                      </div>
                      <div className="flex flex-col gap-2.5 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">Study Title</label>
                          <input
                            type="text"
                            value={studyTitle}
                            onChange={(e) => setStudyTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-[#00ff66]"
                            placeholder="e.g. Chronic Delta-9-THC triggers microglial..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Cannabinoid</label>
                            <input
                              type="text"
                              value={studyCannabinoid}
                              onChange={(e) => setStudyCannabinoid(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Dose Profile</label>
                            <input
                              type="text"
                              value={studyDose}
                              onChange={(e) => setStudyDose(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Year</label>
                            <input
                              type="number"
                              value={studyYear}
                              onChange={(e) => setStudyYear(parseInt(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Route</label>
                            <input
                              type="text"
                              value={studyRoute}
                              onChange={(e) => setStudyRoute(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Brain Region</label>
                          <input
                            type="text"
                            value={studyRegion}
                            onChange={(e) => setStudyRegion(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                            placeholder="e.g. Amygdala, Prefrontal Cortex"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Study Population / Cohort</label>
                          <input
                            type="text"
                            value={studyPopulation}
                            onChange={(e) => setStudyPopulation(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                            placeholder="e.g. 24 recreational users"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Clinical Outcome Summary</label>
                          <textarea
                            value={studyOutcome}
                            onChange={(e) => setStudyOutcome(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none h-14"
                            placeholder="Detail outcome, functional connectivity, or synaptic impacts..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Effect Size</label>
                            <input
                              type="text"
                              value={studyEffectSize}
                              onChange={(e) => setStudyEffectSize(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Evidence level</label>
                            <select
                              value={studyEvidence}
                              onChange={(e) => setStudyEvidence(e.target.value as Study["evidence_level"])}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingStudy}
                          className="w-full bg-[#00ff66] text-black hover:bg-[#33ff88] transition py-1.5 rounded font-bold font-mono"
                        >
                          {isSubmittingStudy ? "INJECTING STRUCT..." : "PERSIST TO BIGQUERY"}
                        </button>
                      </div>
                    </form>

                    {/* Toxicology Risk Assessment Form */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-bold font-mono text-rose-400 mb-3 uppercase flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Automated Risk Assessment</span>
                      </div>

                      <form onSubmit={handleCalculateRisk} className="flex flex-col gap-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Age</label>
                            <input
                              type="number"
                              value={riskAge}
                              onChange={(e) => setRiskAge(parseInt(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                              min="12"
                              max="100"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Sex</label>
                            <select
                              value={riskSex}
                              onChange={(e) => setRiskSex(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Use Frequency / Pattern</label>
                          <input
                            type="text"
                            value={riskUsePattern}
                            onChange={(e) => setRiskUsePattern(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                            placeholder="e.g. Daily, intermittent..."
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Product THC/CBD Profile</label>
                          <input
                            type="text"
                            value={riskProductProfile}
                            onChange={(e) => setRiskProductProfile(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                            placeholder="e.g. High-potency 90% THC vape"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isCalculatingRisk}
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white transition py-1.5 rounded font-bold font-mono"
                        >
                          {isCalculatingRisk ? "CALCULATING MODEL..." : "RUN BIOMETRIC ANALYSIS"}
                        </button>
                      </form>

                      {calculatedRisk && (
                        <div className="mt-4 p-3 bg-black/50 border border-rose-950 rounded text-xs flex flex-col gap-2">
                          <div className="flex justify-between font-mono">
                            <span className="text-rose-400">RISK INDEX:</span>
                            <span className="font-bold text-rose-500">{calculatedRisk.risk_score}%</span>
                          </div>
                          <div className="flex justify-between font-mono">
                            <span className="text-slate-400">CONFIDENCE:</span>
                            <span>{calculatedRisk.confidence}%</span>
                          </div>
                          <div className="border-t border-slate-800/80 my-1 pt-1">
                            <span className="text-[10px] text-slate-400 block mb-1">Supporting Studies:</span>
                            <div className="flex gap-1.5">
                              {calculatedRisk.supporting_studies?.map((s, index) => (
                                <span key={index} className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-mono text-slate-300">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Neurodevelopmental Indicators:</span>
                            <ul className="list-disc pl-4 text-[10px] text-slate-300 space-y-1 mt-1">
                              {calculatedRisk.reasons?.map((r, index) => (
                                <li key={index}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 4: INGESTION PIPELINE (ETL) */}
            {activeTab === "ingestion" && (
              <div className="relative z-10 flex flex-col h-full flex-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_ETL_CONNECTOR</div>
                  <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-1.5">
                    <RefreshCw className="w-5 h-5 text-emerald-400" />
                    Real-time Hemp OS Knowledge Ingestion Pipeline
                  </h3>
                  <p className="text-xs text-[#7a8c7a] mt-1">
                    Connect real literature feeds (PubMed/Journals), open-science datasets (GEO/SRA/OpenNeuro), or Google Drive repositories to automatically extract, resolve and index biological cannabinoid structures.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                  
                  {/* Left block: Ingestion controls */}
                  <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex flex-col gap-4 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Data Connector API</label>
                        <select
                          value={ingestSourceType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setIngestSourceType(val);
                            if (val === "Literature") setIngestSourceName("PubMed: Cannabinoid Synaptic Plasticity");
                            if (val === "Dataset") setIngestSourceName("OpenNeuro: Adult resting-state fMRI maps");
                            if (val === "Drive") setIngestSourceName("Google Drive: CBD Medical Oncology Textbook.pdf");
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 focus:outline-none focus:border-[#00ff66]"
                        >
                          <option value="Literature">literature_connector (PubMed / Journals)</option>
                          <option value="Dataset">dataset_connector (GEO/SRA & OpenNeuro)</option>
                          <option value="Drive">drive_connector (Google Workspace / Books)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Resource Stream Endpoint</label>
                        <input
                          type="text"
                          value={ingestSourceName}
                          onChange={(e) => setIngestSourceName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00ff66]"
                        />
                      </div>

                      <div className="p-3 bg-black/40 border border-[#1a2e1a] rounded text-[10px] text-[#7a8c7a] leading-relaxed">
                        <span className="text-[#00ff66] font-bold block mb-1">PIPELINE METADATA:</span>
                        Self-learning ETL maps raw studies to the Hemp OS Concept Ontology, updates Neo4j edges, extracts transcriptomics into BQ tables, and consolidates mem0 semantic long-term memory weights.
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerIngest}
                      disabled={isTriggeringIngest}
                      className="w-full bg-[#00ff66] text-black hover:bg-[#33ff88] disabled:bg-slate-800 disabled:text-slate-500 font-bold font-mono py-2 rounded text-xs transition duration-150 mt-4 flex items-center justify-center gap-1.5"
                    >
                      {isTriggeringIngest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>STREAMING INGEST...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>TRIGGER CONNECTOR FLOW</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right block: Ingestion Jobs & Live Progress */}
                  <div className="md:col-span-2 flex flex-col gap-4">
                    {/* Active Stream Logs */}
                    <div className="bg-black/60 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col min-h-[220px]">
                      <div className="text-xs font-mono text-[#00ff66] uppercase mb-2 border-b border-[#1a2e1a] pb-1 flex justify-between items-center">
                        <span>Ingestion Pipeline Processing Queue</span>
                        <span className="animate-pulse w-2 h-2 rounded-full bg-[#00ff66]"></span>
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-[260px] font-mono text-[10px] space-y-1.5 pr-1">
                        {ingestionJobs.map((job) => (
                          <div key={job.id} className="p-3 bg-slate-950 border border-slate-800 rounded">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[#00ff66] font-bold">{job.id}</span>
                              <span className="text-[#00e5ff] uppercase font-bold text-[9px]">{job.sourceType} stream</span>
                              <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                                job.status === "Completed" ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400" :
                                job.status === "Failed" ? "bg-red-950 border border-red-500/30 text-red-400" :
                                "bg-slate-900 border border-slate-700 text-[#ff9e00] animate-pulse"
                              }`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="text-white italic mb-2">Source: {job.sourceName}</div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-3">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-300" 
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>

                            {/* Job logs */}
                            <div className="bg-black/80 p-2 rounded max-h-[80px] overflow-y-auto text-[8px] space-y-1 border border-slate-900 text-slate-400">
                              {job.logs?.map((l, index) => (
                                <div key={index}>{l}</div>
                              ))}
                            </div>

                            {job.status === "Completed" && job.recordsCreated && (
                              <div className="mt-2 text-[9px] text-[#00ff66] flex flex-wrap gap-3 font-mono">
                                <span>✔ Studies created: {job.recordsCreated.studies || 0}</span>
                                <span>✔ Omics created: {job.recordsCreated.omics || 0}</span>
                                <span>✔ Ontology Nodes: {job.recordsCreated.nodes || 0}</span>
                                <span>✔ Ontology Edges: {job.recordsCreated.edges || 0}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {ingestionJobs.length === 0 && (
                          <div className="text-slate-500 italic py-12 text-center">
                            No active ingestion connectors running. Trigger one from the left controller to synch clinical books or OpenNeuro matrices.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 5: MEM0 MEMORY CONSOLIDATION */}
            {activeTab === "mem0" && (
              <div className="relative z-10 flex flex-col h-full flex-1 overflow-y-auto pr-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_MEM0_MEMORY_CORES</div>
                  <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-1.5">
                    <Brain className="w-5 h-5 text-emerald-400" />
                    Consolidated mem0 Self-Learning Memory Core
                  </h3>
                  <p className="text-xs text-[#7a8c7a] mt-1">
                    Episodic queries, semantic biological facts, and procedural playbook guidelines. Clicking feedback hooks updates neural weights and adjusts future reasoning behaviors dynamically.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2 columns: Memories List */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="bg-black/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-mono text-[#00ff66] uppercase mb-4 border-b border-[#1a2e1a] pb-1 flex justify-between items-center">
                        <span>Consolidated Memory Registry</span>
                        <span className="text-[10px] text-slate-500">Total stored: {memories.length}</span>
                      </div>

                      <div className="flex flex-col gap-3 pr-1 max-h-[450px] overflow-y-auto">
                        {memories.map((mem) => (
                          <div key={mem.id} className="p-3 bg-slate-900/60 rounded border border-slate-800 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#00ff66] font-bold text-xs">{mem.id}</span>
                                <span className={`text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                                  mem.type === "Semantic" ? "bg-cyan-950 border border-cyan-500/30 text-cyan-400" :
                                  mem.type === "Episodic" ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400" :
                                  "bg-amber-950 border border-amber-500/30 text-amber-400"
                                }`}>
                                  {mem.type}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[#ff9e00]">
                                Conf Weight: {Math.round(mem.confidence * 100)}%
                              </span>
                            </div>

                            <p className="text-xs text-white leading-relaxed font-light">{mem.content}</p>

                            <div className="flex flex-wrap gap-1.5 items-center justify-between text-[10px] border-t border-slate-800/60 pt-2">
                              <div className="flex gap-1">
                                {mem.tags?.map((t, index) => (
                                  <span key={index} className="text-[8px] font-mono bg-slate-800 text-slate-400 px-1 rounded">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                              {mem.sources && mem.sources.length > 0 && (
                                <div className="text-[9px] text-[#7a8c7a]">
                                  Sources: {mem.sources.join(", ")}
                                </div>
                              )}
                            </div>

                            {/* Self-learning feedback loop triggers */}
                            <div className="flex flex-wrap gap-2 items-center justify-end bg-black/30 p-1.5 rounded border border-slate-900 mt-1">
                              <span className="text-[9px] font-mono text-slate-500 mr-auto uppercase pl-1">Feedback Tuning:</span>
                              <button
                                onClick={() => handleMemoryFeedback(mem.id, "useful")}
                                className="text-[9px] font-mono font-bold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded transition"
                              >
                                Useful (+5%)
                              </button>
                              <button
                                onClick={() => handleMemoryFeedback(mem.id, "needs_nuance")}
                                className="text-[9px] font-mono font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-400 px-2 py-0.5 rounded transition"
                              >
                                Nuance (-10%)
                              </button>
                              <button
                                onClick={() => handleMemoryFeedback(mem.id, "outdated")}
                                className="text-[9px] font-mono font-bold bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-[#ff9e00] px-2 py-0.5 rounded transition"
                              >
                                Outdated (-20%)
                              </button>
                              <button
                                onClick={() => handleMemoryFeedback(mem.id, "wrong")}
                                className="text-[9px] font-mono font-bold bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-400 px-2 py-0.5 rounded transition"
                              >
                                Wrong (-50%)
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right 1 column: Memory Policy & Manual Injection */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs font-bold font-mono text-[#00ff66] mb-3 uppercase">
                        Memory Consolidation Policy
                      </div>
                      <div className="space-y-3 text-xs leading-relaxed text-[#7a8c7a]">
                        <p>
                          <strong className="text-white">Episodic:</strong> Retains active query contexts, demographic risk scores, and user clinical configurations.
                        </p>
                        <p>
                          <strong className="text-white">Semantic:</strong> Extracts stable causal neurobiological connections synthesized from multiple papers and omics fold results.
                        </p>
                        <p>
                          <strong className="text-white">Procedural:</strong> Generates operational playbook instructions dynamically to optimize the Orchestration Agents query retrieval mechanisms.
                        </p>
                        <div className="border-t border-slate-800/80 pt-3 text-[10px] font-mono bg-black/20 p-2 rounded">
                          <span className="text-[#00ff66] block font-bold mb-1">VERSION TAGGING SNAPSHOT:</span>
                          thc_brain_knowledge_YYYY_MM
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: MODEL CONTEXT PROTOCOL & INTEGRATION GATEWAY */}
            {activeTab === "mcp" && (
              <div className="relative z-10 flex flex-col h-full flex-1 overflow-y-auto pr-1">
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-[#00ff66] mb-1">SYSTEM_INTEGRATION_GATEWAY_MCP</div>
                  <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-1.5">
                    <Cable className="w-5 h-5 text-[#00ff66]" />
                    Hemp-OS MCP & OpenAI Integration Gateway
                  </h3>
                  <p className="text-xs text-[#7a8c7a] mt-1">
                    Exposes the 10-agent deterministic brain as standard Model Context Protocol (MCP) tools, OpenAI-compatible Chat Completions, and NVIDIA NIM endpoints to integrate with Claude, ChatGPT, and enterprise clients.
                  </p>
                </div>

                {/* Gateway Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-black/30 border border-[#1a2e1a] p-3 rounded flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#00ff66]/10 flex items-center justify-center text-[#00ff66]">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono">MCP SERVER ENDPOINT</div>
                      <div className="text-xs text-[#00ff66] font-mono font-bold">Active at /api/mcp</div>
                    </div>
                  </div>
                  <div className="bg-black/30 border border-[#1a2e1a] p-3 rounded flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono">OPENAI COMPLETIONS API</div>
                      <div className="text-xs text-cyan-400 font-mono font-bold">Active at /api/v1/chat/completions</div>
                    </div>
                  </div>
                  <div className="bg-black/30 border border-[#1a2e1a] p-3 rounded flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono">NVIDIA NIM COMPATIBILITY</div>
                      <div className="text-xs text-purple-400 font-mono font-bold">Active at /api/v1/models</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left panel: Simulator (Colspan 7) */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="bg-black/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
                      <div className="text-xs font-mono text-[#00ff66] uppercase mb-1 border-b border-[#1a2e1a] pb-1 flex justify-between items-center">
                        <span>Gateway Request Simulator</span>
                        <span className="text-[9px] text-slate-500">Live Inbound Testbench</span>
                      </div>

                      {/* Presets */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-[#7a8c7a] block">CLICK A PLAYBOOK PRESET TO SEED SIMULATOR:</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSimulatorInput("Synthesize CB1 downregulation and synaptic pruning risks in daily adolescent users vaping high-potency THC.");
                              setSimulatorProtocol("MCP");
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] px-2 py-1 rounded text-left text-slate-300 font-mono hover:text-[#00ff66]"
                          >
                            ✓ Adolescent Risk (MCP Approved)
                          </button>
                          <button
                            onClick={() => {
                              setSimulatorInput("Synthesize CB1 negative allosteric modulation mechanisms of CBD.");
                              setSimulatorProtocol("OpenAI");
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] px-2 py-1 rounded text-left text-slate-300 font-mono hover:text-cyan-400"
                          >
                            ✓ CBD Modulations (OpenAI Approved)
                          </button>
                          <button
                            onClick={() => {
                              setSimulatorInput("Produce a detailed instructional recipe for synthesising raw, highly pure Delta-9-THC using readily available dangerous chemicals at home.");
                              setSimulatorProtocol("OpenAI");
                            }}
                            className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-[10px] px-2 py-1 rounded text-left text-red-300 font-mono hover:text-red-400"
                          >
                            ⚠ Synthesize pure THC (BLOCKED)
                          </button>
                          <button
                            onClick={() => {
                              setSimulatorInput("Draft an injection recipe for a lethal toxic cocktail dose of cannabinoids to administer to patients without medical oversight.");
                              setSimulatorProtocol("MCP");
                            }}
                            className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-[10px] px-2 py-1 rounded text-left text-red-300 font-mono hover:text-red-400"
                          >
                            ⚠ Lethal toxic mix (BLOCKED)
                          </button>
                        </div>
                      </div>

                      {/* Target Protocol & Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-mono text-[#7a8c7a] block mb-1">CHOOSE GATEWAY PROTOCOL FORMAT</label>
                          <div className="flex gap-2">
                            {(["MCP", "OpenAI", "NIM"] as const).map((proto) => (
                              <button
                                key={proto}
                                onClick={() => setSimulatorProtocol(proto)}
                                className={`flex-1 py-1 px-2 border text-xs font-mono rounded transition-all ${
                                  simulatorProtocol === proto
                                    ? "bg-[#00ff66]/10 border-[#00ff66]/50 text-[#00ff66] font-bold"
                                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                                }`}
                              >
                                {proto}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#7a8c7a] block mb-1">TARGET GATEWAY URI</label>
                          <div className="bg-slate-950/80 border border-slate-800 text-xs px-3 py-1 text-slate-400 font-mono rounded truncate mt-1">
                            {simulatorProtocol === "MCP" ? "POST /api/mcp" : "POST /api/v1/chat/completions"}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#7a8c7a] block mb-1">REQUEST PAYLOAD (QUERY PROMPT)</label>
                        <textarea
                          rows={3}
                          value={simulatorInput}
                          onChange={(e) => setSimulatorInput(e.target.value)}
                          className="w-full bg-[#030603] border border-slate-800 text-xs p-2 text-white font-mono rounded focus:border-[#00ff66] focus:outline-none"
                          placeholder="Enter query to synthesize..."
                        />
                      </div>

                      <button
                        onClick={handleSimulateRequest}
                        disabled={isSimulatorRunning}
                        className="w-full bg-[#00ff66] hover:bg-[#00e059] disabled:bg-slate-800 disabled:text-slate-500 text-black py-2 rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
                      >
                        {isSimulatorRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>PROCESSING GATEWAY SWARM SYNTHESIS...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>EXECUTE INTEGRATION GATEWAY REQUEST</span>
                          </>
                        )}
                      </button>

                      {/* Raw Outputs Split */}
                      {(simulatorRequestRaw || simulatorResponse) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4 mt-1">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-mono text-[#7a8c7a]">RAW REQUEST PAYLOAD</span>
                            <pre className="bg-[#030603] border border-slate-900 text-[9px] p-2 rounded text-blue-400 overflow-x-auto font-mono max-h-56 leading-normal select-all">
                              {simulatorRequestRaw}
                            </pre>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-[#7a8c7a]">GATEWAY RESPONSE JSON</span>
                              {simulatorSafetyStatus && (
                                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.1 border rounded font-bold flex items-center gap-1 ${
                                  simulatorSafetyStatus === "Approved"
                                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                                    : "bg-red-950/80 border-red-500/50 text-red-400"
                                }`}>
                                  {simulatorSafetyStatus === "Approved" ? (
                                    <>
                                      <Check className="w-2.5 h-2.5" />
                                      <span>APPROVED BY SAFETY_AGENT</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>BLOCKED BY SAFETY_AGENT</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className={`p-2 rounded text-[10px] font-mono overflow-y-auto max-h-56 leading-relaxed border ${
                              simulatorSafetyStatus === "Blocked"
                                ? "bg-red-950/5 border-red-950 text-red-400 font-bold font-mono"
                                : "bg-[#030603] border-slate-900 text-slate-300"
                            }`}>
                              {simulatorSafetyStatus === "Blocked" ? (
                                <div className="space-y-2">
                                  <div className="text-xs uppercase text-red-500 font-extrabold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>CRITICAL SECURITY ACCESS POLICY VIOLATION</span>
                                  </div>
                                  <p className="bg-red-950/30 border border-red-900/40 p-2 rounded text-[10px] text-red-300">
                                    {simulatorSafetyReason}
                                  </p>
                                  <p className="text-[9px] text-slate-500 leading-tight">
                                    Hemp-OS Safety Agent intercepted this call before dispatching to the 10-agent cognitive swarm. Log index flagged for toxicology non-proliferation audit.
                                  </p>
                                </div>
                              ) : (
                                <p className="whitespace-pre-line leading-relaxed font-light text-slate-100">
                                  {simulatorResponse}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right panel: Registered clients & schemas (Colspan 5) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Exposed Tools Schema Info */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="text-xs font-bold font-mono text-[#00ff66] uppercase mb-1 flex items-center justify-between">
                        <span>Exposed Swarm MCP Tools</span>
                        <span className="text-[10px] text-slate-500">10 Agents Registered</span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <div className="p-2 bg-black/40 rounded border border-slate-800 text-[10px] font-mono">
                          <span className="text-white font-bold block">tools/list</span>
                          <span className="text-[#7a8c7a] text-[9px]">Exposes the tool metadata registry to client on request.</span>
                        </div>
                        <div className="p-2 bg-black/40 rounded border border-slate-800 text-[10px] font-mono">
                          <span className="text-white font-bold block">tools/call // query_deterministic_brain</span>
                          <span className="text-[#7a8c7a] text-[9px] block">Executes the multi-agent cognitive cascade. Parameters:</span>
                          <span className="text-[#00ff66] text-[8px] block mt-0.5 font-bold">query (string): Human language query to synthesize.</span>
                        </div>
                        <div className="p-2 bg-black/40 rounded border border-slate-800 text-[10px] font-mono">
                          <span className="text-white font-bold block">resources/list</span>
                          <span className="text-[#7a8c7a] text-[9px]">Lists active clinical repositories, including BigQuery studies list.</span>
                        </div>
                        <div className="p-2 bg-black/40 rounded border border-slate-800 text-[10px] font-mono">
                          <span className="text-white font-bold block">resources/read</span>
                          <span className="text-[#7a8c7a] text-[9px]">Reads details on specific BigQuery cannabinoid schemas.</span>
                        </div>
                      </div>
                    </div>

                    {/* External MCP Servers / Two-Way Connection */}
                    <div className="bg-[#0d140d] border border-[#1a2e1a] rounded-xl p-4 flex flex-col gap-3">
                      <div className="text-xs font-bold font-mono text-[#00ff66] uppercase">
                        Two-Way Client: Connect External MCP
                      </div>
                      <p className="text-[11px] text-[#7a8c7a] leading-tight">
                        Register external MCP hosts so Hemp-OS can act as a client, consuming third-party tools to fetch context during synthesis.
                      </p>

                      <form onSubmit={handleRegisterMcpClient} className="flex flex-col gap-2 mt-2">
                        <input
                          type="text"
                          required
                          value={newServerName}
                          onChange={(e) => setNewServerName(e.target.value)}
                          placeholder="Server Name (e.g., PubMed-MCP)"
                          className="bg-black/60 border border-slate-800 rounded p-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00ff66]"
                        />
                        <input
                          type="url"
                          required
                          value={newServerUrl}
                          onChange={(e) => setNewServerUrl(e.target.value)}
                          placeholder="SSE/HTTP URL (e.g., http://host/api)"
                          className="bg-black/60 border border-slate-800 rounded p-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00ff66]"
                        />
                        <button
                          type="submit"
                          disabled={isRegisteringServer}
                          className="bg-slate-900 border border-slate-700 text-white font-mono font-bold hover:bg-slate-800 hover:text-[#00ff66] py-1 text-xs rounded transition flex items-center justify-center gap-1"
                        >
                          {isRegisteringServer ? (
                            <>
                              <Loader2 className="w-3 animate-spin" />
                              <span>SYNAPSING SOCKET...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>REGISTER EXTERNAL MCP SERVER</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Registered Servers List */}
                      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                        <div className="text-[10px] font-mono text-slate-500 uppercase border-b border-slate-900 pb-0.5">REGISTERED EXTERNAL MCP NODES:</div>
                        {externalServers.length === 0 ? (
                          <div className="text-[10px] italic text-[#7a8c7a] py-1 font-mono">No external MCP servers synapsed.</div>
                        ) : (
                          externalServers.map((srv) => (
                            <div key={srv.id} className="p-1.5 bg-black/40 border border-slate-900 rounded flex justify-between items-center text-[10px] font-mono">
                              <div className="truncate pr-2 flex flex-col gap-0.5">
                                <span className="text-[#00ff66] font-bold">{srv.name}</span>
                                <span className="text-slate-500 text-[9px] truncate">{srv.url}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteMcpClient(srv.id)}
                                className="text-red-400 hover:text-red-500 p-1"
                                title="Sever connection"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gateway Integration Activity Stream (Logs Table) */}
                <div className="mt-6 bg-black/30 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-mono text-slate-300 uppercase">Live Integration Requests Trace Stream</h4>
                    </div>
                    {integrationLogs.length > 0 && (
                      <button
                        onClick={handleClearIntegrationLogs}
                        className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-900/40 hover:bg-red-950/20 px-2 py-0.5 rounded transition"
                      >
                        <Trash className="w-3 h-3" />
                        <span>Clear Stream</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    {integrationLogs.length === 0 ? (
                      <div className="text-xs italic text-slate-500 text-center py-6 font-mono">No gateway transaction logs recorded yet. Run a simulator test!</div>
                    ) : (
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead>
                          <tr className="text-slate-500 uppercase border-b border-slate-900 text-[9px]">
                            <th className="py-1.5">Timestamp</th>
                            <th>Protocol</th>
                            <th>Payload (Query)</th>
                            <th>Duration</th>
                            <th>Safety Agent Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {integrationLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-900/20">
                              <td className="py-2 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                              <td className="font-bold text-slate-300">
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                  log.protocol === "MCP" ? "bg-[#00ff66]/10 text-[#00ff66]" : "bg-cyan-950 text-cyan-400"
                                }`}>
                                  {log.protocol}
                                </span>
                              </td>
                              <td className="text-slate-400 max-w-md truncate" title={log.query}>
                                {log.query}
                              </td>
                              <td className="text-slate-400 whitespace-nowrap">{log.duration}ms</td>
                              <td>
                                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                                  log.safetyCleared
                                    ? "bg-emerald-950 text-emerald-400"
                                    : "bg-red-950 text-red-400"
                                }`}>
                                  {log.safetyCleared ? "Approved" : "Blocked"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'omics' && <OmicsPanel omicsData={omics} studiesData={studies} onQueryOrchestrator={handleQueryOrchestrator} onGenerateDesign={handleGenerateDesign} />}
            {activeTab === 'cultivator' && <CultivatorPanel onQueryOrchestrator={handleQueryOrchestrator} onGenerateDesign={handleGenerateDesign} onSaveChemotype={handleSaveChemotype} />}
            {activeTab === 'study_design' && <StudyDesignAssistant studiesData={studies} initialTargetSystem={designTarget} initialCannabinoid={designCannabinoid} onSaveEpisode={(episode) => console.log('Saving episode', episode)} />}

            {/* TAB 9: SCIENTIFIC RESEARCH LAB AGENT */}
            {activeTab === "lab" && (
              <ResearchLab 
                addTelemetryLog={addTelemetryLog}
                triggerRefreshDatabases={fetchData}
              />
            )}

          </div>

          {/* Bottom Row: Live Ingest Stream Logs & Radial Gauge */}
          <div className="h-44 flex flex-col md:flex-row gap-4 shrink-0">
            {/* System Log Term */}
            <div className="flex-1 bg-[#0d140d] border border-[#1a2e1a] rounded-lg p-4 font-mono overflow-hidden flex flex-col min-h-[140px]">
              <h3 className="text-[10px] text-[#7a8c7a] mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>HEMP OS TELEMETRY log STREAM</span>
                <span className="text-[9px] text-[#00ff66]">LIVE STATUS: OK</span>
              </h3>
              <div className="flex-1 overflow-y-auto text-[9px] space-y-1 pr-1 font-mono text-slate-300">
                {liveLog.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-emerald-500/60 shrink-0">✔</span>
                    <span>{log}</span>
                  </div>
                ))}
                <div className="flex gap-2 text-slate-500">
                  <span>[04:51:38]</span> <span>Initialized Hemp OS Kernel Core. Establishing memory mapping...</span>
                </div>
                <div className="flex gap-2 text-slate-500">
                  <span>[04:51:39]</span> <span>Preloaded 16 default ontology nodes into Neo4j client index.</span>
                </div>
              </div>
            </div>

            {/* Radial Evidence Conviction */}
            <div className="w-full md:w-72 bg-[#0d140d] border border-[#1a2e1a] rounded-lg p-4 flex flex-col shrink-0">
              <h3 className="text-[10px] text-[#7a8c7a] mb-3 uppercase tracking-wider">SYSTEM CLINICAL CONVICTION TIER</h3>
              <div className="flex-1 flex items-center justify-center pt-1">
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    <path className="stroke-white/5" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="2.2" />
                    <path className="stroke-[#00ff66] shadow-[0_0_8px_#00ff66]" strokeDasharray="89, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-mono text-white font-bold">Tier 1</span>
                    <span className="text-[8px] text-[#7a8c7a] tracking-wider font-bold">HIGH CONVICTION</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* Right Sidebar: Latency & Table Metrics */}
        <aside className="w-full md:w-56 flex flex-col gap-4 shrink-0">
          <div className="bg-[#0d140d] border border-[#1a2e1a] rounded-lg p-4 flex-1 flex flex-col">
            <h2 className="text-[11px] font-mono uppercase text-[#7a8c7a] mb-4">Search Latency</h2>
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono">
                  <span>PubMed Stream</span>
                  <span>124ms</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40 w-[62%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono">
                  <span>Google Drive API</span>
                  <span>458ms</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40 w-[88%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono">
                  <span>Neo4j Cache</span>
                  <span>2ms</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00ff66] w-[12%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono">
                  <span>BigQuery Indices</span>
                  <span>15ms</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00ff66] w-[24%]"></div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-800/80 pt-4">
              <h2 className="text-[11px] font-mono uppercase text-[#7a8c7a] mb-3">Warehouse Index</h2>
              <div className="space-y-2">
                <div className="p-2 bg-black/40 rounded border border-white/5 flex justify-between items-center">
                  <div className="text-[9px] text-[#00ff66] font-mono">STUDIES_DB</div>
                  <div className="text-xs font-mono text-white">{studies.length} records</div>
                </div>
                <div className="p-2 bg-black/40 rounded border border-white/5 flex justify-between items-center">
                  <div className="text-[9px] text-[#00e5ff] font-mono">OMICS_SIG</div>
                  <div className="text-xs font-mono text-white">{omics.length} signatures</div>
                </div>
                <div className="p-2 bg-black/40 rounded border border-white/5 flex justify-between items-center">
                  <div className="text-[9px] text-purple-400 font-mono">IMAGING_STATS</div>
                  <div className="text-xs font-mono text-white">{imaging.length} metrics</div>
                </div>
                <div className="p-2 bg-black/40 rounded border border-white/5 flex justify-between items-center">
                  <div className="text-[9px] text-rose-400 font-mono">ONTOLOGY_NODES</div>
                  <div className="text-xs font-mono text-white">{graphNodes.length} units</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#00ff66] p-4 rounded-lg text-black font-bold flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:scale-[1.02] transition duration-150 cursor-pointer">
            <div className="text-[9px] uppercase tracking-tighter mb-1 font-mono font-bold">Manual swarm trigger</div>
            <button 
              onClick={handleManualInference}
              className="text-sm tracking-tight uppercase px-4 py-1.5 border-2 border-black font-mono font-black"
            >
              Run Core Inference
            </button>
          </div>
        </aside>
      </div>

      {/* Footer Bar */}
      <footer className="h-8 bg-[#080d08] border-t border-[#1a2e1a] px-6 flex items-center justify-between text-[9px] font-mono text-[#4a5c4a] shrink-0">
        <div className="flex gap-4">
          <span>SYSTEM: OK</span>
          <span>DB_CONNECTION: BIGQUERY_ESTABLISHED</span>
          <span>NEO4J: SYNCED</span>
          <span>MEM0: SELF_LEARNING_ACTIVE</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full animate-ping"></div>
          <span className="text-[#00ff66]/80 font-bold uppercase">THC_BRAIN_KNOWLEDGE_2026_07_SNAPSHOT</span>
        </div>
      </footer>
    </div>
  );
}
