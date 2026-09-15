// Validate a customer's chosen option ids against a product's live option
// groups. Called at cart read and at order time — the cookie is intent, not a
// trust boundary; options are re-checked against the DB like products are.

import type { StoredOptionGroup } from "./types";

// Re-exported so `validate.test.ts` (which imports StoredOptionGroup from
// "./validate") typechecks. Tasks 2–5 consume only validateSelection/SelectionResult.
export type { StoredOptionGroup } from "./types";

export type SelectionFailure =
  | "unknown-option"
  | "duplicate-group"
  | "incomplete"
  | "sold-out";

export type SelectionResult =
  | { ok: true; optionNames: string[] }
  | { ok: false; reason: SelectionFailure };

export function validateSelection(
  groups: StoredOptionGroup[],
  optionIds: string[],
): SelectionResult {
  if (groups.length === 0) {
    return optionIds.length === 0
      ? { ok: true, optionNames: [] }
      : { ok: false, reason: "unknown-option" };
  }
  if (optionIds.length !== groups.length) {
    return { ok: false, reason: "incomplete" };
  }

  const byId = new Map<string, { groupId: string; option: { name: string; stock: number } }>();
  for (const g of groups) {
    for (const o of g.options) byId.set(o.id, { groupId: g.id, option: o });
  }

  const seenGroups = new Set<string>();
  const names: string[] = [];
  for (const id of optionIds) {
    const hit = byId.get(id);
    if (!hit) return { ok: false, reason: "unknown-option" };
    if (seenGroups.has(hit.groupId)) return { ok: false, reason: "duplicate-group" };
    if (hit.option.stock <= 0) return { ok: false, reason: "sold-out" };
    seenGroups.add(hit.groupId);
    names.push(hit.option.name);
  }
  return { ok: true, optionNames: names };
}