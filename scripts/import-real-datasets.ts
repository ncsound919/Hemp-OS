/**
 * Import real scientific datasets into Hemp OS DB.
 *
 * Sources:
 *  1. Medical_Marijuana_Brand_Registry.csv — CT state lab-tested products
 *  2. cannabis_studies_complete_2025_classified.csv — 2000+ AI-classified studies
 *  3. weed_strain.csv — strain data with yields, flowering, effects
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { parse as csvParse } from 'csv-parse/sync';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const DATA_DIR = path.join(process.cwd(), 'papers and data');
const db = new Database(DB_PATH);

function setupTables() {
  db.exec(`
    -- Lab-tested medical marijuana products (CT state registry)
    CREATE TABLE IF NOT EXISTS mmj_products (
      registration_number TEXT PRIMARY KEY,
      brand_name TEXT,
      dosage_form TEXT,
      producer TEXT,
      approval_date TEXT,
      thc REAL, thca REAL,
      cbd REAL, cbda REAL,
      cbg REAL, cbga REAL,
      cbdv REAL, cbc REAL, cbn REAL, thcv REAL,
      a_pinene REAL, b_myrcene REAL, b_caryophyllene REAL,
      b_pinene REAL, limonene REAL, ocimene REAL,
      linalool REAL, humulene REAL
    );

    -- AI-classified research studies
    CREATE TABLE IF NOT EXISTS research_studies (
      id INTEGER PRIMARY KEY,
      study_title TEXT,
      study_link TEXT,
      result_no_finetune TEXT,
      result_finetune TEXT,
      study_type TEXT,
      study_year INTEGER,
      cannabinoids TEXT,
      organ_systems TEXT,
      study_conditions TEXT,
      pdf_url TEXT
    );

    -- Strain grow data
    CREATE TABLE IF NOT EXISTS strain_grow_data (
      id INTEGER PRIMARY KEY,
      strain TEXT,
      thc REAL, cbd REAL, cbg REAL,
      strain_type TEXT,
      climate TEXT, difficulty TEXT,
      fungal_resistance TEXT,
      indoor_yield_max REAL, outdoor_yield_max REAL,
      flowering_weeks_min REAL, flowering_weeks_max REAL,
      height_inches_min REAL, height_inches_max REAL,
      good_effects TEXT, side_effects TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_studies_year ON research_studies(study_year);
    CREATE INDEX IF NOT EXISTS idx_studies_condition ON research_studies(study_conditions);
    CREATE INDEX IF NOT EXISTS idx_studies_result ON research_studies(result_no_finetune);
    CREATE INDEX IF NOT EXISTS idx_mmj_thc ON mmj_products(thc);
    CREATE INDEX IF NOT EXISTS idx_mmj_cbd ON mmj_products(cbd);
  `);
}

function importStudies(fileName: string): number {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) { console.log(`  ${fileName} not found`); return 0; }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const records = csvParse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
  const existing = (db.prepare('SELECT COUNT(*) as c FROM research_studies').get() as any).c;
  if (existing > 0) { console.log(`  ${fileName}: already have ${existing} studies`); return existing; }

  const insert = db.prepare(`INSERT OR IGNORE INTO research_studies
    (id, study_title, study_link, result_no_finetune, result_finetune, study_type, study_year, cannabinoids, organ_systems, study_conditions, pdf_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  let count = 0;
  const tx = db.transaction(() => {
    for (const r of records) {
      const id = parseInt(r.id) || count + 1;
      insert.run(id, r.study_title || '', r.study_link || '', r.resultIA_no_fine_tunning || '',
        r.resultIA_fine_tunning || '', r.study_type || '', parseInt(r.study_year) || 0,
        r.cannabinoids || '', r.organ_systems || '', r.study_conditions || '', r.pdf_final_url || '');
      count++;
    }
  });
  tx();
  console.log(`  ${fileName}: imported ${count} studies`);
  return count;
}

function parsePct(val: string): number {
  if (!val || val === 'N/A' || val === '') return 0;
  return parseFloat(val.replace('%', '').replace('$', '').trim()) || 0;
}

function importMMJ(): number {
  const filePath = path.join(DATA_DIR, 'Medical_Marijuana_Brand_Registry.csv');
  if (!fs.existsSync(filePath)) { console.log('  MMJ registry not found'); return 0; }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const records = csvParse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
  const existing = (db.prepare('SELECT COUNT(*) as c FROM mmj_products').get() as any).c;
  if (existing > 0) { console.log(`  MMJ: already have ${existing} products`); return existing; }

  const insert = db.prepare(`INSERT OR IGNORE INTO mmj_products
    (registration_number, brand_name, dosage_form, producer, approval_date,
     thc, thca, cbd, cbda, cbg, cbga, cbdv, cbc, cbn, thcv,
     a_pinene, b_myrcene, b_caryophyllene, b_pinene, limonene, ocimene, linalool, humulene)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  let count = 0;
  const tx = db.transaction(() => {
    for (const r of records) {
      insert.run(
        r['REGISTRATION-NUMBER'] || `mmj-${count}`,
        r['BRAND-NAME'] || '', r['DOSAGE-FORM'] || '', r['PRODUCER'] || '',
        r['APPROVAL-DATE'] || '',
        parsePct(r['TETRAHYDROCANNABINOL-THC']), parsePct(r['TETRAHYDROCANNABINOL-ACID-THCA']),
        parsePct(r['CANNABIDIOLS-CBD']), parsePct(r['CANNABIDIOL-ACID-CBDA']),
        parsePct(r['CBG']), parsePct(r['CBG-A']),
        parsePct(r['CANNABAVARIN-CBDV']), parsePct(r['CANNABICHROMENE-CBC']),
        parsePct(r['CANNBINOL-CBN']), parsePct(r['TETRAHYDROCANNABIVARIN-THCV']),
        parsePct(r['A-PINENE']), parsePct(r['B-MYRCENE']), parsePct(r['B-CARYOPHYLLENE']),
        parsePct(r['B-PINENE']), parsePct(r['LIMONENE']), parsePct(r['OCIMENE']),
        parsePct(r['LINALOOL-LIN']), parsePct(r['HUMULENE-HUM']),
      );
      count++;
    }
  });
  tx();
  console.log(`  MMJ: imported ${count} lab-tested products`);
  return count;
}

function importStrainGrowData(): number {
  const filePath = path.join(DATA_DIR, 'weed_strain.csv');
  if (!fs.existsSync(filePath)) { console.log('  weed_strain.csv not found'); return 0; }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const records = csvParse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
  const existing = (db.prepare('SELECT COUNT(*) as c FROM strain_grow_data').get() as any).c;
  if (existing > 0) { console.log(`  weed_strain: already have ${existing} records`); return existing; }

  const insert = db.prepare(`INSERT OR IGNORE INTO strain_grow_data
    (id, strain, thc, cbd, cbg, strain_type, climate, difficulty, fungal_resistance,
     indoor_yield_max, outdoor_yield_max, flowering_weeks_min, flowering_weeks_max,
     height_inches_min, height_inches_max, good_effects, side_effects)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  let count = 0;
  const tx = db.transaction(() => {
    for (const r of records) {
      insert.run(
        parseInt(r.id) || count, r.strain || '',
        parsePct(r.thc), parsePct(r.cbd), parsePct(r.cbg),
        r.strainType || '', r.climate || '', r.difficulty || '', r.fungalResistance || '',
        parseFloat(r.indoorYieldInGramsMax) || 0, parseFloat(r.outdoorYieldInGramsMax) || 0,
        parseFloat(r.floweringWeeksMin) || 0, parseFloat(r.floweringWeeksMax) || 0,
        parseFloat(r.heightInInchesMin) || 0, parseFloat(r.heightInInchesMax) || 0,
        r.goodEffects || '', r.sideEffects || '',
      );
      count++;
    }
  });
  tx();
  console.log(`  weed_strain: imported ${count} grow records`);
  return count;
}

async function main() {
  console.log('=== Importing Real Scientific Datasets ===\n');
  setupTables();

  console.log('1. Research studies:');
  const s1 = importStudies('cannabis_studies_complete_2025_classified.csv');
  const s2 = importStudies('studies_cannabis.csv');

  console.log('\n2. Lab-tested medical marijuana products:');
  const mmj = importMMJ();

  console.log('\n3. Strain grow data:');
  const grow = importStrainGrowData();

  console.log('\n=== Summary ===');
  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM research_studies) as studies,
      (SELECT COUNT(*) FROM mmj_products) as mmj,
      (SELECT COUNT(*) FROM strain_grow_data) as grow,
      (SELECT COUNT(*) FROM strains) as strains,
      (SELECT COUNT(*) FROM market_prices) as prices,
      (SELECT COUNT(*) FROM papers) as papers
  `).get() as any;
  console.log(`  Research studies:        ${totals.studies}`);
  console.log(`  MMJ lab-tested products: ${totals.mmj}`);
  console.log(`  Strain grow records:     ${totals.grow}`);
  console.log(`  Cannabis strains:        ${totals.strains}`);
  console.log(`  Scientific papers:       ${totals.papers}`);
  console.log(`  Market price records:    ${totals.prices}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  TOTAL records:           ${totals.studies + totals.mmj + totals.grow + totals.strains + totals.papers + totals.prices}`);

  db.close();
}

main().catch(err => { console.error(err); db.close(); });
