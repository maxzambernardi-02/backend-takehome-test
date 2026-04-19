import type { ParsedVariant } from "../parser/index.js";

export interface Individual {
  readonly id: string;
}

export type CreateIndividualResult =
  | { readonly ok: true; readonly individual: Individual }
  | { readonly ok: false; readonly reason: "already_exists" };

export type SaveVariantsResult =
  | { readonly ok: true; readonly count: number }
  | { readonly ok: false; readonly reason: "individual_not_found" };

export type GetVariantsResult =
  | { readonly ok: true; readonly variants: ParsedVariant[] }
  | { readonly ok: false; readonly reason: "individual_not_found" };

/**
 * Storage abstraction for individuals and their genetic data.
 *
 * The API depends only on this interface so the backing store (in-memory,
 * SQLite, etc.) can be swapped without touching HTTP handlers.
 */
export interface Store {
  createIndividual(id: string): CreateIndividualResult;
  listIndividualIds(): string[];
  hasIndividual(id: string): boolean;
  /**
   * Replace all genetic data for the given individual with the supplied list.
   * Replacement is simpler to reason about than merge for this take-home;
   * if partial uploads were required, we would add a merge method behind the
   * same interface.
   */
  saveVariants(individualId: string, variants: ParsedVariant[]): SaveVariantsResult;
  /**
   * Return all stored variants for the individual, optionally filtered to a
   * specific set of variant IDs. An empty filter set returns no variants.
   */
  getVariants(individualId: string, variantIds?: ReadonlySet<string>): GetVariantsResult;
}

export type { ParsedVariant };
