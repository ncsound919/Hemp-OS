/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, AlertCircle, RefreshCw, Cpu, 
} from 'lucide-react';
import { ProcessGraph, ProcessRunResult } from '../../kernel/core/types.ts';

interface AIAdvisorProps {
  graph: ProcessGraph;
  currentResults: ProcessRunResult | null;
  selectedBiomassName: string;
}

interface OllamaModel {
  name: string;
  model: string;
  size: number;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
  };
}

const SAMPLE_LOCAL_MODELS = [
  { id: 'llama3.2:1b', name: 'Llama 3.2 (1B)', size: '1.2B parameters', strengths: 'Ultra-fast edge generation, general terminology, basic checks' },
  { id: 'qwen2:1.5b', name: 'Qwen 2 (1.5B)', size: '1.5B parameters', strengths: 'Strong coding, chemistry formulas, brief reports' },
  { id: 'gemma:2b', name: 'Gemma 2 (2B)', size: '2.6B parameters', strengths: 'Precise logic, structured answers, high safety alignments' },
  { id: 'tinyllama:1.1b', name: 'TinyLlama (1.1B)', size: '1.1B parameters', strengths: 'Tiny footprint, high response velocity, educational use' }
];

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'simulated';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  source?: string;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({
  graph,
  currentResults,
  selectedBiomassName,
}) => {
  // Engine Mode Selection
  const [engineMode, setEngineMode] = useState<'gemini' | 'ollama'>('gemini');
  
  // Conversation Feed
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi! I am the Hemp OS AI Workspace Advisor. I live entirely outside the physical simulation kernel. I can help you design optimal workflows, troubleshoot process bottlenecks, and interpret your thermal decarboxylation or distillation yields.",
      source: "Gemini Cloud API"
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ollama Specific States
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [detectedModels, setDetectedModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('simulated');
  const [corsError, setCorsError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Auto-detect on component mount or URL change
  const handleDetectOllama = async (quiet = false) => {
    if (!quiet) {
      setConnectionStatus('connecting');
      setError(null);
      setCorsError(false);
    }
    try {
      // Use backend proxy to bypass CORS
      const response = await fetch(`/api/ollama/tags?url=${encodeURIComponent(ollamaUrl)}`, { 
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        setDetectedModels(models);
        setConnectionStatus('connected');
        setCorsError(false);
        if (models.length > 0 && !models.some((m: any) => m.name === selectedModel)) {
          setSelectedModel(models[0].name);
        }
      } else {
        throw new Error(`Ollama responded with status: ${response.status}`);
      }
    } catch (err: any) {
      console.warn('Ollama connection check failed:', err);
      // If it failed because of connection or CORS
      setCorsError(true);
      setConnectionStatus('simulated'); // Default to high-fidelity offline simulation
      if (!quiet) {
        setError("Could not reach Ollama at the specified URL via proxy.");
      }
    }
  };

  useEffect(() => {
    handleDetectOllama(true);
  }, []);

  const presetQuestions = [
    "Optimize parameters for High CBD",
    "Is my decarb temperature too high?",
    "Explain winterization wax extraction",
  ];

  // Helper function to simulate compact model responses in sandbox mode
  const getSimulatedModelResponse = (userPrompt: string, modelName: string) => {
    const activeStages = graph?.stages?.map((s) => s.name).join(' -> ') || 'None';
    const cleanPrompt = userPrompt.toLowerCase();
    
    // Model signature label
    const signature = `\n\n---
[ENGINE: ${modelName.toUpperCase()} (Simulated Local <=3B Model)]
- Mode: Browser Sandbox Ingress
- Status: Resource-Constrained (Low Latency)`;

    if (cleanPrompt.includes('decarb') || cleanPrompt.includes('temperature') || cleanPrompt.includes('heat')) {
      return `I am ${modelName} (under 3B parameter local model). I have reviewed your decarb stage config.
      
- **Decarboxylation Check**: Maintaining temperature at 120°C is perfect for preserving the molecular skeleton. Going above 140°C triggers rapid degradation of CBD to CBN and vaporizes precious terpenes.
- **My limits**: As a compact model, I cannot run double-precision thermodynamic integrals, but I confirm this temperature fits standard kinetic envelopes.${signature}`;
    }

    if (cleanPrompt.includes('winterization') || cleanPrompt.includes('wax') || cleanPrompt.includes('lipid') || cleanPrompt.includes('cold')) {
      return `I am ${modelName} local engine. Let's look at your winterization parameters:
      
- **Winterization Mechanics**: Cooling ethanol slurry to -40°C causes cuticular waxes and heavy lipids to precipitate into macroscopic crystal structures. If your cooling rate is too fast (e.g. above 1.5°C/min), you get fine colloid suspensions which are extremely difficult to filter out.
- **Tip**: Keep the holding time above 12 hours for complete precipitation.${signature}`;
    }

    if (cleanPrompt.includes('optimize') || cleanPrompt.includes('cbd') || cleanPrompt.includes('yield')) {
      return `I am ${modelName} local model. Here is a quick edge check for CBD optimization:
      
1. **Feedstock**: Your active biomass is "${selectedBiomassName}".
2. **Workflow stages**: active pipeline is ${activeStages}.
3. **Yield vs Purity**: Supercritical CO2 yields high crude but requires multi-stage distillation to reach >90% purity. Increase ethanol solvent ratio in winterization to improve wax removal and final distillate grade.${signature}`;
    }

    return `I am ${modelName} (local model running in simulated browser environment). 

You asked: "${userPrompt}"

Since I am a compact model with under 3 billion parameters, I perform simple classifications:
- Current active strain is: **${selectedBiomassName}**
- Current active process: **${activeStages}**

To perform deeper chemical engineering synthesis, toggle back to the **Gemini 3.5 Cloud Engine** or run the live **Ollama Core** on your localhost!${signature}`;
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    if (engineMode === 'ollama') {
      // OLLAMA LOCAL MODE
      if (connectionStatus === 'simulated') {
        // Run Simulated Offline model
        setTimeout(() => {
          const simulatedText = getSimulatedModelResponse(userMsg, selectedModel);
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            text: simulatedText,
            source: `Offline Sim (${selectedModel})`
          }]);
          setLoading(false);
        }, 800);
      } else {
        // Run live Ollama fetch from local host
        try {
          const activeStages = graph?.stages?.map((s) => `${s.name} (${s.type})`).join(' -> ') || 'None';
          const systemPrompt = `You are a helpful, extremely concise local assistant inside Hemp OS. 
Active strain: ${selectedBiomassName}. Active stages: ${activeStages}. 
Since you are a compact model under 3B parameters, keep answers ultra-short, simple, and direct.`;

          const response = await fetch(`/api/ollama/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: ollamaUrl,
              model: selectedModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMsg }
              ],
              stream: false
            })
          });

          if (!response.ok) {
            throw new Error(`Ollama server returned status: ${response.status}`);
          }

          const data = await response.json();
          const responseText = data.message?.content || data.response || 'No response returned.';
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            text: responseText + `\n\n[LOCAL ENGINE: ${selectedModel.toUpperCase()}]`,
            source: `Ollama Core`
          }]);
        } catch (err: any) {
          console.error(err);
          // Auto-fallback to simulation with warning
          setConnectionStatus('simulated');
          const fallbackText = getSimulatedModelResponse(userMsg, selectedModel) + 
            `\n\n⚠️ *Connection to ${ollamaUrl} was lost (CORS or server off). Auto-switched to Offline Simulation Sandbox.*`;
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            text: fallbackText,
            source: 'Offline Sim Fallback'
          }]);
        } finally {
          setLoading(false);
        }
      }
    } else {
      // GEMINI CLOUD MODE
      try {
        const response = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMsg,
            graph,
            currentResults,
            selectedBiomassName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Server error');
        }

        setMessages((prev) => [...prev, { 
          role: 'assistant', 
          text: data.text,
          source: 'Gemini Cloud'
        }]);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to the AI advisor shell.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-xl text-white">
      
      {/* Advisor Header */}
      <div className="bg-[#0a0a0b] p-4 border-b border-[#1f1f21] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#aaa]">Hemp OS Advisor</h3>
              <span className="text-[8px] bg-purple-900/40 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-mono font-bold tracking-widest">[AI ADVISORY]</span>
            </div>
            <span className="text-[8px] font-mono text-gray-500 block uppercase">Dual-Core AI Reasoning</span>
          </div>
        </div>

        {/* Engine Toggle Switches */}
        <div className="flex bg-[#161619] p-1 rounded-xl border border-[#222] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setEngineMode('gemini')}
            className={`px-3 py-1 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
              engineMode === 'gemini'
                ? 'bg-purple-950/40 border border-purple-500 text-purple-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            Gemini Cloud
          </button>
          <button
            type="button"
            onClick={() => {
              setEngineMode('ollama');
              setShowSettings(true); // Open settings to show Ollama configuration
            }}
            className={`px-3 py-1 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              engineMode === 'ollama'
                ? 'bg-blue-950/40 border border-blue-500 text-blue-300'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Cpu className="w-3 h-3" />
            Ollama Local
          </button>
        </div>
      </div>

      {/* Ollama Setup Config Subpanel */}
      {engineMode === 'ollama' && showSettings && (
        <div className="bg-[#0b0b0c] border-b border-[#1f1f21] p-4 space-y-3.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              Ollama Controller & Local Ingress
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-[9px] text-gray-500 hover:text-white uppercase font-mono bg-[#161619] px-2 py-0.5 rounded border border-[#222] cursor-pointer"
            >
              Hide settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Host URL Input */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Ollama API Endpoint</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="bg-[#121214] border border-[#1f1f21] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleDetectOllama(false)}
                  className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-[9px] font-mono uppercase font-bold text-white transition-all cursor-pointer"
                >
                  Sync
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Active Local Model (≤3B)</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#121214] border border-[#1f1f21] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none"
              >
                {connectionStatus === 'connected' && detectedModels.length > 0 ? (
                  detectedModels.map((m) => (
                    <option key={m.name} value={m.name}>{m.name} ({m.details?.parameter_size || 'Local'})</option>
                  ))
                ) : (
                  SAMPLE_LOCAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} [Simulated Sandbox]</option>
                  ))
                )}
              </select>
            </div>

            {/* Connection Status Badge */}
            <div className="md:col-span-4 flex items-end justify-between md:justify-end gap-2 h-full pb-0.5">
              <div className="text-right">
                <span className="text-[7px] font-mono text-gray-500 uppercase block font-bold">Local Status</span>
                {connectionStatus === 'connected' ? (
                  <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    🟢 Connected
                  </span>
                ) : connectionStatus === 'connecting' ? (
                  <span className="text-[9px] text-amber-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <span className="text-[9px] text-purple-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                    🟣 Offline Sandbox
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Trouble Shooting Helper Link */}
          <div className="border-t border-[#1f1f21]/60 pt-2 flex justify-between items-center text-[8px] font-mono">
            <span className="text-gray-500">Selected model constraints: <strong className="text-cyan-400">Basic Functions Only</strong></span>
            <button
              type="button"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <HelpCircle className="w-3 h-3" />
              How to bypass CORS/SSL?
            </button>
          </div>

          {showTroubleshoot && (
            <div className="bg-[#121214] border border-blue-500/20 rounded-lg p-3 font-mono text-[8px] text-gray-400 leading-relaxed space-y-2">
              <p className="font-bold text-white uppercase text-[8.5px] text-blue-400">🔧 Bypassing Sandbox CORS Restrictions</p>
              <p>Ollama blocks cross-origin requests by default. If your connection shows <span className="text-purple-400 font-bold">Offline Sandbox</span>, execute this terminal command to authorize local browsers:</p>
              <div className="bg-black p-2 rounded text-blue-300 font-bold select-all overflow-x-auto">
                OLLAMA_ORIGINS="*" ollama serve
              </div>
              <p><strong>Mixed Content Blocks:</strong> If this app is loaded over HTTPS, modern browsers block unencrypted HTTP requests (to `localhost:11434`). You can click the shield/site settings in your address bar and click "Allow Insecure Content" to connect, or use our pre-built, robust **Simulation Sandbox** which requires zero setup!</p>
            </div>
          )}
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[350px] max-h-[500px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'self-end bg-blue-600 text-white rounded-br-none font-medium'
                : 'self-start bg-[#1b1b1e] text-[#ccc] rounded-bl-none border border-[#1f1f21]'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-center justify-between gap-4 border-b border-[#1f1f21]/80 pb-1 mb-1.5">
                <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">
                  HEMP OS SYSTEM ADVISOR
                </span>
                <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-wider">
                  {msg.source || 'Local Kernel'}
                </span>
              </div>
            )}
            <div className="whitespace-pre-line">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="self-start bg-[#1b1b1e] text-[#888] rounded-xl rounded-bl-none border border-[#1f1f21] p-4 flex items-center gap-2.5 text-xs max-w-[85%]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
            <span>
              {engineMode === 'ollama' 
                ? `Querying local model "${selectedModel}"...`
                : 'Gemini Cloud is reviewing process flow coefficients...'}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-900/30 text-red-400 rounded-xl p-3 text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <span className="font-bold block uppercase tracking-wider text-xs">Advisory Connection Blocked</span>
              <span className="text-[11px] leading-normal">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Preset pills */}
      <div className="px-4 py-2.5 bg-[#0a0a0b]/40 border-t border-[#1f1f21] flex flex-wrap gap-1.5 overflow-x-auto">
        {presetQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={() => handleSend(q)}
            className="text-[10px] bg-[#1b1b1e] hover:bg-[#252528] border border-[#2d2d30] text-[#aaa] px-2.5 py-1 rounded-full cursor-pointer transition-all hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-4 bg-[#0a0a0b] border-t border-[#1f1f21] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            engineMode === 'ollama'
              ? `Ask local "${selectedModel}" simple questions...`
              : "Ask AI about chemistry, yields, or configs..."
          }
          disabled={loading}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          className="flex-1 bg-[#121214] border border-[#1f1f21] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-medium"
        />
        <button
          type="button"
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="w-9 h-9 bg-purple-600 hover:bg-purple-500 disabled:bg-[#1b1b1e] disabled:text-[#444] rounded-xl flex items-center justify-center text-white cursor-pointer transition-all shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
