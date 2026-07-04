import { DeterministicExecutionTrace, Study, OmicsSignature, ImagingMetric, MemoryItem } from "../types";
import { GoogleGenAI } from "@google/genai";

// OpenClaw inspired Gateway Service
export class GatewayService {
  private static instance: GatewayService;

  private constructor() {}

  public static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService();
    }
    return GatewayService.instance;
  }

  // Routing orchestrator
  async routeToOrchestrator(
    query: string,
    mode: "clinical" | "mechanistic" | "hypothesis" | "cultivator" | "notebook" = "mechanistic",
    context: any // studies, omics, imaging, memories, aiClient
  ): Promise<DeterministicExecutionTrace> {
    const res = await fetch("/api/agents/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode }),
    });
    if (!res.ok) throw new Error(`Gateway Error: ${res.statusText}`);
    return await res.json();
  }
}

export const gateway = GatewayService.getInstance();
