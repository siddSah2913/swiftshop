// Variant (option-set) constants and input shapes. A product may carry up to
// two option groups ("Size", "Color"); each option has its own stock that gates
// availability (0 = sold out). Pure module — no DB or Next imports.

export const MAX_OPTION_GROUPS = 2;
export const MAX_OPTIONS_PER_GROUP = 10;
export const MAX_GROUP_NAME_LEN = 30;
export const MAX_OPTION_NAME_LEN = 30;
export const MAX_OPTION_STOCK = 1_000_000;

/** Admin form shape — one group with its options (name + stock). */
export type OptionSetInput = {
  name: string;
  options: { name: string; stock: number }[];
};

/** DB-shaped group, as `placeOrder`/cart read from Prisma (with ids). */
export type StoredOption = { id: string; name: string; stock: number };
export type StoredOptionGroup = { id: string; name: string; options: StoredOption[] };