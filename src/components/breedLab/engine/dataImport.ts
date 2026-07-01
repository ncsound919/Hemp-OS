/**
 * Lab-data import: turns real CSV/HPLC exports into TraitStat records.
 * Deliberately does NOT scrape or fabricate data — this module only
 * structures and validates what the user actually measured.
 *
 * Expected CSV shape (one row per replicate measurement, long format):
 *   strainId,trait,value,date
 *   bd-001,thc,19.8,2026-05-01
 *   bd-001,thc,20.4,2026-05-08
 *   bd-001,cbd,0.6,2026-05-01
 *
 * Long format (one measurement per row) lets you import replicate samples
 * so the engine can compute real variance and sample size instead of
 * assuming them.
 */

import { TraitStat } from "./types";
import { mean, sampleVariance } from "./stats";

export interface RawMeasurement {
  strainId: string;
  trait: string;
  value: number;
  date?: string;
}

export interface ImportResult {
  measurements: RawMeasurement[];
  errors: string[];
}

const REQUIRED_COLUMNS = ["strainid", "trait", "value"];

/** Parse a CSV string. Minimal RFC-4180-ish parser — no external deps, handles quoted fields. */
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    if (inQuotes) {
      if (c === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && csvText[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export function importLabCsv(csvText: string): ImportResult {
  const errors: string[] = [];
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { measurements: [], errors: ["CSV is empty."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missingCols = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missingCols.length > 0) {
    return {
      measurements: [],
      errors: [`Missing required column(s): ${missingCols.join(", ")}. Required: ${REQUIRED_COLUMNS.join(", ")}`],
    };
  }

  const idx = {
    strainId: header.indexOf("strainid"),
    trait: header.indexOf("trait"),
    value: header.indexOf("value"),
    date: header.indexOf("date"),
  };

  const measurements: RawMeasurement[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const lineNum = r + 1;
    const strainId = cols[idx.strainId]?.trim();
    const trait = cols[idx.trait]?.trim().toLowerCase();
    const rawValue = cols[idx.value]?.trim();
    const date = idx.date >= 0 ? cols[idx.date]?.trim() : undefined;

    if (!strainId) {
      errors.push(`Line ${lineNum}: missing strainId, row skipped.`);
      continue;
    }
    if (!trait) {
      errors.push(`Line ${lineNum}: missing trait, row skipped.`);
      continue;
    }
    const value = Number(rawValue);
    if (rawValue === undefined || rawValue === "" || Number.isNaN(value)) {
      errors.push(`Line ${lineNum}: value "${rawValue}" is not numeric, row skipped.`);
      continue;
    }
    if (value < 0) {
      errors.push(`Line ${lineNum}: negative value (${value}) for trait "${trait}" — check units, row skipped.`);
      continue;
    }
    measurements.push({ strainId, trait, value, date });
  }

  return { measurements, errors };
}

/**
 * Aggregate raw replicate measurements into TraitStat records per strain/trait.
 * Heritability is NOT computed from a single strain's replicates — replicate
 * variance within one strain/environment estimates Ve, not h^2. Heritability
 * must be supplied separately (from parent-offspring regression, published
 * cultivar data, or an explicit user assumption) via `heritabilityByTrait`.
 */
export function aggregateToTraitStats(
  measurements: RawMeasurement[],
  heritabilityByTrait: Record<string, number>,
  defaultHeritability = 0.5
): Record<string, Record<string, TraitStat>> {
  // Trait keys coming out of importLabCsv are always lowercased (see parse loop
  // above). heritabilityByTrait is user-supplied and may use any casing
  // (e.g. "floweringDays"), so normalize here or lookups silently miss and
  // fall back to defaultHeritability. Caught during audit — see AUDIT.md.
  const normalizedHeritability: Record<string, number> = {};
  for (const [k, v] of Object.entries(heritabilityByTrait)) {
    normalizedHeritability[k.toLowerCase()] = v;
  }

  const grouped = new Map<string, Map<string, number[]>>(); // strainId -> trait -> values

  for (const m of measurements) {
    if (!grouped.has(m.strainId)) grouped.set(m.strainId, new Map());
    const traitMap = grouped.get(m.strainId)!;
    if (!traitMap.has(m.trait)) traitMap.set(m.trait, []);
    traitMap.get(m.trait)!.push(m.value);
  }

  const result: Record<string, Record<string, TraitStat>> = {};
  for (const [strainId, traitMap] of grouped) {
    result[strainId] = {};
    for (const [trait, values] of traitMap) {
      result[strainId][trait] = {
        mean: mean(values),
        variance: sampleVariance(values),
        heritability: normalizedHeritability[trait] ?? defaultHeritability,
        sampleSize: values.length,
      };
    }
  }
  return result;
}
