import React, { useState, useMemo } from "react";
import { GraphNode, GraphEdge, NodeProvenance, EdgeProvenance, BaseGraphNode } from "../types";
import { Network, Database, Eye, Activity, Filter, Info, Search, ShieldCheck, CheckCircle2, AlertTriangle, Play } from "lucide-react";

interface GraphVisualizerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onAddNode?: (node: GraphNode) => void;
  onAddEdge?: (edge: GraphEdge) => void;
  onVerifyNode?: (nodeId: string, status: "verified" | "unverified" | "contradicted") => void;
  onVerifyEdge?: (edgeId: string, status: "verified" | "unverified" | "contradicted") => void;
  onDistillEpisode?: (episodeNodeId: string) => void;
  onKairosTrigger?: () => void;
}

export default function GraphVisualizer({ 
  nodes, 
  edges, 
  onAddNode, 
  onAddEdge,
  onVerifyNode,
  onVerifyEdge,
  onDistillEpisode,
  onKairosTrigger
}: GraphVisualizerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("THC");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("All");
  const [selectedMemoryFilter, setSelectedMemoryFilter] = useState<string>("All");

  // Add Node State
  const [newNodeId, setNewNodeId] = useState("");
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeType, setNewNodeType] = useState<GraphNode["type"]>("Cannabinoid");

  // Type-specific additions
  const [newAgentRole, setNewAgentRole] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("pending");
  const [newEpisodeTimestamp, setNewEpisodeTimestamp] = useState(new Date().toISOString());
  const [newWorkflowTemplate, setNewWorkflowTemplate] = useState("");
  const [newInvariantConstraint, setNewInvariantConstraint] = useState("");
  const [newProcedureSource, setNewProcedureSource] = useState("");

  // Provenance state (required for verified node injection)
  const [newProvSource, setNewProvSource] = useState("manual-injection");
  const [newProvSourceType, setNewProvSourceType] = useState<NodeProvenance["sourceType"]>("Agent");
  const [newProvAssertingAgent, setNewProvAssertingAgent] = useState("UserOperator");
  const [newProvConfidence, setNewProvConfidence] = useState(0.95);
  const [newProvStatus, setNewProvStatus] = useState<NodeProvenance["verificationStatus"]>("verified");
  const [newProvEpisodeId, setNewProvEpisodeId] = useState("EPI-MANUAL");

  // Add Edge State
  const [newEdgeSource, setNewEdgeSource] = useState("");
  const [newEdgeTarget, setNewEdgeTarget] = useState("");
  const [newEdgeRelation, setNewEdgeRelation] = useState<GraphEdge["relation"]>("affects");

  // Edge Provenance state
  const [newEdgeProvSource, setNewEdgeProvSource] = useState("manual-injection");
  const [newEdgeProvAssertingAgent, setNewEdgeProvAssertingAgent] = useState("UserOperator");
  const [newEdgeProvConfidence, setNewEdgeProvConfidence] = useState(0.95);
  const [newEdgeProvStatus, setNewEdgeProvStatus] = useState<EdgeProvenance["verificationStatus"]>("verified");
  const [newEdgeProvEpisodeId, setNewEdgeProvEpisodeId] = useState("EPI-MANUAL");
  const [newEdgeEvidenceNode, setNewEdgeEvidenceNode] = useState("");

  // Positions layout logic incorporating new bands
  const positions = useMemo(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    const counts: Record<string, number> = {};

    nodes.forEach((node) => {
      const type = node.type;
      if (!counts[type]) counts[type] = 0;
      counts[type]++;
    });

    const indices: Record<string, number> = {};
    nodes.forEach((node) => {
      const type = node.type;
      if (indices[type] === undefined) indices[type] = 0;
      const idx = indices[type]++;
      const total = counts[type];

      let x = 300;
      let y = 200;

      switch (type) {
        case "Cannabinoid":
          x = 80;
          y = 120 + (idx / Math.max(1, total - 1)) * 260;
          break;
        case "Receptor":
          x = 240;
          y = 140 + (idx / Math.max(1, total - 1)) * 220;
          break;
        case "Pathway":
          x = 400;
          y = 160 + (idx / Math.max(1, total - 1)) * 180;
          break;
        case "BrainRegion":
          x = 560;
          y = 120 + (idx / Math.max(1, total - 1)) * 260;
          break;
        case "Phenotype":
          x = 720;
          y = 100 + (idx / Math.max(1, total - 1)) * 300;
          break;
        case "Study":
        case "Dataset":
        case "Population":
          x = 320 + (idx % 2 === 0 ? -120 : 120);
          y = 120 + idx * 50;
          break;
        case "Agent":
          // Top Band for Agents
          x = 80 + (idx / Math.max(1, total - 1)) * 740;
          y = 45;
          break;
        case "Episode":
          // Bottom Band for Episodes
          x = 80 + (idx / Math.max(1, total - 1)) * 740;
          y = 445;
          break;
        case "Workflow":
        case "Procedure":
        case "Invariant":
          // Far-right column
          x = 880;
          y = 100 + (idx / Math.max(1, total - 1)) * 300;
          break;
        default:
          x = 300;
          y = 200;
      }
      layout[node.id] = { x, y };
    });

    return layout;
  }, [nodes]);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedEdge = useMemo(() => {
    return edges.find((e) => e.id === selectedEdgeId) || null;
  }, [edges, selectedEdgeId]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            node.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTypeFilter === "All" || node.type === selectedTypeFilter;
      
      let matchesMemory = true;
      if (selectedMemoryFilter === "Episodic") {
        matchesMemory = ["Episode", "Task", "Agent"].includes(node.type);
      } else if (selectedMemoryFilter === "Semantic") {
        const domainTypes = ["Cannabinoid", "Receptor", "Pathway", "BrainRegion", "Phenotype", "Study", "Dataset", "Population"];
        matchesMemory = domainTypes.includes(node.type) && (!node.provenance || node.provenance.verificationStatus === "verified");
      } else if (selectedMemoryFilter === "Procedural") {
        matchesMemory = ["Workflow", "Procedure", "Invariant"].includes(node.type);
      }

      return matchesSearch && matchesType && matchesMemory;
    });
  }, [nodes, searchQuery, selectedTypeFilter, selectedMemoryFilter]);

  // Edges linked to filtered nodes
  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [edges, filteredNodes]);

  // Find related connections for selected node
  const selectedNodeRelations = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId);
  }, [edges, selectedNodeId]);

  const nodeColors: Record<GraphNode["type"], string> = {
    Cannabinoid: "fill-emerald-500 stroke-emerald-400 text-emerald-950",
    Receptor: "fill-indigo-500 stroke-indigo-400 text-indigo-950",
    Pathway: "fill-cyan-500 stroke-cyan-400 text-cyan-950",
    BrainRegion: "fill-purple-500 stroke-purple-400 text-purple-950",
    Phenotype: "fill-rose-500 stroke-rose-400 text-rose-950",
    Study: "fill-amber-500 stroke-amber-400 text-amber-950",
    Dataset: "fill-blue-500 stroke-blue-400 text-blue-950",
    Population: "fill-teal-500 stroke-teal-400 text-teal-950",
    Agent: "fill-orange-500 stroke-orange-400 text-orange-950",
    Task: "fill-yellow-500 stroke-yellow-400 text-yellow-950",
    Episode: "fill-slate-500 stroke-slate-400 text-slate-950",
    Workflow: "fill-pink-500 stroke-pink-400 text-pink-950",
    Invariant: "fill-red-600 stroke-red-500 text-red-950",
    Procedure: "fill-lime-500 stroke-lime-400 text-lime-950"
  };

  const relationColors: Record<GraphEdge["relation"], string> = {
    affects: "stroke-emerald-500/50",
    associated_with: "stroke-slate-400/50",
    upregulates: "stroke-cyan-500/70",
    downregulates: "stroke-rose-500/70",
    observed_in: "stroke-purple-500/50",
    contradicted_by: "stroke-red-500/80 stroke-dasharray-[3,3]",
    
    // Cognitive-layer relations
    depends_on: "stroke-slate-500/50",
    refines: "stroke-green-500/60",
    generalizes: "stroke-blue-500/50",
    supports: "stroke-teal-500/60",
    invalidates: "stroke-red-600/80 stroke-dasharray-[3,3]",
    derived_from: "stroke-amber-600/50",
    verified_by: "stroke-emerald-600/70",
    asserted_by: "stroke-orange-500/50",
    compressed_into: "stroke-pink-500/50",
    triggers: "stroke-yellow-500/60",
    produced_by: "stroke-gray-400/50"
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeId || !newNodeLabel || !onAddNode) return;

    const baseNode: BaseGraphNode = {
      id: newNodeId.toUpperCase().trim(),
      label: newNodeLabel.trim(),
      provenance: {
        source: newProvSource.trim() || "manual-injection",
        sourceType: newProvSourceType,
        assertingAgent: newProvAssertingAgent.trim() || "UserOperator",
        confidence: Number(newProvConfidence),
        verificationStatus: newProvStatus,
        timestamp: new Date().toISOString(),
        episodeId: newProvEpisodeId.trim() || "EPI-MANUAL"
      }
    };

    let finalNode: GraphNode;
    if (newNodeType === "Agent") {
      finalNode = { ...baseNode, type: "Agent", agentRole: newAgentRole.trim() || "Autonomous Agent" };
    } else if (newNodeType === "Task") {
      finalNode = { ...baseNode, type: "Task", taskStatus: newTaskStatus };
    } else if (newNodeType === "Episode") {
      finalNode = { ...baseNode, type: "Episode", timestamp: newEpisodeTimestamp };
    } else if (newNodeType === "Workflow") {
      finalNode = { ...baseNode, type: "Workflow", template: newWorkflowTemplate.trim() || "Standard Template" };
    } else if (newNodeType === "Invariant") {
      finalNode = { ...baseNode, type: "Invariant", constraint: newInvariantConstraint.trim() || "State constraint" };
    } else if (newNodeType === "Procedure") {
      finalNode = { ...baseNode, type: "Procedure", sourceWorkflow: newProcedureSource.trim() || "WKF-001" };
    } else {
      finalNode = { ...baseNode, type: newNodeType as any };
    }

    onAddNode(finalNode);
    setNewNodeId("");
    setNewNodeLabel("");
  };

  const handleCreateEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdgeSource || !newEdgeTarget || !onAddEdge) return;

    onAddEdge({
      id: `E-${Date.now()}`,
      source: newEdgeSource,
      target: newEdgeTarget,
      relation: newEdgeRelation,
      provenance: {
        source: newEdgeProvSource.trim() || "manual-injection",
        assertingAgent: newEdgeProvAssertingAgent.trim() || "UserOperator",
        confidence: Number(newEdgeProvConfidence),
        verificationStatus: newEdgeProvStatus,
        timestamp: new Date().toISOString(),
        episodeId: newEdgeProvEpisodeId.trim() || "EPI-MANUAL",
        evidence: newEdgeEvidenceNode ? [newEdgeEvidenceNode] : [newEdgeSource, newEdgeTarget]
      }
    });

    setNewEdgeSource("");
    setNewEdgeTarget("");
  };

  const getVerificationStroke = (node: GraphNode) => {
    const isDomain = ["Cannabinoid", "Receptor", "Pathway", "BrainRegion", "Phenotype", "Study", "Dataset", "Population"].includes(node.type);
    const finalStatus = node.provenance?.verificationStatus || (isDomain ? "verified" : "unverified");

    if (finalStatus === "verified") return "stroke-emerald-500 stroke-[2px]";
    if (finalStatus === "contradicted") return "stroke-red-500 stroke-[2px] stroke-dasharray-[3,3] animate-pulse";
    return "stroke-amber-500 stroke-[1.5px] stroke-dasharray-[2,2]";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Control Panel / Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Filter className="w-4 h-4" />
            <span>GRAPH CONTROLLER</span>
          </div>
        </div>

        {/* Action: Kairos Autonomy Trigger */}
        {onKairosTrigger && (
          <button
            type="button"
            onClick={onKairosTrigger}
            className="w-full bg-orange-950/40 hover:bg-orange-900/50 border border-orange-800/60 text-orange-400 font-mono text-[10px] font-bold py-1.5 px-2 rounded transition flex items-center justify-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>Spawn Autonomous Task Node</span>
          </button>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
          />
        </div>

        {/* Classification / Filters Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Type Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-medium">Node Category</label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Categories</option>
              <option value="Cannabinoid">Cannabinoids</option>
              <option value="Receptor">Receptors</option>
              <option value="Pathway">Pathways</option>
              <option value="BrainRegion">Brain Regions</option>
              <option value="Phenotype">Phenotypes</option>
              <option value="Study">Clinical Studies</option>
              <option value="Agent">Agents</option>
              <option value="Task">Tasks</option>
              <option value="Episode">Episodes</option>
              <option value="Workflow">Workflows</option>
              <option value="Invariant">Invariants</option>
              <option value="Procedure">Procedures</option>
            </select>
          </div>

          {/* Memory Type Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-medium">Memory Layer</label>
            <select
              value={selectedMemoryFilter}
              onChange={(e) => setSelectedMemoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Memory</option>
              <option value="Episodic">Episodic (Episodes/Tasks)</option>
              <option value="Semantic">Semantic (Verified Facts)</option>
              <option value="Procedural">Procedural (Workflows)</option>
            </select>
          </div>
        </div>

        {/* Selected Node or Edge Details */}
        <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between overflow-y-auto max-h-[340px]">
          <div>
            {selectedNode ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-400 mb-1 font-medium flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>INSPECTED NODE</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {selectedNode.id}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                    {selectedNode.type}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100">{selectedNode.label}</h4>

                {/* Cognitive Specific Attributes */}
                {selectedNode.type === "Agent" && (
                  <div className="bg-orange-950/20 border border-orange-900/30 rounded p-2 text-xs font-mono text-orange-300 mt-1">
                    <div className="text-[10px] text-orange-500 font-bold uppercase mb-0.5">AGENT ROLE</div>
                    <div>{selectedNode.agentRole || "Autonomous pipeline module"}</div>
                  </div>
                )}
                {selectedNode.type === "Task" && (
                  <div className="bg-yellow-950/20 border border-yellow-900/30 rounded p-2 text-xs font-mono text-yellow-300 mt-1">
                    <div className="text-[10px] text-yellow-500 font-bold uppercase mb-0.5">TASK STATUS</div>
                    <div className="capitalize font-bold">{selectedNode.taskStatus || "pending"}</div>
                  </div>
                )}
                {selectedNode.type === "Episode" && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 mt-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">EPISODIC TIMESTAMP</div>
                    <div>{selectedNode.timestamp ? new Date(selectedNode.timestamp).toLocaleString() : "Unknown"}</div>
                  </div>
                )}
                {selectedNode.type === "Workflow" && (
                  <div className="bg-pink-950/20 border border-pink-900/30 rounded p-2 text-xs font-mono text-pink-300 mt-1">
                    <div className="text-[10px] text-pink-500 font-bold uppercase mb-0.5">WORKFLOW TEMPLATE</div>
                    <div>{selectedNode.template || "Standard Procedure Map"}</div>
                  </div>
                )}
                {selectedNode.type === "Invariant" && (
                  <div className="bg-red-950/20 border border-red-900/30 rounded p-2 text-xs font-mono text-red-300 mt-1">
                    <div className="text-[10px] text-red-500 font-bold uppercase mb-0.5">INVARIANT CONSTRAINT</div>
                    <div>{selectedNode.constraint || "No constraints specified"}</div>
                  </div>
                )}
                {selectedNode.type === "Procedure" && (
                  <div className="bg-lime-950/20 border border-lime-900/30 rounded p-2 text-xs font-mono text-lime-300 mt-1">
                    <div className="text-[10px] text-lime-500 font-bold uppercase mb-0.5">SOURCE WORKFLOW</div>
                    <div>{selectedNode.sourceWorkflow || "Self-contained procedure"}</div>
                  </div>
                )}

                {/* Relationships list */}
                <div className="border-t border-slate-800/80 my-1 pt-1.5">
                  <span className="text-[10px] font-medium text-slate-400 block mb-1">RELATIONSHIPS ({selectedNodeRelations.length})</span>
                  <div className="max-h-[85px] overflow-y-auto flex flex-col gap-1">
                    {selectedNodeRelations.map((e) => {
                      const otherNodeId = e.source === selectedNode.id ? e.target : e.source;
                      const otherNode = nodes.find((n) => n.id === otherNodeId);
                      const isOutgoing = e.source === selectedNode.id;
                      return (
                        <div key={e.id} className="text-[11px] flex items-center justify-between bg-slate-900/50 px-2 py-1 rounded border border-slate-800/30">
                          <span 
                            onClick={() => { setSelectedEdgeId(e.id); setSelectedNodeId(null); }}
                            className="text-slate-400 hover:text-cyan-400 cursor-pointer font-mono text-[9px]"
                          >
                            {isOutgoing ? "→" : "←"} {e.relation}
                          </span>
                          <span 
                            onClick={() => { setSelectedNodeId(otherNodeId); setSelectedEdgeId(null); }}
                            className="text-emerald-400 hover:underline cursor-pointer font-medium truncate max-w-[100px]"
                          >
                            {otherNode ? otherNode.label : otherNodeId}
                          </span>
                        </div>
                      );
                    })}
                    {selectedNodeRelations.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No connections established.</span>
                    )}
                  </div>
                </div>

                {/* Provenance & Grounding Details Panel */}
                <div className="border-t border-slate-800/80 mt-1 pt-1.5">
                  <span className="text-[10px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                    <Database className="w-3 h-3 text-emerald-400" />
                    PROVENANCE & GROUNDING
                  </span>
                  {selectedNode.provenance ? (
                    <div className="bg-slate-900/80 rounded border border-slate-800/60 p-2 flex flex-col gap-1.5 text-[10px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Source:</span>
                        <span className="text-slate-300 truncate max-w-[120px]" title={selectedNode.provenance.source}>
                          {selectedNode.provenance.source}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Type:</span>
                        <span className="text-cyan-400 font-bold">{selectedNode.provenance.sourceType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Asserted By:</span>
                        <span className="text-orange-400 font-bold bg-orange-950/30 border border-orange-900/20 px-1 rounded text-[9px]">
                          {selectedNode.provenance.assertingAgent}
                        </span>
                      </div>
                      
                      {/* Confidence & Verification Split Display */}
                      <div className="flex flex-col gap-1 mt-0.5 border-t border-slate-800/50 pt-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-slate-500">Confidence Score:</span>
                          <span className="text-emerald-400 font-bold">{(selectedNode.provenance.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex border border-slate-800/60">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedNode.provenance.confidence >= 0.8 ? "bg-emerald-500" :
                              selectedNode.provenance.confidence >= 0.5 ? "bg-amber-500" : "bg-red-500"
                            }`} 
                            style={{ width: `${selectedNode.provenance.confidence * 100}%` }} 
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-800/50 pt-1">
                        <span className="text-slate-500">Verification:</span>
                        <span className={`px-1 rounded text-[9px] uppercase font-bold tracking-wider border ${
                          selectedNode.provenance.verificationStatus === "verified" ? "bg-emerald-950/40 border-emerald-800 text-emerald-400" :
                          selectedNode.provenance.verificationStatus === "contradicted" ? "bg-red-950/40 border-red-900 text-red-400 animate-pulse" : 
                          "bg-amber-950/40 border-amber-800 text-amber-400"
                        }`}>
                          {selectedNode.provenance.verificationStatus}
                        </span>
                      </div>

                      <div className="flex justify-between border-t border-slate-800/50 pt-1 text-[9px]">
                        <span className="text-slate-500">Timestamp:</span>
                        <span className="text-slate-400">
                          {new Date(selectedNode.provenance.timestamp).toLocaleDateString()} {new Date(selectedNode.provenance.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Episode:</span>
                        <span 
                          onClick={() => {
                            if (nodes.some(n => n.id === selectedNode.provenance?.episodeId)) {
                              setSelectedNodeId(selectedNode.provenance.episodeId);
                              setSelectedEdgeId(null);
                            }
                          }}
                          className="text-indigo-400 cursor-pointer hover:underline truncate max-w-[100px] font-bold"
                        >
                          {selectedNode.provenance.episodeId}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic p-1.5 bg-slate-900/30 rounded border border-slate-800/20 font-mono">
                      No provenance record found. Legacy node (assumed verified baseline knowledge).
                    </div>
                  )}
                </div>

                {/* Actions: Verify / Contradict buttons */}
                {onVerifyNode && (
                  <div className="flex gap-1.5 mt-1 border-t border-slate-800/40 pt-1.5">
                    <button
                      type="button"
                      onClick={() => onVerifyNode(selectedNode.id, "verified")}
                      className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 rounded py-1 px-1 text-[10px] font-mono font-bold transition flex items-center justify-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verify</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerifyNode(selectedNode.id, "contradicted")}
                      className="flex-1 bg-red-950/40 hover:bg-red-900/60 border border-red-950 text-red-400 rounded py-1 px-1 text-[10px] font-mono font-bold transition flex items-center justify-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span>Contradict</span>
                    </button>
                  </div>
                )}

                {/* Actions: Trigger Offline Distillation on Episode */}
                {onDistillEpisode && selectedNode.type === "Episode" && (
                  <button
                    type="button"
                    onClick={() => onDistillEpisode(selectedNode.id)}
                    className="w-full mt-1 bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-700/50 text-indigo-200 font-mono text-[10px] font-bold py-1 px-2 rounded transition flex items-center justify-center gap-1"
                  >
                    <Database className="w-3 h-3 text-indigo-400" />
                    <span>Distill Episode to Facts</span>
                  </button>
                )}

              </div>
            ) : selectedEdge ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-400 mb-1 font-medium flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1">
                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                    <span>INSPECTED SYNAPSE EDGE</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {selectedEdge.id}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400">
                    {selectedEdge.relation}
                  </span>
                </div>

                {/* Edge Synapse Direction Flow */}
                <div className="bg-slate-900/80 rounded border border-slate-800/60 p-2 flex flex-col gap-1 text-[11px] font-mono">
                  <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">SYNAPSE DIRECTION</div>
                  <div className="flex items-center justify-between gap-1">
                    <span 
                      onClick={() => { setSelectedNodeId(selectedEdge.source); setSelectedEdgeId(null); }}
                      className="text-emerald-400 hover:underline cursor-pointer truncate max-w-[90px] font-bold"
                    >
                      {nodes.find(n => n.id === selectedEdge.source)?.label || selectedEdge.source}
                    </span>
                    <span className="text-slate-600 font-bold">-{selectedEdge.relation}→</span>
                    <span 
                      onClick={() => { setSelectedNodeId(selectedEdge.target); setSelectedEdgeId(null); }}
                      className="text-emerald-400 hover:underline cursor-pointer truncate max-w-[90px] font-bold"
                    >
                      {nodes.find(n => n.id === selectedEdge.target)?.label || selectedEdge.target}
                    </span>
                  </div>
                </div>

                {/* Edge Provenance & Grounding Panel */}
                <div className="border-t border-slate-800/80 mt-1 pt-1.5">
                  <span className="text-[10px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                    <Database className="w-3 h-3 text-cyan-400" />
                    SYNAPSE PROVENANCE
                  </span>
                  {selectedEdge.provenance ? (
                    <div className="bg-slate-900/80 rounded border border-slate-800/60 p-2 flex flex-col gap-1.5 text-[10px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Source Link:</span>
                        <span className="text-slate-300 truncate max-w-[120px]" title={selectedEdge.provenance.source}>
                          {selectedEdge.provenance.source}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Asserted By:</span>
                        <span className="text-orange-400 font-bold bg-orange-950/30 border border-orange-900/20 px-1 rounded text-[9px]">
                          {selectedEdge.provenance.assertingAgent}
                        </span>
                      </div>

                      {/* Edge Confidence Split Display */}
                      <div className="flex flex-col gap-1 mt-0.5 border-t border-slate-800/50 pt-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-slate-500">Edge Confidence:</span>
                          <span className="text-cyan-400 font-bold">{(selectedEdge.provenance.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex border border-slate-800/60">
                          <div 
                            className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                            style={{ width: `${selectedEdge.provenance.confidence * 100}%` }} 
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-800/50 pt-1">
                        <span className="text-slate-500">Verification:</span>
                        <span className={`px-1 rounded text-[9px] uppercase font-bold tracking-wider border ${
                          selectedEdge.provenance.verificationStatus === "verified" ? "bg-emerald-950/40 border-emerald-800 text-emerald-400" :
                          selectedEdge.provenance.verificationStatus === "contradicted" ? "bg-red-950/40 border-red-900 text-red-400 animate-pulse" : 
                          "bg-amber-950/40 border-amber-800 text-amber-400"
                        }`}>
                          {selectedEdge.provenance.verificationStatus}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Origin Episode:</span>
                        <span 
                          onClick={() => {
                            if (nodes.some(n => n.id === selectedEdge.provenance?.episodeId)) {
                              setSelectedNodeId(selectedEdge.provenance.episodeId);
                              setSelectedEdgeId(null);
                            }
                          }}
                          className="text-indigo-400 cursor-pointer hover:underline truncate max-w-[100px] font-bold"
                        >
                          {selectedEdge.provenance.episodeId}
                        </span>
                      </div>

                      {/* Supporting evidence node IDs */}
                      {selectedEdge.provenance.evidence && selectedEdge.provenance.evidence.length > 0 && (
                        <div className="border-t border-slate-800/50 pt-1 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-500 uppercase font-bold">Supporting Evidence Nodes</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedEdge.provenance.evidence.map((nodeId) => (
                              <span 
                                key={nodeId}
                                onClick={() => {
                                  if (nodes.some(n => n.id === nodeId)) {
                                    setSelectedNodeId(nodeId);
                                    setSelectedEdgeId(null);
                                  }
                                }}
                                className="bg-slate-950 hover:bg-slate-800 text-[9px] border border-slate-800 rounded px-1 text-slate-300 hover:text-emerald-400 cursor-pointer transition"
                              >
                                {nodeId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic p-1.5 bg-slate-900/30 rounded border border-slate-800/20 font-mono">
                      No provenance record found. Legacy baseline synapse connection.
                    </div>
                  )}
                </div>

                {/* Actions: Verify / Contradict edge buttons */}
                {onVerifyEdge && (
                  <div className="flex gap-1.5 mt-1 border-t border-slate-800/40 pt-1.5">
                    <button
                      type="button"
                      onClick={() => onVerifyEdge(selectedEdge.id, "verified")}
                      className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 rounded py-1 px-1 text-[10px] font-mono font-bold transition flex items-center justify-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verify Synapse</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerifyEdge(selectedEdge.id, "contradicted")}
                      className="flex-1 bg-red-950/40 hover:bg-red-900/60 border border-red-950 text-red-400 rounded py-1 px-1 text-[10px] font-mono font-bold transition flex items-center justify-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span>Contradict Synapse</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-4">Click a node or synapse edge on the graph to inspect its properties and molecular relationships.</div>
            )}
          </div>
        </div>

        {/* Add Node form with Provenance schema mandate */}
        {onAddNode && (
          <form onSubmit={handleCreateNode} className="border-t border-slate-800 pt-3 flex flex-col gap-2 max-h-[220px] overflow-y-auto">
            <span className="text-xs font-semibold text-slate-400 block">ADD NODE & MANDATE PROVENANCE</span>
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="ID (e.g. CB1)"
                value={newNodeId}
                onChange={(e) => setNewNodeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              <input
                type="text"
                placeholder="Label (e.g. CB1 Receptor)"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as GraphNode["type"])}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="Cannabinoid">Cannabinoid</option>
                <option value="Receptor">Receptor</option>
                <option value="Pathway">Pathway</option>
                <option value="BrainRegion">Brain Region</option>
                <option value="Phenotype">Phenotype</option>
                <option value="Agent">Agent</option>
                <option value="Task">Task</option>
                <option value="Episode">Episode</option>
                <option value="Workflow">Workflow</option>
                <option value="Invariant">Invariant</option>
                <option value="Procedure">Procedure</option>
              </select>

              {/* Dynamic Type-specific fields */}
              {newNodeType === "Agent" && (
                <input
                  type="text"
                  placeholder="Agent Role (e.g. Consensus Audit)"
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-orange-300 focus:outline-none focus:border-emerald-500"
                />
              )}
              {newNodeType === "Task" && (
                <select
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-yellow-300 focus:outline-none"
                >
                  <option value="pending">pending</option>
                  <option value="completed">completed</option>
                  <option value="failed">failed</option>
                </select>
              )}
              {newNodeType === "Episode" && (
                <input
                  type="text"
                  placeholder="Timestamp ISO 8601"
                  value={newEpisodeTimestamp}
                  onChange={(e) => setNewEpisodeTimestamp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                />
              )}
              {newNodeType === "Workflow" && (
                <input
                  type="text"
                  placeholder="Workflow Template Spec"
                  value={newWorkflowTemplate}
                  onChange={(e) => setNewWorkflowTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-pink-300 focus:outline-none"
                />
              )}
              {newNodeType === "Invariant" && (
                <input
                  type="text"
                  placeholder="Constraint rule check statement"
                  value={newInvariantConstraint}
                  onChange={(e) => setNewInvariantConstraint(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-red-300 focus:outline-none"
                />
              )}
              {newNodeType === "Procedure" && (
                <input
                  type="text"
                  placeholder="Source Workflow ID"
                  value={newProcedureSource}
                  onChange={(e) => setNewProcedureSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-lime-300 focus:outline-none"
                />
              )}

              {/* Provenance collapsible section */}
              <div className="border border-slate-800/80 bg-slate-950/40 rounded p-1.5 flex flex-col gap-1.5 mt-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Provenance Manifest (Mandatory)</span>
                <input
                  type="text"
                  placeholder="Source (e.g. paper:PMC123)"
                  value={newProvSource}
                  onChange={(e) => setNewProvSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200"
                  required
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={newProvSourceType}
                    onChange={(e) => setNewProvSourceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                  >
                    <option value="Document">Document</option>
                    <option value="URL">URL</option>
                    <option value="Agent">Agent</option>
                    <option value="Kernel">Kernel</option>
                    <option value="Experiment">Experiment</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Asserting Agent"
                    value={newProvAssertingAgent}
                    onChange={(e) => setNewProvAssertingAgent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                    required
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 font-mono">Confidence: {(newProvConfidence * 100).toFixed(0)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={newProvConfidence}
                    onChange={(e) => setNewProvConfidence(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold py-1 rounded text-xs transition">
                Inject Provenance Node
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Graphical Stage */}
      <div className="lg:col-span-3 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 relative min-h-[520px]">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <Network className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-300">COGNITIVE KNOWLEDGE METAGRAPH</span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2 justify-end text-[9px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 max-w-[280px] lg:max-w-none">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span>Cannabinoid</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span><span>Receptor</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span><span>Pathway</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span><span>Region</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>Phenotype</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span>Agent</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span><span>Task</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span><span>Episode</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span><span>Workflow</span></div>
        </div>

        {/* SVG Stage */}
        <div 
          onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
          className="flex-1 w-full h-full min-h-[440px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] relative"
        >
          <svg className="w-full h-full min-h-[430px]" viewBox="0 0 1020 500">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
            </defs>

            {/* Links */}
            {visibleEdges.map((edge) => {
              const start = positions[edge.source];
              const end = positions[edge.target];
              if (!start || !end) return null;

              const isSelected = selectedNodeId === edge.source || selectedNodeId === edge.target;
              const isDirectlySelected = selectedEdgeId === edge.id;

              return (
                <g 
                  key={edge.id}
                  className="cursor-pointer group select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    setSelectedNodeId(null);
                  }}
                >
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    className={`stroke-2 transition-all duration-300 ${relationColors[edge.relation]} ${
                      isDirectlySelected ? "stroke-cyan-400 stroke-[3px] opacity-100" :
                      isSelected ? "stroke-emerald-400 opacity-100" : "opacity-30 group-hover:opacity-75"
                    }`}
                    markerEnd="url(#arrow)"
                  />
                  {/* Styled label background badge */}
                  <rect
                    x={(start.x + end.x) / 2 - 35}
                    y={(start.y + end.y) / 2 - 10}
                    width="70"
                    height="14"
                    rx="3"
                    className={`transition-all duration-200 ${
                      isDirectlySelected ? "fill-cyan-950 stroke-cyan-500 stroke" : "fill-slate-950 stroke-slate-800/80 stroke"
                    } group-hover:stroke-slate-600`}
                  />
                  <text
                    x={(start.x + end.x) / 2}
                    y={(start.y + end.y) / 2 - 1}
                    className={`text-[8px] font-mono select-none text-center transition-colors ${
                      isDirectlySelected ? "fill-cyan-400 font-bold" : "fill-slate-400 group-hover:fill-slate-200"
                    }`}
                    textAnchor="middle"
                  >
                    {edge.relation}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;

              const isSelected = selectedNodeId === node.id;
              const colorClass = nodeColors[node.type];

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group select-none"
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  {/* Verification Status Ring */}
                  <circle
                    r={isSelected ? 18 : 15}
                    className={`fill-none transition-all duration-300 ${getVerificationStroke(node)}`}
                  />

                  {/* Core Node Circle */}
                  <circle
                    r={isSelected ? 14 : 11}
                    className={`${colorClass} transition-all duration-300 stroke-2 group-hover:scale-110 ${
                      isSelected ? "ring-4 ring-emerald-500/30" : ""
                    }`}
                  />
                  
                  <text
                    y="-22"
                    className="fill-slate-300 text-[10px] font-medium transition-colors group-hover:fill-emerald-400 font-sans"
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                  <text
                    className="fill-slate-950 font-mono text-[8px] font-bold"
                    textAnchor="middle"
                    y="3"
                  >
                    {node.id.substring(0, 4)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Edge Injection Form requiring evidence nodes */}
        {onAddEdge && (
          <form onSubmit={handleCreateEdge} className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">CONNECT NODES & DECLARE EVIDENCE COGNITION</span>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={newEdgeSource}
                  onChange={(e) => setNewEdgeSource(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Source Node</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.id} - {n.label}</option>
                  ))}
                </select>
                <select
                  value={newEdgeRelation}
                  onChange={(e) => setNewEdgeRelation(e.target.value as GraphEdge["relation"])}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="affects">affects</option>
                  <option value="associated_with">associated_with</option>
                  <option value="upregulates">upregulates</option>
                  <option value="downregulates">downregulates</option>
                  <option value="observed_in">observed_in</option>
                  <option value="contradicted_by">contradicted_by</option>
                  <option value="depends_on">depends_on</option>
                  <option value="refines">refines</option>
                  <option value="generalizes">generalizes</option>
                  <option value="supports">supports</option>
                  <option value="invalidates">invalidates</option>
                  <option value="derived_from">derived_from</option>
                  <option value="verified_by">verified_by</option>
                  <option value="asserted_by">asserted_by</option>
                  <option value="compressed_into">compressed_into</option>
                  <option value="triggers">triggers</option>
                  <option value="produced_by">produced_by</option>
                </select>
                <select
                  value={newEdgeTarget}
                  onChange={(e) => setNewEdgeTarget(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Target Node</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.id} - {n.label}</option>
                  ))}
                </select>
              </div>

              {/* Collapsible/Inlined Edge Provenance fields */}
              <div className="flex flex-wrap gap-2 items-center border border-slate-800/80 bg-slate-900/40 rounded p-1 text-[10px]">
                <input
                  type="text"
                  placeholder="Prov Source (e.g. PMC123)"
                  value={newEdgeProvSource}
                  onChange={(e) => setNewEdgeProvSource(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-slate-300 w-[110px]"
                />
                <input
                  type="text"
                  placeholder="Asserting Agent"
                  value={newEdgeProvAssertingAgent}
                  onChange={(e) => setNewEdgeProvAssertingAgent(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-slate-300 w-[100px]"
                />
                <select
                  value={newEdgeEvidenceNode}
                  onChange={(e) => setNewEdgeEvidenceNode(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-slate-300"
                >
                  <option value="">No Evidence Cite</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>Cite: {n.id}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold px-3 py-1 rounded text-xs transition">
                Create Provenance Edge
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
