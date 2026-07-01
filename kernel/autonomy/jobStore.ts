export interface CronJob {
  id: string;
  schedule: string;
  graphId: string;
  biomassId: string;
  enabled: boolean;
  consecutiveFailures: number;
  lastRunAt: string | null;
  lastStatus: string | null;
}

export const jobStore = {
  listEnabled: async (): Promise<CronJob[]> => [],
  getById: async (id: string): Promise<CronJob | null> => null,
  recordRun: async (id: string, run: any): Promise<any> => ({ consecutiveFailures: 0 }),
  resetFailures: async (id: string) => {},
  incrementFailures: async (id: string) => {},
  flagForReview: async (id: string, reason: string) => {},
  setEnabled: async (id: string, enabled: boolean) => {},
};
