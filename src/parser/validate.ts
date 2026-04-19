import { FIELD_HUMAN_NAME, NUCLEOTIDES } from "./constants.js";
import {
  err,
  ok,
  type Chromosome,
  type Nucleotide,
  type ParsedVariant,
  type Result,
} from "./types.js";
import type { ColumnIndexByField } from "./header.js";

const INTEGER_RE = /^\d+$/;

const invalid = (
  line: number,
  field: keyof ParsedVariant,
  rawValue: string,
  message: string,
): Result<never> =>
  err({
    kind: "field_invalid",
    line,
    field: FIELD_HUMAN_NAME[field],
    rawValue,
    message,
  });

export function validateVariantId(
  raw: string,
  line: number,
): Result<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return invalid(line, "variantId", raw, "Variant ID must be a non-empty string");
  }
  return ok(trimmed);
}

export function validateChromosome(
  raw: string,
  line: number,
): Result<Chromosome> {
  const trimmed = raw.trim();
  if (trimmed === "X" || trimmed === "Y") {
    return ok(trimmed);
  }
  if (INTEGER_RE.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    if (n >= 1 && n <= 22) {
      return ok(n as Chromosome);
    }
  }
  return invalid(
    line,
    "chromosome",
    raw,
    "Chromosome must be an integer 1..22 or exactly 'X' or 'Y'",
  );
}

export function validatePosition(raw: string, line: number): Result<number> {
  const trimmed = raw.trim();
  if (!INTEGER_RE.test(trimmed)) {
    return invalid(
      line,
      "position",
      raw,
      "Position must be a non-negative integer (no decimals, no exponent)",
    );
  }
  const n = Number.parseInt(trimmed, 10);
  if (n <= 0) {
    return invalid(line, "position", raw, "Position must be greater than 0");
  }
  if (!Number.isSafeInteger(n)) {
    return invalid(
      line,
      "position",
      raw,
      "Position exceeds safe integer range",
    );
  }
  return ok(n);
}

export function validateAllele(
  raw: string,
  line: number,
  field: "referenceAllele" | "alternateAllele",
): Result<Nucleotide> {
  const trimmed = raw.trim();
  if (trimmed.length !== 1 || !NUCLEOTIDES.has(trimmed as Nucleotide)) {
    return invalid(
      line,
      field,
      raw,
      `${FIELD_HUMAN_NAME[field]} must be a single character in {A,C,G,T}`,
    );
  }
  return ok(trimmed as Nucleotide);
}

export function validateFrequency(
  raw: string,
  line: number,
): Result<number> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return invalid(
      line,
      "alternateAlleleFrequency",
      raw,
      "Alternate allele frequency is required",
    );
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    return invalid(
      line,
      "alternateAlleleFrequency",
      raw,
      "Alternate allele frequency must be a finite number in [0, 1]",
    );
  }
  return ok(n);
}

/**
 * Assemble and validate a single body row using the header's column map.
 * Returns a ParsedVariant on success; fails fast on the first invalid field.
 */
export function assembleRow(
  cells: readonly string[],
  line: number,
  columnIndexByField: ColumnIndexByField,
): Result<ParsedVariant> {
  const variantIdResult = validateVariantId(
    cells[columnIndexByField.variantId] ?? "",
    line,
  );
  if (!variantIdResult.ok) return variantIdResult;

  const chromosomeResult = validateChromosome(
    cells[columnIndexByField.chromosome] ?? "",
    line,
  );
  if (!chromosomeResult.ok) return chromosomeResult;

  const positionResult = validatePosition(
    cells[columnIndexByField.position] ?? "",
    line,
  );
  if (!positionResult.ok) return positionResult;

  const refResult = validateAllele(
    cells[columnIndexByField.referenceAllele] ?? "",
    line,
    "referenceAllele",
  );
  if (!refResult.ok) return refResult;

  const altResult = validateAllele(
    cells[columnIndexByField.alternateAllele] ?? "",
    line,
    "alternateAllele",
  );
  if (!altResult.ok) return altResult;

  if (refResult.value === altResult.value) {
    return invalid(
      line,
      "alternateAllele",
      altResult.value,
      "Alternate allele must differ from reference allele",
    );
  }

  const freqResult = validateFrequency(
    cells[columnIndexByField.alternateAlleleFrequency] ?? "",
    line,
  );
  if (!freqResult.ok) return freqResult;

  return ok({
    variantId: variantIdResult.value,
    chromosome: chromosomeResult.value,
    position: positionResult.value,
    referenceAllele: refResult.value,
    alternateAllele: altResult.value,
    alternateAlleleFrequency: freqResult.value,
  });
}
