// Slug math for store URLs ("Sita's Fashion" -> "sitas-fashion").
// Pure + unit-tested: this is the base of the onboarding slug suggestion.

const MAX_SLUG = 48; // Store.slug lives in a varchar-ish unique column; keep URLs short.

/** Turn any free-text shop name into a URL-safe kebab-case slug. */
export function slugify(input: string): string {
  const cleaned = input
    .normalize("NFD") // split base letter + diacritic
    .replace(/[̀-ͯ]/g, "") // drop diacritics (é -> e)
    .toLowerCase()
    .replace(/['’]/g, "") // strip apostrophes before kebab-casing
    .replace(/[^a-z0-9]+/g, "-") // everything else becomes "-"
    .replace(/^-+|-+$/g, "") // no leading/trailing "-"
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, "");
  return cleaned || "shop";
}