import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { CronJob } from './types.ts';
import { validateCronExpression } from './cronUtils.ts';

interface JobModalProps {
  job: CronJob | null; // null means "Create New"
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, data: { name: string; schedule: string; action: string; status: 'active' | 'paused' }) => void;
}

export const JobModal: React.FC<JobModalProps> = ({
  job,
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const isEditing = !!job;

  // Initialize form state
  useEffect(() => {
    if (job) {
      setName(job.name);
      setSchedule(job.schedule);
      setAction(job.action);
      setStatus(job.status);
    } else {
      setName('');
      setSchedule('*/15 * * * *');
      setAction('');
      setStatus('active');
    }
    setError('');
  }, [job, isOpen]);

  // Support ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Job name is required.');
      return;
    }

    if (!validateCronExpression(schedule)) {
      setError('Invalid cron expression. Expected format: * * * * *');
      return;
    }

    if (!action.trim()) {
      setError('Job action description is required.');
      return;
    }

    onSave(isEditing ? job.id : null, {
      name: name.trim(),
      schedule: schedule.trim(),
      action: action.trim(),
      status
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={modalRef} 
        className="bg-[#121214] border border-[#1f1f21] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6"
      >
        <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            {isEditing ? 'Edit Cron Daemon' : 'Register New Daemon'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0d0d0f] hover:bg-[#1a1a1c] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">
              Job Identifier / Name
            </label>
            <input
              id="input-cron-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Precipitation Calibration Sweep"
              className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">
              Cron Schedule Pattern (5-field)
            </label>
            <input
              id="input-cron-schedule"
              type="text"
              value={schedule}
              onChange={(e) => {
                setSchedule(e.target.value);
                setError('');
              }}
              placeholder="*/15 * * * *"
              className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-all"
              required
            />
            <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
              <span>min hr dom mon dow</span>
              <span className="text-purple-400 font-bold">Real-time parsed</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">
              Execution Action Description
            </label>
            <input
              id="input-cron-action"
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Regulate secondary flowsheet coefficient parameters"
              className="w-full bg-[#0d0d0f] border border-[#1f1f21] rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">
              Initial Deployment Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`px-4 py-3 border text-[9px] font-mono uppercase font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  status === 'active'
                    ? 'bg-purple-950/20 border-purple-500 text-purple-300'
                    : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${status === 'active' ? 'opacity-100' : 'opacity-0'}`} />
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('paused')}
                className={`px-4 py-3 border text-[9px] font-mono uppercase font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  status === 'paused'
                    ? 'bg-zinc-950 border-zinc-500 text-zinc-300'
                    : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${status === 'paused' ? 'opacity-100' : 'opacity-0'}`} />
                Paused
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-[9px] font-mono uppercase tracking-wide">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-[#1f1f21]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#0d0d0f] border border-[#1f1f21] text-gray-400 hover:text-white font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              id="btn-save-cron"
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-mono text-[9px] uppercase tracking-widest font-bold rounded-xl cursor-pointer shadow-lg transition-all"
            >
              {isEditing ? 'Save Changes' : 'Deploy Daemon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
