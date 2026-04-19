export type Nucleotide = "A" | "C" | "G" | "T";

export type AutosomeNumber =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22;

export type Chromosome = AutosomeNumber | "X" | "Y";

export interface ParsedVariant {
  readonly variantId: string;
  readonly chromosome: Chromosome;
  readonly position: number;
  readonly referenceAllele: Nucleotide;
  readonly alternateAllele: Nucleotide;
  readonly alternateAlleleFrequency: number;
}

export type LogicalField =
  | "variantId"
  | "chromosome"
  | "position"
  | "referenceAllele"
  | "alternateAllele"
  | "alternateAlleleFrequency";
