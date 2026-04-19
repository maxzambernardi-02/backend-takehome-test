import type { CreateIndividualResult, Individual, Store } from "./types.js";

/**
 * Non-persistent Store implementation. State lives in the Node process and is
 * lost on restart. Used for the take-home; production would use a durable
 * backend behind the same Store interface.
 */
export function createInMemoryStore(): Store {
  const individualsById = new Map<string, Individual>();

  return {
    createIndividual(id: string): CreateIndividualResult {
      if (individualsById.has(id)) {
        return { ok: false, reason: "already_exists" };
      }
      const individual: Individual = { id };
      individualsById.set(id, individual);
      return { ok: true, individual };
    },

    listIndividualIds(): string[] {
      return Array.from(individualsById.keys());
    },
  };
}
