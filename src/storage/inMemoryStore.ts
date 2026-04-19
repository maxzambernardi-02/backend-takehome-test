import type {
  CreateIndividualResult,
  GetVariantsResult,
  Individual,
  ParsedVariant,
  SaveVariantsResult,
  Store,
} from "./types.js";

/**
 * Non-persistent Store implementation. State lives in the Node process and is
 * lost on restart. Used for the take-home; production would use a durable
 * backend behind the same Store interface.
 */
export function createInMemoryStore(): Store {
  const individualsById = new Map<string, Individual>();
  const variantsByIndividualId = new Map<string, ParsedVariant[]>();

  return {
    createIndividual(id: string): CreateIndividualResult {
      if (individualsById.has(id)) {
        return { ok: false, reason: "already_exists" };
      }
      const individual: Individual = { id };
      individualsById.set(id, individual);
      variantsByIndividualId.set(id, []);
      return { ok: true, individual };
    },

    listIndividualIds(): string[] {
      return Array.from(individualsById.keys());
    },

    hasIndividual(id: string): boolean {
      return individualsById.has(id);
    },

    saveVariants(individualId, variants): SaveVariantsResult {
      if (!individualsById.has(individualId)) {
        return { ok: false, reason: "individual_not_found" };
      }
      variantsByIndividualId.set(individualId, [...variants]);
      return { ok: true, count: variants.length };
    },

    getVariants(individualId, variantIds): GetVariantsResult {
      if (!individualsById.has(individualId)) {
        return { ok: false, reason: "individual_not_found" };
      }
      const all = variantsByIndividualId.get(individualId) ?? [];
      if (variantIds === undefined) {
        return { ok: true, variants: [...all] };
      }
      return {
        ok: true,
        variants: all.filter((v) => variantIds.has(v.variantId)),
      };
    },
  };
}
