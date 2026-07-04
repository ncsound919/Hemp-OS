import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3100),
  GEMINI_API_KEY: z.string().optional(),
  ALLOWED_OLLAMA_HOSTS: z.string().default('http://localhost:11434'),
  DATA_DIR: z.string().default('data'),
  BODY_LIMIT_JSON: z.string().default('1mb'),
  CORS_ORIGIN: z.string().default('*'),
  // Shared secret gating access to the internal API surface
  // (kernel, ingest, ollama, ai routes). In production this is REQUIRED.
  // In development it defaults to empty (no auth) for local convenience.
  API_KEY: z.string().optional(),
}).refine(
  (data) => {
    if (data.NODE_ENV === 'production' && !data.API_KEY) {
      return false;
    }
    return true;
  },
  { message: 'API_KEY is required when NODE_ENV=production' },
);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  ALLOWED_OLLAMA_HOSTS: parsed.data.ALLOWED_OLLAMA_HOSTS.split(',').map(s => s.trim()),
};
