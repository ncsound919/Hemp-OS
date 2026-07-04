import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  boolean,
  real,
  jsonb,
} from 'drizzle-orm/pg-core';

// Enums for better constraints
export const strainTypeEnum = pgEnum('strain_type', [
  'indica',
  'sativa',
  'hybrid',
  'other',
]);

export const strains = pgTable('strains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: strainTypeEnum('type').notNull(),
  thcMin: integer('thc_min'),
  thcMax: integer('thc_max'),
  cbdMin: integer('cbd_min'),
  cbdMax: integer('cbd_max'),
  terpeneProfile: text('terpene_profile'),
  effects: text('effects'),
  medicalUses: text('medical_uses'),
  source: text('source'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Studies
export const studies = pgTable('studies', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authors: text('authors'),
  year: integer('year'),
  journal: text('journal'),
  doi: text('doi'),
  abstract: text('abstract'),
  fullTextPath: text('full_text_path'),
  topicTags: text('topic_tags'),
  population: text('population'),
  dose: text('dose'),
  route: text('route'),
  outcomes: text('outcomes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Join table for strain ↔ study
export const strainStudyRelations = pgTable('strain_study_relations', {
  strainId: integer('strain_id')
    .notNull()
    .references(() => strains.id, { onDelete: 'cascade' }),
  studyId: integer('study_id')
    .notNull()
    .references(() => studies.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull().default('mentioned'),
});

// Drizzle relations
export const terpenes = pgTable('terpenes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

export const strainTerpenes = pgTable('strain_terpenes', {
  id: serial('id').primaryKey(),
  strainId: integer('strain_id')
    .notNull()
    .references(() => strains.id, { onDelete: 'cascade' }),
  terpeneId: integer('terpene_id')
    .notNull()
    .references(() => terpenes.id, { onDelete: 'cascade' }),
  concentration: real('concentration').notNull(),
});

export const effects = pgTable('effects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

export const strainEffects = pgTable('strain_effects', {
  id: serial('id').primaryKey(),
  strainId: integer('strain_id')
    .notNull()
    .references(() => strains.id, { onDelete: 'cascade' }),
  effectId: integer('effect_id')
    .notNull()
    .references(() => effects.id, { onDelete: 'cascade' }),
});

export const strainRelations = relations(strains, ({ many }) => ({
  studies: many(strainStudyRelations),
  terpenes: many(strainTerpenes),
  effects: many(strainEffects),
}));

export const studyRelations = relations(studies, ({ many }) => ({
  strains: many(strainStudyRelations),
}));

export const terpeneRelations = relations(terpenes, ({ many }) => ({
  strains: many(strainTerpenes),
}));

export const strainTerpeneRelations = relations(strainTerpenes, ({ one }) => ({
  strain: one(strains, {
    fields: [strainTerpenes.strainId],
    references: [strains.id],
  }),
  terpene: one(terpenes, {
    fields: [strainTerpenes.terpeneId],
    references: [terpenes.id],
  }),
}));

export const effectRelations = relations(effects, ({ many }) => ({
  strains: many(strainEffects),
}));

export const strainEffectRelations = relations(strainEffects, ({ one }) => ({
  strain: one(strains, {
    fields: [strainEffects.strainId],
    references: [strains.id],
  }),
  effect: one(effects, {
    fields: [strainEffects.effectId],
    references: [effects.id],
  }),
}));

// Ingestion status enum
export const ingestionStatusEnum = pgEnum('ingestion_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'skipped',
]);

// File watcher queue
export const ingestionQueue = pgTable('ingestion_queue', {
  id: serial('id').primaryKey(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),        // 'pdf','csv','json','txt','xml'
  fileSize: integer('file_size'),
  status: ingestionStatusEnum('status').default('pending'),
  entityType: text('entity_type'),             // 'strain','study','compound','unknown'
  extractedData: jsonb('extracted_data'),
  errorMessage: text('error_message'),
  processingStartedAt: timestamp('processing_started_at'),
  processingCompletedAt: timestamp('processing_completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Knowledge bank - compartmentalized storage
export const knowledgeBank = pgTable('knowledge_bank', {
  id: serial('id').primaryKey(),
  sourceFileId: integer('source_file_id').references(() => ingestionQueue.id),
  category: text('category').notNull(), // 'strain','study','compound','experiment','simulation','recall'
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  embedding: text('embedding'),        // JSON string of vector for now
  metadata: jsonb('metadata'),
  confidenceScore: real('confidence_score'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Autonomous experiments
export const experiments = pgTable('experiments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  hypothesis: text('hypothesis'),
  methodology: text('methodology'),
  status: text('status').default('queued'), // 'queued','running','completed','failed'
  results: jsonb('results'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Simulation runs
export const simulations = pgTable('simulations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parameters: jsonb('parameters'),
  results: jsonb('results'),
  status: text('status').default('queued'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Autonomous Insights & Trends
export const insights = pgTable('insights', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'trend', 'discovery', 'correlation', 'anomaly', 'prediction'
  title: text('title').notNull(),
  description: text('description').notNull(),
  confidence: real('confidence_score').notNull().default(0.5),
  sourceEntities: jsonb('source_entities').notNull().default([]), // IDs of strains/studies/knowledge entries
  evidence: jsonb('evidence').notNull().default([]),
  category: text('category').notNull(),
  tags: jsonb('tags').default([]),
  isVerified: boolean('is_verified').default(false),
  generatedAt: timestamp('generated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const trends = pgTable('trends', {
  id: serial('id').primaryKey(),
  metric: text('metric').notNull(),
  entityType: text('entity_type').notNull(), // 'strain', 'study', 'compound'
  period: text('period').notNull(), // 'week', 'month', 'year'
  values: jsonb('values').notNull(),
  slope: real('slope'),
  significance: real('p_value'),
  insightId: integer('insight_id').references(() => insights.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const correlations = pgTable('correlations', {
  id: serial('id').primaryKey(),
  factorA: text('factor_a').notNull(),
  factorB: text('factor_b').notNull(),
  correlationCoefficient: real('correlation_coefficient').notNull(),
  sampleSize: integer('sample_size').notNull(),
  pValue: real('p_value'),
  domain: text('domain').notNull(), // 'terpenes', 'effects', 'cannabinoids', 'studies'
  insightId: integer('insight_id').references(() => insights.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const discoveryLog = pgTable('discovery_log', {
  id: serial('id').primaryKey(),
  event: text('event').notNull(), // 'new_strain_pattern', 'effect_correlation', 'anomaly_detected'
  details: jsonb('details').notNull(),
  reviewed: boolean('reviewed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Shared state for cross-system synchronization
export const systemConnections = pgTable('system_connections', {
  id: serial('id').primaryKey(),
  systemName: text('system_name').notNull().unique(),
  endpoint: text('endpoint').notNull(),
  status: text('status').notNull().default('disconnected'),
  lastHeartbeat: timestamp('last_heartbeat'),
  capabilities: jsonb('capabilities').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Provenance tracking across all three systems
export const provenanceLog = pgTable('provenance_log', {
  id: serial('id').primaryKey(),
  sourceSystem: text('source_system').notNull(),
  targetSystem: text('target_system').notNull(),
  action: text('action').notNull(),
  payload: jsonb('payload'),
  status: text('status').notNull().default('pending'),
  correlationId: text('correlation_id'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Research tasks queue for inter-system workflows
export const researchTasks = pgTable('research_tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  sourceSystem: text('source_system').notNull(),
  assignedSystem: text('assigned_system').notNull(),
  status: text('status').notNull().default('queued'),
  priority: integer('priority').default(5),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

