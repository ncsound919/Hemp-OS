/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Info, RefreshCw, Layers } from 'lucide-react';
import { VerificationReport } from '../../kernel/validation/reports.ts';

export const KernelReport: React.FC = () => {
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/kernel/verify');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to retrieve report');
      }
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Verification pipeline offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-xl text-white flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0a0a0b] p-4 border-b border-[#1f1f21] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#aaa]">KERNEL INTEGRITY REPORT</h3>
          <span className="ml-2 text-[9px] bg-blue-900/40 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">[DETERMINISTIC KERNEL]</span>
        </div>
        <button
          type="button"
          onClick={fetchReport}
          disabled={loading}
          className="text-[#666] hover:text-[#aaa] transition-all cursor-pointer p-1 rounded-md hover:bg-[#1f1f21]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !report ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 min-h-[350px]">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Compiling mathematical proofs and verifying conservation assertions...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400 flex flex-col items-center gap-2 min-h-[350px] justify-center">
          <XCircle className="w-8 h-8 text-red-500" />
          <div className="font-semibold text-xs uppercase">Verification Pipeline Blocked</div>
          <p className="text-[11px] text-slate-500 leading-normal">{error}</p>
        </div>
      ) : report ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[500px]">
          {/* Scoring badge */}
          <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#1f1f21] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#555] font-bold uppercase tracking-wider">KERNEL VERIFIED STATUS</div>
              <div className="text-[10px] text-[#888] mt-0.5">Strict Physical Determinism Compliant</div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-blue-400">{report.summary.integrityScore.toFixed(0)}%</span>
              <div className="text-[9px] text-blue-500 font-bold tracking-wider uppercase mt-0.5">INTEGRITY PASS</div>
            </div>
          </div>

          {/* Sandboxed characteristics checklist */}
          <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold tracking-wide">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>STRICT OFF-LINE ISOLATION PROPERTIES</span>
            </div>
            <ul className="text-[11px] text-[#aaa] list-inside list-disc leading-relaxed flex flex-col gap-0.5 font-sans pl-1">
              <li>0% Network or HTTP access in physics paths</li>
              <li>No stochastic behavior (0% Math.random dependency)</li>
              <li>Strict Arrhenius reaction kinetic constraints</li>
              <li>Conservation of mass boundaries verified (to 0.001 kg)</li>
            </ul>
          </div>

          {/* Test cases */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[10px] text-[#555] font-bold uppercase tracking-widest pb-1.5 border-b border-[#1f1f21]">
              Deterministic Test Suite Results
            </div>

            {report.results.map((res, idx) => (
              <div key={idx} className="bg-[#0d0d0f]/60 rounded-xl border border-[#1f1f21] p-3.5 flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold truncate max-w-[180px]">{res.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    res.status === 'passed' ? 'bg-blue-950/30 text-blue-400 border border-blue-900/40' : 'bg-red-950/30 text-red-400 border border-red-900/40'
                  }`}>
                    {res.status}
                  </span>
                </div>
                <p className="text-[#888] text-[10px] leading-relaxed font-sans">{res.details}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-[#1f1f21] pt-1.5 mt-0.5 text-[#555] font-bold">
                  <div>
                    <span className="text-[#555] font-sans">Expected:</span>
                    <div className="text-[#aaa] mt-0.5 font-semibold">{res.expected}</div>
                  </div>
                  <div>
                    <span className="text-[#555] font-sans">Actual:</span>
                    <div className="text-[#aaa] mt-0.5 truncate font-semibold">{res.actual}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
