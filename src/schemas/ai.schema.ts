import { z } from 'zod';

export const aiAssistSchema = z.object({
  body: z.object({
    prompt: z.string().min(1),
    graph: z.any().optional(),
    currentResults: z.any().optional(),
    selectedBiomassName: z.string().optional(),
  }),
  query: z.any(),
  params: z.any(),
  headers: z.any(),
});
