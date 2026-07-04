import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

// Remove fake sequential strains and obvious fabrications
const patterns = [
  "canonical_name GLOB 'Skunk #[0-9][0-9]'",
  "canonical_name GLOB 'Skunk #[0-9]'",
  "canonical_name GLOB 'Strain #[0-9]*'",
  "canonical_name GLOB 'Hybrid #[0-9]*'",
  "canonical_name GLOB 'Indica #[0-9]*'",
  "canonical_name GLOB 'Sativa #[0-9]*'",
  "canonical_name GLOB 'CBD #[0-9]*'",
  "canonical_name GLOB 'THC #[0-9]*'",
  "canonical_name GLOB 'Test *'",
  "canonical_name LIKE '%placeholder%'",
];

const allFakes: any[] = [];
for (const pattern of patterns) {
  const found = db.prepare(`SELECT id, canonical_name FROM strains WHERE ${pattern}`).all() as any[];
  for (const f of found) {
    if (!allFakes.some(x => x.id === f.id)) allFakes.push(f);
  }
}

if (allFakes.length > 0) {
  console.log(`Removing ${allFakes.length} fake/sequential strains:`);
  for (const f of allFakes) console.log(`  - ${f.canonical_name}`);

  const tx = db.transaction(() => {
    for (const f of allFakes) {
      db.prepare('DELETE FROM strain_aliases WHERE strain_id = ?').run(f.id);
      db.prepare('DELETE FROM source_records WHERE strain_id = ?').run(f.id);
      db.prepare('DELETE FROM strains WHERE id = ?').run(f.id);
    }
  });
  tx();
} else {
  console.log('No fake strains found.');
}

const count = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
console.log(`\nTotal strains: ${count.c}`);

// Show unique type distribution
const types = db.prepare('SELECT type, COUNT(*) as c FROM strains GROUP BY type').all() as any[];
console.log('\nBy type:');
for (const t of types) console.log(`  ${t.type}: ${t.c}`);

db.close();
