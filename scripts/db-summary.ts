import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

console.log('=== STRAINS (with real cannabinoid data) ===');
const strains = db.prepare(`SELECT canonical_name, type, json_extract(cannabinoids_json, '$.thc') as thc FROM strains ORDER BY CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) DESC`).all() as any[];
for (const s of strains) {
  const thcVal = typeof s.thc === 'string' ? parseFloat(s.thc) : s.thc;
  console.log(`  ${s.canonical_name.padEnd(24)} ${(thcVal || 0).toFixed(1).padStart(5)}% THC  ${s.type || ''}`);
}

console.log('\n=== PAPER SOURCES ===');
const srcs = db.prepare('SELECT source, COUNT(*) as c FROM papers GROUP BY source ORDER BY c DESC').all() as any[];
for (const s of srcs) {
  console.log(`  ${s.source.padEnd(12)} ${s.c} papers`);
}

console.log('\n=== RECENT PAPERS ===');
const papers = db.prepare('SELECT title, year, source FROM papers WHERE year > 2020 ORDER BY year DESC LIMIT 8').all() as any[];
for (const p of papers) {
  console.log(`  [${p.source}] (${p.year}) ${(p.title || '').substring(0, 90)}`);
}

db.close();
