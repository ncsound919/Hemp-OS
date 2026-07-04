import { generateDashboardHTML } from '../integration/monitor-dashboard.ts';

const html = generateDashboardHTML('http://localhost:3100/api/integration');
console.log('Dashboard HTML generated:');
console.log('  Length:', html.length, 'chars');
console.log('  Has Chart.js:', html.includes('chart.js'));
console.log('  Has health grid:', html.includes('healthGrid'));
console.log('  Has freshness:', html.includes('freshnessTable'));
console.log('  Has auto-refresh:', html.includes('setInterval'));
console.log('  Has metric cards:', html.includes('metricCards'));
console.log('  Has system status:', html.includes('systemStatus'));
console.log('Dashboard ✓');
