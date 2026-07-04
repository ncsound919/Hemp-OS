import { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, 
  Eye, Box, BarChart3, Zap, Activity,
  Target, Brain,
  ChevronRight, Settings, Bell,
  ArrowUpRight, ArrowDownRight,
  Wallet, LineChart, CandlestickChart, Terminal
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

// Types
interface Agent {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  capabilities: string[];
  status: 'idle' | 'scanning' | 'running' | 'analyzing' | 'executing' | 'paused';
  color: string;
  lastActivity: string;
  confidence: number;
}

// Types

interface BudgetAllocation {
  agent: string;
  allocated: number;
  used: number;
  remaining: number;
}

// Mock Data
const mockChartData = [
  { time: '09:30', value: 100 },
  { time: '10:00', value: 102 },
  { time: '10:30', value: 101 },
  { time: '11:00', value: 105 },
  { time: '11:30', value: 103 },
  { time: '12:00', value: 107 },
  { time: '12:30', value: 106 },
  { time: '13:00', value: 109 },
  { time: '13:30', value: 111 },
  { time: '14:00', value: 110 },
  { time: '14:30', value: 113 },
  { time: '15:00', value: 115 },
];

const mockAgentContribution = [
  { name: 'Lookahead', value: 35, color: '#00d084' },
  { name: 'Simulation', value: 28, color: '#9b59b6' },
  { name: 'Analyst', value: 22, color: '#3498db' },
  { name: 'Trading', value: 15, color: '#f39c12' },
];

const mockMonthlyReturns = [
  { month: 'Jan', return: 12.4 },
  { month: 'Feb', return: 8.7 },
  { month: 'Mar', return: 15.2 },
  { month: 'Apr', return: 6.3 },
  { month: 'May', return: 9.8 },
  { month: 'Jun', return: 11.5 },
];

// Components
const StatusBadge = ({ status, text }: { status: 'active' | 'paused' | 'inactive'; text: string }) => {
  const colors = {
    active: 'bg-emerald-500',
    paused: 'bg-amber-500',
    inactive: 'bg-slate-500'
  };
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
      <span className={`w-2 h-2 rounded-full ${colors[status]} status-pulse`} />
      <span className="text-xs font-medium text-white/80">{text}</span>
    </div>
  );
};

const MetricCard = ({ label, value, change, prefix = '' }: { label: string; value: string; change?: number; prefix?: string }) => (
  <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
    <p className="text-xs text-white/50 mb-1">{label}</p>
    <p className="text-xl font-bold font-mono text-white">{prefix}{value}</p>
    {change !== undefined && (
      <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span>{Math.abs(change).toFixed(2)}%</span>
      </div>
    )}
  </div>
);

const AgentCard = ({ agent, isActive, onClick }: { agent: Agent; isActive: boolean; onClick: () => void }) => {
  const statusColors = {
    idle: 'bg-slate-500',
    scanning: 'bg-emerald-500',
    running: 'bg-purple-500',
    analyzing: 'bg-blue-500',
    executing: 'bg-amber-500',
    paused: 'bg-slate-400'
  };

  return (
    <div 
      onClick={onClick}
      className={`agent-card p-5 cursor-pointer ${isActive ? 'border-emerald-500/50 glow-green' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${agent.color} bg-opacity-20`}>
          {agent.icon}
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]} status-pulse`} />
          <span className="text-xs text-white/60 capitalize">{agent.status}</span>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">{agent.name}</h3>
      <p className="text-sm text-white/60 mb-4 line-clamp-2">{agent.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {agent.capabilities.map((cap, i) => (
          <span key={i} className="px-2 py-0.5 text-xs rounded bg-white/5 text-white/50">
            {cap}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <span className="text-xs text-white/40">{agent.lastActivity}</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              style={{ width: `${agent.confidence}%` }}
            />
          </div>
          <span className="text-xs text-white/60">{agent.confidence}%</span>
        </div>
      </div>
    </div>
  );
};

const ActivityLog = ({ logs }: { logs: { agent: string; message: string; time: string; type: 'info' | 'success' | 'warning' }[] }) => (
  <div className="space-y-2 max-h-96 overflow-y-auto">
    {logs.map((log, i) => (
      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
        <div className={`w-2 h-2 rounded-full mt-1.5 ${
          log.type === 'success' ? 'bg-emerald-400' : 
          log.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 mb-0.5">{log.agent} • {log.time}</p>
          <p className="text-sm text-white/80">{log.message}</p>
        </div>
      </div>
    ))}
  </div>
);

const BudgetPanel = ({ allocations, totalBudget, remaining }: { allocations: BudgetAllocation[]; totalBudget: number; remaining: number }) => (
  <div className="p-5 rounded-xl bg-white/5 border border-white/10">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Wallet className="w-5 h-5 text-emerald-400" />
        Daily Budget
      </h3>
      <span className="text-2xl font-bold font-mono text-emerald-400">${remaining.toLocaleString()}</span>
    </div>
    
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-white/60">Used</span>
        <span className="text-white font-mono">${(totalBudget - remaining).toLocaleString()} / ${totalBudget.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
          style={{ width: `${((totalBudget - remaining) / totalBudget) * 100}%` }}
        />
      </div>
    </div>
    
    <div className="space-y-3">
      {allocations.map((alloc, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-sm text-white/60">{alloc.agent}</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full rounded-full bg-emerald-400/60"
                style={{ width: `${(alloc.used / alloc.allocated) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white/40">${alloc.remaining}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main App Component
function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [portfolioValue, setPortfolioValue] = useState(124592.47);
  const [dailyPnL, setDailyPnL] = useState(2847.23);
  const [logs, setLogs] = useState<{ agent: string; message: string; time: string; type: 'info' | 'success' | 'warning' }[]>([
    { agent: 'System', message: 'Trading platform initialized', time: '08:00:00', type: 'info' },
    { agent: 'Lookahead', message: 'Market scan complete - 12 opportunities identified', time: '08:15:32', type: 'info' },
    { agent: 'Simulation', message: 'Scenario testing completed - 73% confidence on BTC long', time: '08:22:15', type: 'success' },
    { agent: 'Analyst', message: 'RSI divergence detected on ETH/USD', time: '08:30:45', type: 'warning' },
  ]);

  const agents: Agent[] = [
    {
      id: 'lookahead',
      name: 'Lookahead Agent',
      icon: <Eye className="w-6 h-6 text-emerald-400" />,
      description: 'Analyzes historical patterns and market indicators to predict price movements and identify emerging trends.',
      capabilities: ['Pattern Recognition', 'Trend Forecasting', 'Support/Resistance'],
      status: sessionActive ? 'scanning' : 'idle',
      color: 'bg-emerald-500',
      lastActivity: '2 min ago',
      confidence: 87
    },
    {
      id: 'simulation',
      name: 'Simulation Agent',
      icon: <Box className="w-6 h-6 text-purple-400" />,
      description: 'Runs thousands of scenario simulations to test strategy viability and predict outcomes.',
      capabilities: ['Monte Carlo', 'Risk Assessment', 'Backtesting'],
      status: sessionActive ? 'running' : 'idle',
      color: 'bg-purple-500',
      lastActivity: '5 min ago',
      confidence: 73
    },
    {
      id: 'analyst',
      name: 'Analyst Agent',
      icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
      description: 'Processes real-time market data, news sentiment, and technical indicators.',
      capabilities: ['Technical Analysis', 'Sentiment Tracking', 'Correlation'],
      status: sessionActive ? 'analyzing' : 'idle',
      color: 'bg-blue-500',
      lastActivity: '1 min ago',
      confidence: 91
    },
    {
      id: 'trading',
      name: 'Trading Agent',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      description: 'Executes trades with precision timing and manages positions based on agent consensus.',
      capabilities: ['Order Execution', 'Position Mgmt', 'Risk Controls'],
      status: sessionActive ? 'executing' : 'idle',
      color: 'bg-amber-500',
      lastActivity: 'Just now',
      confidence: 82
    }
  ];

  const budgetAllocations: BudgetAllocation[] = [
    { agent: 'Lookahead', allocated: 5000, used: 1200, remaining: 3800 },
    { agent: 'Simulation', allocated: 3000, used: 800, remaining: 2200 },
    { agent: 'Analyst', allocated: 2000, used: 400, remaining: 1600 },
    { agent: 'Trading', allocated: 20000, used: 8500, remaining: 11500 },
  ];

  const totalBudget = 30000;
  const remainingBudget = budgetAllocations.reduce((sum, b) => sum + b.remaining, 0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sessionActive && !sessionPaused) {
      const interval = setInterval(() => {
        setPortfolioValue(prev => prev + (Math.random() - 0.4) * 100);
        setDailyPnL(prev => prev + (Math.random() - 0.4) * 50);
        
        // Add random logs
        if (Math.random() > 0.7) {
          const newLog = {
            agent: agents[Math.floor(Math.random() * agents.length)].name,
            message: ['Scanning markets...', 'Pattern detected', 'Executing trade', 'Analysis complete'][Math.floor(Math.random() * 4)],
            time: new Date().toLocaleTimeString(),
            type: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)] as 'info' | 'success' | 'warning'
          };
          setLogs(prev => [newLog, ...prev].slice(0, 50));
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [sessionActive, sessionPaused]);

  const handleStartSession = () => {
    setSessionActive(true);
    setSessionPaused(false);
    setLogs(prev => [{ agent: 'System', message: 'Trading session started', time: new Date().toLocaleTimeString(), type: 'success' }, ...prev]);
  };

  const handlePauseSession = () => {
    setSessionPaused(!sessionPaused);
    setLogs(prev => [{ agent: 'System', message: `Trading session ${sessionPaused ? 'resumed' : 'paused'}`, time: new Date().toLocaleTimeString(), type: 'warning' }, ...prev]);
  };

  const handleStopSession = () => {
    setSessionActive(false);
    setSessionPaused(false);
    setLogs(prev => [{ agent: 'System', message: 'Trading session stopped', time: new Date().toLocaleTimeString(), type: 'info' }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0a0c10]/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-lg font-bold">TradeMind AI</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">Dashboard</a>
            <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">Agents</a>
            <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">Performance</a>
            <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">Settings</a>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5 text-white/60" />
            </button>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Settings className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <StatusBadge 
                    status={sessionActive ? 'active' : 'inactive'} 
                    text={sessionActive ? '4 Agents Active' : 'Session Inactive'} 
                  />
                  <span className="text-sm text-white/40">{currentTime.toLocaleString()}</span>
                </div>
                <h1 className="text-4xl font-bold text-white">AI Trading Command Center</h1>
                <p className="text-white/60 mt-1">Four autonomous agents analyzing markets and executing strategies</p>
              </div>
              
              <div className="flex items-center gap-3">
                {!sessionActive ? (
                  <button 
                    onClick={handleStartSession}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-all hover:scale-105 glow-green"
                  >
                    <Play className="w-5 h-5" />
                    Start Session
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handlePauseSession}
                      className="flex items-center gap-2 px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold rounded-lg transition-all"
                    >
                      {sessionPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      {sessionPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                      onClick={handleStopSession}
                      className="flex items-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg transition-all"
                    >
                      <Square className="w-5 h-5" />
                      Stop
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-4">
              <MetricCard 
                label="Portfolio Value" 
                value={portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                prefix="$"
              />
              <MetricCard 
                label="Daily P&L" 
                value={dailyPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                change={(dailyPnL / (portfolioValue - dailyPnL)) * 100}
                prefix="$"
              />
              <MetricCard 
                label="Active Positions" 
                value="7" 
              />
              <MetricCard 
                label="Win Rate Today" 
                value="68.5" 
                change={2.3}
                prefix="%"
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Agents & Chart */}
            <div className="col-span-2 space-y-6">
              {/* Agent Network */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Autonomous Agent Network
                  </h2>
                  <button className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    View Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {agents.map(agent => (
                    <AgentCard 
                      key={agent.id}
                      agent={agent}
                      isActive={selectedAgent === agent.id}
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Live Chart */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CandlestickChart className="w-5 h-5 text-emerald-400" />
                    Portfolio Performance
                  </h2>
                  <div className="flex items-center gap-2">
                    {['1m', '5m', '15m', '1h', '4h', '1D'].map((tf, i) => (
                      <button 
                        key={tf}
                        className={`px-3 py-1 text-xs rounded ${i === 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockChartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d084" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00d084" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                      <XAxis dataKey="time" stroke="#8b949e" fontSize={12} />
                      <YAxis stroke="#8b949e" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#161920', border: '1px solid #2d3748', borderRadius: '8px' }}
                        labelStyle={{ color: '#8b949e' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#00d084" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Performance Analytics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-4">Agent Contribution</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={mockAgentContribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {mockAgentContribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#161920', border: '1px solid #2d3748', borderRadius: '8px' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mockAgentContribution.map((item, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-white/60">{item.name} {item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-4">Monthly Returns</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockMonthlyReturns}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="month" stroke="#8b949e" fontSize={12} />
                        <YAxis stroke="#8b949e" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#161920', border: '1px solid #2d3748', borderRadius: '8px' }}
                          formatter={(value) => [`${value}%`, 'Return']}
                        />
                        <Bar dataKey="return" fill="#00d084" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Budget & Activity */}
            <div className="space-y-6">
              {/* Budget Panel */}
              <BudgetPanel 
                allocations={budgetAllocations}
                totalBudget={totalBudget}
                remaining={remainingBudget}
              />

              {/* Agent Activity Feed */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    Agent Activity
                  </h3>
                  <button 
                    onClick={() => setLogs([])}
                    className="text-xs text-white/40 hover:text-white/60"
                  >
                    Clear
                  </button>
                </div>
                <ActivityLog logs={logs} />
              </div>

              {/* Quick Stats */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Session Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Session Duration</span>
                    <span className="text-sm font-mono text-white">02:34:18</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Trades Executed</span>
                    <span className="text-sm font-mono text-white">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Winning Trades</span>
                    <span className="text-sm font-mono text-emerald-400">18</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Losing Trades</span>
                    <span className="text-sm font-mono text-red-400">6</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Avg Trade Size</span>
                    <span className="text-sm font-mono text-white">$2,450</span>
                  </div>
                </div>
              </div>

              {/* Market Overview */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-emerald-400" />
                  Market Overview
                </h3>
                <div className="space-y-3">
                  {[
                    { symbol: 'BTC/USD', price: 67245.30, change: 2.34 },
                    { symbol: 'ETH/USD', price: 3521.80, change: 1.87 },
                    { symbol: 'SPY', price: 445.20, change: -0.45 },
                    { symbol: 'QQQ', price: 378.90, change: 0.92 },
                  ].map((market, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm font-medium text-white">{market.symbol}</span>
                      <div className="text-right">
                        <p className="text-sm font-mono text-white">${market.price.toLocaleString()}</p>
                        <p className={`text-xs ${market.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {market.change >= 0 ? '+' : ''}{market.change}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
