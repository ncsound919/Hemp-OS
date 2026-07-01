import { useState, useEffect, useCallback, useRef } from 'react';
import parser from 'cron-parser';
import { CronJob, CronJobFormData } from './types';
import { showSuccess, showError } from './toast';

const API_BASE = '/api/cron'; // Change to your actual backend URL

const STORAGE_KEY = 'cron-daemon-jobs';

interface UseCronDaemonOptions {
  initialJobs?: CronJob[];
  initialEnabled?: boolean;
  tickInterval?: number;
}

export function useCronDaemon({
  initialJobs = [],
  initialEnabled = true,
  tickInterval = 5,
}: UseCronDaemonOptions) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [countdown, setCountdown] = useState(10);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage + initial data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setJobs(JSON.parse(saved));
      } catch {
        setJobs(initialJobs);
      }
    } else {
      setJobs(initialJobs);
    }
  }, [initialJobs]);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const calculateNextRun = useCallback((schedule: string): string => {
    try {
      const interval = (parser as any).parseExpression(schedule);
      return interval.next().toDate().toISOString();
    } catch {
      return new Date(Date.now() + 60000).toISOString();
    }
  }, []);

  // Real backend API helpers
  const api = {
    runJob: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}/run`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to run job');
      return res.json();
    },

    createJob: async (data: CronJobFormData) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create job');
      return res.json();
    },

    updateJob: async (id: string, data: Partial<CronJobFormData>) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update job');
      return res.json();
    },

    deleteJob: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete job');
    },
  };

  // Global tick
  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= tickInterval ? 10 : prev - tickInterval));
      // Optional: sync with backend periodically
    }, tickInterval * 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [enabled, tickInterval]);

  const runJobNow = useCallback(async (id: string) => {
    setRunningJobs(prev => new Set(prev).add(id));

    try {
      await api.runJob(id);
      
      setJobs(prev => prev.map(job => 
        job.id === id 
          ? { 
              ...job, 
              lastRun: new Date().toISOString(),
              nextRun: calculateNextRun(job.schedule),
              lastExecutionDuration: Math.floor(Math.random() * 800) + 300,
              status: 'active'
            } 
          : job
      ));
      
      showSuccess(`Job executed successfully`);
    } catch (err) {
      setJobs(prev => prev.map(job => 
        job.id === id ? { ...job, status: 'error' } : job
      ));
      showError(`Failed to run job: ${(err as Error).message}`);
    } finally {
      setRunningJobs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [calculateNextRun]);

  const addJob = useCallback(async (data: CronJobFormData) => {
    setIsLoading(true);
    try {
      const newJobFromServer = await api.createJob(data);
      setJobs(prev => [...prev, { 
        ...newJobFromServer, 
        nextRun: calculateNextRun(data.schedule) 
      }]);
      showSuccess('Job created successfully');
    } catch (err) {
      showError(`Failed to create job: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [calculateNextRun]);

  const updateJob = useCallback(async (id: string, data: Partial<CronJobFormData>) => {
    try {
      await api.updateJob(id, data);
      setJobs(prev => prev.map(job => 
        job.id === id 
          ? { 
              ...job, 
              ...data, 
              nextRun: data.schedule ? calculateNextRun(data.schedule) : job.nextRun 
            } 
          : job
      ));
      showSuccess('Job updated');
    } catch (err) {
      showError(`Update failed: ${(err as Error).message}`);
    }
  }, [calculateNextRun]);

  const deleteJob = useCallback(async (id: string) => {
    try {
      await api.deleteJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      showSuccess('Job deleted');
    } catch (err) {
      showError(`Delete failed: ${(err as Error).message}`);
    }
  }, []);

  return {
    jobs,
    enabled,
    countdown,
    runningJobs: Array.from(runningJobs),
    isLoading,
    setEnabled,
    toggleJob: (id: string) => setJobs(prev => prev.map(j => j.id === id ? { ...j, status: j.status === 'active' ? 'paused' : 'active' } : j)),
    runJobNow,
    addJob,
    updateJob,
    deleteJob,
  };
}
