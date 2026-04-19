import { HEADER_LABEL_TO_FIELD, REQUIRED_FIELDS } from "./constants.js";
import { err, ok, type Result } from "./errors.js";
import type { LogicalField } from "./types.js";

export type ColumnIndexByField = Readonly<Record<LogicalField, number>>;

/**
 * Parse the first line of a .sano file and produce a mapping from logical
 * field name to column index in the body rows.
 *
 * Rules enforced:
 *  - The FIRST character of the line must be '#'. Exactly one '#' is stripped.
 *  - Labels are matched by exact string (after trim). No aliases, no case folding.
 *  - All six required labels must be present, with no duplicates and no extras.
 */
export function parseHeader(
  headerLine: string,
  lineNo: number,
): Result<ColumnIndexByField> {
  if (headerLine.length === 0 || headerLine[0] !== "#") {
    return err({
      kind: "missing_header_hash",
      line: lineNo,
      message: "Header line must start with '#'",
    });
  }

  const withoutHash = headerLine.slice(1);
  const rawLabels = withoutHash.split(",").map((cell) => cell.trim());

  const columnIndexByField: Partial<Record<LogicalField, number>> = {};
  const seenLabels = new Set<string>();

  for (let i = 0; i < rawLabels.length; i++) {
    const label = rawLabels[i] ?? "";

    if (seenLabels.has(label)) {
      return err({
        kind: "header_duplicate_column",
        line: lineNo,
        rawValue: label,
        message: `Duplicate header column: "${label}"`,
      });
    }
    seenLabels.add(label);

    const field = HEADER_LABEL_TO_FIELD[label];
    if (!field) {
      return err({
        kind: "header_unknown_column",
        line: lineNo,
        rawValue: label,
        message: `Unknown header column: "${label}"`,
      });
    }

    columnIndexByField[field] = i;
  }

  for (const field of REQUIRED_FIELDS) {
    if (columnIndexByField[field] === undefined) {
      return err({
        kind: "header_missing_column",
        line: lineNo,
        field,
        message: `Missing required header column for field "${field}"`,
      });
    }
  }

  return ok(columnIndexByField as ColumnIndexByField);
}

export function headerColumnCount(map: ColumnIndexByField): number {
  return REQUIRED_FIELDS.length;
}
