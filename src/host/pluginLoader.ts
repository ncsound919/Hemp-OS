// Simulates safe plugin loading and execution.

export interface ScientificPlugin {
  id: string;
  execute: (input: any) => Promise<any>;
}

class PluginLoader {
  private plugins: Map<string, ScientificPlugin> = new Map();

  load(plugin: ScientificPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  async run(pluginId: string, input: any) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not loaded.`);
    return await plugin.execute(input);
  }
}

export const loader = new PluginLoader();
