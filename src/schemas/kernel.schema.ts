import { z } from 'zod';

const stageSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.enum(['extraction', 'winterization', 'decarboxylation', 'distillation']),
  config: z.record(z.string(), z.any()),
});

export const kernelProcessSchema = z.object({
  body: z.object({
    graph: z.object({
      stages: z.array(stageSchema).min(1),
    }),
    biomass: z.record(z.string(), z.any()),
  }),
  query: z.any(),
  params: z.any(),
  headers: z.any(),
});
