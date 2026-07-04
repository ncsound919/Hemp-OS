/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Link as LinkIcon, 
  Award, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  Filter, 
  Search,
  Database,
  Calendar,
  Flame,
  LineChart
} from 'lucide-react';

interface Insight {
  id: number;
  type: 'correlation' | 'trend' | 'anomaly' | 'discovery' | string;
  title: string;
  description: string;
  confidence: number;
  category: string;
  tags: string[] | null;
  evidence: any;
  isVerified: boolean;
  generatedAt: string;
  createdAt: string;
}

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let url = '/api/insights?limit=40';
      if (filterCategory !== 'all') {
        url += `&category=${filterCategory}`;
      }
      if (filterType !== 'all') {
        url += `&type=${filterType}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (err: any) {
      console.error('Failed to fetch insights:', err);
      setError(err.message || 'Failed to retrieve insights from the server.');
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterType]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRunAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      const res = await fetch('/api/insights/analyze', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchInsights();
    } catch (err: any) {
      console.error('Manual analysis run failed:', err);
      alert(`Analysis run failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredInsights = insights.filter(ins => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ins.title.toLowerCase().includes(q) ||
      ins.description.toLowerCase().includes(q) ||
      ins.category.toLowerCase().includes(q) ||
      (ins.tags && ins.tags.some(t => t.toLowerCase().includes(q)))
    );
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'correlation':
        return <Activity className="text-[#A5C9B3]" size={18} />;
      case 'trend':
        return <TrendingUp className="text-[#93C5FD]" size={18} />;
      case 'anomaly':
        return <AlertTriangle className="text-[#FCA5A5]" size={18} />;
      case 'discovery':
        return <Award className="text-[#FDE047]" size={18} />;
      default:
        return <LineChart className="text-gray-400" size={18} />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'correlation':
        return 'border-[#2D5A47]/40 hover:border-[#A5C9B3]/50';
      case 'trend':
        return 'border-blue-500/20 hover:border-blue-400/50';
      case 'anomaly':
        return 'border-red-500/20 hover:border-red-400/50';
      case 'discovery':
        return 'border-yellow-500/20 hover:border-yellow-400/50';
      default:
        return 'border-white/10 hover:border-white/25';
    }
  };

  const getBgGlow = (type: string) => {
    switch (type) {
      case 'correlation':
        return 'bg-[#2D5A47]/5';
      case 'trend':
        return 'bg-blue-500/5';
      case 'anomaly':
        return 'bg-red-500/5';
      case 'discovery':
        return 'bg-yellow-500/5';
      default:
        return 'bg-white/5';
    }
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto h-full space-y-8">
      {/* Upper Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 uppercase tracking-[0.2em] text-[#A5C9B3] text-[10px] font-bold">
            <span>Core Analytical Engine</span>
            <span className="h-px w-8 bg-[#A5C9B3]/40" />
            <span className="opacity-50">Local Mining & Statistical Insights</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-light italic text-white flex items-center gap-3">
            HempOS Insights
          </h2>
          <p className="mt-2 text-xs text-[#6B7280]">
            Autonomous, mathematical correlations, chemovar trends, Potency outliers, and research linkages computed on your localized PostgreSQL registry. No external APIs required.
          </p>
        </div>

        <div>
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isLoading}
            className="flex items-center gap-2 rounded-full border border-[#2D5A47] px-5 py-2.5 text-xs font-bold uppercase text-[#A5C9B3] hover:bg-[#2D5A47] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'Mining Database...' : 'Trigger Re-Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Grid Statistics Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Insights', val: insights.length, desc: 'Across all vectors', icon: <Database size={16} className="text-[#A5C9B3]" /> },
          { label: 'Correlations Found', val: insights.filter(i => i.type === 'correlation').length, desc: 'Pearson coefficient r ≥ 0.7', icon: <Activity size={16} className="text-[#34D399]" /> },
          { label: 'potency anomalies', val: insights.filter(i => i.type === 'anomaly').length, desc: 'Potency deviation ≥ 1.8σ', icon: <AlertTriangle size={16} className="text-red-400" /> },
          { label: 'Cross-Entity Citations', val: insights.filter(i => i.type === 'discovery').length, desc: 'Studies matching strain profiles', icon: <LinkIcon size={16} className="text-yellow-400" /> },
        ].map((stat, idx) => (
          <div key={idx} className="rounded-lg border border-white/10 bg-[#0F1113] p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{stat.label}</div>
              <div className="text-2xl font-mono font-bold text-white mt-1">{stat.val}</div>
              <div className="text-[9px] text-[#6B7280] mt-0.5">{stat.desc}</div>
            </div>
            <div className="bg-white/5 p-2 rounded">{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 border-b border-white/10 pb-5">
        {/* Filters Left */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 pr-2">
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded border border-white/15 bg-[#0F1113] text-xs px-3 py-1.5 text-white focus:border-[#A5C9B3] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="terpenes">Terpenes Synergy</option>
            <option value="cannabinoids">Potency & Cannabinoids</option>
            <option value="effects">Subjective Effects</option>
            <option value="studies">Clinical Clusters</option>
            <option value="cross-reference">Cross-Entity Matches</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded border border-white/15 bg-[#0F1113] text-xs px-3 py-1.5 text-white focus:border-[#A5C9B3] focus:outline-none"
          >
            <option value="all">All Formats</option>
            <option value="correlation">Correlations</option>
            <option value="trend">Trends</option>
            <option value="anomaly">Anomalies</option>
            <option value="discovery">Discoveries</option>
          </select>
        </div>

        {/* Search Right */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="Search keywords, compounds, tags, or outcomes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border border-white/15 bg-[#0F1113] pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-[#A5C9B3] focus:outline-none"
          />
        </div>
      </div>

      {/* Insights Display Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((_, idx) => (
            <div key={idx} className="animate-pulse bg-[#0F1113] rounded-lg h-32 w-full border border-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 text-red-400 p-4 rounded text-sm text-center">
          {error}
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="text-center py-16 text-[#6B7280] bg-[#0F1113] border border-white/5 rounded-lg">
          <Database size={40} className="mx-auto mb-3 opacity-30 text-[#A5C9B3]" />
          <div className="text-base font-serif italic text-white/80">No insights identified yet</div>
          <p className="text-xs max-w-md mx-auto mt-2">
            Add more strains, studies, or trigger a re-analysis. The mathematical correlation engine requires data records to run linear regression and matrix correlations!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInsights.map((ins) => {
            const hasConfidence = ins.confidence !== undefined;
            const borderCol = getBorderColor(ins.type);
            const glowBg = getBgGlow(ins.type);

            return (
              <div
                key={ins.id}
                className={`flex flex-col justify-between border ${borderCol} ${glowBg} rounded-lg p-5 transition-all duration-300 relative group overflow-hidden`}
              >
                {/* Upper bar */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-black/40 rounded">
                        {getIcon(ins.type)}
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#A5C9B3]">
                        {ins.type} • {ins.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ins.isVerified && (
                        <div className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-tight bg-emerald-950/45 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle size={10} />
                          <span>verified</span>
                        </div>
                      )}
                      
                      {hasConfidence && (
                        <div className="text-[10px] font-mono text-gray-400 bg-[#0A0B0C] px-2 py-0.5 rounded border border-white/5">
                          Conf: <span className="text-white font-bold">{Math.round(ins.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-serif text-lg font-normal text-white mb-2 group-hover:text-[#A5C9B3] transition-colors">
                    {ins.title}
                  </h3>

                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    {ins.description}
                  </p>
                </div>

                {/* Evidence Stats / Technical block */}
                <div>
                  {ins.evidence && (
                    <div className="bg-[#0A0B0C] border border-white/5 rounded p-3 mb-4 font-mono text-[11px] text-gray-400 space-y-1">
                      <div className="flex justify-between border-b border-white/5 pb-1 mb-1 text-[10px] uppercase font-bold text-gray-500">
                        <span>Evidence Parameters</span>
                        <span>Value</span>
                      </div>
                      {ins.type === 'correlation' && (
                        <>
                          <div className="flex justify-between">
                            <span>Pearson Coefficient (r)</span>
                            <span className="text-[#34D399] font-bold">{ins.evidence.correlation?.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sample Size (Strains)</span>
                            <span className="text-white font-bold">{ins.evidence.sampleSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Association</span>
                            <span className="text-yellow-400">High Synergy</span>
                          </div>
                        </>
                      )}
                      {ins.type === 'trend' && ins.evidence.slope !== undefined && (
                        <>
                          <div className="flex justify-between">
                            <span>Trend Slope (m)</span>
                            <span className={ins.evidence.slope > 0 ? 'text-[#93C5FD] font-bold' : 'text-red-400 font-bold'}>
                              {ins.evidence.slope > 0 ? '+' : ''}{ins.evidence.slope?.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Data Timeline Points</span>
                            <span className="text-white font-bold">{ins.evidence.ratioTimeline?.length || 0}</span>
                          </div>
                        </>
                      )}
                      {ins.type === 'anomaly' && ins.evidence.zScore !== undefined && (
                        <>
                          <div className="flex justify-between">
                            <span>Potency Potency Level</span>
                            <span className="text-white">{(ins.evidence.thcValue * 100)?.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Deviation Score (z)</span>
                            <span className="text-red-400 font-bold">{ins.evidence.zScore > 0 ? '+' : ''}{ins.evidence.zScore?.toFixed(2)}σ</span>
                          </div>
                        </>
                      )}
                      {ins.type === 'discovery' && ins.evidence.independentOddsRatio !== undefined && (
                        <>
                          <div className="flex justify-between">
                            <span>Co-occurrence Count</span>
                            <span className="text-white font-bold">{ins.evidence.cooccurrences} strains</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overrepresented Factor</span>
                            <span className="text-yellow-400 font-bold">{ins.evidence.independentOddsRatio}x</span>
                          </div>
                        </>
                      )}
                      {ins.type === 'discovery' && ins.evidence.strainName && (
                        <>
                          <div className="flex justify-between">
                            <span>Cited Strain</span>
                            <span className="text-[#A5C9B3] font-bold">{ins.evidence.strainName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Matching Study ID</span>
                            <span className="text-blue-400">#{ins.evidence.studyId}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tags & Time */}
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex flex-wrap gap-1.5">
                      {ins.tags && ins.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-gray-500">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-600 font-mono flex items-center gap-1 shrink-0">
                      <Calendar size={10} />
                      <span>{new Date(ins.generatedAt || ins.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
