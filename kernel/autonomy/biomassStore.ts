import { db } from './db.ts';
import { Biomass } from '../core/types.ts';

db.exec(`
  CREATE TABLE IF NOT EXISTS biomass (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`);

export const biomassStore = {
  getById: async (id: string): Promise<Biomass | null> => {
    const row = db.prepare('SELECT data FROM biomass WHERE id = ?').get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  },
  save: async (biomass: Biomass) => {
    db.prepare('INSERT OR REPLACE INTO biomass (id, data) VALUES (?, ?)').run(
      biomass.id,
      JSON.stringify(biomass)
    );
  }
};
