import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
console.log('Data dir contents:', fs.readdirSync(dataDir));

for (const dbName of ['hemp_os.db', 'hemp-os.db']) {
  const p = path.join(dataDir, dbName);
  console.log(`\n=== ${dbName} (exists: ${fs.existsSync(p)}) ===`);
  if (!fs.existsSync(p)) continue;
  console.log('Size:', fs.statSync(p).size, 'bytes');
  try {
    const db = new Database(p);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    console.log('Tables:', tables.map(t => t.name).join(', '));
    for (const t of tables) {
      if (t.name.startsWith('sqlite_')) continue;
      const c = db.prepare(`SELECT COUNT(*) as c FROM \`${t.name}\``).get() as { c: number };
      console.log(`  - ${t.name}: ${c.c} rows`);
    }
    db.close();
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}
