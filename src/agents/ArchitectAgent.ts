import { OllamaService } from '../services/ollama.service.ts';
import { ProcessGraph } from '../../kernel/core/types.ts';
import { AgenticThoughtChain } from '../types/provenance.types.ts';
import { StrainKnowledgeAdapter } from './StrainKnowledgeAdapter.ts';

export interface HypothesisProposal {
  thoughtChain: AgenticThoughtChain;
  // Note: parameterDelta contains absolute new values that will be merged into the stage config
  parameterDelta: Record<string, any>;
}

export class ArchitectAgent {
  private static globalStepCounter = 1;

  constructor(
    private ollama: OllamaService,
    private strainAdapter?: StrainKnowledgeAdapter
  ) {}

  /**
   * Helper to fetch the best model available
   */
  private async getBestModel(): Promise<string> {
    const preferredPrefixes = ['llama3.1', 'mistral', 'qwen', 'llama3'];
    try {
      const tags = await this.ollama.getTags();
      if (tags && tags.models && tags.models.length > 0) {
        for (const prefix of preferredPrefixes) {
          const match = tags.models.find((m: any) => m.name.includes(prefix));
          if (match) return match.name;
        }
        return tags.models[0].name;
      }
    } catch (e) {
      console.warn('Could not fetch Ollama tags:', e);
    }
    return 'llama3.1:8b'; // Sensible default
  }

  /**
   * Propose a process improvement based on a research query and current graph.
   */
  async proposeHypothesis(
    query: string,
    currentGraph: ProcessGraph,
    historicalContext?: string
  ): Promise<HypothesisProposal> {
    const step = ArchitectAgent.globalStepCounter++;
    const stages = currentGraph?.stages || [];

    // 1. Query Strain genetics database if adapter is present
    let strainContext = '';
    let foundStrains: any[] = [];
    if (this.strainAdapter) {
      try {
        foundStrains = await this.strainAdapter.searchStrains(query, 3);
        if (foundStrains && foundStrains.length > 0) {
          strainContext = `\nRelevant Strain Genetics Information (from SQLite Database):\n` +
            foundStrains.map(s => 
              `- ${s.name} (${s.type}): THC=${s.thc}%, CBD=${s.cbd}%, CBG=${s.cbg}%, Terpenes=${JSON.stringify(s.terpenes)}. Origin: ${s.origin || ''}`
            ).join('\n');
        }
      } catch (err) {
        console.warn('Strain adapter search failed during hypothesis proposing:', err);
      }
    }

    const systemPrompt = `
You are an expert chemical engineering research assistant in botanical extraction. You have access to a hemp processing flowsheet with stages: 
${stages.map(s => `- ${s.type}: ${JSON.stringify(s.config)}`).join('\n')}
${strainContext ? `\nTarget Strain context for this run:${strainContext}\n` : ''}

Based on the user's research query and the target strain profiles, propose ONE specific parameter change (e.g., temperature, pressure, solvent ratio) that could improve yield, efficiency, or isolate desired cannabinoids/terpenes.
Return ONLY a valid JSON object with the following structure:
{
  "hypothesis": "A concise explanation of why this change might work, referencing chemical principles and target strain cannabinoids.",
  "stageType": "the stage type to modify (e.g., 'winterization', 'decarboxylation', 'extraction', 'distillation')",
  "parameter": "parameter name (e.g., 'coolingTemp', 'temperature', 'extractionTemp', 'vacuumPressure', 'solventRatio')",
  "newValue": 12.34,
  "supportingEvidence": ["reference or reason supporting this change"]
}
Only propose changes that are physically plausible. Do not suggest changes that would violate safety limits.
`;

    let proposal: any = null;
    let ollamaSuccess = false;

    try {
      const modelToUse = await this.getBestModel();
      
      // Retry mechanism with exponential backoff
      let retries = 3;
      let delay = 800;

      while (retries > 0 && !ollamaSuccess) {
        try {
          const response = await this.ollama.chat({
            model: modelToUse,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Query: ${query}\nCurrent graph: ${JSON.stringify(currentGraph, null, 2)}${historicalContext ? `\nContext: ${historicalContext}` : ''}` }
            ],
            format: 'json',
            options: { temperature: 0.7, num_ctx: 8192 }
          });

          const text = response?.message?.content || response?.content;
          if (!text) {
            throw new Error('Empty response from Ollama');
          }

          const parsed = JSON.parse(text.trim());

          // Validate schema
          if (
            parsed.hypothesis &&
            parsed.stageType &&
            parsed.parameter &&
            typeof parsed.newValue === 'number' &&
            Array.isArray(parsed.supportingEvidence)
          ) {
            // Validate stageType against existing graph stages
            if (stages.some((s: any) => s.type === parsed.stageType)) {
              proposal = parsed;
              ollamaSuccess = true;
            } else {
              throw new Error(`Proposed stageType '${parsed.stageType}' not found in current graph.`);
            }
          } else {
            throw new Error('Invalid JSON schema returned by Ollama.');
          }
        } catch (err) {
          retries--;
          if (retries > 0) {
            console.warn(`Ollama call failed, retrying in ${delay}ms...`, err);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
          } else {
            throw err;
          }
        }
      }
    } catch (error) {
      console.warn('Ollama service hypothesis generation failed after retries, falling back to local deterministic rule-based assistant:', error);
    }

    if (ollamaSuccess && proposal) {
      const thoughtChain: AgenticThoughtChain = {
        step,
        timestamp: Date.now(),
        module: 'Architect',
        hypothesis: proposal.hypothesis,
        supporting_evidence: proposal.supportingEvidence,
        parameter_delta: {
          [proposal.stageType]: {
            [proposal.parameter]: proposal.newValue
          }
        }
      };

      return {
        thoughtChain,
        parameterDelta: thoughtChain.parameter_delta,
      };
    }

    // --- Fallback rule-based generator ---
    const lQuery = query.toLowerCase();
    const lHistory = historicalContext?.toLowerCase() || '';
    
    // Default fallback
    let stageType = 'winterization';
    let parameter = 'coolingTemp';
    let newValue = -42.0;
    let hypothesis = 'Based on crystallization kinetics, lowering the winterization temperature precipitates secondary fats and lipids, refining distillate purity.';
    let supportingEvidence = ['NIST phase equilibria models for hemp waxes and cannabinoid constituents'];

    // Ensure our default stageType exists, else pick the first one
    if (stages.length > 0 && !stages.find((s: any) => s.type === stageType)) {
      stageType = stages[0].type;
      parameter = Object.keys(stages[0].config || {})[0] || 'parameter';
      newValue = 0;
    }

    // Adjust fallback dynamically based on queried strain features if available
    if (foundStrains.length > 0) {
      const primaryStrain = foundStrains[0];
      if (primaryStrain.thc > 15 && (lQuery.includes('decarb') || lQuery.includes('thc') || lQuery.includes('active'))) {
        stageType = 'decarboxylation';
        parameter = 'temperature';
        newValue = 124.5;
        hypothesis = `The target strain ${primaryStrain.name} is high in THC (${primaryStrain.thc}%). Decarboxylating at 124.5°C optimizes the Arrhenius rate constants for converting THCA to active THC while preserving key terpenes like Myrcene.`;
        supportingEvidence = [`Arrhenius rate kinetics equation parameters calibrated for high-potency ${primaryStrain.name}`];
      } else if (primaryStrain.cbd > 10 && (lQuery.includes('solvent') || lQuery.includes('cbd') || lQuery.includes('extraction'))) {
        stageType = 'extraction';
        parameter = 'solventRatio';
        newValue = 9.5;
        hypothesis = `Target strain ${primaryStrain.name} contains highly concentrated CBD (${primaryStrain.cbd}%). An elevated solvent ratio of 9.5:1 ensures complete substrate wetting and maximizes mass transport coefficients.`;
        supportingEvidence = [`Solid-liquid mass transport boundary diffusion coefficients for ${primaryStrain.name}`];
      } else if (primaryStrain.terpenes && Object.keys(primaryStrain.terpenes).length > 0 && lQuery.includes('terp')) {
        stageType = 'extraction';
        parameter = 'extractionTemp';
        newValue = -15.0;
        hypothesis = `Target strain ${primaryStrain.name} has a rich terpene profile. Lowering extraction temperature preserves volatile terpenes from degradation while maintaining cannabinoid solubility.`;
        supportingEvidence = [`Vapor pressure and thermal degradation studies of monoterpenes in ${primaryStrain.name}`];
      }
    } else {
      // Standard rule fallbacks using query and historical context
      const combinedContext = lQuery + ' ' + lHistory;
      if (combinedContext.includes('decarb') || combinedContext.includes('thermal') || combinedContext.includes('carbon')) {
        stageType = 'decarboxylation';
        parameter = 'temperature';
        newValue = 122.5;
        hypothesis = 'Thermal excitation of the carboxyl group (-COOH) on CBDA accelerates conversion to active CBD without inducing terpene degradation.';
        supportingEvidence = ['Arrhenius rate kinetics equation parameters'];
      } else if (combinedContext.includes('distill') || combinedContext.includes('film') || combinedContext.includes('vacuum') || combinedContext.includes('pressure')) {
        stageType = 'distillation';
        parameter = 'vacuumPressure';
        newValue = 0.04;
        hypothesis = 'Decreasing operating pressure increases the molecular mean free path, facilitating low-temperature fractional distillation.';
        supportingEvidence = ['Knudsen equation for molecular distillation column paths'];
      } else if (combinedContext.includes('solvent') || combinedContext.includes('ratio') || combinedContext.includes('extraction')) {
        stageType = 'extraction';
        parameter = 'solventRatio';
        newValue = 9.0;
        hypothesis = 'Increasing the solvent-to-biomass ratio ensures complete wetting of the substrate, preventing mass-transfer stagnation.';
        supportingEvidence = ['Solid-liquid mass transport boundary diffusion coefficients'];
      } else if (combinedContext.includes('filt') || combinedContext.includes('micron') || combinedContext.includes('clarity')) {
        stageType = 'filtration';
        parameter = 'micronRating';
        newValue = 1.0;
        hypothesis = 'Decreasing filter micron rating increases capture of coagulated lipids and fine particulates, improving final product clarity.';
        supportingEvidence = ['Darcy’s Law models for pressure-driven botanical filtration'];
      }
    }
    
    // Final check for fallback stageType
    if (stages.length > 0 && !stages.find((s: any) => s.type === stageType)) {
        stageType = stages[0].type;
        parameter = Object.keys(stages[0].config || {})[0] || 'parameter';
    }

    const thoughtChain: AgenticThoughtChain = {
      step,
      timestamp: Date.now(),
      module: 'Architect (Local Engine)',
      hypothesis,
      supporting_evidence: supportingEvidence,
      parameter_delta: {
        [stageType]: {
          [parameter]: newValue
        }
      }
    };

    return {
      thoughtChain,
      parameterDelta: thoughtChain.parameter_delta,
    };
  }
}
