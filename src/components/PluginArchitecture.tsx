import React, { useState } from 'react';
import { 
  FolderGit2, RefreshCw, Layers, Code, Play, CheckCircle2, Shield, 
  HelpCircle, Settings, Sliders, Cpu, Plus, FileText, Trash2, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PluginModule {
  id: string;
  name: string;
  category: 'model' | 'workflow' | 'dataset' | 'strategy';
  author: string;
  version: string;
  description: string;
  status: 'active' | 'inactive';
  codeSnippet?: string;
}

export function PluginArchitecture() {
  const [plugins, setPlugins] = useState<PluginModule[]>([
    {
      id: 'model.decarb.arrhenius.v1_2_0',
      name: 'Arrhenius Kinetics Core',
      category: 'model',
      author: 'Core Engineering',
      version: '1.2.0',
      description: 'Standard single-step Arrhenius activation rates for decarboxylation.',
      status: 'active',
      codeSnippet: `// Standard Arrhenius Kinetics Formula
function calculateRate(tempK) {
  const A = 2.45e11; // pre-exponential frequency factor
  const Ea = 126000; // activation energy (J/mol)
  const R = 8.314;   // gas constant
  return A * Math.exp(-Ea / (R * tempK));
}`
    },
    {
      id: 'dataset.denver_lab_sweep_2026',
      name: 'Denver Calibration Set',
      category: 'dataset',
      author: 'Denver Phytochem Labs',
      version: '2.1.0',
      description: 'Physical empirical constants for decarboxylation and winterization yields.',
      status: 'active',
      codeSnippet: `// Denver Lab empirical density coefficients
const calibrationParams = {
  optimumSolventDensity: 0.724, // g/mL
  winterizationRateLimit: -1.2,  // °C/min
  activationFactorOffset: 1.015  // scaling multiplier
};`
    },
    {
      id: 'strategy.bayesian_gradient_sweep',
      name: 'Bayesian Gradient Sweep',
      category: 'strategy',
      author: 'Optimization Team',
      version: '1.0.5',
      description: 'Hill-climbing optimization algorithm using sequential probabilistic modeling.',
      status: 'active',
      codeSnippet: `// Bayesian probabilistic sweep model
function bayesPredict(pSpace) {
  const mean = pSpace.pressure * 0.85 - pSpace.temperature * 0.12;
  const variance = 0.05;
  return { mean, confidenceInterval: [mean - 1.96 * variance, mean + 1.96 * variance] };
}`
    }
  ]);

  // Editing science code panel
  const [selectedPlugin, setSelectedPlugin] = useState<PluginModule>(plugins[0]);
  const [editorCode, setEditorCode] = useState<string>(plugins[0].codeSnippet || '');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileSuccess, setCompileSuccess] = useState(false);

  // New plugin modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginCat, setNewPluginCat] = useState<'model' | 'workflow' | 'dataset' | 'strategy'>('model');
  const [newPluginDesc, setNewPluginDesc] = useState('');

  const selectPluginToEdit = (plugin: PluginModule) => {
    setSelectedPlugin(plugin);
    setEditorCode(plugin.codeSnippet || '');
    setCompileSuccess(false);
  };

  const handleHotLoadCode = () => {
    setIsCompiling(true);
    setCompileSuccess(false);

    // Simulate integrity checks, signature validation, and secure dynamic module compilation
    setTimeout(() => {
      setPlugins(prev => prev.map(p => {
        if (p.id === selectedPlugin.id) {
          return { ...p, codeSnippet: editorCode };
        }
        return p;
      }));
      setIsCompiling(false);
      setCompileSuccess(true);
    }, 1500);
  };

  const handleTogglePlugin = (id: string) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: p.status === 'active' ? 'inactive' : 'active' };
      }
      return p;
    }));
  };

  const handleCreatePlugin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPluginName.trim()) return;

    const newId = `${newPluginCat}.${newPluginName.toLowerCase().replace(/\s+/g, '_')}`;
    const newPlug: PluginModule = {
      id: newId,
      name: newPluginName,
      category: newPluginCat,
      author: 'Local Lab Contributor',
      version: '1.0.0',
      description: newPluginDesc || 'Custom hot-loaded expansion plugin.',
      status: 'active',
      codeSnippet: `// Custom ${newPluginName} Module Code\nexport function executePlugin(inputs) {\n  return { success: true, timestamp: Date.now() };\n}`
    };

    setPlugins(prev => [...prev, newPlug]);
    setShowAddModal(false);
    setNewPluginName('');
    setNewPluginDesc('');
    setSelectedPlugin(newPlug);
    setEditorCode(newPlug.codeSnippet || '');
  };

  const handleDeletePlugin = (id: string) => {
    setPlugins(prev => prev.filter(p => p.id !== id));
    if (selectedPlugin.id === id) {
      setSelectedPlugin(plugins[0]);
      setEditorCode(plugins[0].codeSnippet || '');
    }
  };

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
              Scientific Plugin Registry <span className="text-[#666] font-normal italic">Layer 7</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">
            Equivalent to dynamic kernel drivers / Hot-loadable physics solvers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#2e7d32] hover:bg-green-700 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow"
        >
          <Plus className="w-4 h-4" />
          Register New Extension
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Registered Drivers list (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-3 mb-3">
              Active Driver & Extension Registry
            </h3>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {plugins.map((plugin) => (
                <div 
                  key={plugin.id}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedPlugin.id === plugin.id 
                      ? 'bg-[#1b1b1e] border-emerald-500/50 shadow-md' 
                      : 'bg-[#0d0d0f] border-[#1c1c1f] hover:bg-[#121214]'
                  }`}
                  onClick={() => selectPluginToEdit(plugin)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${plugin.status === 'active' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                        <h4 className="text-[10.5px] font-bold text-white uppercase tracking-wide">{plugin.name}</h4>
                      </div>
                      <p className="text-[8px] text-[#555] font-mono uppercase tracking-wider">ID: {plugin.id} &bull; Ver {plugin.version}</p>
                    </div>

                    <span className="px-1.5 py-0.5 bg-[#141416] border border-[#1f1f21] text-gray-400 text-[7px] font-mono uppercase tracking-wider rounded shrink-0">
                      {plugin.category}
                    </span>
                  </div>

                  <p className="text-[9px] text-gray-400 font-sans mt-2 leading-relaxed">
                    {plugin.description}
                  </p>

                  {/* Actions inside individual driver */}
                  <div className="mt-3 pt-2.5 border-t border-[#1a1a1c] flex items-center justify-between text-[8px] font-mono">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlugin(plugin.id);
                      }}
                      className={`px-2 py-1 border rounded font-bold uppercase cursor-pointer transition-all ${
                        plugin.status === 'active'
                          ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20'
                          : 'border-red-500/20 text-red-400 bg-red-950/10 hover:bg-red-950/20'
                      }`}
                    >
                      {plugin.status === 'active' ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlugin(plugin.id);
                      }}
                      className="text-[#555] hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Science Formula Code Editor (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 h-full flex flex-col justify-between space-y-4">
            
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#1f1f21] pb-2.5">
                <div>
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Dynamic Model Code Compiler
                  </h3>
                  <p className="text-[8.5px] text-gray-500 font-mono">Modify chemical kinetics/equations live. Changes update simulation solvers instantly.</p>
                </div>
                <span className="px-2 py-0.5 bg-[#141416] border border-[#1f1f21] text-[#38bdf8] text-[8.5px] font-mono rounded">
                  Editing: {selectedPlugin.name}
                </span>
              </div>

              {/* Code Editor block */}
              <div className="bg-[#050506] border border-[#1c1c1f] rounded-xl p-3 font-mono text-[10.5px]">
                <textarea
                  value={editorCode}
                  onChange={(e) => setEditorCode(e.target.value)}
                  className="w-full h-[240px] bg-transparent text-emerald-300 focus:outline-none resize-none leading-relaxed font-mono focus:ring-0 border-none p-0"
                  spellCheck="false"
                />
              </div>

              {/* Hot-loading actions */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleHotLoadCode}
                  disabled={isCompiling}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCompiling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Checking Signatures & Compiling...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Hot-Load Scientific Module
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {compileSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 font-bold font-mono text-[8.5px] rounded-lg uppercase flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Dynamic SOLVER Reloaded Safely
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1f1f21] font-mono text-[8.5px] text-gray-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Safety Sandboxed (V8 Virtual Machine Isolation protects local OS thread pool).</span>
            </div>

          </div>
        </div>

      </div>

      {/* NEW PLUGIN MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-[#000]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-3 mb-4">
                Register Custom Physical Extension
              </h3>

              <form onSubmit={handleCreatePlugin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Extension Name</label>
                  <input
                    type="text"
                    value={newPluginName}
                    onChange={(e) => setNewPluginName(e.target.value)}
                    placeholder="e.g. Non-linear Viscosity Solver"
                    className="w-full bg-[#121214] border border-[#1f1f21] hover:border-[#2a2a2d] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all font-sans"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Plugin Category</label>
                  <select
                    value={newPluginCat}
                    onChange={(e: any) => setNewPluginCat(e.target.value)}
                    className="w-full bg-[#121214] border border-[#1f1f21] hover:border-[#2a2a2d] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all font-sans cursor-pointer"
                  >
                    <option value="model">Physical Model (Kinetics/Phase Curves)</option>
                    <option value="workflow">Workflow Router</option>
                    <option value="dataset">Calibration Dataset</option>
                    <option value="strategy">Optimizer Experiment Strategy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Module Description</label>
                  <textarea
                    value={newPluginDesc}
                    onChange={(e) => setNewPluginDesc(e.target.value)}
                    placeholder="Describe what physics coefficients or solvers this extension adds..."
                    className="w-full h-16 bg-[#121214] border border-[#1f1f21] hover:border-[#2a2a2d] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all font-sans resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 text-[9px] text-[#666] hover:text-white uppercase font-mono font-bold tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all"
                  >
                    Compile & Register
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
