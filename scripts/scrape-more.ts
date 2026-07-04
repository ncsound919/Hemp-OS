/**
 * Final mass scrape pass — 30 more category batches, strict anti-fabrication.
 * Explicitly tells DeepSeek to NOT invent sequential names.
 */

import Database from 'better-sqlite3';
import path from 'path';

const KEY = process.env.DEEPSEEK_API_KEY || 'sk-6f66664876aa4e6c9fdf81deb35b9eca';
const URL = 'https://api.deepseek.com/v1/chat/completions';
const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

const CATEGORIES = [
  'kush strains (Bubba Kush, Master Kush, Hindu Kush, etc)',
  'haze strains (Super Silver Haze, Amnesia Haze, etc)',
  'diesel strains (Sour Diesel, NYC Diesel, etc)',
  'cookie/dessert strains (GSC, Gelato, Sherbet, etc)',
  'blueberry/berry strains (Blueberry, Blue Dream, etc)',
  'cheese strains (UK Cheese, Blue Cheese, etc)',
  'purple strains (Purple Haze, GDP, Purple Punch, etc)',
  'landrace strains from Afghanistan, Thailand, Mexico, Colombia, Jamaica',
  'European-bred strains from Spain, Netherlands, UK',
  'Canadian-bred strains',
  'award-winning High Times Cannabis Cup strains',
  'high-THC strains (above 22%) for experienced users',
  'high-CBD strains (above 4% CBD) for medical use',
  'classic strains from the 1970s-1990s (Skunk #1, Northern Lights, etc)',
  'modern exotic strains 2020-2025 (Runtz, Jealousy, etc)',
  'lemon/citrus strains (Super Lemon Haze, Lemon Skunk, etc)',
  'apple/fruit strains (Apple Fritter, Banana OG, Grape Ape, etc)',
  'pine/earthy strains (Jack Herer, Pineapple Express, etc)',
  'gas/chemical strains (Chemdawg, Gas, etc)',
  'white strains (White Widow, White Rhino, White Russian, etc)',
  'Afghani and Middle Eastern strains',
  'African strains (Durban Poison, Malawi Gold, etc)',
  'South American strains (Colombian Gold, Brazilian, etc)',
  'Thai and Southeast Asian strains',
  'Hindu Kush mountain region strains',
  'compact indica strains for indoor growing',
  'tall sativa strains for outdoor growing',
  'autoflowering strains',
  'CBD-rich 1:1 ratio strains',
  'THC-v and CBD-v rare cannabinoid strains',
];

async function fetchBatch(category: string, batchId: number): Promise<number> {
  const systemPrompt = `You are a cannabis strain database with REAL strains only. Return a JSON array of cannabis strains for: "${category}".

ABSOLUTELY DO NOT invent strains. Only return strains that are real, well-known, and documented on Leafly, AllBud, SeedFinder, or other reputable sources. If you cannot find 20 real strains, return fewer rather than making them up. NEVER output sequential numbered names like "Strain #1, Strain #2".

Each object: { "name": "exact strain name", "thc": number (0-35, use 0 if unknown), "cbd": number (0-20, use 0 if unknown), "classification": "Indica"/"Sativa"/"Hybrid", "lineage": ["parent1","parent2"] or [], "effects": ["effect1",...], "flavors": ["flavor1",...], "breeder": "name or empty" }

Return ONLY the JSON array.`;

  try {
    const res = await globalThis.fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `List real ${category}. Return JSON array of strain objects only.` },
        ],
        temperature: 0.3,
        max_tokens: 6000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) { console.log(`  [B${batchId}] API ${res.status}`); return 0; }
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) { console.log(`  [B${batchId}] Empty`); return 0; }

    const m = content.match(/\[[\s\S]*\]/);
    if (!m) { console.log(`  [B${batchId}] No JSON`); return 0; }

    const strains = JSON.parse(m[0]);
    if (!Array.isArray(strains)) { console.log(`  [B${batchId}] Not array`); return 0; }

    // Filter out obvious fakes
    const real = strains.filter((s: any) => {
      const name = s.name || '';
      return name.length > 2 && !/^[A-Za-z]+ #[0-9]+$/.test(name) && !/^Strain \d+$/i.test(name);
    });

    let stored = 0;
    const now = new Date().toISOString();
    for (const s of real) {
      const name = s.name;
      if (db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name)) continue;

      const typeStr = (s.classification || '').toLowerCase().includes('indica') ? 'indica'
        : (s.classification || '').toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';

      db.prepare(`INSERT INTO strains (canonical_name, type, breeder, description, lineage_json, effects_json, flavors_json, terpenes_json, cannabinoids_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        name, typeStr, s.breeder || '', '',
        JSON.stringify(s.lineage || []), JSON.stringify(s.effects || []),
        JSON.stringify(s.flavors || []), JSON.stringify([]),
        JSON.stringify({ thc: s.thc || 0, cbd: s.cbd || 0, cbg: 0, cbn: 0 }),
        now, now,
      );

      const row = db.prepare('SELECT id FROM strains WHERE canonical_name = ?').get(name) as any;
      if (row) {
        db.prepare('INSERT OR IGNORE INTO strain_aliases (strain_id, alias) VALUES (?, ?)').run(row.id, name.toLowerCase().replace(/\s+/g, '-'));
        db.prepare('INSERT INTO source_records (source, source_id, strain_id, raw_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run('deepseek-m3', `m3-${batchId}-${row.id}`, row.id, JSON.stringify(s), now, now);
      }
      stored++;
    }

    if (real.length !== strains.length) {
      console.log(`  [B${batchId}] ${category.substring(0, 40).padEnd(42)} → ${stored} new (filtered ${strains.length - real.length} fakes)`);
    } else {
      console.log(`  [B${batchId}] ${category.substring(0, 40).padEnd(42)} → ${stored} new`);
    }
    return stored;
  } catch (err: any) {
    console.log(`  [B${batchId}] ${category.substring(0, 30)}: ${err.message.substring(0, 60)}`);
    return 0;
  }
}

async function main() {
  const start = Date.now();
  const existing = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
  console.log(`Starting with ${existing.c} strains\n`);

  let total = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const added = await fetchBatch(CATEGORIES[i], i + 1);
    total += added;
    const rate = (total / ((Date.now() - start) / 1000)).toFixed(1);
    if ((i + 1) % 5 === 0) {
      const t = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
      console.log(`  → Checkpoint: ${t.c} total, +${total} from this run (${rate}/s)\n`);
    }
  }

  const finalCount = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n=== COMPLETE in ${elapsed}s ===`);
  console.log(`  Added: ${total}`);
  console.log(`  Total: ${finalCount.c}`);

  const types = db.prepare('SELECT type, COUNT(*) as c FROM strains GROUP BY type ORDER BY c DESC').all() as any[];
  console.log('\nBy type:');
  for (const t of types) console.log(`  ${t.type}: ${t.c}`);

  db.close();
}

main().catch(err => { console.error('Fatal:', err); db.close(); });
