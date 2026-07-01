/**
 * Pedigree tracking and inbreeding coefficient calculation using the
 * recursive tabular (kinship/coancestry) method — standard in animal and
 * plant breeding (Wright 1922; Emik & Terrill 1949 recursive formulation).
 *
 * Limitation, stated plainly: any strain whose parents aren't in the
 * registry is treated as an unrelated, non-inbred founder. If two "founder"
 * strains are actually related landraces/clones outside your records, true
 * inbreeding will be underestimated. Only as good as the pedigree you feed it.
 */

import { Strain } from "./types";

export class Pedigree {
  private registry = new Map<string, Strain>();
  private kinshipMemo = new Map<string, number>();

  constructor(strains: Strain[] = []) {
    for (const s of strains) this.add(s);
  }

  add(strain: Strain): void {
    this.registry.set(strain.id, strain);
    this.kinshipMemo.clear(); // pedigree changed, cached kinships are stale
  }

  private key(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  /** Wright's coefficient of kinship (coancestry) between two individuals. */
  kinship(idA: string, idB: string): number {
    const k = this.key(idA, idB);
    const cached = this.kinshipMemo.get(k);
    if (cached !== undefined) return cached;

    const result = this.computeKinship(idA, idB);
    this.kinshipMemo.set(k, result);
    return result;
  }

  private computeKinship(idA: string, idB: string): number {
    const a = this.registry.get(idA);
    const b = this.registry.get(idB);

    if (!a || !b) return 0; // unknown pedigree -> treated as unrelated founder

    if (idA === idB) {
      if (a.parents.length === 2) {
        const f = this.kinship(a.parents[0], a.parents[1]);
        return 0.5 * (1 + f);
      }
      return 0.5; // founder, assumed non-inbred base population
    }

    // Recurse on whichever individual has known parents (standard tabular method).
    if (a.parents.length === 2) {
      const [p1, p2] = a.parents;
      return 0.5 * (this.kinship(p1, idB) + this.kinship(p2, idB));
    }
    if (b.parents.length === 2) {
      const [p1, p2] = b.parents;
      return 0.5 * (this.kinship(idA, p1) + this.kinship(idA, p2));
    }
    return 0; // both are founders with no shared recorded ancestry
  }

  /**
   * Inbreeding coefficient F of a (potential) offspring of parentA x parentB
   * — equal to the kinship between the two parents.
   */
  inbreedingCoefficientOfCross(parentAId: string, parentBId: string): number {
    return this.kinship(parentAId, parentBId);
  }

  /** F for an already-registered strain, using its recorded parents. */
  inbreedingCoefficientOf(strainId: string): number | null {
    const s = this.registry.get(strainId);
    if (!s || s.parents.length !== 2) return null;
    return this.kinship(s.parents[0], s.parents[1]);
  }
}
