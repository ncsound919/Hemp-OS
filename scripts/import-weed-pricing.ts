/**
 * Import weed pricing data from amitkaps/weed into Hemp OS DB.
 * Source: https://github.com/amitkaps/weed
 * Downloads and imports the 22,899-row cannabis pricing dataset.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { parse as csvParse } from 'csv-parse/sync';

const DB_PATH = path.join(process.cwd(), 'data', 'hemp_os.db');
const DATA_DIR = path.join(process.cwd(), 'data');
const db = new Database(DB_PATH);

function setupTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      highq_price REAL,
      highq_transactions INTEGER,
      medq_price REAL,
      medq_transactions INTEGER,
      lowq_price REAL,
      lowq_transactions INTEGER,
      observation_date TEXT NOT NULL,
      year INTEGER,
      month INTEGER,
      week INTEGER,
      weekday INTEGER
    );

    CREATE TABLE IF NOT EXISTS market_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      abbreviation TEXT NOT NULL UNIQUE,
      latitude REAL,
      longitude REAL,
      legal_status TEXT
    );

    CREATE TABLE IF NOT EXISTS state_demographics (
      state TEXT NOT NULL PRIMARY KEY,
      total_population INTEGER,
      percent_white INTEGER,
      percent_black INTEGER,
      percent_asian INTEGER,
      percent_hispanic INTEGER,
      per_capita_income INTEGER,
      median_rent INTEGER,
      median_age REAL,
      unemployment_rate REAL
    );

    CREATE INDEX IF NOT EXISTS idx_market_prices_state ON market_prices(state);
    CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(observation_date);
    CREATE INDEX IF NOT EXISTS idx_market_prices_year ON market_prices(year);

    -- Legal status enum from State_Location.csv
    CREATE TABLE IF NOT EXISTS legal_statuses (
      status TEXT PRIMARY KEY,
      description TEXT
    );
  `);

  // Seed legal status descriptions
  const existingStatuses = db.prepare('SELECT COUNT(*) as c FROM legal_statuses').get() as any;
  if (existingStatuses.c === 0) {
    const statuses = [
      ['illegal', 'All forms prohibited'],
      ['medical', 'Medical use legal'],
      ['medical-limited', 'Limited medical use (low-THC only)'],
      ['decriminalized', 'Decriminalized (civil penalty)'],
      ['decriminalized+medical', 'Decriminalized + medical program'],
      ['legal', 'Fully legal (recreational + medical)'],
    ];
    const insert = db.prepare('INSERT INTO legal_statuses (status, description) VALUES (?, ?)');
    for (const [s, d] of statuses) insert.run(s, d);
  }
}

function importPriceData() {
  const csvPath = path.join(DATA_DIR, 'Weed_Price.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('Weed_Price.csv not found, skipping price import');
    return 0;
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records = csvParse(raw, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    relax_column_count: true,
  });

  console.log(`Parsed ${records.length} price records`);

  const insert = db.prepare(`INSERT INTO market_prices 
    (state, highq_price, highq_transactions, medq_price, medq_transactions, lowq_price, lowq_transactions, observation_date, year, month, week, weekday)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const existing = db.prepare('SELECT COUNT(*) as c FROM market_prices').get() as any;
  if (existing.c > 0) {
    console.log(`Already have ${existing.c} price records, skipping`);
    return existing.c;
  }

  let imported = 0;
  const tx = db.transaction(() => {
    for (const row of records) {
      const date = row.date || '';
      if (!date) continue;
      const d = new Date(date);
      insert.run(
        row.State || '',
        parseFloat(row.HighQ) || null,
        parseInt(row.HighQN) || 0,
        parseFloat(row.MedQ) || null,
        parseInt(row.MedQN) || 0,
        parseFloat(row.LowQ) || null,
        parseInt(row.LowQN) || 0,
        date,
        d.getFullYear(),
        d.getMonth() + 1,
        getWeekNumber(d),
        d.getDay(),
      );
      imported++;
    }
  });
  tx();
  console.log(`Imported ${imported} price records`);
  return imported;
}

function importStateData() {
  // State_Location.csv
  const locPath = path.join(DATA_DIR, 'State_Location.csv');
  if (fs.existsSync(locPath)) {
    const raw = fs.readFileSync(locPath, 'utf-8');
    const records = csvParse(raw, { columns: true, skip_empty_lines: true });
    const insert = db.prepare(`INSERT OR REPLACE INTO market_states (name, abbreviation, latitude, longitude, legal_status) VALUES (?, ?, ?, ?, ?)`);
    const existing = db.prepare('SELECT COUNT(*) as c FROM market_states').get() as any;
    if (existing.c === 0) {
      const tx = db.transaction(() => {
        for (const r of records) insert.run(r.region || '', r.state || '', parseFloat(r.latitude) || 0, parseFloat(r.longitude) || 0, r.status || 'illegal');
      });
      tx();
      console.log(`Imported state locations: ${records.length}`);
    }
  }

  // Demographics_State.csv
  const demoPath = path.join(DATA_DIR, 'Demographics_State.csv');
  if (fs.existsSync(demoPath)) {
    const raw = fs.readFileSync(demoPath, 'utf-8');
    const records = csvParse(raw, { columns: true, skip_empty_lines: true });
    const insert = db.prepare(`INSERT OR REPLACE INTO state_demographics (state, total_population, percent_white, percent_black, percent_asian, percent_hispanic, per_capita_income, median_rent, median_age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const existing = db.prepare('SELECT COUNT(*) as c FROM state_demographics').get() as any;
    if (existing.c === 0) {
      const tx = db.transaction(() => {
        for (const r of records) {
          insert.run(r.region || '', parseInt(r.total_population) || 0, parseInt(r.percent_white) || 0, parseInt(r.percent_black) || 0, parseInt(r.percent_asian) || 0, parseInt(r.percent_hispanic) || 0, parseInt(r.per_capita_income) || 0, parseInt(r.median_rent) || 0, parseFloat(r.median_age) || 0);
        }
      });
      tx();
      console.log(`Imported demographics: ${records.length}`);
    }
  }
}

function getWeekNumber(d: Date): number {
  const first = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
}

async function main() {
  console.log('=== Importing Weed Pricing Data ===\n');
  setupTables();
  importStateData();
  const count = importPriceData();

  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM market_prices) as prices,
      (SELECT COUNT(*) FROM market_states) as states,
      (SELECT COUNT(*) FROM state_demographics) as demos
  `).get() as any;

  console.log(`\n=== Results ===`);
  console.log(`  Price records: ${totals.prices}`);
  console.log(`  States: ${totals.states}`);
  console.log(`  Demographics: ${totals.demos}`);

  if (totals.prices > 0) {
    const prices = db.prepare('SELECT state, highq_price, medq_price, observation_date FROM market_prices LIMIT 5').all() as any[];
    console.log('\nSample:');
    for (const p of prices) {
      console.log(`  ${p.state}: High $${p.highq_price}/oz, Med $${p.medq_price}/oz (${p.observation_date})`);
    }
  }

  db.close();
}

main().catch(err => { console.error(err); db.close(); });
