import { registry } from './serviceRegistry';
import { loader } from './pluginLoader';
import { dagWorkflowService } from './services/dagWorkflow';
import { leanProverPlugin } from './services/formalVerification';

export const initializeHost = () => {
  registry.register(dagWorkflowService);
  loader.load(leanProverPlugin);
};
