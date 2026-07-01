// A central registry for host services.
// This acts as the "daemon manager" for the OS shell.

export interface HostService {
  name: string;
  status: 'running' | 'stopped' | 'failed';
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

class ServiceRegistry {
  private services: Map<string, HostService> = new Map();

  register(service: HostService) {
    this.services.set(service.name, service);
  }

  get(name: string) {
    return this.services.get(name);
  }

  async startAll() {
    for (const service of this.services.values()) {
      if (service.status === 'stopped') {
        await service.start();
      }
    }
  }

  async stopAll() {
    for (const service of this.services.values()) {
      if (service.status === 'running') {
        await service.stop();
      }
    }
  }
}

export const registry = new ServiceRegistry();
