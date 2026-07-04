/**
 * Enriches existing OpenAlex-sourced strains with real cannabinoid data from DeepSeek.
 * Only processes strains that have zero cannabinoid data (OpenAlex fallback entries).
 */

import Database from 'better-sqlite3';
import path from 'path';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6f66664876aa4e6c9fdf81deb35b9eca';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

async function fetchStrainData(strainName: string): Promise<any | null> {
  const res = await globalThis.fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a cannabis strain database. Return ONLY a JSON object with: name, thc, cbd, cbg, cbn, terpenes {myrcene, limonene, caryophyllene, pinene, linalool}, classification (Indica/Sativa/Hybrid), lineage, effects, flavors, breeder, origin. Use real published data.' },
        { role: 'user', content: `Cannabis strain profile for "${strainName}" with verified cannabinoid data:` },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return null;
  const data = await res.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  const m = content.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function main() {
  const strains = db.prepare("SELECT id, canonical_name, cannabinoids_json FROM strains WHERE json_extract(cannabinoids_json, '$.thc') = 0").all() as any[];
  console.log(`Found ${strains.length} strains needing enrichment\n`);

  let ok = 0, fail = 0;

  for (const s of strains) {
    console.log(`  [FETCH] ${s.canonical_name}...`);
    try {
      const data = await fetchStrainData(s.canonical_name);
      if (!data || !data.thc) { console.log(`     No data`); fail++; continue; }

      const now = new Date().toISOString();
      const typeStr = (data.classification || '').toLowerCase().includes('indica') ? 'indica'
        : (data.classification || '').toLowerCase().includes('sativa') ? 'sativa' : 'hybrid';

      db.prepare(`UPDATE strains SET type=?, breeder=?, description=?, lineage_json=?, effects_json=?, flavors_json=?, terpenes_json=?, cannabinoids_json=?, updated_at=? WHERE id=?`)
        .run(typeStr, data.breeder || '', data.origin || '',
          JSON.stringify(data.lineage || []), JSON.stringify(data.effects || []),
          JSON.stringify(data.flavors || []), JSON.stringify(Object.keys(data.terpenes || {})),
          JSON.stringify({ thc: data.thc, cbd: data.cbd || 0, cbg: data.cbg || 0, cbn: data.cbn || 0 }),
          now, s.id);

      console.log(`     [OK] ${data.name} — ${data.thc}% THC`);
      ok++;
    } catch (err: any) {
      console.log(`     [ERR] ${err.message.substring(0, 80)}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 600));
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM strains').get() as any;
  const withData = db.prepare("SELECT COUNT(*) as c FROM strains WHERE json_extract(cannabinoids_json, '$.thc') > 0").get() as any;

  console.log(`\n=== RESULTS ===`);
  console.log(`  Enriched: ${ok}, Failed: ${fail}`);
  console.log(`  Total strains: ${total.c}`);
  console.log(`  With cannabinoid data: ${withData.c}`);
  db.close();
}

main().catch(err => { console.error(err); db.close(); });
