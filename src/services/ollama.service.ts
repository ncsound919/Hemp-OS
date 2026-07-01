import { env } from '../config/env.ts';
import { AppError } from '../lib/AppError.ts';

type OllamaMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OllamaMessage {
  role: OllamaMessageRole;
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  format?: 'json' | string;
  options?: Record<string, unknown>;
  tools?: unknown[];
  keep_alive?: string | number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  system?: string;
  template?: string;
  context?: number[];
  format?: 'json' | string;
  options?: Record<string, unknown>;
  keep_alive?: string | number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  input: string | string[];
  truncate?: boolean;
  options?: Record<string, unknown>;
  keep_alive?: string | number;
}

function normalizeBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AppError(400, 'Invalid Ollama URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(400, 'Invalid Ollama URL protocol');
  }

  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';

  return parsed.toString().replace(/\/$/, '');
}

function assertAllowedHost(raw: string): string {
  const normalized = normalizeBaseUrl(raw);
  const allowed = env.ALLOWED_OLLAMA_HOSTS.map(normalizeBaseUrl);

  if (!allowed.includes(normalized)) {
    throw new AppError(400, 'Ollama host is not allowed', {
      host: normalized,
    });
  }

  return normalized;
}

async function parseUpstreamError(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  return { raw: text };
}

export class OllamaService {
  private defaultBaseUrl: string;

  constructor() {
    this.defaultBaseUrl = assertAllowedHost(env.ALLOWED_OLLAMA_HOSTS[0] || 'http://localhost:11434');
  }

  private resolveBaseUrl(url?: string) {
    return assertAllowedHost(url || this.defaultBaseUrl);
  }

  private async requestJson<T>(
    baseUrl: string,
    path: string,
    init: RequestInit = {},
    timeoutMs = 60_000
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });

      if (!res.ok) {
        const details = await parseUpstreamError(res);
        throw new AppError(res.status, `Ollama upstream request failed: ${path}`, details);
      }

      return res.json() as Promise<T>;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new AppError(504, 'Ollama upstream request timed out', { path });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestStream(
    baseUrl: string,
    path: string,
    init: RequestInit = {},
    timeoutMs = 60_000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });

      if (!res.ok) {
        const details = await parseUpstreamError(res);
        throw new AppError(res.status, `Ollama upstream stream failed: ${path}`, details);
      }

      return res;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new AppError(504, 'Ollama upstream stream timed out', { path });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(url?: string) {
    const baseUrl = this.resolveBaseUrl(url);
    const tags = await this.requestJson<any>(baseUrl, '/api/tags', { method: 'GET' }, 10_000);
    return {
      ok: true,
      baseUrl,
      modelCount: Array.isArray(tags?.models) ? tags.models.length : 0,
    };
  }

  async getTags(url?: string) {
    const baseUrl = this.resolveBaseUrl(url);
    return this.requestJson<any>(baseUrl, '/api/tags', { method: 'GET' }, 15_000);
  }

  async showModel(input: { url?: string; model: string; verbose?: boolean }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model) {
      throw new AppError(400, 'Model is required');
    }

    return this.requestJson<any>(
      baseUrl,
      '/api/show',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.model,
          verbose: input.verbose ?? false,
        }),
      },
      30_000
    );
  }

  async pullModel(input: { url?: string; model: string; stream?: boolean; insecure?: boolean }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model) {
      throw new AppError(400, 'Model is required');
    }

    return this.requestJson<any>(
      baseUrl,
      '/api/pull',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.model,
          stream: input.stream ?? false,
          insecure: input.insecure ?? false,
        }),
      },
      10 * 60_000
    );
  }

  async deleteModel(input: { url?: string; model: string }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model) {
      throw new AppError(400, 'Model is required');
    }

    return this.requestJson<any>(
      baseUrl,
      '/api/delete',
      {
        method: 'DELETE',
        body: JSON.stringify({ name: input.model }),
      },
      30_000
    );
  }

  async generate(input: OllamaGenerateRequest & { url?: string }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model || !input.prompt) {
      throw new AppError(400, 'Model and prompt are required');
    }

    const { url, ...payload } = input;
    return this.requestJson<any>(
      baseUrl,
      '/api/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          stream: payload.stream ?? false,
        }),
      },
      120_000
    );
  }

  async chat(input: OllamaChatRequest & { url?: string }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model || !Array.isArray(input.messages) || input.messages.length === 0) {
      throw new AppError(400, 'Model and messages are required');
    }

    const { url, ...payload } = input;

    return this.requestJson<any>(
      baseUrl,
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          stream: false,
        }),
      },
      120_000
    );
  }

  async chatStream(input: OllamaChatRequest & { url?: string }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model || !Array.isArray(input.messages) || input.messages.length === 0) {
      throw new AppError(400, 'Model and messages are required');
    }

    const { url, ...payload } = input;

    return this.requestStream(
      baseUrl,
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          stream: true,
        }),
      },
      120_000
    );
  }

  async embeddings(input: OllamaEmbeddingRequest & { url?: string }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    if (!input.model || !input.input) {
      throw new AppError(400, 'Model and input are required');
    }

    const { url, ...payload } = input;

    return this.requestJson<any>(
      baseUrl,
      '/api/embed',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      60_000
    );
  }

  async openAiChatCompletions(input: {
    url?: string;
    model: string;
    messages: Array<{ role: string; content: any }>;
    stream?: boolean;
    temperature?: number;
    tools?: unknown[];
  }) {
    const baseUrl = this.resolveBaseUrl(input.url);

    return this.requestJson<any>(
      baseUrl,
      '/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      120_000
    );
  }
}