// Inter-service communication mesh
// Provides RPC, event bus, and health checking between all three systems

import { randomUUID } from 'crypto';
import path from 'path';
import {
  SERVICES,
  ServiceName,
  ServiceConfig,
  RPCRequest,
  EventBusEvent,
  ProvenanceEntry,
  isValidServiceName,
  MAX_PROVENANCE_LOG_SIZE,
} from './types.ts';
import { EventStore, StoredEvent } from './event-store.ts';

type EventHandler = (event: EventBusEvent) => void | Promise<void>;
type RPCHandler = (request: RPCRequest) => Promise<any>;

class ServiceMesh {
  private services: Map<ServiceName, ServiceConfig> = new Map(Object.entries(SERVICES) as [ServiceName, ServiceConfig][]);
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private rpcHandlers: Map<string, RPCHandler> = new Map();
  private provenanceLog: ProvenanceEntry[] = [];
  private healthCache: Map<ServiceName, { status: string; lastCheck: number }> = new Map();
  private correlationStore: Map<string, any> = new Map();
  private defaultSource: ServiceName = 'hemp-os';
  private eventStore: EventStore;

  constructor() {
    const eventLogPath = path.join(process.cwd(), 'data', 'event-store.json');
    this.eventStore = new EventStore(eventLogPath, 10000);
    this.registerDefaultHandlers();
  }

  setDefaultSource(source: ServiceName) {
    this.defaultSource = source;
  }

  private registerDefaultHandlers() {
    this.rpc('health', async () => ({ status: 'ok', timestamp: Date.now() }));

    // Hemp OS handlers
    this.rpc('hemp-os:kernel:process', async (req) => {
      return this.forwardToService('hemp-os', '/api/kernel/process', req.params);
    });
    this.rpc('hemp-os:kernel:verify', async (req) => {
      return this.forwardToService('hemp-os', '/api/kernel/verify', {});
    });
    this.rpc('hemp-os:kernel:profiles', async (req) => {
      return this.forwardToService('hemp-os', '/api/kernel/profiles', {});
    });
    this.rpc('hemp-os:provenance:stage', async (req) => {
      return this.forwardToService('hemp-os', '/api/provenance/stage', req.params);
    });

    // Hemp OS DB handlers
    this.rpc('hemp-os-db:strains:search', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/recent-entities', req.params);
    });
    this.rpc('hemp-os-db:strains:advanced-search', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/strains/advanced-search', req.params);
    });
    this.rpc('hemp-os-db:insights:analyze', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/insights/analyze', {});
    });
    this.rpc('hemp-os-db:insights:list', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/insights', {});
    });
    this.rpc('hemp-os-db:experiments:create', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/experiments', req.params);
    });
    this.rpc('hemp-os-db:simulations:create', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/simulations', req.params);
    });
    this.rpc('hemp-os-db:knowledge-bank:query', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/knowledge-bank', req.params);
    });
    this.rpc('hemp-os-db:ingestion:start', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/ingestion/start', {});
    });
    this.rpc('hemp-os-db:ingestion:stop', async (req) => {
      return this.forwardToService('hemp-os-db', '/api/ingestion/stop', {});
    });

    // Hemp Agent handlers
    this.rpc('hemp-agent:ncbi:search', async (req) => {
      return this.forwardToService('hemp-agent', '/api/ncbi/search', req.params);
    });
    this.rpc('hemp-agent:brain:query', async (req) => {
      return this.forwardToService('hemp-agent', '/api/agent/query', req.params);
    });
    this.rpc('hemp-agent:brain:dream', async (req) => {
      return this.forwardToService('hemp-agent', '/api/dream', req.params);
    });
    this.rpc('hemp-agent:brain:pipeline', async (req) => {
      return this.forwardToService('hemp-agent', '/api/deterministic-pipeline', req.params);
    });
  }

  private async forwardToService(
    target: ServiceName,
    path: string,
    params: any
  ): Promise<any> {
    const config = this.services.get(target);
    if (!config) {throw new Error(`Unknown service: ${target}`);}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${config.host}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err: any) {
      return { error: err.message, service: target, path };
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- RPC Methods ---

  async rpc(method: string, handler?: RPCHandler): Promise<any> {
    if (handler) {
      this.rpcHandlers.set(method, handler);
      return;
    }

    const handlerFn = this.rpcHandlers.get(method);
    if (!handlerFn) {throw new Error(`No handler registered for: ${method}`);}

    const [targetService] = method.split(':');
    const request: RPCRequest = {
      id: randomUUID(),
      source: this.defaultSource,
      target: targetService as ServiceName,
      method,
      params: {},
      timestamp: Date.now(),
    };

    return handlerFn(request);
  }

  // --- Event Bus Methods ---

  on(eventType: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  off(eventType: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(eventType) || [];
    this.eventHandlers.set(
      eventType,
      handlers.filter((h) => h !== handler)
    );
  }

  async emit(event: EventBusEvent) {
    const handlers = this.eventHandlers.get(event.type) || [];
    const allHandlers = this.eventHandlers.get('*') || [];

    for (const handler of [...handlers, ...allHandlers]) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Event handler error for ${event.type}:`, err);
      }
    }
  }

  fireEvent(source: ServiceName, type: string, payload: any) {
    const event: EventBusEvent = {
      id: randomUUID(),
      source,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.emit(event);
    this.logProvenance(source, 'event-bus', type, payload);

    // Persist event for recovery after restart
    const storedEvent: StoredEvent = {
      id: event.id,
      source: event.source,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
    };
    this.eventStore.append(storedEvent);
  }

  /** Query persisted events with optional filters */
  queryEvents(filter?: { source?: string; type?: string; since?: number; limit?: number }): StoredEvent[] {
    return this.eventStore.query(filter);
  }

  /** Check if a specific RPC has already been processed (idempotency) */
  isRpcProcessed(rpcId: string): boolean {
    const existing = this.eventStore.query({ type: `rpc:${rpcId}` });
    return existing.length > 0;
  }

  /** Marks an RPC as processed for idempotency tracking */
  markRpcProcessed(rpcId: string, source: ServiceName, method: string) {
    this.eventStore.append({
      id: rpcId,
      source,
      type: `rpc:${rpcId}`,
      payload: { method },
      timestamp: Date.now(),
    });
  }

  // --- Health Checking ---

  async checkHealth(service: ServiceName): Promise<{ status: string; latency: number }> {
    const config = this.services.get(service);
    if (!config) {return { status: 'unknown', latency: -1 };}

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(`${config.host}/health`, {
        signal: controller.signal,
      });
      const latency = Date.now() - start;
      const status = response.ok ? 'healthy' : 'unhealthy';
      this.healthCache.set(service, { status, lastCheck: Date.now() });
      return { status, latency };
    } catch {
      const latency = Date.now() - start;
      this.healthCache.set(service, { status: 'unreachable', lastCheck: Date.now() });
      return { status: 'unreachable', latency };
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkAllHealth(): Promise<Record<ServiceName, { status: string; latency: number }>> {
    const results = {} as Record<ServiceName, { status: string; latency: number }>;
    for (const [name] of this.services) {
      results[name] = await this.checkHealth(name as ServiceName);
    }
    return results;
  }

  // --- Provenance Tracking ---

  logProvenance(
    source: ServiceName | string,
    target: ServiceName | string,
    action: string,
    payload: any
  ): string {
    const correlationId = randomUUID();
    const entry: ProvenanceEntry = {
      id: randomUUID(),
      sourceSystem: source,
      targetSystem: target,
      action,
      payload,
      status: 'completed',
      correlationId,
      timestamp: Date.now(),
    };

    // Evict oldest entries if log exceeds max size
    if (this.provenanceLog.length >= MAX_PROVENANCE_LOG_SIZE) {
      this.provenanceLog = this.provenanceLog.slice(-MAX_PROVENANCE_LOG_SIZE + 1);
    }

    this.provenanceLog.push(entry);
    return correlationId;
  }

  getProvenanceLog(filter?: {
    source?: ServiceName;
    target?: ServiceName;
    action?: string;
    since?: number;
    limit?: number;
  }): ProvenanceEntry[] {
    let log = this.provenanceLog;
    if (filter?.source) {log = log.filter((e) => e.sourceSystem === filter.source);}
    if (filter?.target) {log = log.filter((e) => e.targetSystem === filter.target);}
    if (filter?.action) {log = log.filter((e) => e.action === filter.action);}
    if (filter?.since) {log = log.filter((e) => e.timestamp >= filter.since!);}
    if (filter?.limit) {log = log.slice(-filter.limit);}
    return log;
  }

  // --- Correlation Store ---

  setCorrelation(id: string, data: any) {
    this.correlationStore.set(id, data);
  }

  getCorrelation(id: string): any {
    return this.correlationStore.get(id);
  }

  clearCorrelation(id: string) {
    this.correlationStore.delete(id);
  }

  // --- Utility ---

  getServices(): Map<ServiceName, ServiceConfig> {
    return this.services;
  }

  getServiceUrl(service: ServiceName): string {
    return this.services.get(service)?.host || '';
  }

  /** Reset state — for testing only */
  reset() {
    this.provenanceLog = [];
    this.healthCache.clear();
    this.correlationStore.clear();
    this.eventStore.clear();
  }
}

// Singleton
export const mesh = new ServiceMesh();
