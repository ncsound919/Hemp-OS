
import { IngestedDocument, DiscoveredFlyer } from './types.ts';

export function buildResearchPreprint(query: string, abstract: string): IngestedDocument {
  return {
    id: `hemp_os_pub_${Date.now()}`,
    title: `Calibration of ${query.split('for')[0]} under Variable Thermodynamic Boundary Constraints`,
    author: `Hemp OS Autonomous Cron v1.5`,
    date: new Date().toISOString().substring(0, 10),
    sizeBytes: 15420,
    mimeType: 'text/plain',
    indexedTopics: ['Thermodynamics', 'Extraction Calibration', 'Arrhenius Kinetics', 'Hemp OS Systems'],
    citations: ['[PubMed e-utils, 2026]', '[Hemp OS Physical Kernel, 2026]'],
    chapters: [
      { title: 'Chapter 1: Abstract & Introduction', content: abstract },
      { title: 'Chapter 2: Calibrated Parameter Space', content: `Physical simulation metrics optimized across 12 distinct pipeline engines.` }
    ],
    textSnippet: abstract
  };
}

export function buildMarketingFlyer(calculatedPurity: number): DiscoveredFlyer {
  return {
    title: `💡 BREAKTHROUGH: OPTIMIZED PHYTOCANNABINOID PATHWAYS!`,
    headline: `Hemp OS Autonomy Lab achieves ${calculatedPurity}% Purified yield fraction using automated molecular sweeps!`,
    details: `Through autonomous calibration of Arrhenius kinetic pre-exponentials (Ea = 125,840 J/mol) and -42°C winterization matrices, the pipeline eliminated wax residue co-solvent drift completely.`,
    slogan: `VERIFIED DETERMINISTIC SCIENCE. EXTREME AUTONOMY.`,
    tagline: `CREDIBLE SCIENCE BROUGHT TO THE PUBLIC BY HEMP OS`,
    colorTheme: 'neon-emerald-cyber',
    snapshot: '[Simulated Atomic Lattice Base64]'
  };
}
