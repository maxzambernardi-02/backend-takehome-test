import type { ParsedVariant } from "../parser/index.js";

export interface Individual {
  readonly id: string;
}

export type CreateIndividualResult =
  | { readonly ok: true; readonly individual: Individual }
  | { readonly ok: false; readonly reason: "already_exists" };

/**
 * Storage abstraction for individuals and their genetic data.
 *
 * The API depends only on this interface so the backing store (in-memory,
 * SQLite, etc.) can be swapped without touching HTTP handlers.
 *
 * Only the methods required for the current endpoint slice are defined today;
 * genetic-data methods will be added when the upload endpoint lands.
 */
export interface Store {
  createIndividual(id: string): CreateIndividualResult;
  listIndividualIds(): string[];
}

export type { ParsedVariant };
