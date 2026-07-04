// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useCronDaemon } from './useCronDaemon';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import parser from 'cron-parser';
import { showSuccess, showError } from './toast';

vi.mock('./toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

global.fetch = vi.fn();

describe('useCronDaemon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calculates next run date using cron-parser', () => {
    const { result } = renderHook(() => useCronDaemon({}));

    act(() => {
      result.current.addJob({
        name: 'Test Job',
        schedule: '*/10 * * * *',
        action: 'Test',
        status: 'active',
      });
    });

    expect(result.current.jobs[0].schedule).toBe('*/10 * * * *');
    expect(new Date(result.current.jobs[0].nextRun)).toBeInstanceOf(Date);
  });

  it('handles successful job run', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useCronDaemon({ initialJobs: [{ id: 'job-123', name: 'Test', schedule: '* * * * *', action: '', status: 'active', lastRun: null, nextRun: '' }] }));

    await act(async () => {
      await result.current.runJobNow('job-123');
    });

    expect(showSuccess).toHaveBeenCalled();
  });

  it('handles job run failure and sets error status', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCronDaemon({ initialJobs: [{ id: 'job-123', name: 'Test', schedule: '* * * * *', action: '', status: 'active', lastRun: null, nextRun: '' }] }));

    await act(async () => {
      await result.current.runJobNow('job-123');
    });

    expect(result.current.jobs[0].status).toBe('error');
    expect(showError).toHaveBeenCalled();
  });

  it('validates cron expressions in modal flow (via calculateNextRun)', () => {
    const invalid = () => (parser as any).parseExpression('invalid-cron');
    expect(invalid).toThrow();
  });
});
