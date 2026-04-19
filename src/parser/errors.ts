import type { ParsedVariant } from "./types.js";

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
