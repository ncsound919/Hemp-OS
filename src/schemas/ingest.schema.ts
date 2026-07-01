import { z } from 'zod';

export const scrapeSchema = z.object({
  body: z.object({
    target: z.string().optional(),
    query: z.string().optional(),
  }),
});

export const ingestSchema = z.object({
  body: z.object({
    fileId: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
  }),
  headers: z.object({
    authorization: z.string(),
  }),
});
