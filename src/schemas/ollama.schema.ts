import { z } from 'zod';

export const getTagsSchema = z.object({
  body: z.any(),
  params: z.any(),
  headers: z.any(),
  query: z.object({
    url: z.string().url().optional(),
  }),
});

const ollamaMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  images: z.array(z.string()).optional(),
});

export const ollamaChatSchema = z.object({
  body: z.object({
    model: z.string().min(1),
    messages: z.array(ollamaMessageSchema).min(1),
    stream: z.boolean().optional(),
    format: z.string().optional(),
    options: z.record(z.string(), z.any()).optional(),
    tools: z.array(z.any()).optional(),
    keep_alive: z.union([z.string(), z.number()]).optional(),
    url: z.string().url().optional(),
  }),
  query: z.any(),
  params: z.any(),
  headers: z.any(),
});
