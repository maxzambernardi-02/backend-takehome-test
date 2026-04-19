import type { LogicalField, Nucleotide } from "./types.js";

export const HEADER_LABEL_TO_FIELD: Readonly<Record<string, LogicalField>> = {
  "Variant ID": "variantId",
  "Chromosome": "chromosome",
  "Position on chromosome": "position",
  "Reference allele": "referenceAllele",
  "Alternate allele": "alternateAllele",
  "Alternate allele frequency": "alternateAlleleFrequency",
};

export const REQUIRED_FIELDS: readonly LogicalField[] = [
  "variantId",
  "chromosome",
  "position",
  "referenceAllele",
  "alternateAllele",
  "alternateAlleleFrequency",
];

export const NUCLEOTIDES: ReadonlySet<Nucleotide> = new Set<Nucleotide>([
  "A",
  "C",
  "G",
  "T",
]);

export const FIELD_HUMAN_NAME: Readonly<Record<LogicalField, string>> = {
  variantId: "Variant ID",
  chromosome: "Chromosome",
  position: "Position on chromosome",
  referenceAllele: "Reference allele",
  alternateAllele: "Alternate allele",
  alternateAlleleFrequency: "Alternate allele frequency",
};
