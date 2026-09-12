# Phase 1 — Onboarding + Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-up owner can create their store (name → category → city → slug), pick a template + brand look (color, logo), and manage products (quick-add single with a photo gallery, bulk-add N photos → N products, list, edit, delete).

**Architecture:** All Phase 1 work lives under the auth-guarded `/dashboard/*` shell. Server actions (Next.js Server Functions) mutate the DB through the Prisma 7 client (`@/lib/db`), each one scoped to the session owner's store via a shared `requireStore()` tenant guard. Photos are written straight to `public/uploads-original/<storeId>/` by the server action and served as plain static URLs. Pure logic (slugify, Nepal data, payload parsing, image validation) sits in `src/lib/*` and is unit-tested with vitest.

**Tech Stack:** Next.js 16.3.5 (App Router, Server Actions) · React 19.2.8 · TypeScript strict · Tailwind v4 · Prisma 7.10.0 (driver adapter) · NextAuth v5 (JWT) · Zod 4.6.2 · vitest (new, pure-logic only)

**Spec:** `docs/superpowers/specs/2026-09-13-phase1-onboarding-products-design.md`

## Global Constraints

- **Next.js 16 server actions are reachable via direct POST.** Every action MUST verify auth + ownership before touching data. Never trust that a form was the only caller.
- **`redirect()` / `notFound()` throw** — never wrap them in `try/catch`. Final `redirect()` calls go OUTSIDE the try; only throwing-away-the-action code goes inside. Same contract as Phase 0's `login/actions.ts`.
- **Server action request bodies cap at 1MB by default** (raw multipart, incl. ~10–20 KB/file overhead). The plan raises `experimental.serverActions.bodySizeLimit` (Task 3) — do not ship uploads without it.
- **Money = integers (NPR, no paisa).** `priceNpr` is `z.number().int().min(0).max(10_000_000)`, built from `Number(formData.get(...))`. Never `z.coerce.number()`, which silently turns `""` into `0`.
- **Tenant isolation in every query.** Every `storeId`-scoped read/write goes through the `requireStore()` store (Task 5). Never select/update by id without first proving ownership.
- **Prisma 7 type names.** Generated model types are `StoreModel`, `ProductModel` from `@/generated/prisma/models`; the instance `prisma` is imported from `@/lib/db`.
- **i18n key parity is a compile error.** Any key added to `src/locales/en.ts` must exist in `ne.ts` (typed `Dict`); a missing Nepali word fails `npm run build`.
- **Log policy:** `import { log } from "@/lib/log"`; `catch (e) { log("feature:action", e); return { error: t(locale, "common.error") }; }`. Never leak stack traces.
- Use the same `useActionState(state, init)` two-arg form, `pending` disable, and pre-translated `state.error` pattern as `src/components/signup-form.tsx`.
- File uploads: `accept="image/jpeg,image/png,image/webp"`, per-file ≤ 5 MB, ≤ 6 files per submission.
- **Filename generation uses `crypto.randomUUID()`** (built-in), NOT the `cuid` package — same purpose (unique, untrusted-externally), one fewer dependency. DB row ids stay Prisma `cuid()`.
- Read relevant Next 16 docs first, per `AGENTS.md`: `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `.../05-config/01-next-config-js/serverActions.md` (already verified for this plan).
- Every task ends with a commit; large tasks commit per sub-step.

---

### Task 1: vitest runner + `src/lib/slug.ts`

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add devDep `vitest`, script `"test": "vitest run"`)
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `slugify(input: string): string` — used by the onboarding slug step (Task 6).

- [ ] **Step 1: Install dev dependencies and add the test script**

Run:
```bash
npm i -D vitest
```
Then in `package.json`, under `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 2: Write the vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/slug.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and kebab-cases plain text", () => {
    expect(slugify("Sita's Fashion")).toBe("sitas-fashion");
  });
  it("strips diacritics", () => {
    expect(slugify("Göras café")).toBe("goras-cafe");
  });
  it("collapses runs of separators", () => {
    expect(slugify("A  B -- C")).toBe("a-b-c");
  });
  it("trims leading/trailing separators", () => {
    expect(slugify("_Pokhara_")).toBe("pokhara");
  });
  it("caps at 48 chars", () => {
    expect(slugify("a".repeat(60))).toHaveLength(48);
  });
  it("falls back to 'shop' when empty", () => {
    expect(slugify("   ")).toBe("shop");
    expect(slugify("!!!")).toBe("shop");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL ("Cannot find module './slug'" / `slugify` is not exported).

- [ ] **Step 5: Implement `slugify`**

Create `src/lib/slug.ts`:
```ts
// Slug math for store URLs ("Sita's Fashion" -> "sitas-fashion").
// Pure + unit-tested: this is the base of the onboarding slug suggestion.

const MAX_SLUG = 48; // Store.slug lives in a varchar-ish unique column; keep URLs short.

/** Turn any free-text shop name into a URL-safe kebab-case slug. */
export function slugify(input: string): string {
  const cleaned = input
    .normalize("NFD") // split base letter + diacritic
    .replace(/[̀-ͯ]/g, "") // drop diacritics (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // everything else becomes "-"
    .replace(/^-+|-+$/g, "") // no leading/trailing "-"
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, "");
  return cleaned || "shop";
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: 6 passed.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat(slug): add slugify + vitest runner for pure logic"
```

---

### Task 2: `src/lib/nepal.ts` — province → district data

**Files:**
- Create: `src/lib/nepal.ts`
- Test: `src/lib/nepal.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `interface Province { id: ProvinceId; districts: string[] }`, `PROVINCES: Province[]` (all 77 official districts, each in exactly one province), `type ProvinceId = "koshi" | "madhesh" | "bagmati" | "gandaki" | "lumbini" | "karnali" | "sudurpashchim"`, `ALL_DISTRICTS: string[]`. Province labels are NOT stored here — they come from i18n keys `onboarding.province.<id>` (Task 4). Consumers: onboarding city step (Task 6) and the onboarding Zod schema (Task 6).

- [ ] **Step 1: Write the failing test**

Create `src/lib/nepal.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { PROVINCES } from "./nepal";

describe("nepal.ts", () => {
  it("has all 7 provinces", () => {
    expect(PROVINCES).toHaveLength(7);
  });

  it("has exactly 77 districts, each in exactly one province", () => {
    const seen = new Set<string>();
    for (const p of PROVINCES) {
      expect(p.districts.length).toBeGreaterThan(0);
      for (const d of p.districts) {
        expect(seen.has(d)).toBe(false); // duplicate = two provinces claiming one district
        seen.add(d);
      }
    }
    expect(seen.size).toBe(77);
  });

  it("keeps province ids distinct", () => {
    const ids = PROVINCES.map((p) => p.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("sorts districts alphabetically for stable dropdown order", () => {
    for (const p of PROVINCES) {
      expect([...p.districts].sort()).toEqual(p.districts);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL ("Cannot find module './nepal'").

- [ ] **Step 3: Implement the data file**

Create `src/lib/nepal.ts`:
```ts
// Nepal's 7 provinces and their districts, used by the onboarding city step.
// Province ids are stable keys and their LABELS are localized via i18n keys
// "onboarding.province.<id>"; district names stay English in the DB (they are
// stored as Store.city) so they are consistent and sortable. See the Phase 1 spec §5.

export type ProvinceId =
  | "koshi"
  | "madhesh"
  | "bagmati"
  | "gandaki"
  | "lumbini"
  | "karnali"
  | "sudurpashchim";

export interface Province {
  id: ProvinceId;
  districts: string[];
}

// All 77 official districts, grouped by province, alphabetized within.
export const PROVINCES: Province[] = [
  {
    id: "koshi",
    districts: [
      "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang",
      "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari",
      "Taplejung", "Terhathum", "Udayapur",
    ],
  },
  {
    id: "madhesh",
    districts: [
      "Bara", "Dhanusa", "Mahottari", "Parsa", "Rautahat", "Saptari",
      "Sarlahi", "Siraha",
    ],
  },
  {
    id: "bagmati",
    districts: [
      "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu",
      "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap",
      "Rasuwa", "Sindhuli", "Sindhupalchok",
    ],
  },
  {
    id: "gandaki",
    districts: [
      "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang",
      "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun",
    ],
  },
  {
    id: "lumbini",
    districts: [
      "Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu",
      "Palpa", "Parasi", "Pyuthan", "Rolpa", "Rukum West", "Rupandehi",
    ],
  },
  {
    id: "karnali",
    districts: [
      "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu",
      "Rukum East", "Salyan", "Surkhet",
    ],
  },
  {
    id: "sudurpashchim",
    districts: [
      "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula",
      "Doti", "Kailali", "Kanchanpur",
    ],
  },
];

/** Every district name across all provinces (for the Zod union in Task 6). */
export const ALL_DISTRICTS: string[] = PROVINCES.flatMap((p) => p.districts);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nepal.ts src/lib/nepal.test.ts
git commit -m "feat(nepal): province->district data (77 districts, all 7 provinces)"
```

---

### Task 3: Upload infra + raise the server-action body limit

**Files:**
- Create: `src/lib/files.ts`
- Test: `src/lib/files.test.ts`
- Modify: `next.config.ts` (add `experimental.serverActions.bodySizeLimit`)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `MAX_FILE_BYTES = 5 * 1024 * 1024`
  - `MAX_PHOTOS_PER_SUBMISSION = 6`
  - `imageExt(mime: string): string | null` — `"image/jpeg" → "jpg"`, `"image/png" → "png"`, `"image/webp" → "webp"`, else `null`
  - `validateImageFile(file: File): string | null` — an i18n key (`"products.invalidImage"` | `"products.imageTooBig"`) or `null` when OK
  - `uploadUrl(storeId: string, filename: string): string` — `"/uploads-original/<storeId>/<filename>"`
  - `async writeUpload(file: File, storeId: string, prefix = ""): Promise<string>` — writes to `public/uploads-original/<storeId>/<prefix><uuid>.<ext>` (fresh `crypto.randomUUID()` each call) and returns `uploadUrl`. Writes are NOT unit-tested (fs + disk); callers (Tasks 8/9) are exercised in the DoD walkthrough. Only the pure helpers are tested below.

- [ ] **Step 1: Write the failing test**

Create `src/lib/files.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  imageExt,
  uploadUrl,
  validateImageFile,
} from "./files";

function file(size: number, type: string): File {
  return new File([new Uint8Array(size)], "a", { type });
}

describe("imageExt", () => {
  it("maps accepted mime types to extensions", () => {
    expect(imageExt("image/jpeg")).toBe("jpg");
    expect(imageExt("image/png")).toBe("png");
    expect(imageExt("image/webp")).toBe("webp");
  });
  it("rejects anything else", () => {
    expect(imageExt("image/gif")).toBeNull();
    expect(imageExt("")).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("accepts a valid jpeg under the cap", () => {
    expect(validateImageFile(file(1024, "image/jpeg"))).toBeNull();
  });
  it("rejects wrong types", () => {
    expect(validateImageFile(file(1024, "image/gif"))).toBe("products.invalidImage");
  });
  it("rejects > 5MB", () => {
    expect(validateImageFile(file(MAX_FILE_BYTES + 1, "image/jpeg"))).toBe(
      "products.imageTooBig",
    );
  });
  it("rejects empty files", () => {
    expect(validateImageFile(file(0, "image/png"))).toBe("products.invalidImage");
  });
});

describe("uploadUrl", () => {
  it("builds the public path under the store folder", () => {
    expect(uploadUrl("abc", "logo-123.jpg")).toBe("/uploads-original/abc/logo-123.jpg");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL ("Cannot find module './files'").

- [ ] **Step 3: Implement `src/lib/files.ts`**

```ts
// Photo upload shared helpers. Next 16 server-action bodies cap at 1MB by
// default (see next.config.ts bodySizeLimit raise) — per-file and per-batch
// caps live here so callers (product/design actions) stay small.

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_SUBMISSION = 6;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Extension for an accepted image mime type, else null. */
export function imageExt(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

/** Returns an i18n key describing the first problem, or null when the file is OK. */
export function validateImageFile(file: File): string | null {
  if (!imageExt(file.type)) return "products.invalidImage";
  if (file.size === 0) return "products.invalidImage";
  if (file.size > MAX_FILE_BYTES) return "products.imageTooBig";
  return null;
}

/** Public URL for a stored upload (served from Next's public/ folder). */
export function uploadUrl(storeId: string, filename: string): string {
  return `/uploads-original/${storeId}/${filename}`;
}

/**
 * Write one uploaded file under public/uploads-original/<storeId>/, returning
 * its public URL. Filenames are randomUUID + extension — never the client's own
 * name — so they are unique and untrusted-externally.
 */
export async function writeUpload(
  file: File,
  storeId: string,
  prefix = "",
): Promise<string> {
  const ext = imageExt(file.type); // validated upstream; throw here on misuse
  if (!ext) throw new Error(`unexpected mime for upload: ${file.type}`);
  const dir = path.join(process.cwd(), "public", "uploads-original", storeId);
  const filename = `${prefix}${randomUUID()}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return uploadUrl(storeId, filename);
}
```

- [ ] **Step 4: Raise the server-action body limit**

Modify `next.config.ts` so it reads:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Default 1MB cannot carry photos (≤5MB each, ≤6 per submission).
      // Auth-gated actions only; leave headroom for multipart boundary bytes.
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: 8 passed (4 + 4 + 1).

- [ ] **Step 6: Commit**

```bash
git add src/lib/files.ts src/lib/files.test.ts next.config.ts
git commit -m "feat(uploads): shared photo validation + write helper; raise server-action body limit to 35mb"
```

---

### Task 4: i18n keys for onboarding, design, products

**Files:**
- Modify: `src/locales/en.ts`
- Modify: `src/locales/ne.ts`

**Interfaces:**
- Consumes: the existing `Dict` type (en.ts bottom: `Record<keyof typeof en, string>`)
- Produces: all keys used by Tasks 6–10 so those components/actions compile. `ne.ts` must mirror every key (parity is a type error otherwise).

- [ ] **Step 1: Add the English keys**

Append to the object in `src/locales/en.ts` (before the closing `} as const;`), keeping the existing keys intact:

```ts
  // Navigation (Phase 1)
  "nav.setupYourShop": "Set up your shop",

  // Onboarding wizard
  "onboarding.title": "Set up your shop",
  "onboarding.subtitle": "Four quick steps and your store is live.",
  "onboarding.shopName": "Shop name",
  "onboarding.shopNameHint": "What customers will see in their browser tab.",
  "onboarding.category": "What do you sell?",
  "onboarding.category.clothing": "Clothing & Fashion",
  "onboarding.category.electronics": "Electronics & Gadgets",
  "onboarding.category.general": "General / Kirana / Handmade",
  "onboarding.city": "Where is your shop?",
  "onboarding.selectProvince": "Select province",
  "onboarding.selectDistrict": "Select district",
  "onboarding.slug": "Your store link",
  "onboarding.slugHint": "We made one from your shop name — you can change it.",
  "onboarding.slugTaken": "That name is taken — try another.",
  "onboarding.slugAvailable": "Available ✓",
  "onboarding.slugInvalid": "Use letters and numbers only, separated by -.",
  "onboarding.createButton": "Create my shop",
  "onboarding.province.koshi": "Koshi Province",
  "onboarding.province.madhesh": "Madhesh Province",
  "onboarding.province.bagmati": "Bagmati Province",
  "onboarding.province.gandaki": "Gandaki Province",
  "onboarding.province.lumbini": "Lumbini Province",
  "onboarding.province.karnali": "Karnali Province",
  "onboarding.province.sudurpashchim": "Sudurpashchim Province",

  // Design page
  "design.title": "Make it yours",
  "design.template": "Pick a template",
  "design.template.clothing": "Clothing",
  "design.template.electronics": "Electronics",
  "design.template.general": "General",
  "design.colorLabel": "Brand color",
  "design.logo": "Logo",
  "design.logoHint": "Optional — a square photo works best.",
  "design.save": "Save & see my products",
  "design.invalidColor": "Choose a valid color.",

  // Products
  "products.title": "Your products",
  "products.add": "Add product",
  "products.empty": "No products yet — add your first one.",
  "products.name": "Product name",
  "products.caption": "Caption",
  "products.priceNpr": "Price (NPR)",
  "products.saveAll": "Save all",
  "products.save": "Save product",
  "products.bulkMode": "Add several products",
  "products.singleMode": "Add one product at a time",
  "products.bulkHint": "Each photo becomes its own product.",
  "products.photo": "Photos",
  "products.addPhoto": "Add photo",
  "products.remove": "Remove",
  "products.edit": "Edit",
  "products.delete": "Delete",
  "products.deleteConfirm": "Delete this product?",
  "products.invalidName": "Give the product a name.",
  "products.invalidPrice": "Enter a price in rupees (whole number).",
  "products.invalidImage": "Use a JPG, PNG, or WebP photo.",
  "products.imageTooBig": "Photo is too big — max 5 MB per photo.",
  "products.tooManyPhotos": "Too many photos — max 6 per upload.",
  "products.saved": "Saved.",
```
Note: if `common.error` already exists in en.ts from Phase 0, do NOT add a second copy — the `products.*`/`onboarding.*` actions reference keys already in this block plus the existing `common.error`. When in doubt, grep the file.

- [ ] **Step 2: Mirror every key in `src/locales/ne.ts`**

The file is typed `export const ne: Dict = { ... }`. Add the same dotted keys with Nepali (नेपाली) translations:
```ts
  "nav.setupYourShop": "पसल खोल्नुहोस्",
  "onboarding.title": "आफ्नो पसल बनाउनुहोस्",
  "onboarding.subtitle": "चार चरणमा तपाईंको पसल — जतनसँग।",
  "onboarding.shopName": "पसलको नाम",
  "onboarding.shopNameHint": "ग्राहकले ट्याबमा यही नाम हेर्नेछन्।",
  "onboarding.category": "के बेच्नुहुन्छ?",
  "onboarding.category.clothing": "कपडा र फेसन",
  "onboarding.category.electronics": "इलेक्ट्रोनिक्स र ग्याजेट",
  "onboarding.category.general": "सामान्य / किराना / हस्तनिर्मित",
  "onboarding.city": "तपाईंको पसल कहाँ छ?",
  "onboarding.selectProvince": "प्रदेश छान्नुहोस्",
  "onboarding.selectDistrict": "जिल्ला छान्नुहोस्",
  "onboarding.slug": "तपाईंको पसल लिंक",
  "onboarding.slugHint": "नामबाट बनाइएको — चाहेमा परिवर्तन गर्नुहोस्।",
  "onboarding.slugTaken": "यो नाम पहिल्यै लिइएको छ — अर्को रोज्नुहोस्।",
  "onboarding.slugAvailable": "उपलब्ध ✓",
  "onboarding.slugInvalid": "अक्षर र नम्बर मात्र, बीचमा - राख्नुहोस्।",
  "onboarding.createButton": "मेरो पसल बनाउनुहोस्",
  "onboarding.province.koshi": "कोशी प्रदेश",
  "onboarding.province.madhesh": "मधेश प्रदेश",
  "onboarding.province.bagmati": "बागमती प्रदेश",
  "onboarding.province.gandaki": "गण्डकी प्रदेश",
  "onboarding.province.lumbini": "लुम्बिनी प्रदेश",
  "onboarding.province.karnali": "कर्णाली प्रदेश",
  "onboarding.province.sudurpashchim": "सुदूरपश्चिम प्रदेश",
  "design.title": "आफ्नो शैली",
  "design.template": "टेम्पलेट छान्नुहोस्",
  "design.template.clothing": "कपडा",
  "design.template.electronics": "इलेक्ट्रोनिक्स",
  "design.template.general": "सामान्य",
  "design.colorLabel": "ब्रान्ड रङ",
  "design.logo": "लोगो",
  "design.logoHint": "ऐच्छिक — वर्गाकार फोटो उपयुक्त हुन्छ।",
  "design.save": "बचत गर्नुहोस्",
  "design.invalidColor": "सही रङ छान्नुहोस्।",
  "products.title": "तपाईंका उत्पादनहरू",
  "products.add": "उत्पादन थप्नुहोस्",
  "products.empty": "अझै उत्पादन छैन — पहिलो उत्पादन थप्नुहोस्।",
  "products.name": "उत्पादनको नाम",
  "products.caption": "विवरण",
  "products.priceNpr": "मूल्य (रुपैयाँ)",
  "products.saveAll": "सबै बचत गर्नुहोस्",
  "products.save": "उत्पादन बचत गर्नुहोस्",
  "products.bulkMode": "धेरै उत्पादन थप्नुहोस्",
  "products.singleMode": "एक एक गरेर थप्नुहोस्",
  "products.bulkHint": "हरेक फोटो एउटा उत्पादन बन्छ।",
  "products.photo": "फोटोहरू",
  "products.addPhoto": "फोटो थप्नुहोस्",
  "products.remove": "हटाउनुहोस्",
  "products.edit": "सम्पादन",
  "products.delete": "मेट्ने",
  "products.deleteConfirm": "यो उत्पादन मेट्ने?",
  "products.invalidName": "उत्पादनको नाम लेख्नुहोस्।",
  "products.invalidPrice": "मूल्य रुपैयाँमा लेख्नुहोस् (पूर्ण संख्या)।",
  "products.invalidImage": "JPG, PNG वा WebP फोटो प्रयोग गर्नुहोस्।",
  "products.imageTooBig": "फोटो ठूलो भयो — बढीमा ५ MB प्रति फोटो।",
  "products.tooManyPhotos": "धेरै फोटो — बढीमा ६ वटा।",
  "products.saved": "बचत भयो।",
```
Leave the existing keys untouched; only ADD the ones above, mirroring en.ts 1:1.

- [ ] **Step 3: Verify parity with a build**

Run: `npm run build`
Expected: compiles. (A missing key in `ne.ts` is a type error on `export const ne: Dict`.)

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/ne.ts
git commit -m "feat(i18n): onboarding, design, products keys (en + ne)"
```

---

### Task 5: `requireStore()` tenant guard

**Files:**
- Create: `src/lib/require-store.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth`, `prisma` from `@/lib/db`, `redirect` from `next/navigation`, `StoreModel` from `@/generated/prisma/models`
- Produces:
  - `export type SessionUser = { id: string; name?: string | null; email?: string | null }`
  - `export async function requireStore(): Promise<{ session: { user: SessionUser }; store: StoreModel }>` — redirects to `/login` when unauthenticated, `/dashboard/onboarding` when the owner has no store. **Not unit-tested** (needs `auth()` + DB); exercised by every guarded action/page and the DoD tenant check.

- [ ] **Step 1: Implement the guard**

Create `src/lib/require-store.ts`:
```ts
// The multi-tenant boundary. Every dashboard page and action that touches a
// Store's data runs through requireStore(): it guarantees a session, then
// loads ONLY the session owner's store. See webplan.md §5.4 / spec §4.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { StoreModel } from "@/generated/prisma/models";

export type SessionUser = { id: string; name?: string | null; email?: string | null };

export interface AuthContext {
  session: { user: SessionUser };
  store: StoreModel;
}

/** Session + the caller's own store, or a redirect (throws, never returns). */
export async function requireStore(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!store) redirect("/dashboard/onboarding");

  return { session: { user: session.user }, store };
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: compiles. (`findUnique` returns `StoreModel | null`, which satisfies the return type after the redirect.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/require-store.ts
git commit -m "feat(auth): requireStore() tenant guard (session + owner store)"
```

---

### Task 6: Onboarding — schema, actions, page

**Files:**
- Create: `src/app/dashboard/onboarding/actions.ts`
- Create: `src/app/dashboard/onboarding/schema.ts`
- Test: `src/app/dashboard/onboarding/schema.test.ts`
- Create: `src/app/dashboard/onboarding/page.tsx`
- Create: `src/components/onboarding-form.tsx`
- Create: `src/components/slug-field.tsx`
- Modify: `src/app/dashboard/page.tsx` (show "set up your shop" CTA when no store)

**Interfaces:**
- Consumes: `slugify` (Task 1), `PROVINCES` (Task 2), `prisma`/`auth` (`@/lib/db`, `@/lib/auth`), i18n keys (Task 4), `t`/`getLocale` from `@/lib/i18n`, `log` from `@/lib/log`
- Produces:
  - `export type OnboardingState = { error?: string }`
  - `export async function createStore(prev: OnboardingState, formData: FormData): Promise<OnboardingState>` — creates the store, `redirect("/dashboard/design")`.
  - `export async function checkSlug(slug: string): Promise<{ available: boolean }>`
  - `export const onboardingSchema` (Zod), input `{ name, category, province, district, slug }`.

- [ ] **Step 1: Write the failing schema test**

Create `src/app/dashboard/onboarding/schema.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./schema";

const valid = {
  name: "Sita's Fashion",
  category: "clothing",
  province: "bagmati",
  district: "Kathmandu",
  slug: "sitas-fashion",
};

describe("onboardingSchema", () => {
  it("accepts a valid payload", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(onboardingSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
  });

  it("rejects a category outside the enum", () => {
    expect(onboardingSchema.safeParse({ ...valid, category: "cars" }).success).toBe(false);
  });

  it("rejects a province that is not one of the 7", () => {
    expect(onboardingSchema.safeParse({ ...valid, province: "narnia" }).success).toBe(false);
  });

  it("rejects a district that belongs to another province", () => {
    // Jhapa is in Koshi, not Bagmati.
    expect(onboardingSchema.safeParse({ ...valid, district: "Jhapa" }).success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    expect(onboardingSchema.safeParse({ ...valid, slug: "Sita's Fashion!" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: Implement `schema.ts`**

```ts
import { z } from "zod";
import { PROVINCES, type ProvinceId } from "@/lib/nepal";

const CATEGORIES = ["clothing", "electronics", "general"] as const;
const PROVINCE_IDS = PROVINCES.map((p) => p.id) as [ProvinceId, ...ProvinceId[]];

// province -> its districts, so "district not in that province" is a
// first-class error. The two-step picker can be bypassed by a direct POST —
// this closes that gap server-side (see Global Constraints).
const DISTRICT_BY_PROVINCE = new Map(PROVINCES.map((p) => [p.id, new Set(p.districts)]));

export const onboardingSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    category: z.enum(CATEGORIES),
    province: z.enum(PROVINCE_IDS),
    district: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        const provinceId = ctx.parent.province as ProvinceId;
        if (!DISTRICT_BY_PROVINCE.get(provinceId)?.has(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "common.error",
          });
        }
      }),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "onboarding.slugInvalid")
      .max(48),
  });
```

Note on the `district` refine: it needs the sibling `province` value. In Zod 4, `z.string().superRefine((val, ctx) => ...)` can read `ctx.parent` to reach sibling fields. The client kebabizes the live slug field on blur before submit, so the regex only sees clean input; direct POSTs get rejected.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: 6 passed.

- [ ] **Step 5: Implement `actions.ts`**

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";
import { log } from "@/lib/log";
import { onboardingSchema } from "./schema";

export type OnboardingState = { error?: string };

/** Create the caller's store if they don't have one; then send them to design. */
export async function createStore(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    province: formData.get("province"),
    district: formData.get("district"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    return {
      error:
        issue.path[0] === "slug"
          ? t(locale, "onboarding.slugInvalid")
          : t(locale, "common.error"),
    };
  }

  try {
    // An owner may open /dashboard/onboarding twice; second time, just send on.
    const existing = await prisma.store.findUnique({
      where: { ownerId: session.user.id },
    });
    if (existing) redirect("/dashboard");

    const taken = await prisma.store.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (taken) return { error: t(locale, "onboarding.slugTaken") };

    await prisma.store.create({
      data: {
        ownerId: session.user.id,
        name: parsed.data.name,
        category: parsed.data.category,
        city: parsed.data.district, // province grouping lives in the picker, not in Store.city
        template: parsed.data.category, // template defaults to the category for v1
        slug: parsed.data.slug,
      },
    });
  } catch (error) {
    // A slug raced in from a parallel creation (unique conflict) or a DB hiccup.
    log("onboarding:createStore", error);
    return { error: t(locale, "common.error") };
  }

  redirect("/dashboard/design");
}

/** Live slug availability — callable from the client (debounced). */
export async function checkSlug(slug: string): Promise<{ available: boolean }> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return { available: true };
  const taken = await prisma.store.findUnique({ where: { slug: clean } });
  return { available: !taken };
}
```

- [ ] **Step 6: Implement the slug field component**

Create `src/components/slug-field.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { checkSlug } from "@/app/dashboard/onboarding/actions";
import { slugify } from "@/lib/slug";

type Props = {
  name: string;
  value: string;
  hint: string;
  takenLabel: string;
  availableLabel: string;
  onChange: (value: string) => void;
};

/** Editable slug input with a debounced, server-side free-name check. */
export function SlugField({
  name,
  value,
  hint,
  takenLabel,
  availableLabel,
  onChange,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const update = (raw: string) => {
    setDraft(raw);
    onChange(raw);
  };

  useEffect(() => {
    clearTimeout(timerRef.current);
    const clean = draft.trim().toLowerCase();
    if (!clean) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    timerRef.current = setTimeout(async () => {
      const { available } = await checkSlug(clean);
      setStatus(available ? "ok" : "taken");
    }, 400);
  }, [draft]);

  return (
    <div className="space-y-1">
      <input
        name={name}
        value={draft}
        onChange={(e) => update(e.target.value)}
        onBlur={() => update(slugify(draft))}
        autoCapitalize="none"
        spellCheck={false}
        maxLength={48}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
      />
      <p
        className={
          status === "taken"
            ? "text-sm text-red-600"
            : status === "ok"
              ? "text-sm text-teal-600"
              : "text-sm text-zinc-500"
        }
      >
        {hint}
        {status === "taken" ? ` · ${takenLabel}` : status === "ok" ? ` · ${availableLabel}` : ""}
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Implement the onboarding form**

Create `src/components/onboarding-form.tsx`:
```tsx
"use client";

import { useActionState, useMemo, useState } from "react";
import { createStore, type OnboardingState } from "@/app/dashboard/onboarding/actions";
import { PROVINCES } from "@/lib/nepal";
import { slugify } from "@/lib/slug";
import { SlugField } from "./slug-field";

type Labels = {
  shopName: string;
  shopNameHint: string;
  category: string;
  categoryClothing: string;
  categoryElectronics: string;
  categoryGeneral: string;
  city: string;
  selectProvince: string;
  selectDistrict: string;
  slug: string;
  slugHint: string;
  slugTaken: string;
  slugAvailable: string;
  createButton: string;
  provinceLabels: Record<string, string>;
};

export function OnboardingForm({ labels }: { labels: Labels }) {
  const [state, action, pending] = useActionState(createStore, {} as OnboardingState);
  const [category, setCategory] = useState("clothing");
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const districts = useMemo(
    () => PROVINCES.find((p) => p.id === province)?.districts ?? [],
    [province],
  );

  // Auto-suggest the slug from the shop name until the owner edits it by hand.
  const suggestSlug = (name: string) => {
    setShopName(name);
    if (!slug) setSlug(slugify(name));
  };

  return (
    <form action={action} className="space-y-6">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.shopName}</span>
        <input
          name="name"
          value={shopName}
          onChange={(e) => suggestSlug(e.target.value)}
          maxLength={80}
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
        <span className="text-xs text-zinc-500">{labels.shopNameHint}</span>
      </label>

      <div>
        <span className="block text-sm font-medium text-zinc-700">{labels.category}</span>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {(
            [
              ["clothing", labels.categoryClothing],
              ["electronics", labels.categoryElectronics],
              ["general", labels.categoryGeneral],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-300 px-4 py-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
            >
              <input
                type="radio"
                name="category"
                value={value}
                checked={category === value}
                onChange={() => setCategory(value)}
                className="accent-teal-700"
              />
              <span className="text-sm text-zinc-800">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">{labels.city}</span>
          <select
            name="province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict("");
            }}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
          >
            <option value="">{labels.selectProvince}</option>
            {PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {labels.provinceLabels[p.id]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">{labels.selectDistrict}</span>
          <select
            name="district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
            disabled={!province}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none disabled:opacity-50"
          >
            <option value="">{labels.selectDistrict}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium text-zinc-700">{labels.slug}</span>
        <SlugField
          name="slug"
          value={slug}
          hint={labels.slugHint}
          takenLabel={labels.slugTaken}
          availableLabel={labels.slugAvailable}
          onChange={setSlug}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "…" : labels.createButton}
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Implement `page.tsx`**

Create `src/app/dashboard/onboarding/page.tsx`:
```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROVINCES } from "@/lib/nepal";
import { getLocale, t } from "@/lib/i18n";
import { OnboardingForm } from "@/components/onboarding-form";

// If the owner already has a store, onboarding is done — send them to design.
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const store = await prisma.store.findUnique({ where: { ownerId: session.user.id } });
  if (store) redirect("/dashboard");

  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "onboarding.title")}</h1>
      <p className="mt-1 text-zinc-600">{t(locale, "onboarding.subtitle")}</p>
      <OnboardingForm
        labels={{
          shopName: t(locale, "onboarding.shopName"),
          shopNameHint: t(locale, "onboarding.shopNameHint"),
          category: t(locale, "onboarding.category"),
          categoryClothing: t(locale, "onboarding.category.clothing"),
          categoryElectronics: t(locale, "onboarding.category.electronics"),
          categoryGeneral: t(locale, "onboarding.category.general"),
          city: t(locale, "onboarding.city"),
          selectProvince: t(locale, "onboarding.selectProvince"),
          selectDistrict: t(locale, "onboarding.selectDistrict"),
          slug: t(locale, "onboarding.slug"),
          slugHint: t(locale, "onboarding.slugHint"),
          slugTaken: t(locale, "onboarding.slugTaken"),
          slugAvailable: t(locale, "onboarding.slugAvailable"),
          createButton: t(locale, "onboarding.createButton"),
          provinceLabels: Object.fromEntries(
            PROVINCES.map((p) => [p.id, t(locale, `onboarding.province.${p.id}` as const)]),
          ),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 9: Update the dashboard home so a no-store user sees the CTA**

Modify `src/app/dashboard/page.tsx`: after the existing session check (`if (!session?.user) redirect("/login");`), load the owner's store:
```tsx
const store = await prisma.store.findUnique({
  where: { ownerId: session.user.id },
});
```
Then render the existing demo-data card only when `store` exists, and otherwise a CTA card:
```tsx
{store ? (
  <section>{/* existing demo-data content */}</section>
) : (
  <section className="rounded-lg border border-zinc-200 bg-white p-6">
    <h2 className="font-semibold text-zinc-900">{t(locale, "nav.setupYourShop")}</h2>
    <p className="mt-2 text-sm text-zinc-600">{t(locale, "onboarding.subtitle")}</p>
    <a
      href="/dashboard/onboarding"
      className="mt-4 inline-block rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
    >
      {t(locale, "nav.setupYourShop")}
    </a>
  </section>
)}
```
Add the `prisma` import at the top of the file. Keep any existing `getLocale`/`t` plumbing.

- [ ] **Step 10: Verify the whole app still builds**

Run: `npm run build`
Expected: compiles; routes include `/dashboard/onboarding`.

- [ ] **Step 11: Commit**

```bash
git add src/app/dashboard/onboarding src/app/dashboard/page.tsx src/components/onboarding-form.tsx src/components/slug-field.tsx
git commit -m "feat(onboarding): 4-step shop setup wizard (name, category, province->district, slug) + live slug check"
```

---

### Task 7: Design page — template, color, logo

**Files:**
- Create: `src/app/dashboard/design/actions.ts`
- Create: `src/app/dashboard/design/page.tsx`
- Create: `src/components/design-form.tsx`

**Interfaces:**
- Consumes: `requireStore` (Task 5), `writeUpload`/`validateImageFile` (Task 3), i18n keys (Task 4)
- Produces:
  - `export type DesignState = { error?: string }`
  - `export async function updateDesign(prev: DesignState, formData: FormData): Promise<DesignState>` — updates template/primaryColor/logo; `redirect("/dashboard/products")`.
  - `export const TEMPLATES: readonly ["clothing", "electronics", "general"]` and `export const COLOR_PRESETS: readonly string[]` — used by `design-form.tsx`.

- [ ] **Step 1: Implement `actions.ts`**

Create `src/app/dashboard/design/actions.ts`:
```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { log } from "@/lib/log";
import { validateImageFile, writeUpload } from "@/lib/files";

export type DesignState = { error?: string };

const designSchema = z.object({
  template: z.enum(["clothing", "electronics", "general"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "design.invalidColor"),
});

export const TEMPLATES = ["clothing", "electronics", "general"] as const;
export const COLOR_PRESETS = [
  "#0F766E", "#4338CA", "#B45309", "#BE123C",
  "#A21CAF", "#0891B2", "#4D7C0F", "#52525B", "#B91C1C",
] as const;

/** Save template + brand color + (optional) logo; then go set up products. */
export async function updateDesign(
  _prev: DesignState,
  formData: FormData,
): Promise<DesignState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const parsed = designSchema.safeParse({
    template: formData.get("template"),
    primaryColor: formData.get("primaryColor"),
  });
  if (!parsed.success) return { error: t(locale, "design.invalidColor") };

  try {
    const { store } = await requireStore();

    let logoUrl = store.logoUrl;
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const err = validateImageFile(logo);
      if (err) return { error: t(locale, err) };
      // Replace the old logo file on disk (best-effort — a missing file is fine).
      if (store.logoUrl) {
        const old = path.join(process.cwd(), "public", ...store.logoUrl.split("/").filter(Boolean));
        await unlink(old).catch(() => {});
      }
      logoUrl = await writeUpload(logo, store.id, "logo-");
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        template: parsed.data.template,
        primaryColor: parsed.data.primaryColor,
        ...(logoUrl !== store.logoUrl ? { logoUrl } : {}),
      },
    });
  } catch (error) {
    log("design:updateDesign", error);
    return { error: t(locale, "common.error") };
  }

  redirect("/dashboard/products");
}
```

- [ ] **Step 2: Implement `design-form.tsx`**

Create `src/components/design-form.tsx`:
```tsx
"use client";

import { useActionState, useState } from "react";
import {
  updateDesign,
  TEMPLATES,
  COLOR_PRESETS,
} from "@/app/dashboard/design/actions";

type Labels = {
  template: string;
  templateOptions: Record<string, string>;
  colorLabel: string;
  logo: string;
  logoHint: string;
  save: string;
};

export function DesignForm({
  labels,
  initial,
}: {
  labels: Labels;
  initial: { template: string; primaryColor: string; logoUrl: string | null };
}) {
  const [state, action, pending] = useActionState(updateDesign, {});
  const [color, setColor] = useState(initial.primaryColor);

  return (
    <form action={action} className="space-y-6">
      <div>
        <span className="text-sm font-medium text-zinc-700">{labels.template}</span>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => (
            <label
              key={tpl}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-300 px-4 py-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
            >
              <input
                type="radio"
                name="template"
                value={tpl}
                defaultChecked={initial.template === tpl}
                className="accent-teal-700"
              />
              <span className="text-sm text-zinc-800">{labels.templateOptions[tpl]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-zinc-700">{labels.colorLabel}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full border-2 ${color === c ? "border-zinc-900" : "border-zinc-200"}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <input
          name="primaryColor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
          placeholder="#0F766E"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">{state.error}</p>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.logo}</span>
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-white hover:file:bg-teal-800"
        />
        {initial.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={initial.logoUrl} alt="" className="mt-3 h-16 w-16 rounded-md object-cover" />
        ) : null}
        <span className="text-xs text-zinc-500">{labels.logoHint}</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "…" : labels.save}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement `page.tsx`**

Create `src/app/dashboard/design/page.tsx`:
```tsx
import { cookies } from "next/headers";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { DesignForm } from "@/components/design-form";

export default async function DesignPage() {
  const { store } = await requireStore();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "design.title")}</h1>
      <DesignForm
        labels={{
          template: t(locale, "design.template"),
          templateOptions: {
            clothing: t(locale, "design.template.clothing"),
            electronics: t(locale, "design.template.electronics"),
            general: t(locale, "design.template.general"),
          },
          colorLabel: t(locale, "design.colorLabel"),
          logo: t(locale, "design.logo"),
          logoHint: t(locale, "design.logoHint"),
          save: t(locale, "design.save"),
        }}
        initial={{
          template: store.template,
          primaryColor: store.primaryColor,
          logoUrl: store.logoUrl,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: compiles; `/dashboard/design` present.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/design src/components/design-form.tsx
git commit -m "feat(design): template + brand color + logo upload page"
```

---

### Task 8: Products — server actions

**Files:**
- Create: `src/app/dashboard/products/actions.ts`
- Create: `src/app/dashboard/products/parse-payload.ts` (pure, unit-tested)
- Test: `src/app/dashboard/products/payload.test.ts`

**Interfaces:**
- Consumes: `requireStore` (Task 5), `writeUpload`/`validateImageFile`/`MAX_PHOTOS_PER_SUBMISSION` (Task 3), i18n keys (Task 4), `prisma` (`@/lib/db`)
- Produces:
  - From `parse-payload.ts`:
    - `export type ProductInput = { name: string; caption: string; priceNpr: number; photoFiles: File[] }`
    - `export type ParseResult = { ok: true; data: ProductInput } | { ok: false; errorKey: string }`
    - `export type BulkGroup = { name: string; caption: string; priceNpr: number; photo: File | null }`
    - `export type BulkParseResult = { ok: true; groups: BulkGroup[] } | { ok: false; errorKey: string }`
    - `parseSingleForm(formData: FormData, opts?: { requirePhoto?: boolean }): ParseResult`
    - `parseBulkForm(formData: FormData): BulkParseResult`
  - From `actions.ts`:
    - `export type ProductsFormState = { error?: string }`
    - `createProduct(prev, formData)`, `createProducts(prev, formData)`, `updateProduct(prev, formData, id)`, `deleteProduct(prev, formData, id)` — all `redirect("/dashboard/products")` after success.

- [ ] **Step 1: Write the failing payload test**

Create `src/app/dashboard/products/payload.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseBulkForm, parseSingleForm } from "./parse-payload";

function photo(): File {
  return new File([new Uint8Array(8)], "p.png", { type: "image/png" });
}

describe("parseSingleForm", () => {
  it("parses a valid single product with a gallery", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("caption", "black cotton");
    fd.set("priceNpr", "1500");
    fd.append("photo", photo());
    fd.append("photo", photo());
    expect(parseSingleForm(fd).ok).toBe(true);
  });

  it("rejects when no photo (photo required by default)", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("priceNpr", "1500");
    expect(parseSingleForm(fd).ok).toBe(false);
  });

  it("allows no photo when requirePhoto is false (edit path)", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("priceNpr", "1500");
    expect(parseSingleForm(fd, { requirePhoto: false }).ok).toBe(true);
  });

  it("rejects a bad price", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("priceNpr", "abc");
    fd.append("photo", photo());
    expect(parseSingleForm(fd).ok).toBe(false);
  });
});

describe("parseBulkForm", () => {
  it("parses N labelled groups", () => {
    const fd = new FormData();
    fd.append("item0photo", photo());
    fd.set("item0name", "A");
    fd.set("item0price", "100");
    fd.append("item1photo", photo());
    fd.set("item1name", "B");
    fd.set("item1price", "200");
    const r = parseBulkForm(fd);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.groups).toHaveLength(2);
  });

  it("stops cleanly when the index chain ends", () => {
    const fd = new FormData();
    fd.append("item0photo", photo());
    fd.set("item0name", "Only");
    fd.set("item0price", "100");
    const r = parseBulkForm(fd);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.groups).toHaveLength(1);
  });

  it("rejects a group that has a name but no photo", () => {
    const fd = new FormData();
    fd.append("item0photo", photo());
    fd.set("item0name", "A");
    fd.set("item0price", "100");
    fd.set("item1name", "garbage");
    expect(parseBulkForm(fd).ok).toBe(false);
  });

  it("rejects an empty submission", () => {
    expect(parseBulkForm(new FormData()).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL ("Cannot find module './parse-payload'").

- [ ] **Step 3: Implement `parse-payload.ts`**

Create `src/app/dashboard/products/parse-payload.ts`:
```ts
// Turn a product FormData into typed, validated groups. Pure and unit-tested
// (Node 20+ has global File/FormData). The actions in actions.ts call these,
// then write files + rows server-side.

import { MAX_PHOTOS_PER_SUBMISSION, validateImageFile } from "@/lib/files";

export type ProductInput = {
  name: string;
  caption: string;
  priceNpr: number;
  photoFiles: File[];
};

export type ParseResult =
  | { ok: true; data: ProductInput }
  | { ok: false; errorKey: string };

export type BulkGroup = {
  name: string;
  caption: string;
  priceNpr: number;
  photo: File | null;
};

export type BulkParseResult =
  | { ok: true; groups: BulkGroup[] }
  | { ok: false; errorKey: string };

/** One NPR price check shared by both parsers. Integers only, 0..10,000,000. */
function priceError(raw: string): string | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) return "products.invalidPrice";
  return null;
}

/**
 * Single-product mode: `photo` (one or more files, `getAll`), `name`,
 * `caption`, `priceNpr`. `requirePhoto: false` is used by updateProduct, where
 * the owner may keep existing photos and add none.
 */
export function parseSingleForm(
  formData: FormData,
  opts: { requirePhoto?: boolean } = {},
): ParseResult {
  const photos = formData.getAll("photo").filter((f): f is File => f instanceof File);
  if (photos.length > MAX_PHOTOS_PER_SUBMISSION) {
    return { ok: false, errorKey: "products.tooManyPhotos" };
  }
  for (const p of photos) {
    const err = validateImageFile(p);
    if (err) return { ok: false, errorKey: err };
  }

  const name = String(formData.get("name") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!name) return { ok: false, errorKey: "products.invalidName" };

  const bad = priceError(String(formData.get("priceNpr") ?? ""));
  if (bad) return { ok: false, errorKey: bad };

  if ((opts.requirePhoto ?? true) && photos.length === 0) {
    return { ok: false, errorKey: "products.invalidImage" };
  }

  return {
    ok: true,
    data: { name, caption, priceNpr: Number(formData.get("priceNpr")), photoFiles: photos },
  };
}

/**
 * Bulk mode: index-prefixed groups `item<i>photo`, `item<i>name`,
 * `item<i>caption`, `item<i>price`, one per product. Iterates 0..N-1 until the
 * first missing index.
 */
export function parseBulkForm(formData: FormData): BulkParseResult {
  const groups: BulkGroup[] = [];
  let i = 0;
  for (;;) {
    const photo = formData.get(`item${i}photo`);
    const name = String(formData.get(`item${i}name`) ?? "").trim();
    if (!(photo instanceof File) && name === "") break; // end of submitted groups

    const caption = String(formData.get(`item${i}caption`) ?? "").trim();
    const bad = photo instanceof File
      ? validateImageFile(photo) ?? (!name ? "products.invalidName" : priceError(String(formData.get(`item${i}price`) ?? "")))
      : "products.invalidImage";
    if (bad) return { ok: false, errorKey: bad };

    groups.push({
      name,
      caption,
      priceNpr: photo instanceof File ? Number(formData.get(`item${i}price`)) : 0,
      photo: photo instanceof File ? photo : null,
    });
    i++;
  }

  if (groups.length === 0) return { ok: false, errorKey: "products.invalidImage" };
  if (groups.length > MAX_PHOTOS_PER_SUBMISSION) {
    return { ok: false, errorKey: "products.tooManyPhotos" };
  }
  return { ok: true, groups };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: 8 passed (4 single + 4 bulk).

- [ ] **Step 5: Implement the actions**

Create `src/app/dashboard/products/actions.ts`:
```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { log } from "@/lib/log";
import { writeUpload } from "@/lib/files";
import { parseBulkForm, parseSingleForm } from "./parse-payload";

export type ProductsFormState = { error?: string };

async function locale() {
  return getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);
}

/** Create one product (with a photo gallery). */
export async function createProduct(
  _prev: ProductsFormState,
  formData: FormData,
): Promise<ProductsFormState> {
  const loc = await locale();
  const parsed = parseSingleForm(formData);
  if (!parsed.ok) return { error: t(loc, parsed.errorKey) };

  try {
    const { store } = await requireStore();
    const imageUrls = await Promise.all(
      parsed.data.photoFiles.map((f) => writeUpload(f, store.id)),
    );
    await prisma.product.create({
      data: {
        storeId: store.id,
        name: parsed.data.name,
        caption: parsed.data.caption,
        priceNpr: parsed.data.priceNpr,
        imageUrls,
      },
    });
  } catch (error) {
    log("products:createProduct", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}

/** Create many products at once (bulk: one photo = one product). */
export async function createProducts(
  _prev: ProductsFormState,
  formData: FormData,
): Promise<ProductsFormState> {
  const loc = await locale();
  const parsed = parseBulkForm(formData);
  if (!parsed.ok) return { error: t(loc, parsed.errorKey) };

  try {
    const { store } = await requireStore();
    const rows: import("@/generated/prisma/client").Prisma.ProductCreateManyInput[] = [];
    for (const g of parsed.groups) {
      const imageUrls = g.photo ? [await writeUpload(g.photo, store.id)] : [];
      rows.push({
        storeId: store.id,
        name: g.name,
        caption: g.caption,
        priceNpr: g.priceNpr,
        imageUrls,
      });
    }
    if (rows.length) await prisma.product.createMany({ data: rows });
  } catch (error) {
    log("products:createProducts", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}

/** Update caption/price/photos of a product the caller OWNS. */
export async function updateProduct(
  _prev: ProductsFormState,
  formData: FormData,
  id: string,
): Promise<ProductsFormState> {
  const loc = await locale();
  const parsed = parseSingleForm(formData, { requirePhoto: false });
  if (!parsed.ok) return { error: t(loc, parsed.errorKey) };

  try {
    const { store } = await requireStore();
    const existing = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    });
    if (!existing) redirect("/dashboard/products");

    const added = await Promise.all(
      parsed.data.photoFiles.map((f) => writeUpload(f, store.id)),
    );
    const removed = String(formData.get("removePhotos") ?? "")
      .split(",")
      .filter(Boolean);

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        caption: parsed.data.caption,
        priceNpr: parsed.data.priceNpr,
        imageUrls: {
          set: [...existing.imageUrls.filter((u) => !removed.includes(u)), ...added],
        },
      },
    });
  } catch (error) {
    log("products:updateProduct", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}

/** Delete a product the caller OWNS, removing its photo files best-effort. */
export async function deleteProduct(
  _prev: ProductsFormState,
  formData: FormData,
  id: string,
): Promise<ProductsFormState> {
  const loc = await locale();
  try {
    const { store } = await requireStore();
    const existing = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    });
    if (!existing) return { error: t(loc, "common.error") };

    await prisma.product.delete({ where: { id: existing.id } });
    for (const u of existing.imageUrls) {
      const filePath = path.join(process.cwd(), "public", ...u.split("/").filter(Boolean));
      await unlink(filePath).catch(() => {}); // best-effort cleanup
    }
  } catch (error) {
    log("products:deleteProduct", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: compiles. Note: the `createMany` row type uses `import("@/generated/prisma/client").Prisma.ProductCreateManyInput`. If the generated client exports that differently, drop the explicit type annotation entirely — Prisma infers the row type from the `createMany({ data })` call argument. Prefer the simplest form that compiles.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/products/actions.ts src/app/dashboard/products/parse-payload.ts src/app/dashboard/products/payload.test.ts
git commit -m "feat(products): single+gallery and bulk server actions (parsed, validated, tenant-scoped)"
```

---

### Task 9: Products — pages and components

**Files:**
- Create: `src/app/dashboard/products/page.tsx`
- Create: `src/app/dashboard/products/new/page.tsx`
- Create: `src/app/dashboard/products/[id]/edit/page.tsx`
- Create: `src/components/product-form.tsx`
- Create: `src/components/product-list.tsx`

**Interfaces:**
- Consumes: `requireStore` (Task 5), actions + `ProductsFormState` (Task 8), i18n keys (Task 4), `ProductModel` (`@/generated/prisma/models`), `MAX_PHOTOS_PER_SUBMISSION` (Task 3)
- Produces: the three routes; list renders `ProductModel[]`; new/edit render `ProductForm`.

- [ ] **Step 1: Implement the product list page**

Create `src/app/dashboard/products/page.tsx`:
```tsx
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { ProductList } from "@/components/product-list";

export default async function ProductsPage() {
  const { store } = await requireStore();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "products.title")}</h1>
        <a
          href="/dashboard/products/new"
          className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
        >
          {t(locale, "products.add")}
        </a>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-zinc-500">{t(locale, "products.empty")}</p>
      ) : (
        <ProductList
          products={products}
          labels={{
            priceNpr: t(locale, "products.priceNpr"),
            edit: t(locale, "products.edit"),
            delete: t(locale, "products.delete"),
            deleteConfirm: t(locale, "products.deleteConfirm"),
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `product-list.tsx`**

Create `src/components/product-list.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import type { ProductModel } from "@/generated/prisma/models";
import {
  deleteProduct,
  type ProductsFormState,
} from "@/app/dashboard/products/actions";

function DeleteProductButton({
  productId,
  deleteLabel,
  deleteConfirm,
}: {
  productId: string;
  deleteLabel: string;
  deleteConfirm: string;
}) {
  const [state, action, pending] = useActionState(
    (prev: ProductsFormState, fd: FormData) => deleteProduct(prev, fd, productId),
    {} as ProductsFormState,
  );
  void state;

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(deleteConfirm)) e.preventDefault();
        }}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
      >
        {deleteLabel}
      </button>
    </form>
  );
}

export function ProductList({
  products,
  labels,
}: {
  products: ProductModel[];
  labels: { priceNpr: string; edit: string; delete: string; deleteConfirm: string };
}) {
  return (
    <ul className="mt-6 space-y-3">
      {products.map((p) => {
        const main = p.imageUrls[0];
        return (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4"
          >
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main} alt="" className="h-16 w-16 rounded-md object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-md bg-zinc-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-900">{p.name}</p>
              <p className="text-sm text-zinc-500">
                {labels.priceNpr} {p.priceNpr.toLocaleString("en-IN")}
              </p>
            </div>
            <a
              href={`/dashboard/products/${p.id}/edit`}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              {labels.edit}
            </a>
            <DeleteProductButton
              productId={p.id}
              deleteLabel={labels.delete}
              deleteConfirm={labels.deleteConfirm}
            />
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Implement `product-form.tsx`**

Create `src/components/product-form.tsx`. One client component for new (single or bulk) and edit (single). Props:
- `labels: Labels`
- `mode: "single" | "bulk"` (initial mode; a toggle appears only when creating)
- `product?: { name: string; caption: string; priceNpr: number; imageUrls: string[] }` (edit only)
- `productId?: string` (edit only)

```tsx
"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createProduct,
  createProducts,
  updateProduct,
  type ProductsFormState,
} from "@/app/dashboard/products/actions";
import { MAX_PHOTOS_PER_SUBMISSION } from "@/lib/files";

type Labels = {
  name: string;
  caption: string;
  priceNpr: string;
  photo: string;
  addPhoto: string;
  remove: string;
  save: string;
  saveAll: string;
  bulkMode: string;
  singleMode: string;
  bulkHint: string;
};

type ProductFormAction = (
  prev: ProductsFormState,
  formData: FormData,
) => Promise<ProductsFormState>;

export function ProductForm({
  labels,
  mode: initialMode,
  product,
  productId,
}: {
  labels: Labels;
  mode: "single" | "bulk";
  product?: { name: string; caption: string; priceNpr: number; imageUrls: string[] };
  productId?: string;
}) {
  const [mode, setMode] = useState<"single" | "bulk">(initialMode);
  const [removePhotos, setRemovePhotos] = useState<string[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  // updateProduct needs its 3rd arg; useActionState wants a 2-arg action, so wrap.
  const run: ProductFormAction = useMemo(() => {
    if (productId) return (prev, fd) => updateProduct(prev, fd, productId);
    return mode === "bulk" ? createProducts : createProduct;
  }, [productId, mode]);

  const [state, action, pending] = useActionState(run, {} as ProductsFormState);

  return (
    <form action={action} className="space-y-6">
      {!productId ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "single" ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {labels.singleMode}
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "bulk" ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {labels.bulkMode}
          </button>
        </div>
      ) : null}

      <input type="hidden" name="removePhotos" value={removePhotos.join(",")} />

      {mode === "single" ? (
        <SingleFields labels={labels} product={product} />
      ) : (
        <BulkEditor labels={labels} />
      )}

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.photo}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {product?.imageUrls
            .filter((url) => !removePhotos.includes(url))
            .map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-20 w-20 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setRemovePhotos((r) => [...r, url])}
                  className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white"
                  aria-label={labels.remove}
                >
                  ×
                </button>
              </div>
            ))}
          <div className="relative">
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 text-sm text-zinc-400 hover:border-teal-600 hover:text-teal-700">
              {labels.addPhoto}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  setNewPreviews(list.map((f) => URL.createObjectURL(f)));
                }}
              />
            </label>
          </div>
          {newPreviews.map((src) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={src} src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
          ))}
        </div>
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "…" : mode === "bulk" ? labels.saveAll : labels.save}
      </button>
    </form>
  );
}

/** Single + edit modes: name, caption, price. */
function SingleFields({
  labels,
  product,
}: {
  labels: Labels;
  product?: { name: string; caption: string; priceNpr: number; imageUrls: string[] };
}) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.name}</span>
        <input
          name="name"
          defaultValue={product?.name}
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.caption}</span>
        <textarea
          name="caption"
          defaultValue={product?.caption}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.priceNpr}</span>
        <input
          name="priceNpr"
          type="number"
          inputMode="numeric"
          min="0"
          defaultValue={product?.priceNpr ?? ""}
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>
    </>
  );
}

/** Bulk mode: N slots, each slot = photo + name + price (one product each). */
function BulkEditor({ labels }: { labels: Labels }) {
  const [slots, setSlots] = useState(3);
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{labels.bulkHint}</p>
      {Array.from({ length: slots }).map((_, i) => (
        <fieldset key={i} className="rounded-lg border border-zinc-200 p-4">
          <legend className="sr-only">
            {labels.photo} {i + 1}
          </legend>
          <input
            type="file"
            name={`item${i}photo`}
            accept="image/jpeg,image/png,image/webp"
            required
            className="block w-full text-sm text-zinc-600"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              name={`item${i}name`}
              required
              placeholder={labels.name}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
            />
            <input
              name={`item${i}price`}
              type="number"
              inputMode="numeric"
              min="0"
              required
              placeholder={labels.priceNpr}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={slots >= MAX_PHOTOS_PER_SUBMISSION}
        onClick={() => setSlots((n) => n + 1)}
        className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
      >
        {labels.addPhoto}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Wire up the new-product page**

Create `src/app/dashboard/products/new/page.tsx`:
```tsx
import { cookies } from "next/headers";
import { getLocale, t } from "@/lib/i18n";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);
  const labels = {
    name: t(locale, "products.name"),
    caption: t(locale, "products.caption"),
    priceNpr: t(locale, "products.priceNpr"),
    photo: t(locale, "products.photo"),
    addPhoto: t(locale, "products.addPhoto"),
    remove: t(locale, "products.remove"),
    save: t(locale, "products.save"),
    saveAll: t(locale, "products.saveAll"),
    bulkMode: t(locale, "products.bulkMode"),
    singleMode: t(locale, "products.singleMode"),
    bulkHint: t(locale, "products.bulkHint"),
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "products.add")}</h1>
      <ProductForm mode="single" labels={labels} />
    </div>
  );
}
```
(The dashboard layout guards `/dashboard/*`; `ProductForm`'s actions call `requireStore()`, which redirects a no-store owner to onboarding — no extra check needed here.)

- [ ] **Step 5: Wire up the edit page**

Create `src/app/dashboard/products/[id]/edit/page.tsx`:
```tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { ProductForm } from "@/components/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { store } = await requireStore();
  const { id } = await params; // Next 16: params is a Promise
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>
      <ProductForm
        mode="single"
        productId={product.id}
        product={{
          name: product.name,
          caption: product.caption,
          priceNpr: product.priceNpr,
          imageUrls: product.imageUrls,
        }}
        labels={{
          name: t(locale, "products.name"),
          caption: t(locale, "products.caption"),
          priceNpr: t(locale, "products.priceNpr"),
          photo: t(locale, "products.photo"),
          addPhoto: t(locale, "products.addPhoto"),
          remove: t(locale, "products.remove"),
          save: t(locale, "products.save"),
          saveAll: t(locale, "products.saveAll"),
          bulkMode: t(locale, "products.bulkMode"),
          singleMode: t(locale, "products.singleMode"),
          bulkHint: t(locale, "products.bulkHint"),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: compiles; routes `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/[id]/edit` present.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/products src/components/product-form.tsx src/components/product-list.tsx
git commit -m "feat(products): list, quick-add (gallery + bulk), edit, delete pages"
```

---

### Task 10: Full DoD — build, walkthrough, review pass, commit

**Files:**
- Modify: `PROGRESS.md` (mark Phase 1 in progress/done, add review log lines)

- [ ] **Step 1: Build + restart dev server**

Run: `npm run build` — must pass. Then start `npm run dev` fresh.

- [ ] **Step 2: Manual walkthrough (phone-width window)**

1. Sign up a fresh account → lands on `/dashboard` → sees "Set up your shop" CTA.
2. Complete onboarding: name "Sita's Fashion", category Clothing, province Bagmati → district Kathmandu; slug auto-suggests `sitas-fashion` (live "Available ✓"); typing `sitasfashion` shows "taken".
3. Land on `/dashboard/design`; pick Electronics template, a preset color, upload a logo → Save → land on products.
4. Add one product with a **single photo**; a second with a **2-photo gallery**; a third in **bulk mode** ("Add several products") with 2 photos → each becomes its own product.
5. Edit a product (change caption/price, remove a photo); delete a product (confirm dialog).
6. **Tenant check:** sign up a second owner → their `/dashboard/products` is empty (no `sitasfashion` items) and their onboarding slug `sitas-fashion` shows "taken".
7. Re-open `/dashboard/onboarding` → redirected to `/dashboard` (already has a store).
8. Flip to नेपाली — every Phase 1 label changes (parity is compiled, so nothing goes English unexpectedly).

- [ ] **Step 3: §5.8 review pass**

Run (per `docs/PLAN.md` §5.8): `differential-review`, `clean-code`, `refactoring`, `supply-chain-risk-auditor`, `insecure-defaults`, `sharp-edges`, `static-analysis` (Semgrep). Fix every real finding before commit; log one line per review in `PROGRESS.md`.

- [ ] **Step 4: Update PROGRESS.md + commit the phase**

Mark Phase 1 done in `PROGRESS.md` (status table + "Done in Phase 1" bullets + review log). Then:
```bash
git add -A
git commit -m "Phase 1: onboarding + design + product tools (reviewed)"
git tag phase-1
```
Push only if the user asks.

**Definition of Done — from the spec §11:** `npm run build` passes · creation flow works end-to-end · gallery + bulk products land in the list · edit + delete work · tenant isolation verified (owner B never sees owner A) · re-running onboarding redirects · §5.8 review pass clean-and-logged. When all six hold, Phase 1 is done.