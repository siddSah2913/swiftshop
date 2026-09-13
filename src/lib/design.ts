// Design-page constants. Plain module (NO "use server" directive):
// a "use server" file may only export async functions (Next 16 enforces this
// at build AND in the TS editor rule), so client-facing consts live here and
// design-form.tsx imports them from this module.

export const TEMPLATES = ["clothing", "electronics", "general"] as const;

export const COLOR_PRESETS = [
  "#0F766E", "#4338CA", "#B45309", "#BE123C",
  "#A21CAF", "#0891B2", "#4D7C0F", "#52525B", "#B91C1C",
] as const;