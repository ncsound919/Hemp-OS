import React, { useState } from 'react';
import { Clock, Plus, Edit, Trash2, Play } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { CronJob } from './types.ts';
import { JobModal } from './JobModal.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { calculateNextRun } from './cronUtils.ts';

interface CronDaemonPanelProps {
  cronJobs: CronJob[];
  isCronEnabled: boolean;
  cronCountdown: number;
  setIsCronEnabled: (enabled: boolean) => void;
  handleToggleJob: (id: string) => void;
  handleRunJobNow: (name: string) => void;
  handleCreateJob: (data: { name: string; schedule: string; action: string; status: 'active' | 'paused' }) => void;
  handleUpdateJob: (id: string, data: { name: string; schedule: string; action: string; status: 'active' | 'paused' }) => void;
  handleDeleteJob: (id: string) => void;
}

const CronDaemonPanelContent: React.FC<CronDaemonPanelProps> = ({
  cronJobs,
  isCronEnabled,
  cronCountdown,
  setIsCronEnabled,
  handleToggleJob,
  handleRunJobNow,
  handleCreateJob,
  handleUpdateJob,
  handleDeleteJob
}) => {
  const [modalJob, setModalJob] = useState<CronJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreateModal = () => {
    setModalJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: CronJob) => {
    setModalJob(job);
    setIsModalOpen(true);
  };

  const handleSave = (id: string | null, data: { name: string; schedule: string; action: string; status: 'active' | 'paused' }) => {
    if (id) {
      handleUpdateJob(id, data);
      toast.success(`Daemon "${data.name}" updated successfully.`, {
        style: {
          background: '#121214',
          color: '#e4e4e7',
          border: '1px solid #1f1f21',
          fontFamily: 'monospace',
          fontSize: '11px',
        },
        iconTheme: {
          primary: '#a855f7',
          secondary: '#fff',
        },
      });
    } else {
      handleCreateJob(data);
      toast.success(`New daemon "${data.name}" deployed.`, {
        style: {
          background: '#121214',
          color: '#e4e4e7',
          border: '1px solid #1f1f21',
          fontFamily: 'monospace',
          fontSize: '11px',
        },
        iconTheme: {
          primary: '#a855f7',
          secondary: '#fff',
        },
      });
    }
  };

  const onDeleteClick = (id: string, name: string) => {
    handleDeleteJob(id);
    toast.error(`Daemon "${name}" decommissioned.`, {
      style: {
        background: '#121214',
        color: '#e4e4e7',
        border: '1px solid #1f1f21',
        fontFamily: 'monospace',
        fontSize: '11px',
      },
    });
  };

  const onToggleClick = (id: string, name: string, currentlyActive: boolean) => {
    handleToggleJob(id);
    const stateMsg = currentlyActive ? 'paused' : 'resumed';
    toast.success(`Daemon "${name}" ${stateMsg}.`, {
      style: {
        background: '#121214',
        color: '#e4e4e7',
        border: '1px solid #1f1f21',
        fontFamily: 'monospace',
        fontSize: '11px',
      },
    });
  };

  const onRunNowClick = (name: string) => {
    handleRunJobNow(name);
    toast.success(`Instigated immediate run of "${name}"`, {
      style: {
        background: '#121214',
        color: '#e4e4e7',
        border: '1px solid #1f1f21',
        fontFamily: 'monospace',
        fontSize: '11px',
      },
    });
  };

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Registered Cron Daemons</h3>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter mt-1">
            Deterministic schedules regulating process graph boundaries and backtesting coefficients
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            id="btn-register-cron"
            type="button"
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 bg-[#1b1b1e] border border-[#2d2d30] text-gray-300 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Job</span>
          </button>

          <button
            id="btn-toggle-global-cron"
            type="button"
            onClick={() => setIsCronEnabled(!isCronEnabled)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 ${
              isCronEnabled
                ? 'bg-purple-950/40 border border-purple-500 text-purple-300 animate-pulse'
                : 'text-gray-500 hover:text-white bg-[#0d0d0f]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cron: {isCronEnabled ? `ON (${cronCountdown}s)` : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cronJobs.map((job) => {
          const isActive = job.status === 'active';
          const dynamicNextRun = isActive ? calculateNextRun(job.schedule) : 'Paused';
          
          return (
            <div 
              id={`cron-job-card-${job.id}`}
              key={job.id} 
              className={`p-4 bg-[#0d0d0f] border rounded-xl flex flex-col justify-between transition-all relative group ${
                isActive ? 'border-purple-500/20' : 'border-[#1f1f21] opacity-65'
              }`}
            >
              {/* Top card action buttons shown on hover / always mobile */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  id={`btn-edit-cron-${job.id}`}
                  type="button"
                  onClick={() => openEditModal(job)}
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-[#1a1a1c] transition-all cursor-pointer"
                  title="Edit schedule configuration"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  id={`btn-delete-cron-${job.id}`}
                  type="button"
                  onClick={() => onDeleteClick(job.id, job.name)}
                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-[#1a1a1c] transition-all cursor-pointer"
                  title="Decommission daemon"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1.5 pr-12">
                <div className="flex flex-col">
                  <span className="text-[10.5px] font-bold text-white uppercase tracking-wide truncate max-w-[170px]" title={job.name}>
                    {job.name}
                  </span>
                  <span className={`self-start mt-1 px-1.5 py-0.5 rounded text-[6.5px] font-mono uppercase font-bold tracking-wider ${
                    isActive 
                      ? 'bg-purple-950/40 border border-purple-500/30 text-purple-300' 
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-500'
                  }`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="text-[8px] font-mono text-[#666] space-y-0.5 uppercase tracking-wide pt-1">
                  <p><span className="text-gray-500">Schedule:</span> <span className="text-gray-300 font-bold">{job.schedule}</span></p>
                  <p><span className="text-gray-500">Last Run:</span> <span className="text-gray-400">{job.lastRun || 'Never'}</span></p>
                  <p><span className="text-gray-500">Next Run:</span> <span className={isActive ? 'text-purple-400 font-bold' : 'text-zinc-600'}>{dynamicNextRun}</span></p>
                  <p className="text-gray-400 mt-2 border-t border-[#1a1a1c] pt-1.5">
                    <span className="text-zinc-500 block mb-0.5">Core Action:</span>
                    <span className="text-zinc-300 block normal-case leading-relaxed">{job.action}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 border-t border-[#1a1a1c] pt-3">
                <button
                  id={`btn-toggle-job-${job.id}`}
                  type="button"
                  onClick={() => onToggleClick(job.id, job.name, isActive)}
                  className="flex-1 px-2.5 py-1 bg-[#161619] border border-[#2d2d30] text-gray-400 hover:text-white font-mono text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all"
                >
                  {isActive ? 'Pause' : 'Activate'}
                </button>
                <button
                  id={`btn-run-job-now-${job.id}`}
                  type="button"
                  onClick={() => onRunNowClick(job.name)}
                  className="flex-1 px-2.5 py-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/20 text-purple-300 font-mono text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Run Now</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <JobModal
        job={modalJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
      
      {/* Toast notifications rendering target */}
      <Toaster position="bottom-right" reverseOrder={false} />
    </div>
  );
};

export const CronDaemonPanel: React.FC<CronDaemonPanelProps> = (props) => {
  return (
    <ErrorBoundary>
      <CronDaemonPanelContent {...props} />
    </ErrorBoundary>
  );
};
