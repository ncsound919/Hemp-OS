/**
 * Hemp OS — Real Strain Scraper
 * Uses DeepSeek API to fetch real strain data
 * and stores results in the SQLite database.
 *
 * Usage: $env:DEEPSEEK_API_KEY="sk-xxx"; npx tsx scripts/scrape-strains.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6f66664876aa4e6c9fdf81deb35b9eca';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const db = new Database(DB_PATH);

const POPULAR_STRAINS = [
  'Pineapple Express', 'Girl Scout Cookies', 'Blue Dream', 'Sour Diesel',
  'OG Kush', 'Northern Lights', 'Granddaddy Purple', 'Jack Herer',
  'Green Crack', 'White Widow', 'AK-47', 'Gelato', 'Dosidos',
  'Wedding Cake', 'Zkittlez', 'Bruce Banner', 'Super Silver Haze',
  'Trainwreck', 'Purple Haze', 'Lemon Haze', 'Strawberry Cough',
  'Blue Cheese', 'Amnesia Haze', 'Critical Mass', 'Mango Kush',
];

async function fetchFromDeepSeek(strainName: string): Promise<any | null> {
  const systemPrompt = `You are a cannabis strain database. Return accurate, factual information about cannabis strains based on real-world data from Leafly, SeedFinder, AllBud, and academic sources. Return ONLY a JSON object with these fields:
{
  "name": "exact strain name",
  "thc": number (average THC %),
  "cbd": number (average CBD %),
  "cbg": number (average CBG %),
  "cbn": number (average CBN %),
  "terpenes": { "myrcene": 0-1, "limonene": 0-1, "caryophyllene": 0-1, "pinene": 0-1, "linalool": 0-1 },
  "classification": "Indica | Sativa | Hybrid",
  "lineage": ["parent1", "parent2"],
  "effects": ["effect1", ...],
  "flavors": ["flavor1", ...],
  "breeder": "breeder name or empty string",
  "origin": "short history"
}`;

  const body = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Provide the cannabis strain profile for "${strainName}" with verified data from published sources.` },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');

  // Extract JSON from response (handles markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');
  return JSON.parse(jsonMatch[0]);
}

function store(strainName: string, data: any, source: string): boolean {
  const now = new Date().toISOString();
  const typeStr = (data.classification || '').toLowerCase().includes('indica') ? 'indica'
    : (data.classification || '').toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';

  db.prepare(`INSERT INTO strains (canonical_name, type, breeder, description, lineage_json, effects_json, flavors_json, terpenes_json, cannabinoids_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    data.name || strainName, typeStr,
    data.breeder || source,
    data.origin || '',
    JSON.stringify(data.lineage || []),
    JSON.stringify(data.effects || []),
    JSON.stringify(data.flavors || []),
    JSON.stringify(Object.keys(data.terpenes || {})),
    JSON.stringify({ thc: data.thc || 0, cbd: data.cbd || 0, cbg: data.cbg || 0, cbn: data.cbn || 0 }),
    now, now,
  );

  const row = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(data.name || strainName) as any;
  if (row) {
    const alias = (data.name || strainName).toLowerCase().replace(/\s+/g, '-');
    db.prepare('INSERT OR IGNORE INTO strain_aliases (strain_id, alias) VALUES (?, ?)').run(row.id, alias);
    db.prepare('INSERT INTO source_records (source, source_id, strain_id, raw_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(source, `${source}-${Date.now()}`, row.id, JSON.stringify(data), now, now);
  }
  return true;
}

async function main() {
  console.log('=== HEMP OS STRAIN SCRAPER ===\n');
  console.log(`DeepSeek API: ${DEEPSEEK_API_KEY ? 'Key set' : 'NO KEY'}\n`);

  let scraped = 0, skipped = 0, errors = 0;

  for (const name of POPULAR_STRAINS) {
    if (db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name)) {
      console.log(`  [SKIP] ${name} — already in DB`);
      skipped++; continue;
    }

    console.log(`  [FETCH] ${name}...`);

    try {
      const data = await fetchFromDeepSeek(name);
      if (!data || !data.name) { errors++; continue; }

      store(name, data, 'deepseek');
      console.log(`     [OK] ${data.name} — ${data.thc || '?'}% THC, ${data.classification || '?'}`);
      scraped++;
    } catch (err: any) {
      console.log(`     [ERR] ${err.message.substring(0, 100)}`);
      console.log(`     -> Falling back to OpenAlex...`);

      try {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(name + ' cannabis')}&per-page=2`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'HempOS/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const d = await res.json() as any;
          const p = d.results || [];
          if (p.length > 0) {
            store(name, {
              name, classification: 'Hybrid',
              origin: `Academic ref: ${p[0].title} (${p[0].publication_year || '?'})`,
            }, 'openalex');
            console.log(`     [OK] ${name} (academic ref only)`);
            scraped++;
          } else { errors++; }
        } else { errors++; }
      } catch { errors++; }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
  console.log(`\n=== RESULTS ===`);
  console.log(`  New: ${scraped}, Skipped: ${skipped}, Errors: ${errors}`);
  console.log(`  Total strains in DB: ${total.c}`);
  db.close();
}

main().catch(err => { console.error('Fatal:', err); db.close(); process.exit(1); });
