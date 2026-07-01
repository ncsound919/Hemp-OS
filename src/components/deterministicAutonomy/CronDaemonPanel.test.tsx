// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { CronDaemonPanel } from './CronDaemonPanel.tsx';
import { CronJob } from './types.ts';

// Mock react-hot-toast so that toast calls don't hit the DOM
vi.mock('react-hot-toast', () => {
  return {
    default: {
      success: vi.fn(),
      error: vi.fn(),
    },
    Toaster: () => <div data-testid="mock-toaster" />,
  };
});

// This project's vitest setup does not enable global test hooks, so
// @testing-library/react's automatic DOM cleanup (which relies on a global
// `afterEach`) never runs. Without this, each `render()` call below leaves
// its DOM mounted, causing later tests to see duplicate elements from
// earlier renders (e.g. multiple "Run Now" buttons).
afterEach(() => {
  cleanup();
});

const mockJobs: CronJob[] = [
  {
    id: 'test-job-1',
    name: 'Precision Separation Loop',
    schedule: '*/5 * * * *',
    lastRun: '12 mins ago',
    nextRun: '',
    status: 'active',
    action: 'Run wax filtration pre-exponentials',
  },
];

describe('CronDaemonPanel Component Suite', () => {
  it('renders registered cron jobs, title, metadata and action buttons successfully', () => {
    const handleToggle = vi.fn();
    const handleRunNow = vi.fn();
    const handleCreate = vi.fn();
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <CronDaemonPanel
        cronJobs={mockJobs}
        isCronEnabled={true}
        cronCountdown={45}
        setIsCronEnabled={vi.fn()}
        handleToggleJob={handleToggle}
        handleRunJobNow={handleRunNow}
        handleCreateJob={handleCreate}
        handleUpdateJob={handleUpdate}
        handleDeleteJob={handleDelete}
      />
    );

    // Assert main elements are rendered
    expect(screen.getByText('Registered Cron Daemons')).toBeTruthy();
    expect(screen.getByText('Precision Separation Loop')).toBeTruthy();
    expect(screen.getByText('*/5 * * * *')).toBeTruthy();
    expect(screen.getByText('Run Now')).toBeTruthy();
  });

  it('triggers immediate execution event when Run Now is clicked', () => {
    const handleToggle = vi.fn();
    const handleRunNow = vi.fn();
    const handleCreate = vi.fn();
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <CronDaemonPanel
        cronJobs={mockJobs}
        isCronEnabled={true}
        cronCountdown={45}
        setIsCronEnabled={vi.fn()}
        handleToggleJob={handleToggle}
        handleRunJobNow={handleRunNow}
        handleCreateJob={handleCreate}
        handleUpdateJob={handleUpdate}
        handleDeleteJob={handleDelete}
      />
    );

    const runNowBtn = screen.getByText('Run Now');
    fireEvent.click(runNowBtn);
    expect(handleRunNow).toHaveBeenCalledWith('Precision Separation Loop');
  });

  it('opens and populates registration modal on New Job click', () => {
    const handleToggle = vi.fn();
    const handleRunNow = vi.fn();
    const handleCreate = vi.fn();
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <CronDaemonPanel
        cronJobs={mockJobs}
        isCronEnabled={true}
        cronCountdown={45}
        setIsCronEnabled={vi.fn()}
        handleToggleJob={handleToggle}
        handleRunJobNow={handleRunNow}
        handleCreateJob={handleCreate}
        handleUpdateJob={handleUpdate}
        handleDeleteJob={handleDelete}
      />
    );

    const newJobBtn = screen.getByText('New Job');
    fireEvent.click(newJobBtn);

    // Verify Modal has opened
    expect(screen.getByText('Register New Daemon')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Precipitation Calibration Sweep')).toBeTruthy();
  });
});
