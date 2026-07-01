import { KernelExecutor } from '../kernel/workflow/executor';
import { KernelValidationRunner } from '../kernel/validation/reports';
import { validateProcessGraph } from '../kernel/workflow/processGraph';
import { BIOMASS_PROFILES } from '../kernel/calibration/profiles';
import { AppError } from '../lib/AppError';

export class KernelService {
  runProcess(graph: any, biomass: any) {
    const graphErrors = validateProcessGraph(graph);
    if (graphErrors.length > 0) {
      throw new AppError(400, 'Invalid process graph structure', { details: graphErrors });
    }
    return KernelExecutor.runProcess(graph, biomass);
  }

  verify() {
    return KernelValidationRunner.runIntegrityVerification();
  }

  listProfiles() {
    return BIOMASS_PROFILES;
  }
}
