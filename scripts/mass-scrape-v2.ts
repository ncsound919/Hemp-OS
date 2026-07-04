/**
 * Mass strain scraper v2 — optimized for scale.
 * Phase 1: Get a huge master list of strain names (no detail)
 * Phase 2: Batch-fetch detailed profiles for only NEW strains
 */

import Database from 'better-sqlite3';
import path from 'path';

const KEY = process.env.DEEPSEEK_API_KEY || 'sk-6f66664876aa4e6c9fdf81deb35b9eca';
const URL = 'https://api.deepseek.com/v1/chat/completions';
const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

// =========================================================================
// Phase 1: Get all strain names DeepSeek knows
// =========================================================================

async function fetchNameList(prompt: string): Promise<string[]> {
  try {
    const res = await globalThis.fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a comprehensive cannabis strain database. List as many real cannabis strain names as possible. Return ONLY a JSON array of strings with strain names. No other text.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];
    const m = content.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]).filter((n: any) => typeof n === 'string' && n.length > 2) : [];
  } catch { return []; }
}

// =========================================================================
// Phase 2: Fetch details for a batch of new strain names
// =========================================================================

async function fetchDetails(names: string[], batchId: number): Promise<number> {
  const prompt = `Provide detailed cannabis strain profiles for these strains in a JSON array: ${JSON.stringify(names)}

Each object must have: name (string), thc (number 0-35), cbd (number 0-20), classification ("Indica"/"Sativa"/"Hybrid"), lineage (array of strings), effects (array of strings), flavors (array of strings), breeder (string), origin (string).
Use real verified data. Return ONLY the JSON array.`;

  try {
    const res = await globalThis.fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a cannabis strain database. Return ONLY a JSON array of strain objects. No other text.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return 0;

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return 0;
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) return 0;

    const strains = JSON.parse(m[0]);
    if (!Array.isArray(strains)) return 0;

    let stored = 0;
    const now = new Date().toISOString();

    for (const s of strains) {
      const name = s.name || '';
      if (!name) continue;
      if (db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name)) continue;

      const typeStr = (s.classification || '').toLowerCase().includes('indica') ? 'indica'
        : (s.classification || '').toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';

      db.prepare(`INSERT INTO strains (canonical_name, type, breeder, description, lineage_json, effects_json, flavors_json, terpenes_json, cannabinoids_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        name, typeStr, s.breeder || '', s.origin || '',
        JSON.stringify(s.lineage || []), JSON.stringify(s.effects || []),
        JSON.stringify(s.flavors || []), JSON.stringify([]),
        JSON.stringify({ thc: s.thc || 0, cbd: s.cbd || 0, cbg: s.cbg || 0, cbn: s.cbn || 0 }),
        now, now,
      );

      const row = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name) as any;
      if (row) {
        const alias = name.toLowerCase().replace(/\s+/g, '-');
        db.prepare('INSERT OR IGNORE INTO strain_aliases (strain_id, alias) VALUES (?, ?)').run(row.id, alias);
        db.prepare('INSERT INTO source_records (source, source_id, strain_id, raw_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run('deepseek-v2', `dsv2-${batchId}-${row.id}`, row.id, JSON.stringify(s), now, now);
      }
      stored++;
    }

    const namesStr = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3} more` : '');
    console.log(`  [BATCH ${batchId}] ${namesStr.substring(0, 60).padEnd(62)} → ${stored}/${names.length} new`);
    return stored;
  } catch (err: any) {
    console.log(`  [BATCH ${batchId}] Error: ${err.message.substring(0, 80)}`);
    return 0;
  }
}

async function main() {
  const start = Date.now();
  console.log('=== PHASE 1: Building master strain list ===\n');

  const NAME_PROMPTS = [
    'List 150 of the most popular and well-known cannabis strain names (no duplicates). Focus on: classic strains, Cup winners, famous kushes, hazes, diesels, cookies, dessert strains, fruit strains, landraces, and modern exotics.',
    'List 150 more cannabis strain names DIFFERENT from the first list. Focus on: lesser-known but real strains, European strains, Canadian strains, medical strains, high-CBD strains, CBG strains, rare landraces, and craft breeder strains.',
    'List 150 more cannabis strain names DIFFERENT from both previous lists. Focus on: Pacific Northwest strains, Colorado strains, Michigan strains, legacy strains, pre-2000 classics, African landraces, South American strains, and Asian strains.',
    'List 100 more unique cannabis strain names. Focus on: UK strains, Australian strains, Spanish strains, legacy seed bank strains from Sensi, Nirvana, Dutch Passion, Barney\'s Farm, Greenhouse, and modern US craft breeders.',
  ];

  let allNames = new Set<string>();
  for (let i = 0; i < NAME_PROMPTS.length; i++) {
    console.log(`  Fetching name list ${i + 1}/${NAME_PROMPTS.length}...`);
    const names = await fetchNameList(NAME_PROMPTS[i]);
    for (const n of names) {
      const clean = n.trim().replace(/^\d+\.\s*/, '');
      if (clean.length > 2) allNames.add(clean);
    }
    console.log(`    → ${names.length} returned, ${allNames.size} unique so far`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Filter out existing strains
  const existing = new Set(
    (db.prepare('SELECT canonical_name FROM strains').all() as any[])
      .map((r: any) => r.canonical_name.toLowerCase()),
  );
  const newNames = [...allNames].filter(n => !existing.has(n.toLowerCase()));

  console.log(`\n=== PHASE 2: Fetching details for ${newNames.length} new strains ===\n`);

  if (newNames.length === 0) {
    console.log('No new strains to fetch. Already have everything DeepSeek can provide.');
    db.close();
    return;
  }

  // Fetch in batches of 20
  const BATCH_SIZE = 20;
  let total = 0;
  let batchId = 0;

  for (let i = 0; i < newNames.length; i += BATCH_SIZE) {
    batchId++;
    const batch = newNames.slice(i, i + BATCH_SIZE);
    const count = await fetchDetails(batch, batchId);
    total += count;

    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const remaining = newNames.length - (i + BATCH_SIZE);
    console.log(`  → Progress: ${total} stored, ~${remaining} remaining, ${elapsed}s elapsed\n`);

    await new Promise(r => setTimeout(r, 1500));
  }

  const dbTotal = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n=== COMPLETE in ${elapsed}s ===`);
  console.log(`  Master list size: ${allNames.size} unique names`);
  console.log(`  New strains added: ${total}`);
  console.log(`  Total in database: ${dbTotal.c}`);

  // Show stats
  const withTHC = db.prepare(`SELECT COUNT(*) as c FROM strains WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0`).get() as any;
  const byType = db.prepare("SELECT type, COUNT(*) as c FROM strains GROUP BY type").all() as any[];
  console.log(`  With THC data: ${withTHC.c}`);
  for (const t of byType) console.log(`  ${t.type}: ${t.c}`);

  db.close();
}

main().catch(err => { console.error('Fatal:', err); db.close(); });
