import Database from 'better-sqlite3';
import path from 'path';
const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

console.log('=== Latest Market Prices ===');
const latest = db.prepare('SELECT state, highq_price, observation_date FROM market_prices ORDER BY observation_date DESC LIMIT 8').all() as any[];
for (const r of latest) {
  console.log(`  ${r.observation_date}  ${r.state.padEnd(20)} $${r.highq_price?.toFixed(2)}`);
}

const cali = db.prepare("SELECT AVG(highq_price) as avg FROM market_prices WHERE state = 'California' AND observation_date >= '2024-01-01'").get() as any;
console.log(`\nCalifornia avg 2024-2025: $${cali.avg?.toFixed(2)}`);

const states2024 = db.prepare("SELECT COUNT(DISTINCT state) as c FROM market_prices WHERE observation_date >= '2024-01-01'").get() as any;
console.log(`States with 2024-2025 data: ${states2024.c}`);

const totalNew = db.prepare("SELECT COUNT(*) as c FROM market_prices WHERE observation_date >= '2024-01-01'").get() as any;
console.log(`New price records (2024-2025): ${totalNew.c}`);

const totalOld = db.prepare("SELECT COUNT(*) as c FROM market_prices WHERE observation_date < '2020-01-01'").get() as any;
console.log(`Old price records (pre-2020): ${totalOld.c}`);

console.log(`\nTotal market_prices: ${totalNew.c + totalOld.c}`);

db.close();
