import { benchmarkCert } from '../kernel/rigor/benchmark-certification.ts';
const results = benchmarkCert.runAll();
for (const r of results) {
  console.log(`${r.caseId}: ${r.name} — ${r.passed ? 'PASS' : 'FAIL'}`);
  for (const d of r.deviations) {
    console.log(`  ✗ ${d.param}: expected=${d.expected}, actual=${d.actual}, delta=${d.delta.toFixed(4)}`);
  }
}
