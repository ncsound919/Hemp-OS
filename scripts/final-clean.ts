import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

const suspicious = [
  'Skunk #100', 'Haze Haze', 'Haze 19', 'Haze Queen',
  'CBG-1', 'CBG-2',
  'Kushy Punch', 'Kush Cleaner', 'Diesel Reek',
  'Diesel Reek Auto', 'Diesel Drift', 'Diesel Glue',
  'Diesel Glue Auto', 'Diesel Cookies Auto',
  'Diesel Dream Auto', 'Diesel Wreck Auto', 'Diesel Berry Auto',
  'Diesel Haze Auto', 'Diesel Fire Auto',
  'Haze Glue', 'Haze Cake', 'Haze Jack', 'Haze Dream',
  'Haze Cheese', 'Haze Wreck', 'Haze Diesel', 'Haze Skunk',
  'Haze Mist', 'Haze Express', 'Haze Berry Kush', 'Haze OG', 'Haze Kush',
];

let removed = 0;
for (const name of suspicious) {
  const row = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name) as any;
  if (row) {
    db.prepare('DELETE FROM strain_aliases WHERE strain_id = ?').run(row.id);
    db.prepare('DELETE FROM source_records WHERE strain_id = ?').run(row.id);
    db.prepare('DELETE FROM strains WHERE id = ?').run(row.id);
    console.log('Removed:', name);
    removed++;
  }
}

const count = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
console.log(`\nRemoved ${removed} entries. Total strains: ${count.c}`);

const types = db.prepare('SELECT type, COUNT(*) as c FROM strains GROUP BY type').all() as any[];
for (const t of types) console.log(`  ${t.type}: ${t.c}`);

const maxThc = db.prepare(`SELECT canonical_name, CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc FROM strains ORDER BY thc DESC LIMIT 3`).all() as any[];
console.log('\nTop THC:');
for (const t of maxThc) console.log(`  ${t.canonical_name}: ${t.thc}%`);

const minThc = db.prepare(`SELECT canonical_name, CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc FROM strains WHERE thc > 0 ORDER BY thc ASC LIMIT 3`).all() as any[];
console.log('\nLowest THC:');
for (const t of minThc) console.log(`  ${t.canonical_name}: ${t.thc}%`);

db.close();
