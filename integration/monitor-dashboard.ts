/**
 * Standalone Monitoring Dashboard — Grafana Alternative
 *
 * Self-contained HTML dashboard served directly from the API.
 * No Docker, no Grafana server needed — works out of the box.
 * Uses Chart.js via CDN for real-time visualization.
 *
 * Access: GET /api/integration/monitor/dashboard
 */

export function generateDashboardHTML(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hemp OS — System Monitor</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0b; color: #d1d1d1; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 18px; color: #22c55e; font-weight: 600; letter-spacing: 0.5px; }
  .header .status { font-size: 12px; padding: 4px 12px; border-radius: 12px; font-weight: 500; }
  .status.healthy { background: #064e3b; color: #6ee7b7; }
  .status.degraded { background: #451a03; color: #fbbf24; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: #121214; border: 1px solid #1f1f21; border-radius: 12px; padding: 16px; }
  .card h3 { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .card .value { font-size: 28px; font-weight: 700; color: #fff; }
  .card .sub { font-size: 11px; color: #555; margin-top: 4px; }
  .card .bar { height: 4px; border-radius: 2px; margin-top: 8px; background: #1f1f21; overflow: hidden; }
  .card .bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .chart-card { background: #121214; border: 1px solid #1f1f21; border-radius: 12px; padding: 16px; }
  .chart-card h3 { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .chart-container { position: relative; height: 200px; }
  .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .health-item { padding: 12px; border-radius: 8px; border: 1px solid #1f1f21; text-align: center; }
  .health-item .icon { font-size: 24px; margin-bottom: 4px; }
  .health-item .name { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .health-item .check { font-size: 12px; font-weight: 600; margin-top: 4px; }
  .freshness-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .freshness-table th { text-align: left; padding: 8px; color: #666; font-weight: 500; border-bottom: 1px solid #1f1f21; }
  .freshness-table td { padding: 8px; border-bottom: 1px solid #1f1f21; }
  .freshness-table .current { color: #6ee7b7; }
  .freshness-table .stale { color: #fbbf24; }
  .freshness-table .critical { color: #f87171; }
  .footer { text-align: center; font-size: 10px; color: #444; margin-top: 24px; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="header">
  <h1>🌿 Hemp OS — System Monitor</h1>
  <span id="systemStatus" class="status">—</span>
</div>

<div class="grid" id="metricCards"></div>

<div class="chart-row">
  <div class="chart-card">
    <h3>📊 Record Distribution</h3>
    <div class="chart-container"><canvas id="recordsChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h3>📈 System Health</h3>
    <div class="chart-container"><canvas id="healthChart"></canvas></div>
  </div>
</div>

<div class="card">
  <h3>🔍 Component Health</h3>
  <div class="health-grid" id="healthGrid"></div>
</div>

<div class="card" style="margin-top:16px;">
  <h3>📅 Data Freshness</h3>
  <table class="freshness-table" id="freshnessTable">
    <thead><tr><th>Dataset</th><th>Last Updated</th><th>Status</th></tr></thead>
    <tbody id="freshnessBody"></tbody>
  </table>
</div>

<div class="footer">Hemp OS v2.0.0 — Auto-refreshes every 30s</div>

<script>
const BASE = '${baseUrl}';

async function loadMetrics() {
  const res = await fetch(BASE + '/monitor/health');
  const health = (await res.json());
  const statusEl = document.getElementById('systemStatus');
  statusEl.textContent = health.status?.status || 'unknown';
  statusEl.className = 'status ' + (health.status?.status || 'degraded');

  // Health grid
  const grid = document.getElementById('healthGrid');
  grid.innerHTML = '';
  for (const [name, check] of Object.entries(health.checks || {})) {
    const icon = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
    grid.innerHTML += \`<div class="health-item"><div class="icon">\${icon}</div><div class="name">\${name}</div><div class="check" style="color:\${check.status === 'healthy' ? '#6ee7b7' : '#fbbf24'}">\${check.status}</div><div style="font-size:9px;color:#555;margin-top:2px">\${check.detail?.substring(0,30)}</div></div>\`;
  }

  const metRes = await fetch(BASE + '/monitor/metrics');
  const metText = await metRes.text();
  const metrics = {};
  metText.split('\\n').filter(l => l.startsWith('hemp_os')).forEach(l => {
    const parts = l.split(' ');
    metrics[parts[0]] = parseFloat(parts[parts.length-1]) || 0;
  });

  // Metric cards
  const cards = document.getElementById('metricCards');
  const cardDefs = [
    { label: 'Database Size', key: 'hemp_os_db_size_bytes', fmt: v => (v / 1024 / 1024).toFixed(1) + ' MB', color: '#22c55e' },
    { label: 'Total Records', key: null, fmt: () => Object.entries(metrics).filter(([k]) => k.includes('records_')).reduce((s, [,v]) => s + v, 0).toLocaleString(), color: '#3b82f6', bar: 100 },
    { label: 'Pipeline Runs', key: 'hemp_os_pipeline_runs', fmt: v => v + ' runs', color: '#a855f7' },
    { label: 'Model Accuracy', key: 'hemp_os_model_accuracy_pct', fmt: v => v.toFixed(1) + '%', color: '#f59e0b', bar: true },
    { label: 'Active Labs', key: 'hemp_os_active_labs', fmt: v => v + ' labs', color: '#06b6d4' },
    { label: 'Strains', key: 'hemp_os_records_strains', fmt: v => v.toLocaleString(), color: '#22c55e' },
    { label: 'Market Records', key: 'hemp_os_records_market_prices', fmt: v => v.toLocaleString(), color: '#3b82f6' },
    { label: 'Research Studies', key: 'hemp_os_records_research_studies', fmt: v => v.toLocaleString(), color: '#a855f7' },
    { label: 'MMJ Products', key: 'hemp_os_records_mmj_products', fmt: v => v.toLocaleString(), color: '#f59e0b' },
    { label: 'Advisors', key: 'hemp_os_advisors', fmt: v => v + ' advisors', color: '#8b5cf6' },
    { label: 'Provenance Links', key: 'hemp_os_provenance_links', fmt: v => v + ' links', color: '#ec4899' },
    { label: 'Lab Samples', key: 'hemp_os_lab_samples', fmt: v => v.toLocaleString(), color: '#14b8a6' },
  ];
  cards.innerHTML = '';
  for (const def of cardDefs) {
    const val = def.key !== null ? metrics[def.key] || 0 : 0;
    const display = def.key !== null ? def.fmt(val) : def.fmt();
    const barPct = def.bar ? (val / (metrics['hemp_os_model_accuracy_pct'] || 100) * 100) : 0;
    cards.innerHTML += \`<div class="card"><h3>\${def.label}</h3><div class="value">\${display}</div>\${def.bar ? '<div class="bar"><div class="bar-fill" style="width:\${barPct}%;background:\${def.color}"></div></div>' : ''}</div>\`;
  }

  // Records chart
  const recordLabels = ['Strains', 'Papers', 'Market Prices', 'MMJ Products', 'Studies', 'Grow Data'];
  const recordValues = [metrics['hemp_os_records_strains'], metrics['hemp_os_records_papers'], metrics['hemp_os_records_market_prices'], metrics['hemp_os_records_mmj_products'], metrics['hemp_os_records_research_studies'], metrics['hemp_os_records_strain_grow_data']];
  new Chart(document.getElementById('recordsChart'), { type: 'bar', data: { labels: recordLabels, datasets: [{ data: recordValues, backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#a855f7','#06b6d4','#ec4899'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#666', font: { size: 9 } } }, y: { ticks: { color: '#666' } } } } });

  // Health chart
  const healthData = Object.entries(health.checks || {});
  new Chart(document.getElementById('healthChart'), { type: 'doughnut', data: { labels: healthData.map(([n]) => n), datasets: [{ data: healthData.map(([,c]) => c.status === 'healthy' ? 100 : 50), backgroundColor: ['#22c55e','#3b82f6','#a855f7','#f59e0b','#06b6d4','#ec4899'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#666', font: { size: 10 } } } } } });

  // Freshness
  const freshRes = await fetch(BASE + '/monitor/freshness');
  const fresh = (await freshRes.json()).freshness || {};
  const tbody = document.getElementById('freshnessBody');
  tbody.innerHTML = '';
  for (const [name, date] of Object.entries(fresh)) {
    const age = date ? (Date.now() - new Date(date).getTime()) / 86400000 : Infinity;
    const status = age < 30 ? 'current' : age < 365 ? 'stale' : 'critical';
    const label = age < 30 ? '✅ Current' : age < 365 ? '⚠️ ' + Math.round(age) + ' days' : '❌ ' + Math.round(age/365) + ' years';
    tbody.innerHTML += \`<tr><td>\${name}</td><td>\${date || 'never'}</td><td class="\${status}">\${label}</td></tr>\`;
  }
}

loadMetrics();
setInterval(loadMetrics, 30000);
</script>
</body>
</html>`;
}
