import { monitoring } from '../src/services/monitoring.service.ts';

console.log('=== Monitoring System Demo ===\n');

// 1. Health Check
console.log('1. System Health:');
const health = monitoring.getHealth();
console.log(`   Status: ${health.status}`);
for (const [component, check] of Object.entries(health.checks)) {
  console.log(`   ${component.padEnd(15)} ${check.status.padEnd(10)} ${check.detail}`);
}

// 2. Metrics
console.log('\n2. Key Metrics:');
const metrics = monitoring.collectAll();
const keyMetrics = metrics.filter(m =>
  m.name.includes('records') || m.name.includes('pipeline') ||
  m.name.includes('model') || m.name.includes('provenance') ||
  m.name.includes('advisor') || m.name.includes('lab')
);
for (const m of keyMetrics) {
  console.log(`   ${m.name.padEnd(35)} ${String(m.value).padStart(8)} ${m.unit}`);
}
console.log(`\n   Total metrics collected: ${metrics.length}`);

// 3. Data Freshness
console.log('\n3. Data Freshness (last updated):');
const freshness = monitoring.getDataFreshness();
for (const [name, date] of Object.entries(freshness)) {
  console.log(`   ${name.padEnd(20)} ${date || 'never'}`);
}

// 4. Prometheus output sample
console.log('\n4. Prometheus Metrics (sample):');
const promSample = monitoring.toPrometheus(metrics.slice(0, 5));
console.log(promSample);

console.log('\n=== Operations Layer Complete ✓ ===');
