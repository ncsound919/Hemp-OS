import { Biomass, ProcessGraph } from '../../../kernel/core/types.ts';

export interface IngestedDocument {
  id: string;
  title: string;
  author: string;
  date: string;
  sizeBytes: number;
  mimeType: string;
  indexedTopics: string[];
  citations: string[];
  chapters: { title: string; content: string }[];
  textSnippet: string;
}

export interface DiscoveredPaper extends IngestedDocument {}

export interface DiscoveredFlyer {
  title: string;
  headline: string;
  details: string;
  slogan: string;
  tagline: string;
  colorTheme: string;
  snapshot: string;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string | null;
  nextRun: string;
  status: 'active' | 'paused' | 'error';
  action: string;
  lastExecutionDuration?: number;
}

export interface CronJobFormData {
  name: string;
  schedule: string;
  action: string;
  status: 'active' | 'paused';
}

export interface RefinementLog {
  timestamp: string;
  model: string;
  corpusSource: string;
  paramRefined: string;
  oldVal: string;
  newVal: string;
  confidenceScore: number;
}
