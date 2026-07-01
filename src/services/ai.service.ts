import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.ts';
import { AppError } from '../lib/AppError.ts';

export class AiService {
  private ai: GoogleGenAI | null;

  constructor() {
    this.ai =
      env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
        ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
        : null;
  }

  async assist(input: {
    prompt: string;
    graph?: any;
    currentResults?: any;
    selectedBiomassName?: string;
  }) {
    if (!this.ai) {
      throw new AppError(503, 'AI Assist is currently offline');
    }

    const systemInstruction = `
You are Hemp-OS AI, a chemical engineering and phytocannabinoid extraction assistant.
Base chemical reasoning on mass transfer, thermodynamics, Arrhenius kinetics, and distillation curves.
Be direct and concise.
    `.trim();

    const contextBlock = `
[CURRENT SYSTEM CONTEXT]
- Selected Biomass Strain: ${input.selectedBiomassName || 'Custom'}
- Active Process Stages: ${input.graph?.stages?.map((s: any) => `${s.name} (${s.type})`).join(' -> ') || 'None'}
- Current Active Configs: ${JSON.stringify(input.graph?.stages?.map((s: any) => ({ type: s.type, config: s.config })) || [])}
- Current Yield Results: ${input.currentResults ? JSON.stringify(input.currentResults.massBalanceReport) : 'Not Simulated yet'}
    `.trim();

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${contextBlock}\n\n[USER QUESTION]\n${input.prompt}`,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text;
  }
}
