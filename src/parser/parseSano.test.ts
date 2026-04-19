import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseSano } from "./parseSano.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const SAMPLE_PATH = resolve(repoRoot, "individual123.sano");

const VALID_HEADER =
  "#Variant ID,Chromosome,Position on chromosome,Reference allele,Alternate allele,Alternate allele frequency";

const makeFile = (header: string, rows: string[]): string =>
  [header, ...rows].join("\n");

describe("parseSano - happy path", () => {
  it("parses the golden individual123.sano file", () => {
    const contents = readFileSync(SAMPLE_PATH, "utf8");
    const result = parseSano(contents);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.variants).toEqual([
      {
        variantId: "rs12345",
        chromosome: 1,
        position: 1234567,
        referenceAllele: "A",
        alternateAllele: "G",
        alternateAlleleFrequency: 0.12,
      },
      {
        variantId: "rs67890",
        chromosome: 2,
        position: 2345678,
        referenceAllele: "C",
        alternateAllele: "T",
        alternateAlleleFrequency: 0.34,
      },
      {
        variantId: "rs13579",
        chromosome: "X",
        position: 3456789,
        referenceAllele: "G",
        alternateAllele: "A",
        alternateAlleleFrequency: 0.45,
      },
      {
        variantId: "rs24680",
        chromosome: "Y",
        position: 4567890,
        referenceAllele: "T",
        alternateAllele: "C",
        alternateAlleleFrequency: 0.67,
      },
    ]);
  });

  it("accepts a permuted header with correspondingly permuted rows", () => {
    const permutedHeader =
      "#Chromosome,Alternate allele frequency,Variant ID,Position on chromosome,Alternate allele,Reference allele";
    const contents = makeFile(permutedHeader, [
      "1,0.12,rs12345,1234567,G,A",
      "X,0.45,rs13579,3456789,A,G",
    ]);

    const result = parseSano(contents);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toEqual({
      variantId: "rs12345",
      chromosome: 1,
      position: 1234567,
      referenceAllele: "A",
      alternateAllele: "G",
      alternateAlleleFrequency: 0.12,
    });
    expect(result.variants[1]).toEqual({
      variantId: "rs13579",
      chromosome: "X",
      position: 3456789,
      referenceAllele: "G",
      alternateAllele: "A",
      alternateAlleleFrequency: 0.45,
    });
  });

  it("accepts AF boundary values 0 and 1", () => {
    const contents = makeFile(VALID_HEADER, [
      "rs1,1,100,A,G,0",
      "rs2,2,200,C,T,1",
    ]);

    const result = parseSano(contents);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.variants[0]?.alternateAlleleFrequency).toBe(0);
    expect(result.variants[1]?.alternateAlleleFrequency).toBe(1);
  });

  it("accepts a trailing newline", () => {
    const contents = makeFile(VALID_HEADER, ["rs1,1,100,A,G,0.1", ""]);
    const result = parseSano(contents);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variants).toHaveLength(1);
  });

  it("normalizes CRLF line endings", () => {
    const contents = [VALID_HEADER, "rs1,1,100,A,G,0.1"].join("\r\n");
    const result = parseSano(contents);
    expect(result.ok).toBe(true);
  });
});

describe("parseSano - header errors", () => {
  it("errors when the first character is not '#'", () => {
    const contents = makeFile(VALID_HEADER.slice(1), ["rs1,1,100,A,G,0.1"]);
    const result = parseSano(contents);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("missing_header_hash");
    expect(result.error.line).toBe(1);
  });

  it("errors on a duplicate header column", () => {
    const header =
      "#Variant ID,Chromosome,Chromosome,Reference allele,Alternate allele,Alternate allele frequency";
    const result = parseSano(makeFile(header, []));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("header_duplicate_column");
  });

  it("errors on an unknown header name", () => {
    const header =
      "#Variant ID,Chromosome,Position on chromosome,Reference allele,Alternate allele,Unknown field";
    const result = parseSano(makeFile(header, []));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("header_unknown_column");
  });

  it("errors on a missing required column (fewer than 6)", () => {
    const header =
      "#Variant ID,Chromosome,Position on chromosome,Reference allele,Alternate allele";
    const result = parseSano(makeFile(header, []));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("header_missing_column");
  });

  it("errors on empty file", () => {
    expect(parseSano("").ok).toBe(false);
    expect(parseSano("\n\n").ok).toBe(false);
  });
});

describe("parseSano - row errors", () => {
  it("errors when a row has the wrong cell count", () => {
    const contents = makeFile(VALID_HEADER, ["rs1,1,100,A,G"]);
    const result = parseSano(contents);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("row_wrong_cell_count");
    expect(result.error.line).toBe(2);
  });

  it("errors on a blank line between rows", () => {
    const contents = makeFile(VALID_HEADER, [
      "rs1,1,100,A,G,0.1",
      "",
      "rs2,2,200,C,T,0.2",
    ]);
    const result = parseSano(contents);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("row_blank_line");
    expect(result.error.line).toBe(3);
  });

  it("errors on duplicate Variant IDs within a file", () => {
    const contents = makeFile(VALID_HEADER, [
      "rs1,1,100,A,G,0.1",
      "rs1,2,200,C,T,0.2",
    ]);
    const result = parseSano(contents);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("row_duplicate_variant_id");
    expect(result.error.line).toBe(3);
    expect(result.error.rawValue).toBe("rs1");
  });

  it("errors on ref === alt", () => {
    const contents = makeFile(VALID_HEADER, ["rs1,1,100,A,A,0.1"]);
    const result = parseSano(contents);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("field_invalid");
    expect(result.error.field).toBe("Alternate allele");
  });
});

describe("parseSano - field validation", () => {
  const invalidCases: Array<[string, string]> = [
    ["bad chromosome 23", "rs1,23,100,A,G,0.1"],
    ["bad chromosome M", "rs1,M,100,A,G,0.1"],
    ["bad chromosome lowercase x", "rs1,x,100,A,G,0.1"],
    ["bad chromosome empty", "rs1,,100,A,G,0.1"],
    ["bad position 0", "rs1,1,0,A,G,0.1"],
    ["bad position negative", "rs1,1,-1,A,G,0.1"],
    ["bad position decimal", "rs1,1,1.5,A,G,0.1"],
    ["bad position exponent", "rs1,1,1e3,A,G,0.1"],
    ["bad ref allele AA", "rs1,1,100,AA,G,0.1"],
    ["bad ref allele N", "rs1,1,100,N,G,0.1"],
    ["bad ref allele empty", "rs1,1,100,,G,0.1"],
    ["bad AF > 1", "rs1,1,100,A,G,1.000001"],
    ["bad AF < 0", "rs1,1,100,A,G,-0.0001"],
    ["bad AF non-numeric", "rs1,1,100,A,G,abc"],
    ["bad AF NaN literal", "rs1,1,100,A,G,NaN"],
    ["empty variant id", ",1,100,A,G,0.1"],
  ];

  for (const [name, row] of invalidCases) {
    it(`rejects ${name}`, () => {
      const result = parseSano(makeFile(VALID_HEADER, [row]));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("field_invalid");
      expect(result.error.line).toBe(2);
    });
  }
});
