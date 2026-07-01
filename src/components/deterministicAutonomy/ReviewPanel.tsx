import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Cpu, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StagedHypothesis } from '../../types/provenance.types.ts';

interface ReviewPanelProps {
  pendingStages: Array<{ id: string; summary: string; record: StagedHypothesis }>;
  allHypotheses: StagedHypothesis[];
  onReview: (id: string, approved: boolean, comment: string) => Promise<void>;
}

export function ReviewPanel({ pendingStages, allHypotheses, onReview }: ReviewPanelProps) {
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleAction = async (id: string, approved: boolean) => {
    setSubmittingId(id);
    const comment = comments[id] || (approved ? 'Approved by operator' : 'Rejected by operator');
    try {
      await onReview(id, approved, comment);
      // Clear comment for this id
      setComments(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error('Error reviewing staged hypothesis:', e);
    } finally {
      setSubmittingId(null);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) {
      return (
        <span className="px-2 py-0.5 text-[8.5px] font-bold font-mono tracking-wider text-red-400 bg-red-950/40 border border-red-500/30 rounded uppercase flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-red-500" /> High Risk ({score}%)
        </span>
      );
    } else if (score >= 40) {
      return (
        <span className="px-2 py-0.5 text-[8.5px] font-bold font-mono tracking-wider text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded uppercase flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" /> Moderate Risk ({score}%)
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 text-[8.5px] font-bold font-mono tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded uppercase flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Low Risk ({score}%)
        </span>
      );
    }
  };

  const historicalHypotheses = allHypotheses.filter(h => h.status !== 'pending').slice(0, 5);

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1f1f21]">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-400" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#aaa]">
                Human-in-the-Loop Reviews
              </h3>
              <span className="text-[8px] bg-purple-900/40 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-mono font-bold tracking-widest">[POLICY AUDITOR ACTIVE]</span>
            </div>
            <p className="text-[10px] text-[#555] font-mono mt-0.5">
              Review, Approve or Veto Autonomous AI Process Staging Hypotheses
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Reviews Panel */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
            Awaiting Operator Evaluation ({pendingStages.length})
          </h4>

          {pendingStages.length === 0 ? (
            <div className="h-[150px] bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] flex flex-col items-center justify-center text-center p-4">
              <CheckCircle2 className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-xs text-gray-500 font-mono">No hypotheses are currently awaiting manual human review.</p>
              <p className="text-[8.5px] text-gray-600 font-mono uppercase mt-1">Autonomous agent loop cleared / fully auto-approved</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {pendingStages.map(({ id, record }) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] hover:border-[#2a2a2f] transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-wider block">Hypothesis ID: {id}</span>
                        <h5 className="text-xs font-semibold text-white tracking-tight">
                          {record.thoughtChain.hypothesis}
                        </h5>
                      </div>
                      {getRiskBadge(record.riskScore)}
                    </div>

                    {/* Parameter Deltas */}
                    <div className="bg-[#121214] border border-[#1f1f21] p-2.5 rounded-lg font-mono text-[9px]">
                      <span className="text-[7.5px] uppercase text-purple-400 block mb-1 font-bold">Proposed Flowsheet Changes:</span>
                      {Object.entries(record.parameterDelta).map(([stage, config]) => (
                        <div key={stage} className="flex flex-col gap-0.5 text-gray-300">
                          <span className="text-gray-400 capitalize font-semibold">{stage} Config:</span>
                          {Object.entries(config as Record<string, any>).map(([param, val]) => (
                            <div key={param} className="flex items-center gap-1.5 pl-2 text-emerald-400">
                              <span>•</span>
                              <span className="text-gray-500">{param}:</span>
                              <span>{typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Supporting Evidence */}
                    {record.thoughtChain.supporting_evidence && record.thoughtChain.supporting_evidence.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Supporting Evidence / Chain of Thought</span>
                        <div className="text-[9px] text-gray-400 bg-[#121214] p-2 rounded border border-[#1f1f21] font-mono space-y-1 max-h-[80px] overflow-y-auto">
                          {record.thoughtChain.supporting_evidence.map((ev, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <span className="text-purple-400 font-bold">[{i + 1}]</span>
                              <span>{ev}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comment Input & Actions */}
                    <div className="pt-2 border-t border-[#1c1c1f] flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Add manual audit comment..."
                        value={comments[id] || ''}
                        onChange={e => setComments(prev => ({ ...prev, [id]: e.target.value }))}
                        className="w-full bg-[#121214] border border-[#1c1c1f] focus:border-purple-500 rounded px-2.5 py-1.5 text-[10px] font-mono text-white outline-none placeholder-gray-600"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={submittingId !== null}
                          onClick={() => handleAction(id, false)}
                          className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/30 border border-red-500/30 hover:border-red-500/50 text-[9px] font-mono font-bold text-red-400 rounded-md uppercase cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          disabled={submittingId !== null}
                          onClick={() => handleAction(id, true)}
                          className="px-3 py-1.5 bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500/50 text-[9px] font-mono font-bold text-emerald-400 rounded-md uppercase cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Audit Log Panel */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Immutable Audit Log (Past Decisions)
          </h4>

          {historicalHypotheses.length === 0 ? (
            <div className="h-[150px] bg-[#0d0d0f] rounded-xl border border-[#1c1c1f] flex flex-col items-center justify-center text-center p-4">
              <ClipboardList className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-xs text-gray-500 font-mono">No historical decisions logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 font-mono text-[9px]">
              {historicalHypotheses.map(hyp => (
                <div
                  key={hyp.id}
                  className="p-3 bg-[#0d0d0f] rounded-lg border border-[#1c1c1f] hover:border-[#1c1c1f] transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">ID: {hyp.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        hyp.status === 'completed' || hyp.status === 'approved'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                          : hyp.status === 'rejected'
                          ? 'bg-red-950/40 text-red-400 border border-red-500/20'
                          : 'bg-gray-800/40 text-gray-400 border border-gray-700/20'
                      }`}
                    >
                      {hyp.status}
                    </span>
                  </div>
                  <p className="text-gray-300 font-sans text-[10px] font-medium leading-tight">{hyp.thoughtChain.hypothesis}</p>
                  
                  <div className="pt-1.5 border-t border-[#1c1c1f] flex flex-col gap-0.5 text-gray-500 text-[8px]">
                    <div className="flex justify-between">
                      <span>Operator:</span>
                      <span className="text-gray-400">{hyp.operatorReviewer || 'System (Auto)'}</span>
                    </div>
                    {hyp.operatorComment && (
                      <div className="flex justify-between">
                        <span>Comment:</span>
                        <span className="text-gray-400 truncate max-w-[150px]">{hyp.operatorComment}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Reviewed At:</span>
                      <span className="text-gray-400">
                        {hyp.reviewedAt ? new Date(hyp.reviewedAt).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
