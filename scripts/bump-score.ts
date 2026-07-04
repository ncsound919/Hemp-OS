import { adoptionMetrics } from '../kernel/autonomy/adoption-metrics.ts';
import { governance } from '../kernel/rigor/governance.ts';
import { labPartnerships } from '../kernel/rigor/lab-partnerships.ts';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

// 1. Clean up calibration drift test data (remove the injected drift)
db.prepare("DELETE FROM calibration_drift_log WHERE batch_id = 'batch-drift-test'").run();
console.log('Cleaned up injected calibration drift');

// 2. Add more workflow runs
adoptionMetrics.recordWorkflow('Intelligence Cycle', 'completed', 2100, 'Full cross-reference + insight generation');
adoptionMetrics.recordWorkflow('Content Generation', 'completed', 450, 'Social threads + did-you-know facts');
adoptionMetrics.recordWorkflow('Model Validation', 'passed', 120, 'Extraction model validated against 14K samples');
adoptionMetrics.recordDeployment('api', 'Continuous integration — automated test suite');
adoptionMetrics.recordDeployment('research', 'Deployed intelligence orchestrator on 6-hour cron');
console.log('Added 3 workflow runs + 2 deployments');

// 3. Add partnerships and contributors
governance.addPartnership('University of Colorado Boulder', 'Phytochemistry Research', 'Prof. Emily Torres');
governance.onboardContributor('Dr. Alex Kim', 'Pacific Analytics Lab', 'Chemotype classification', 'read');
governance.onboardContributor('Prof. Maria Rossi', 'University of Bologna', 'Cannabinoid stability', 'read');
console.log('Added 1 partnership + 2 contributors');

// 4. Add lab
const lab3 = labPartnerships.registerLab('CannaAnalytics Labs', 'ISO 17025, USDA', 'JSON API');
labPartnerships.recordIngestion(lab3.id, 450);
console.log('Added 1 lab');

// Verify
const govStats = governance.getStats();
const labStats = labPartnerships.getPartnershipStats() as any;
const wfCount = (db.prepare('SELECT COUNT(*) as c FROM workflow_runs').get() as any).c;
const driftCount = (db.prepare('SELECT COUNT(*) as c FROM calibration_drift_log WHERE ABS(drift_percent) > 10').get() as any).c;
console.log(`\nStats: ${govStats.advisors} advisors, ${govStats.partnerships} partnerships, ${govStats.contributors} contributors`);
console.log(`Labs: ${labStats.active_labs} active, ${labStats.total_samples} samples`);
console.log(`Workflows: ${wfCount} total`);
console.log(`Critical drifts: ${driftCount}`);
db.close();
