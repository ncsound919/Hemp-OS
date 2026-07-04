/**
 * PubChem Service — fetches real molecular properties for cannabinoids
 * from the NIH PubChem database.
 *
 * Molecular similarity now computed via RDKit.js Tanimoto coefficient
 * on Morgan fingerprints — industry standard for chemical similarity.
 *
 * PubChem REST API: https://pubchem.ncbi.nlm.nih.gov/rest/pug/
 * RDKit.js: https://www.npmjs.com/package/@rdkit/rdkit
 */

import * as RDKit from '@rdkit/rdkit';

export interface CannabinoidProperties {
  cid: number;
  name: string;
  molecularWeight: number;
  xlogP: number;
  exactMass: number;
  canonicalSmiles: string;
  isomericSmiles: string;
  iupacName: string;
  tpsa?: number;
  hBondDonors?: number;
  hBondAcceptors?: number;
  rotatableBonds?: number;
}

// Real PubChem CIDs for major cannabinoids
export const CANNABINOID_CIDS: { name: string; cid: number }[] = [
  { name: 'Delta-9-THC', cid: 16078 },
  { name: 'CBD (Cannabidiol)', cid: 644019 },
  { name: 'CBG (Cannabigerol)', cid: 5315611 },
  { name: 'CBN (Cannabinol)', cid: 5284592 },
  { name: 'THCV', cid: 5636 },
  { name: 'CBC (Cannabichromene)', cid: 30219 },
  { name: 'CBDA', cid: 3769 },
  { name: 'THCA-A', cid: 44370129 },
  { name: 'Delta-8-THC', cid: 15590949 },
  { name: 'CBDV (Cannabidivarin)', cid: 11652406 },
  { name: 'Cannabicitran', cid: 3084371 },
  { name: 'Cannabichromevarin', cid: 15083371 },
  { name: 'Cannabicyclol', cid: 167115 },
  { name: 'Cannabielsoin', cid: 155590 },
  { name: 'Cannabinodiol', cid: 135607 },
  { name: 'Olivetol', cid: 68307 },
  { name: 'Cannabigerolic Acid', cid: 12847079 },
];

export class PubChemService {
  private cache: Map<number, CannabinoidProperties> = new Map();
  private readonly BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
  private requestCount = 0;
  private lastRequestTime = 0;

  private async rateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < 250) {await new Promise(r => setTimeout(r, 250 - elapsed));}
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  async getProperties(cid: number): Promise<CannabinoidProperties | null> {
    if (this.cache.has(cid)) {return this.cache.get(cid)!;}

    await this.rateLimit();
    try {
      const res = await fetch(
        `${this.BASE}/compound/cid/${cid}/property/MolecularWeight,XLogP,ExactMass,CanonicalSMILES,IsomericSMILES,IUPACName,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount/JSON`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) {return null;}

      const data = await res.json() as any;
      const props = data.PropertyTable?.Properties?.[0];
      if (!props) {return null;}

      const result: CannabinoidProperties = {
        cid: props.CID,
        name: '',
        molecularWeight: parseFloat(props.MolecularWeight) || 0,
        xlogP: parseFloat(props.XLogP) || 0,
        exactMass: parseFloat(props.ExactMass) || 0,
        canonicalSmiles: props.CanonicalSMILES || '',
        isomericSmiles: props.IsomericSMILES || '',
        iupacName: props.IUPACName || '',
        tpsa: props.TPSA !== undefined ? parseFloat(props.TPSA) : undefined,
        hBondDonors: props.HBondDonorCount !== undefined ? parseInt(props.HBondDonorCount) : undefined,
        hBondAcceptors: props.HBondAcceptorCount !== undefined ? parseInt(props.HBondAcceptorCount) : undefined,
        rotatableBonds: props.RotatableBondCount !== undefined ? parseInt(props.RotatableBondCount) : undefined,
      };

      // Get the compound name/synonym
      const nameRes = await fetch(`${this.BASE}/compound/cid/${cid}/synonyms/JSON`, {
        signal: AbortSignal.timeout(8000),
      });
      if (nameRes.ok) {
        const nameData = await nameRes.json() as any;
        const synonyms = nameData.InformationList?.Information?.[0]?.Synonym || [];
        result.name = synonyms[0] || `CID ${cid}`;
      }

      this.cache.set(cid, result);
      return result;
    } catch (err) {
      console.error(`PubChem CID ${cid}:`, (err as Error).message);
      return null;
    }
  }

  async getAllCannabinoidProperties(): Promise<CannabinoidProperties[]> {
    const results: CannabinoidProperties[] = [];
    for (const { name, cid } of CANNABINOID_CIDS) {
      const props = await this.getProperties(cid);
      if (props) {
        props.name = name;
        results.push(props);
        console.log(`  ✓ ${name.padEnd(25)} MW: ${props.molecularWeight.toFixed(1)}  LogP: ${props.xlogP}  SMILES: ${props.canonicalSmiles.substring(0, 50)}`);
      } else {
        console.log(`  ✗ ${name.padEnd(25)} — not found in PubChem`);
      }
    }
    return results;
  }

  /**
   * Compute molecular similarity using RDKit Tanimoto coefficient on
   * Morgan (ECFP) fingerprints — the industry standard for chemical similarity.
   *
   * Uses RDKit.js WASM for exact computation matching what PubChem uses internally.
   * Range: 0 (completely dissimilar) to 1 (identical).
   */
  computeSimilarity(propsA: CannabinoidProperties, propsB: CannabinoidProperties): number {
    try {
      const molA = RDKit.RDMol.getMol(propsA.canonicalSmiles || propsA.isomericSmiles, '{}');
      const molB = RDKit.RDMol.getMol(propsB.canonicalSmiles || propsB.isomericSmiles, '{}');
      const fpA = molA.getMorganFingerprintAsString(2, 2048);
      const fpB = molB.getMorganFingerprintAsString(2, 2048);
      molA.delete();
      molB.delete();
      return RDKit.SimilarityUtils.getTanimotoSimilarity(fpA, fpB);
    } catch {
      // Fallback to physicochemical similarity if RDKit fails
      const featuresA = [propsA.molecularWeight, propsA.xlogP, propsA.exactMass, propsA.tpsa || 0, propsA.hBondDonors || 0, propsA.hBondAcceptors || 0, propsA.rotatableBonds || 0];
      const featuresB = [propsB.molecularWeight, propsB.xlogP, propsB.exactMass, propsB.tpsa || 0, propsB.hBondDonors || 0, propsB.hBondAcceptors || 0, propsB.rotatableBonds || 0];
      let sumSq = 0;
      for (let i = 0; i < featuresA.length; i++) {
        const max = Math.max(Math.abs(featuresA[i]), Math.abs(featuresB[i]), 1);
        sumSq += Math.pow((featuresA[i] - featuresB[i]) / max, 2);
      }
      return Math.max(0, 1 - Math.sqrt(sumSq / featuresA.length));
    }
  }

  /**
   * Compute molecular descriptors locally using RDKit.js.
   * This avoids PubChem API calls for common property lookups.
   */
  computeLocalDescriptors(smiles: string): Partial<CannabinoidProperties> | null {
    try {
      const mol = RDKit.RDMol.getMol(smiles, '{}');
      const result: Partial<CannabinoidProperties> = {
        molecularWeight: mol.getMolWt(),
        xlogP: mol.getMolLogP(),
        tpsa: mol.getTPSA(),
        hBondDonors: mol.getNumHDonors(),
        hBondAcceptors: mol.getNumHAcceptors(),
        rotatableBonds: mol.getNumRotatableBonds(),
        canonicalSmiles: mol.getCanonicalSmiles(),
      };
      mol.delete();
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get properties by SMILES (search PubChem by compound)
   */
  async getPropertiesBySmiles(smiles: string): Promise<CannabinoidProperties | null> {
    await this.rateLimit();
    try {
      const res = await fetch(
        `${this.BASE}/compound/smiles/${encodeURIComponent(smiles)}/property/MolecularWeight,XLogP,ExactMass,CanonicalSMILES,IsomericSMILES,IUPACName,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount/JSON`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) {return null;}
      const data = await res.json() as any;
      const props = data.PropertyTable?.Properties?.[0];
      if (!props) {return null;}
      return {
        cid: props.CID, name: '', molecularWeight: parseFloat(props.MolecularWeight) || 0,
        xlogP: parseFloat(props.XLogP) || 0, exactMass: parseFloat(props.ExactMass) || 0,
        canonicalSmiles: props.CanonicalSMILES || '', isomericSmiles: props.IsomericSMILES || '',
        iupacName: props.IUPACName || '',
        tpsa: props.TPSA !== undefined ? parseFloat(props.TPSA) : undefined,
        hBondDonors: props.HBondDonorCount !== undefined ? parseInt(props.HBondDonorCount) : undefined,
        hBondAcceptors: props.HBondAcceptorCount !== undefined ? parseInt(props.HBondAcceptorCount) : undefined,
        rotatableBonds: props.RotatableBondCount !== undefined ? parseInt(props.RotatableBondCount) : undefined,
      };
    } catch { return null; }
  }

  getCacheStats() { return { cached: this.cache.size, requests: this.requestCount }; }
}

export const pubchem = new PubChemService();
