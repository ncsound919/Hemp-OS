import fs from 'fs';
import path from 'path';

export interface StoredEvent {
  id: string;
  source: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export class EventStore {
  private events: StoredEvent[] = [];
  private filePath: string;
  private maxSize: number;
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(filePath: string, maxSize = 10000) {
    this.filePath = filePath;
    this.maxSize = maxSize;
    this.load();
  }

  private load() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.events = JSON.parse(data);
      }
    } catch (err) {
      console.warn('[EventStore] Failed to load events from disk, starting fresh:', err);
      this.events = [];
    }
  }

  private flush() {
    if (!this.dirty) {return;}
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.events), 'utf-8');
      this.dirty = false;
    } catch (err) {
      console.error('[EventStore] Failed to persist events:', err);
    }
  }

  private scheduleFlush() {
    this.dirty = true;
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, 5000);
    }
  }

  append(event: StoredEvent) {
    this.events.push(event);
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }
    this.scheduleFlush();
  }

  query(filter?: {
    source?: string;
    type?: string;
    since?: number;
    limit?: number;
  }): StoredEvent[] {
    let result = this.events;
    if (filter?.source) {
      result = result.filter((e) => e.source === filter.source);
    }
    if (filter?.type) {
      result = result.filter((e) => e.type === filter.type);
    }
    if (filter?.since) {
      result = result.filter((e) => e.timestamp >= filter.since!);
    }
    if (filter?.limit && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }
    return result;
  }

  count(): number {
    return this.events.length;
  }

  clear() {
    this.events = [];
    this.dirty = true;
    this.flush();
  }

  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}
