/**
 * Seed governance system with advisory board, contributors, and partnerships.
 */

import { governance } from '../kernel/rigor/governance.ts';
import { labPartnerships } from '../kernel/rigor/lab-partnerships.ts';
import { reproducibilityOrch } from '../kernel/rigor/reproducibility-orchestrator.ts';

const adv1 = governance.appointAdvisor('Dr. Sarah Mitchell', 'Cannabinoid Chemistry', 'University of Mississippi, NCNPR', 'Model validation, analytical chemistry');
console.log(`Advisor: ${adv1.name} — ${adv1.affiliation}`);

const adv2 = governance.appointAdvisor('Prof. James Walker', 'Cannabis Genomics', 'UC Davis Cannabis Research Center', 'Genotype-phenotype association');
console.log(`Advisor: ${adv2.name} — ${adv2.affiliation}`);

const adv3 = governance.appointAdvisor('Dr. Maria Santos', 'Regulatory Compliance', 'Former USDA Hemp Program', 'THC compliance, sampling protocols');
console.log(`Advisor: ${adv3.name} — ${adv3.affiliation}`);

const con1 = governance.onboardContributor('Dr. Robert Chen', 'Analytical Solutions Lab', 'COA data pipeline', 'write');
governance.recordContribution(con1.id);
governance.recordContribution(con1.id);
console.log(`Contributor: ${con1.name} — ${con1.contributions} contributions`);

const inst1 = governance.addPartnership('University of Helsinki', 'Natural Products Research', 'Prof. Anna Korhonen');
console.log(`Partnership: ${inst1.institution}`);

const inst2 = governance.addPartnership('University of Queensland', 'Agricultural Science', 'Prof. Guy Coleman');
console.log(`Partnership: ${inst2.institution}`);

const lab1 = labPartnerships.registerLab('Analytical Solutions Lab', 'ISO 17025', 'JSON API');
labPartnerships.recordIngestion(lab1.id, 1500);
console.log(`Lab: ${lab1.labName} — ${lab1.apiKey.substring(0, 12)}...`);

const lab2 = labPartnerships.registerLab('Pacific Cannabis Testing', 'ISO 17025, DEA', 'HL7');
labPartnerships.recordIngestion(lab2.id, 3200);
console.log(`Lab: ${lab2.labName} — ${lab2.apiKey.substring(0, 12)}...`);

const { consensus, rSquared, results } = reproducibilityOrch.runMultiLabValidation();
console.log(`\nMulti-lab reproducibility: ${consensus ? '✅ CONSENSUS' : '❌ FAILED'} (R² = ${rSquared.toFixed(4)})`);
results.forEach(r => console.log(`  ${r.labName}: yield=${r.predictedYield.toFixed(1)}% ${r.withinTolerance ? '✓' : '✗'}`));

const stats = governance.getStats();
console.log(`\nGovernance: ${stats.advisors} advisors, ${stats.contributors} contributors, ${stats.partnerships} partnerships`);

const labStats = labPartnerships.getPartnershipStats() as any;
console.log(`Lab network: ${labStats.active_labs} active labs, ${labStats.total_samples} total samples`);
