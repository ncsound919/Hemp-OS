import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, Code, Globe, Server, Play, Copy, CheckCircle2, ChevronRight, 
  Cpu, Zap, Network, Activity, RefreshCw, Send, ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandLine {
  type: 'input' | 'output' | 'error' | 'success';
  text: string;
}

export function MultiInterfaceSupport() {
  const [activeSubTab, setActiveSubTab] = useState<'cli' | 'api' | 'headless' | 'remote'>('cli');

  // --- TERMINAL CLI STATE ---
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<CommandLine[]>([
    { type: 'output', text: 'Hemp-OS(TM) CommandLine Interface [v2.4.0-LTS]' },
    { type: 'output', text: 'Type "help" to display all available system commands.' },
    { type: 'output', text: 'Status: Connected to Compute Substrate (localhost:3000)' },
    { type: 'output', text: ' ' }
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    const args = cmd.split(' ');
    const primary = args[0].toLowerCase();

    const newHistory = [...terminalHistory, { type: 'input' as const, text: `$ ${cmd}` }];

    switch (primary) {
      case 'help':
        newHistory.push(
          { type: 'output', text: 'Available Hemp-OS Commands:' },
          { type: 'output', text: '  hemp-os run <stage>     - Execute individual process stages (extraction, winterization, decarb)' },
          { type: 'output', text: '  hemp-os systemctl       - Manage background services (watchdog, scheduler, daemon)' },
          { type: 'output', text: '  hemp-os plugins         - Display loaded plugins and active scientific models' },
          { type: 'output', text: '  hemp-os node status     - View local and remote computing cluster metrics' },
          { type: 'output', text: '  hemp-os batch --sweep   - Launch headless parallel parameter batch processing' },
          { type: 'output', text: '  clear                     - Reset the shell terminal display' }
        );
        break;
      case 'clear':
        setTerminalHistory([]);
        setTerminalInput('');
        return;
      case 'hemp-os':
        const subAction = args[1]?.toLowerCase();
        if (subAction === 'run') {
          const stage = args[2]?.toLowerCase() || 'extraction';
          newHistory.push(
            { type: 'output', text: `Initiating headless simulation of: ${stage}...` },
            { type: 'success', text: `[SUCCESS] Run completed in 12ms. Output Purity: 86.42% | Recovered Cannabinoid Yield: 91.15%` }
          );
        } else if (subAction === 'systemctl') {
          const statusAction = args[2]?.toLowerCase() || 'status';
          if (statusAction === 'status') {
            newHistory.push(
              { type: 'output', text: '● hemp-os.service - Hemp-OS Lab Brain Control Daemon' },
              { type: 'output', text: '   Loaded: loaded (/etc/systemd/system/hemp-os.service; enabled)' },
              { type: 'success', text: '   Active: active (running) since Tue 2026-06-30 08:12:44 UTC' },
              { type: 'output', text: '   Main PID: 24419 (hemp-os-brain)' },
              { type: 'output', text: '   Tasks: 44 (limit: 4915)' },
              { type: 'output', text: '   CGroup: /system.slice/hemp-os.service' },
              { type: 'output', text: '           └─24419 /usr/bin/hemp-os-brain --headless --watchdog=enabled' }
            );
          } else {
            newHistory.push({ type: 'output', text: `Executing systemctl ${statusAction} on services...` });
          }
        } else if (subAction === 'plugins') {
          newHistory.push(
            { type: 'output', text: 'Active Driver & Model Plugins:' },
            { type: 'success', text: '  [LOADED] model.decarb.arrhenius.v1_2_0     (Author: Core-Team, Ver: 1.2.0)' },
            { type: 'success', text: '  [LOADED] dataset.denver_lab_sweep_2026     (Author: Contrib,  Ver: 2.1.0)' },
            { type: 'success', text: '  [LOADED] strategy.bayesian_gradient_sweep  (Author: Core-Team, Ver: 1.0.5)' }
          );
        } else if (subAction === 'node' && args[2] === 'status') {
          newHistory.push(
            { type: 'output', text: 'Cluster Node Architecture Status:' },
            { type: 'success', text: '  NODE #01 (Master-Local):  100% ONLINE | CPU: 14% | Mem: 4.2GB / 16GB' },
            { type: 'output', text: '  NODE #02 (AWS-US-West):   100% ONLINE | CPU:  2% | Mem: 1.1GB / 64GB (Cluster Active)' },
            { type: 'output', text: '  NODE #03 (GCP-Europe):    100% ONLINE | CPU:  1% | Mem: 0.9GB / 32GB (Node Sleeping)' }
          );
        } else if (subAction === 'batch' && args[2] === '--sweep') {
          newHistory.push(
            { type: 'output', text: 'Launching massive headless batch research sweep...' },
            { type: 'output', text: 'Sweeping 1,000 extraction pressure/temperature combinations...' },
            { type: 'success', text: '[BATCH SUCCESS] 1,000 executions finished in 0.42 seconds. Optimized point found at 75 bar, -12°C.' }
          );
        } else {
          newHistory.push({ type: 'error', text: `Unknown hemp-os subcommand: "${subAction || ''}". Type "help" for support.` });
        }
        break;
      default:
        newHistory.push({ type: 'error', text: `Command not found: "${primary}". Type "help" to view list of commands.` });
    }

    setTerminalHistory(newHistory);
    setTerminalInput('');
  };

  // --- REST API EXPLORER STATE ---
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiEndpoint, setApiEndpoint] = useState('/api/simulate');
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const triggerApiRequest = () => {
    setIsApiLoading(true);
    setApiResponse(null);

    setTimeout(() => {
      if (apiEndpoint === '/api/simulate') {
        setApiResponse(JSON.stringify({
          status: "success",
          timestamp: new Date().toISOString(),
          kernel: {
            version: "2.4.0-LTS",
            mode: "headless-batch"
          },
          payload: {
            solventPurity: "99.2%",
            decarbRate: "0.0031 s-1",
            reclaimedYield: "89.4%",
            warningFlags: []
          }
        }, null, 2));
      } else if (apiEndpoint === '/api/plugins') {
        setApiResponse(JSON.stringify({
          status: "success",
          activePlugins: [
            { id: "model.decarb.arrhenius", version: "1.2.0", description: "Thermodynamic decarb rate calculations" },
            { id: "strategy.bayesian_gradient_sweep", version: "1.0.5", description: "Multi-dimensional parameter sweep engine" }
          ]
        }, null, 2));
      } else {
        setApiResponse(JSON.stringify({
          status: "success",
          watchdog: "healthy",
          activeSchedulers: 3,
          triggerJobs: [
            { id: "drift_check", cron: "*/15 * * * *", lastRun: "10 mins ago" }
          ]
        }, null, 2));
      }
      setIsApiLoading(false);
    }, 1000);
  };

  const copyCurl = () => {
    const curl = `curl -X ${apiMethod} \\
  https://hempos.local${apiEndpoint} \\
  -H "Authorization: Bearer oauth-token-key" \\
  -H "Content-Type: application/json"`;
    navigator.clipboard.writeText(curl);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // --- HEADLESS MODE SIMULATOR STATE ---
  const [headlessCount, setHeadlessCount] = useState<number>(2000);
  const [isHeadlessRunning, setIsHeadlessRunning] = useState(false);
  const [headlessResult, setHeadlessResult] = useState<{
    completed: number;
    durationMs: number;
    optimum: string;
    speedup: string;
  } | null>(null);

  const runHeadlessBatch = () => {
    setIsHeadlessRunning(true);
    setHeadlessResult(null);

    setTimeout(() => {
      const ms = Math.round(150 + Math.random() * 200);
      setHeadlessResult({
        completed: headlessCount,
        durationMs: ms,
        optimum: "Pressure: 78.4 bar, Temp: -14.2°C, Ethanol Ratio: 8.4 L/kg",
        speedup: `${(headlessCount / (ms / 10)).toFixed(1)}x faster than UI render`
      });
      setIsHeadlessRunning(false);
    }, 2000);
  };

  // --- REMOTE EXECUTION STATE ---
  const [nodes, setNodes] = useState([
    { id: 'master', name: 'Master Host (Local Docker Container)', type: 'Master', status: 'ONLINE', load: 14 },
    { id: 'aws-1', name: 'AWS Cluster Instance (us-west-2)', type: 'Worker', status: 'ONLINE', load: 2 },
    { id: 'gcp-1', name: 'GCP Compute Node (europe-west1-b)', type: 'Worker', status: 'SLEEPING', load: 0 }
  ]);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleProvisionNode = () => {
    setIsProvisioning(true);
    setTimeout(() => {
      setNodes(prev => [
        ...prev,
        {
          id: `worker-${prev.length + 1}`,
          name: `Kubernetes Cluster Node (k8s-pod-node-${prev.length + 1})`,
          type: 'Worker',
          status: 'ONLINE',
          load: 1
        }
      ]);
      setIsProvisioning(false);
    }, 2500);
  };

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-[#38bdf8]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
              Hemp-OS Multi-Interface Gateway <span className="text-[#666] font-normal italic">Layer 6</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">
            Equivalent to Desktop GUI + PowerShell/CLI + Headless Core Cluster
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-[#121214] border border-[#1f1f21] rounded-xl p-0.5 text-[8.5px] font-mono uppercase tracking-wider font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('cli')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'cli' ? 'bg-[#1b1b1e] text-[#38bdf8] border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Interactive CLI
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('api')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'api' ? 'bg-[#1b1b1e] text-[#38bdf8] border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Globe className="w-3.5 h-3.5" />
            REST API
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('headless')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'headless' ? 'bg-[#1b1b1e] text-[#38bdf8] border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Zap className="w-3.5 h-3.5" />
            Headless Sweep
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('remote')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'remote' ? 'bg-[#1b1b1e] text-[#38bdf8] border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Server className="w-3.5 h-3.5" />
            Cloud Clusters
          </button>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          
          {/* 1. INTERACTIVE CLI TERMINAL */}
          {activeSubTab === 'cli' && (
            <motion.div
              key="cli"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-4 font-mono text-[11px] h-[340px] flex flex-col justify-between overflow-hidden shadow-inner">
                {/* Scrollable Command Outputs */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                  {terminalHistory.map((line, idx) => {
                    let color = 'text-gray-300';
                    if (line.type === 'input') color = 'text-[#38bdf8] font-bold';
                    else if (line.type === 'error') color = 'text-red-400 font-bold';
                    else if (line.type === 'success') color = 'text-emerald-400 font-bold';
                    
                    return (
                      <div key={idx} className={`${color} whitespace-pre-wrap leading-relaxed`}>
                        {line.text}
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>

                {/* Command Input Prompt */}
                <form onSubmit={handleCommandSubmit} className="flex border-t border-[#1a1a1c] pt-3 mt-3 items-center gap-2">
                  <span className="text-[#38bdf8] font-bold shrink-0">Hemp-OS $</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Try 'hemp-os run winterization' or 'help'..."
                    className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-gray-600 font-mono text-[11px]"
                    autoFocus
                  />
                  <button type="submit" className="text-[#666] hover:text-[#38bdf8] cursor-pointer">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Shell Quick Commands HUD */}
              <div className="p-3 bg-[#121214] border border-[#1f1f21] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest">Power Shell Macro Injectors:</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTerminalInput('hemp-os run decarb')}
                    className="px-2.5 py-1 bg-[#1b1b1e] hover:bg-[#25252a] border border-[#2d2d30] hover:border-[#38bdf8]/40 text-gray-300 text-[8.5px] font-mono rounded cursor-pointer transition-all"
                  >
                    Quick Run Decarb
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminalInput('hemp-os plugins')}
                    className="px-2.5 py-1 bg-[#1b1b1e] hover:bg-[#25252a] border border-[#2d2d30] hover:border-[#38bdf8]/40 text-gray-300 text-[8.5px] font-mono rounded cursor-pointer transition-all"
                  >
                    Show Loaded Driver Plugins
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminalInput('hemp-os systemctl')}
                    className="px-2.5 py-1 bg-[#1b1b1e] hover:bg-[#25252a] border border-[#2d2d30] hover:border-[#38bdf8]/40 text-gray-300 text-[8.5px] font-mono rounded cursor-pointer transition-all"
                  >
                    Service Status systemd
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. REST API EXPLORER */}
          {activeSubTab === 'api' && (
            <motion.div
              key="api"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Endpoint selection & Curl copy */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-2.5">
                    Hemp-OS REST API Gateway
                  </h3>

                  <div className="space-y-2">
                    <label className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest block">Select Endpoint</label>
                    <div className="space-y-2">
                      {[
                        { method: 'GET' as const, path: '/api/simulate', desc: 'Fetch latest execution physics coefficients' },
                        { method: 'GET' as const, path: '/api/plugins', desc: 'Fetch active driver/module plugins' },
                        { method: 'GET' as const, path: '/api/autonomy', desc: 'Query active watchdog and cron schedulers' }
                      ].map((endpoint) => (
                        <div 
                          key={endpoint.path}
                          onClick={() => {
                            setApiMethod(endpoint.method);
                            setApiEndpoint(endpoint.path);
                          }}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            apiEndpoint === endpoint.path 
                              ? 'bg-[#1b1b1e] border-[#38bdf8]/50' 
                              : 'bg-[#0d0d0f] border-[#1c1c1f] hover:bg-[#121214]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-[#141416] border border-[#1f1f21] text-sky-400 text-[8px] font-mono font-bold uppercase rounded">
                              {endpoint.method}
                            </span>
                            <span className="text-[10px] font-mono text-white">{endpoint.path}</span>
                          </div>
                          <span className="text-[8px] text-[#555] font-sans truncate max-w-[120px]">{endpoint.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Copy Curl Block */}
                  <div className="bg-[#0b0b0c] border border-[#1c1c1f] rounded-xl p-3 relative font-mono text-[9px] text-gray-400">
                    <span className="text-[7.5px] text-[#555] font-mono block mb-2 uppercase tracking-wider">Shell curl request equivalent:</span>
                    <pre className="overflow-x-auto text-sky-300 leading-relaxed">
                      {`curl -X ${apiMethod} \\\n  https://hempos.local${apiEndpoint} \\\n  -H "Authorization: Bearer test_key"`}
                    </pre>
                    <button
                      type="button"
                      onClick={copyCurl}
                      className="absolute top-2 right-2 p-1 bg-[#121214] hover:bg-[#1b1b1e] border border-[#1f1f21] hover:border-[#38bdf8]/40 rounded cursor-pointer text-gray-500 hover:text-white transition-all flex items-center gap-1 text-[8px]"
                    >
                      {copiedText ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Curl
                        </>
                      )}
                    </button>
                  </div>

                  {/* Execution button */}
                  <button
                    type="button"
                    onClick={triggerApiRequest}
                    disabled={isApiLoading}
                    className="w-full py-2 bg-[#38bdf8] hover:bg-sky-500 text-black font-bold font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isApiLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Awaiting REST Response...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Send Request to Gateways
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* REST Response Box */}
              <div className="lg:col-span-7">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-[#1f1f21] pb-2.5 mb-3">
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                        Gateway Response Output
                      </h3>
                      {apiResponse && (
                        <span className="text-[8.5px] font-mono text-emerald-400 uppercase tracking-widest">HTTP 200 OK</span>
                      )}
                    </div>

                    <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-4 font-mono text-[10.5px] text-gray-300 min-h-[220px] max-h-[260px] overflow-y-auto">
                      {apiResponse ? (
                        <pre className="text-emerald-300 leading-relaxed">{apiResponse}</pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-600">
                          <Code className="w-8 h-8 mb-2 text-gray-700" />
                          <p className="uppercase text-[9px] tracking-widest font-mono">No active API transactions</p>
                          <p className="text-[8px] text-gray-500 mt-1 max-w-[180px]">Select an endpoint and hit Send Request to perform standard REST testing.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1f1f21] text-[8px] text-gray-500 font-mono uppercase tracking-wider leading-relaxed">
                    *Hemp-OS REST router is fully documented with Swagger/OAS formats at /api/docs (Headless Mode Enabled).
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. HEADLESS BATCH MODE */}
          {activeSubTab === 'headless' && (
            <motion.div
              key="headless"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[11px] font-bold text-white uppercase tracking-widest font-mono mb-1">
                      Batch Research & Headless Sweep Daemon
                    </h3>
                    <p className="text-[9.5px] text-gray-400 leading-relaxed">
                      Bypasses React DOM drawing loops to execute simulations directly on the physics thread, unlocking massive speeds for large-scale computational sweeps.
                    </p>
                  </div>

                  {/* Batch sweeps count selector */}
                  <div className="p-4 bg-[#0d0d0f] border border-[#1c1c1f] rounded-xl space-y-3">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono flex justify-between">
                      <span>Headless Iteration Space</span>
                      <span className="text-[#38bdf8]">{headlessCount.toLocaleString()} Sweep Coordinates</span>
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="10000"
                      step="500"
                      value={headlessCount}
                      onChange={(e) => setHeadlessCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
                    />
                    <div className="flex justify-between text-[8px] text-[#444] font-mono">
                      <span>500 sweeps</span>
                      <span>10,000 sweeps</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={runHeadlessBatch}
                    disabled={isHeadlessRunning}
                    className="w-full py-2.5 bg-[#38bdf8] hover:bg-sky-500 text-black font-bold font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isHeadlessRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Running Headless Sweep Engine...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Launch High-Speed Sweep
                      </>
                    )}
                  </button>
                </div>

                {/* Batch Metrics HUD */}
                <div className="bg-[#0b0b0c] border border-[#1c1c1f] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Real-time Benchmarking Telemetry</span>
                    
                    {isHeadlessRunning ? (
                      <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                        <Activity className="w-6 h-6 animate-pulse text-[#38bdf8]" />
                        <p className="text-[9px] font-mono uppercase tracking-widest">Streaming parallel runs on thread pool...</p>
                      </div>
                    ) : headlessResult ? (
                      <div className="space-y-3.5 font-mono">
                        <div className="p-3 bg-[#111113] border border-[#1c1c1e] rounded-xl flex justify-between items-center">
                          <span className="text-[9px] text-[#666] uppercase">Simulations Dispatched</span>
                          <span className="text-xs font-bold text-emerald-400">{headlessResult.completed.toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-[#111113] border border-[#1c1c1e] rounded-xl flex justify-between items-center">
                          <span className="text-[9px] text-[#666] uppercase">Total Compilation Clock</span>
                          <span className="text-xs font-bold text-white">{headlessResult.durationMs} milliseconds</span>
                        </div>
                        <div className="p-3 bg-[#111113] border border-[#1c1c1e] rounded-xl flex justify-between items-center">
                          <span className="text-[9px] text-[#666] uppercase">Headless Throughput Gains</span>
                          <span className="text-xs font-bold text-sky-400">{headlessResult.speedup}</span>
                        </div>

                        <div className="p-3.5 bg-sky-950/20 border border-sky-500/20 rounded-xl">
                          <span className="text-[7.5px] text-[#38bdf8] uppercase tracking-widest block mb-1">Global Optimal Point Discovered</span>
                          <p className="text-[9.5px] text-gray-300 font-bold leading-normal">{headlessResult.optimum}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-600">
                        <Zap className="w-8 h-8 mb-2 text-gray-700" />
                        <p className="uppercase text-[9px] tracking-widest font-mono">Telemetry Standby</p>
                        <p className="text-[8px] text-gray-500 mt-1 max-w-[180px]">Dispatched batch computations will output real-time speedups and phase coordinate optima here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. CLOUD AND REMOTE CLUSTERS */}
          {activeSubTab === 'remote' && (
            <motion.div
              key="remote"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Cloud controller interface */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-2.5">
                      Cloud Node Controller
                    </h3>
                    <p className="text-[9.5px] text-gray-400 leading-relaxed mt-2">
                      Scale simulations across decentralized Kubernetes pods or remote cloud droplets (AWS, GCP, DigitalOcean).
                    </p>
                  </div>

                  <div className="p-3.5 bg-sky-950/20 border border-sky-500/20 rounded-xl space-y-2">
                    <span className="text-[8px] font-bold text-[#38bdf8] uppercase tracking-widest block font-mono">Remote Daemon Gateway</span>
                    <p className="text-[9px] text-gray-300 font-mono leading-relaxed">
                      Enabled protocols: gRPC on port 50051, remote SSH handshakes authorized via local physical keys.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleProvisionNode}
                    disabled={isProvisioning}
                    className="w-full py-2 bg-[#38bdf8] hover:bg-sky-500 text-black font-bold font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isProvisioning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Allocating Cloud VPC Resources...
                      </>
                    ) : (
                      <>
                        <Network className="w-3.5 h-3.5" />
                        Provision New Cluster Worker Node
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cluster Nodes List */}
              <div className="lg:col-span-7">
                <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 space-y-3">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-2.5">
                    Hemp-OS Decentralized Cluster Topology ({nodes.length} Nodes)
                  </h3>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {nodes.map((node) => (
                      <div 
                        key={node.id}
                        className="p-3 bg-[#0d0d0f] border border-[#1c1c1f] rounded-xl flex items-center justify-between"
                      >
                        <div className="space-y-1 overflow-hidden mr-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${node.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wide truncate">{node.name}</h4>
                          </div>
                          <p className="text-[8px] text-gray-500 font-mono uppercase tracking-wider">{node.type} node &bull; Status: {node.status}</p>
                        </div>

                        {/* Node stats */}
                        <div className="text-right shrink-0">
                          <span className="text-[8px] text-[#666] font-mono uppercase block mb-0.5">Node Load</span>
                          <span className={`text-[10.5px] font-mono font-bold ${node.load > 10 ? 'text-[#38bdf8]' : 'text-gray-400'}`}>{node.load}% CPU</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
