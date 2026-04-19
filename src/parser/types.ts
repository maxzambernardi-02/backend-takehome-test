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

export type ParseErrorKind =
  | "empty_file"
  | "missing_header_hash"
  | "header_unknown_column"
  | "header_duplicate_column"
  | "header_missing_column"
  | "row_wrong_cell_count"
  | "row_blank_line"
  | "row_duplicate_variant_id"
  | "field_invalid";

export interface ParseError {
  readonly kind: ParseErrorKind;
  readonly line: number;
  readonly field?: string;
  readonly rawValue?: string;
  readonly message: string;
}

export type ParseSanoResult =
  | { readonly ok: true; readonly variants: ParsedVariant[] }
  | { readonly ok: false; readonly error: ParseError };

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ParseError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = (error: ParseError): Result<never> => ({ ok: false, error });
