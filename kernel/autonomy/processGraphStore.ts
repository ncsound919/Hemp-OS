import { db } from './db.ts';
import { ProcessGraph } from '../core/types.ts';

db.exec(`
  CREATE TABLE IF NOT EXISTS process_graphs (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`);

export const processGraphStore = {
  getById: async (id: string): Promise<ProcessGraph | null> => {
    const row = db.prepare('SELECT data FROM process_graphs WHERE id = ?').get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  },
  save: async (id: string, graph: ProcessGraph) => {
    db.prepare('INSERT OR REPLACE INTO process_graphs (id, data) VALUES (?, ?)').run(
      id,
      JSON.stringify(graph)
    );
  }
};
