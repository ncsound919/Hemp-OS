/**
 * OpenWeedLocator (OWL) Integration Adapter
 *
 * Bridges Hemp OS with OWL's MQTT-based weed detection system.
 * Provides: field monitoring, detection event ingestion, relay control,
 * and cross-reference with strain/processing data.
 *
 * OWL repo: https://github.com/geezacoleman/OpenWeedLocator
 */

import { mesh } from './service-mesh.ts';

export interface OWLConfig {
  deviceId: string;
  mqttHost: string;
  mqttPort: number;
  algorithm: string;
  sensitivity: 'low' | 'medium' | 'high';
  detectionMode: 0 | 1 | 2; // spot/off/blanket
}

export interface OWLDetectionEvent {
  deviceId: string;
  timestamp: number;
  algorithm: string;
  weedDetected: boolean;
  relayTriggered: number[];
  detectionCount: number;
  imageCaptured: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  cpuTemp?: number;
}

export interface OWLSystemState {
  deviceId: string;
  timestamp: number;
  detectionEnable: boolean;
  imageSampleEnable: boolean;
  algorithm: string;
  sensitivityLevel: string;
  detectionMode: number;
  weedDetected: boolean;
  cpuPercent: number;
  cpuTemp: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  uptime?: number;
}

export class OWLAdapter {
  private configs: Map<string, OWLConfig> = new Map();
  private events: OWLDetectionEvent[] = [];
  private states: Map<string, OWLSystemState> = new Map();
  private maxEvents = 10000;

  registerDevice(config: OWLConfig) {
    this.configs.set(config.deviceId, config);
    console.log(`[OWL] Registered device: ${config.deviceId}`);
  }

  unregisterDevice(deviceId: string) {
    this.configs.delete(deviceId);
    this.states.delete(deviceId);
    console.log(`[OWL] Unregistered device: ${deviceId}`);
  }

  getDevices(): OWLConfig[] {
    return [...this.configs.values()];
  }

  // Called when OWL publishes state via MQTT
  ingestState(state: OWLSystemState) {
    this.states.set(state.deviceId, state);
    mesh.logProvenance('hemp-os', `owl:${state.deviceId}`, 'state', state);
  }

  // Called when OWL fires a detection event
  ingestDetection(event: OWLDetectionEvent) {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    mesh.logProvenance('hemp-os', `owl:${event.deviceId}`, 'detection', event);
  }

  getState(deviceId: string): OWLSystemState | undefined {
    return this.states.get(deviceId);
  }

  getRecentEvents(deviceId?: string, limit = 100): OWLDetectionEvent[] {
    let filtered = this.events;
    if (deviceId) {filtered = filtered.filter(e => e.deviceId === deviceId);}
    return filtered.slice(-limit).reverse();
  }

  getDetectionSummary(): { deviceId: string; totalDetections: number; lastEvent: OWLDetectionEvent | null }[] {
    const summary = new Map<string, { total: number; last: OWLDetectionEvent | null }>();
    for (const e of this.events) {
      const s = summary.get(e.deviceId) || { total: 0, last: null };
      s.total++;
      s.last = e;
      summary.set(e.deviceId, s);
    }
    return [...summary.entries()].map(([deviceId, s]) => ({
      deviceId,
      totalDetections: s.total,
      lastEvent: s.last,
    }));
  }

  // Generate MQTT command payload for OWL
  buildCommand(action: string, params: Record<string, any>): string {
    return JSON.stringify({ action, params });
  }

  // Health check for all registered devices
  getHealth(): { deviceId: string; connected: boolean; lastState: number | null }[] {
    const now = Date.now();
    return [...this.configs.keys()].map(id => {
      const state = this.states.get(id);
      return {
        deviceId: id,
        connected: state ? (now - (state as any).timestamp || now) < 30000 : false,
        lastState: state?.timestamp || null,
      };
    });
  }
}

export const owlAdapter = new OWLAdapter();
