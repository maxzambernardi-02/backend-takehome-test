import { REQUIRED_FIELDS } from "./constants.js";
import { parseHeader } from "./header.js";
import { assembleRow } from "./validate.js";
import type { ParsedVariant, ParseSanoResult } from "./types.js";

/**
 * Parse the full contents of a .sano file.
 *
 * Design decisions (documented in the plan):
 *  - Input is a UTF-8 decoded string; the API layer is responsible for decoding bytes.
 *  - Fail-fast: return the first error encountered.
 *  - Blank-line policy: trailing whitespace-only lines are skipped; any
 *    whitespace-only line between rows is an error.
 *  - Simple CSV: split on ','. Embedded commas in values are not supported.
 *  - Variant ID uniqueness is enforced within a single file.
 */
export function parseSano(contents: string): ParseSanoResult {
  const normalized = contents.replace(/\r\n?/g, "\n");
  const rawLines = normalized.split("\n");

  let lastNonBlankIndex = rawLines.length - 1;
  while (lastNonBlankIndex >= 0 && (rawLines[lastNonBlankIndex] ?? "").trim() === "") {
    lastNonBlankIndex--;
  }

  if (lastNonBlankIndex < 0) {
    return {
      ok: false,
      error: {
        kind: "empty_file",
        line: 1,
        message: "File is empty",
      },
    };
  }

  const headerLine = rawLines[0] ?? "";
  const headerResult = parseHeader(headerLine, 1);
  if (!headerResult.ok) {
    return { ok: false, error: headerResult.error };
  }
  const columnIndexByField = headerResult.value;
  const expectedCellCount = REQUIRED_FIELDS.length;

  const variants: ParsedVariant[] = [];
  const seenVariantIds = new Set<string>();

  for (let i = 1; i <= lastNonBlankIndex; i++) {
    const rawLine = rawLines[i] ?? "";
    const lineNo = i + 1;

    if (rawLine.trim() === "") {
      return {
        ok: false,
        error: {
          kind: "row_blank_line",
          line: lineNo,
          message: "Blank lines between data rows are not allowed",
        },
      };
    }

    const cells = rawLine.split(",");
    if (cells.length !== expectedCellCount) {
      return {
        ok: false,
        error: {
          kind: "row_wrong_cell_count",
          line: lineNo,
          message: `Expected ${expectedCellCount} columns but got ${cells.length}`,
        },
      };
    }

    const rowResult = assembleRow(cells, lineNo, columnIndexByField);
    if (!rowResult.ok) {
      return { ok: false, error: rowResult.error };
    }

    const variant = rowResult.value;
    if (seenVariantIds.has(variant.variantId)) {
      return {
        ok: false,
        error: {
          kind: "row_duplicate_variant_id",
          line: lineNo,
          field: "Variant ID",
          rawValue: variant.variantId,
          message: `Duplicate Variant ID "${variant.variantId}"`,
        },
      };
    }
    seenVariantIds.add(variant.variantId);
    variants.push(variant);
  }

  return { ok: true, variants };
}
