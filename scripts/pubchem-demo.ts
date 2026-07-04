import { pubchem } from '../integration/pubchem.service.ts';

async function main() {
  console.log('=== Fetching Real Cannabinoid Properties from PubChem (NIH) ===\n');
  const results = await pubchem.getAllCannabinoidProperties();
  console.log(`\nRetrieved ${results.length} of ${17} cannabinoids from PubChem\n`);

  if (results.length >= 2) {
    const thc = results.find(r => r.name.includes('Delta-9-THC'));
    const cbd = results.find(r => r.name.includes('CBD (Cannabidiol)'));
    const cbga = results.find(r => r.name.includes('CBGA'));
    const cbn = results.find(r => r.name.includes('CBN'));

    if (thc && cbd) {
      console.log('=== Cannabinoid Comparison (real PubChem data) ===');
      console.log('');
      console.log('Property                  THC              CBD              Difference');
      console.log('──────────────────────────────────────────────────────────────────────────');
      console.log(`Molecular Weight (g/mol)  ${String(thc.molecularWeight).padStart(8)}     ${String(cbd.molecularWeight).padStart(8)}     ${(thc.molecularWeight - cbd.molecularWeight).toFixed(1).padStart(9)}`);
      console.log(`XLogP (lipophilicity)     ${String(thc.xlogP).padStart(8)}     ${String(cbd.xlogP).padStart(8)}     ${(thc.xlogP - cbd.xlogP).toFixed(1).padStart(9)}`);
      console.log(`TPSA (polar surface)      ${String(thc.tpsa || 0).padStart(8)}     ${String(cbd.tpsa || 0).padStart(8)}     ${((thc.tpsa || 0) - (cbd.tpsa || 0)).toFixed(1).padStart(9)}`);
      console.log(`H-Bond Donors             ${String(thc.hBondDonors || 0).padStart(8)}     ${String(cbd.hBondDonors || 0).padStart(8)}     ${((thc.hBondDonors || 0) - (cbd.hBondDonors || 0)).toFixed(0).padStart(9)}`);
      console.log(`H-Bond Acceptors          ${String(thc.hBondAcceptors || 0).padStart(8)}     ${String(cbd.hBondAcceptors || 0).padStart(8)}     ${((thc.hBondAcceptors || 0) - (cbd.hBondAcceptors || 0)).toFixed(0).padStart(9)}`);

      const sim = pubchem.computeSimilarity(thc, cbd);
      console.log(`\nPhysicochemical similarity: ${(sim * 100).toFixed(1)}%`);
      console.log('(100% = identical properties, higher = more similar)');
    }

    console.log('\n=== Cannabinoid Property Matrix ===');
    console.log('Name                      MW      LogP    TPSA    Donors  Acceptors  SMILES (truncated)');
    console.log('────────────────────────────────────────────────────────────────────────────────────────');
    for (const r of results) {
      const smiles = (r.canonicalSmiles || '').substring(0, 45);
      const mw = r.molecularWeight.toFixed ? r.molecularWeight.toFixed(0) : r.molecularWeight;
      const lp = r.xlogP.toFixed ? r.xlogP.toFixed(1) : r.xlogP;
      const tpsa = r.tpsa !== undefined ? (r.tpsa.toFixed ? r.tpsa.toFixed(0) : r.tpsa) : '?';
      const don = r.hBondDonors !== undefined ? r.hBondDonors : '?';
      const acc = r.hBondAcceptors !== undefined ? r.hBondAcceptors : '?';
      console.log(`${r.name.padEnd(25)} ${String(mw).padStart(6)} ${String(lp).padStart(6)} ${String(tpsa).padStart(6)} ${String(don).padStart(6)} ${String(acc).padStart(8)}  ${smiles}`);
    }
  }
}

main().catch(console.error);
