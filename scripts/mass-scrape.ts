/**
 * Mass strain scraper — fetches 100s of strains via batched DeepSeek API calls.
 * Strategy: 25 strains per API call, ~40 calls = 1000 strains.
 */

import Database from 'better-sqlite3';
import path from 'path';

const KEY = process.env.DEEPSEEK_API_KEY || 'sk-6f66664876aa4e6c9fdf81deb35b9eca';
const URL = 'https://api.deepseek.com/v1/chat/completions';
const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

// Strain categories to cover the full spectrum
const CATEGORIES = [
  'most popular hybrid cannabis strains from the last decade',
  'most popular indica cannabis strains (classic and modern)',
  'most popular sativa cannabis strains (classic and modern)',
  'high-THC cannabis strains (above 25%)',
  'high-CBD cannabis strains (above 5% CBD)',
  'CBG-dominant cannabis strains',
  'classic heirloom and landrace cannabis strains',
  'famous California cannabis strains',
  'famous Dutch/European cannabis strains',
  'award-winning cannabis cup strains',
  'popular Canadian cannabis strains',
  'popular medical cannabis strains',
  'popular exotic cannabis strains from 2020-2025',
  'famous kush cannabis strains',
  'famous haze cannabis strains',
  'famous diesel cannabis strains',
  'famous cookie/dessert cannabis strains',
  'famous fruit-flavored cannabis strains',
  'OG and kush variety cannabis strains',
  'blueberry and berry cannabis strains',
  'cheese and skunk cannabis strains',
  'purple cannabis strains',
  'sour and citrus cannabis strains',
  'pine and earthy cannabis strains',
  'rare and limited release cannabis strains',
  'Canadian legacy cannabis strains',
  'Pacific Northwest cannabis strains',
  'Colorado cannabis strains',
  'Michigan cannabis strains',
  'craft cannabis strains from small breeders',
];

function store(strain: any, batchId: number): boolean {
  try {
    const name = strain.name || strain.strain_name || '';
    if (!name) return false;

    const existing = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name);
    if (existing) return false; // Skip duplicates

    const now = new Date().toISOString();
    const thc = typeof strain.thc === 'number' ? strain.thc
      : typeof strain.thc_percentage === 'number' ? strain.thc_percentage
      : parseFloat(String(strain.thc || 0)) || 0;
    const cbd = typeof strain.cbd === 'number' ? strain.cbd
      : typeof strain.cbd_percentage === 'number' ? strain.cbd_percentage
      : parseFloat(String(strain.cbd || 0)) || 0;
    const classification = strain.classification || strain.type || 'Hybrid';
    const typeStr = classification.toLowerCase().includes('indica') ? 'indica'
      : classification.toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';

    db.prepare(`INSERT INTO strains (canonical_name, type, breeder, description, lineage_json, effects_json, flavors_json, terpenes_json, cannabinoids_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      name, typeStr,
      strain.breeder || '',
      strain.origin || strain.description || '',
      JSON.stringify(strain.lineage || strain.parents || []),
      JSON.stringify(strain.effects || []),
      JSON.stringify(strain.flavors || []),
      JSON.stringify(Object.keys(strain.terpenes || {})),
      JSON.stringify({ thc, cbd, cbg: strain.cbg || 0, cbn: strain.cbn || 0 }),
      now, now,
    );

    const row = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name) as any;
    if (row) {
      const alias = name.toLowerCase().replace(/\s+/g, '-');
      db.prepare('INSERT OR IGNORE INTO strain_aliases (strain_id, alias) VALUES (?, ?)').run(row.id, alias);
      db.prepare('INSERT INTO source_records (source, source_id, strain_id, raw_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run('deepseek-batch', `ds-batch-${batchId}-${row.id}`, row.id, JSON.stringify(strain), now, now);
    }
    return true;
  } catch { return false; }
}

async function fetchBatch(category: string, batchId: number): Promise<number> {
  const systemPrompt = `You are a cannabis strain encyclopedia with comprehensive knowledge of strains from Leafly, SeedFinder, AllBud, and other databases. Return a JSON array of exactly 25 cannabis strains for: "${category}".

Each strain object must have these fields:
{
  "name": "exact strain name",
  "thc": average THC percentage (number, or 0 if unknown),
  "cbd": average CBD percentage (number, or 0 if unknown),
  "cbg": average CBG percentage (number, or 0 if unknown),
  "cbn": average CBN percentage (number, or 0 if unknown),
  "classification": "Indica" or "Sativa" or "Hybrid",
  "lineage": ["parent1", "parent2"] or [],
  "effects": ["effect1", "effect2", ...],
  "flavors": ["flavor1", "flavor2", ...],
  "breeder": "breeder name or empty string",
  "terpenes": { "myrcene": number 0-1, "limonene": number 0-1, "caryophyllene": number 0-1, "pinene": number 0-1, "linalool": number 0-1 }
}

IMPORTANT:
- Return ONLY the JSON array, no other text
- Use real, verified data from published sources
- If you don't know exact numbers, use best estimates based on the strain's known profile
- Include a diversity of strains within the category
- Make sure each strain name is a real, well-known strain`;

  try {
    const res = await globalThis.fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `List 25 ${category}. Return only the JSON array of strain objects.` },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log(`  [BATCH ${batchId}] API ${res.status}: ${text.substring(0, 100)}`);
      return 0;
    }

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) { console.log(`  [BATCH ${batchId}] Empty response`); return 0; }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { console.log(`  [BATCH ${batchId}] No JSON array found`); return 0; }

    const strains = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(strains)) { console.log(`  [BATCH ${batchId}] Not an array`); return 0; }

    let stored = 0;
    for (const s of strains) {
      if (store(s, batchId)) stored++;
    }

    console.log(`  [BATCH ${batchId}] ${category.substring(0, 35).padEnd(36)} → ${stored} new (${strains.length} returned)`);
    return stored;
  } catch (err: any) {
    console.log(`  [BATCH ${batchId}] Error: ${err.message.substring(0, 80)}`);
    return 0;
  }
}

async function main() {
  console.log('=== MASS STRAIN SCRAPER ===\n');
  console.log(`Categories to scrape: ${CATEGORIES.length}`);
  console.log(`Target: ~${CATEGORIES.length * 25} strains\n`);

  const start = Date.now();
  let total = 0;

  for (let i = 0; i < CATEGORIES.length; i++) {
    const count = await fetchBatch(CATEGORIES[i], i + 1);
    total += count;
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const rate = total / (parseInt(elapsed) || 1);
    console.log(`  → Running total: ${total} strains in ${elapsed}s (${rate.toFixed(1)}/s)\n`);

    // Rate limit: 1 req / 1.5s
    await new Promise(r => setTimeout(r, 1500));
  }

  const dbTotal = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n=== COMPLETE in ${elapsed}s ===`);
  console.log(`  New strains added: ${total}`);
  console.log(`  Total in database: ${dbTotal.c}`);

  // Show some samples
  console.log('\nSample additions:');
  const recent = db.prepare(`SELECT canonical_name, json_extract(cannabinoids_json, '$.thc') as thc, type
    FROM strains ORDER BY rowid DESC LIMIT 8`).all() as any[];
  for (const s of recent) {
    console.log(`  ${s.canonical_name.padEnd(30)} ${(parseFloat(s.thc || '0') || 0).toFixed(1).padStart(5)}% THC  ${s.type || ''}`);
  }

  db.close();
}

main().catch(err => { console.error('Fatal:', err); db.close(); });
