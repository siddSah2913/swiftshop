# Phase 1 Design — Welcoming the owner: onboarding + products

Date: 2026-09-13. Status: approved in chat (brainstorming), written to disk.
Supersedes nothing. Extends `docs/PLAN.md` §14 Phase 1 with the decisions below.

## 1. Goal

A signed-up owner can, from their phone: set up a shop (name, category, city,
slug), pick a template and brand look (color + logo), and manage products
(quick-add, gallery, bulk-add, list, edit, delete). DoD (plan §14): *owner
creates a store, picks the Clothing template, adds products, sees them in a
list* — plus the tenant isolation check and the §5.8 review pass.

## 2. Decisions locked in brainstorming (2026-09-13)

| Question | Decision |
|---|---|
| Bulk photo add | **Both** — single product with a photo gallery, AND a "several products" bulk mode (N photos → N products, each captioned+priced) |
| Shop city | **Province → district** two-step picker; `Store.city` stores the district name (plain string) |
| Stock / availability in forms | **Deferred to Phase 3** — Phase 1 product form is photo + caption + price only |

## 3. Routes (all under the auth-guarded dashboard shell)

Deviation from plan (`/onboarding` top-level → `/dashboard/onboarding`) so the
wizard reuses the dashboard layout's `auth()` guard, header, LanguageSwitcher
and SignOutButton. Flagged and accepted in brainstorm.

| Route | Purpose |
|---|---|
| `/dashboard/onboarding` | 4-step wizard: name → category → city (province→district) → slug |
| `/dashboard/design` | Template picker (3), primary color (palette + hex), logo upload |
| `/dashboard/products` | Product list + delete; empty state; "Add product" |
| `/dashboard/products/new` | Quick-add; gallery mode; bulk ("several products") mode |
| `/dashboard/products/[id]/edit` | Edit caption/price/photos (add/remove; first = main) |

## 4. Server actions

All actions: session-required, Zod-validated, tenant-scoped, translated errors
via `t()`, never leak stack traces.

- `createStore(formData)` — `requireStore` inverse: asserts session has **no**
  store yet (idempotent); validates name/category/city/slug; checks slug
  uniqueness with a friendly "that name is taken" error; creates `Store`
  (ownerId = `session.user.id`); `redirect("/dashboard/design")`.
- `checkSlug(slug)` — returns `{ ok, available }` for the debounced live check.
- `updateDesign(formData)` — template (enum), primaryColor (validated hex),
  optional logo file → writes `public/uploads-original/<storeId>/logo-<cuid>.ext`;
  `redirect("/dashboard/products")`.
- Product actions broker a shared file handler:
  - `createProduct(formData, { bulk: false })` — single product with N photos.
  - `createProducts(formData)` — bulk: N records from N photo+caption+price groups.
  - `updateProduct(id, formData)` — caption/price/photos add-remove.
  - `deleteProduct(id)`.
- All product actions first `requireStore()`, then scope every query by
  `storeId` (tenant isolation boundary).

**Photo write path:** `path.join(process.cwd(), "public/uploads-original", storeId, filename)`
where `filename = <cuid>.<ext>` (logo: `logo-<cuid>.<ext>`). File checks:
mime in `image/jpeg, image/png, image/webp`; ≤ 5 MB. Client and server both.

## 5. New/updated lib modules

- `src/lib/slug.ts` — `slugify(input): string` (pure): lowercase, NFD strip
  diacritics, kebab-case, fallback `"shop"`, max length guard.
- `src/lib/nepal.ts` — `PROVINCES: Province[]`; `Province = { id, label, districts: string[] }`.
  7 provinces, curated districts/towns (target ~30–50 total). Pure data,
  unit-verified (every district belongs to exactly one province, non-empty).
  **Label language (decided):** district names are stored in English (Latin)
  — consistent, sortable, and stable for storage as `Store.city`. Province
  labels are localized via i18n keys (`onboarding.province.<id>`) so they
  render in English or नेपाली as the UI language dictates. No mixed-language
  data source.
- `src/lib/require-store.ts` — `requireStore(): Promise<{ session, store }>` —
  asserts session (`redirect("/login")`), loads owner's store, redirects to
  `/dashboard/onboarding` if none. Used by design + product pages.
- `src/lib/files.ts` — `saveUpload(file, dir, { prefix })` shared by product,
  bulk and logo actions; returns stored relative URL; deletes on later remove.

## 6. Components (client)

- `onboarding-form.tsx` — stepper with 4 steps; per-step state; slug live-check.
  City step: two `<select>`s (province → district), district list resets on
  province change.
- `slug-field.tsx` — input + debounced `checkSlug` + available/taken indicator.
- `template-picker.tsx`, `color-picker.tsx`, `logo-upload.tsx` — design page.
- `product-form.tsx` — used by new + edit; props switch gallery vs bulk mode;
  file inputs with local previews; ordered photo list (first = main).
- `product-list-item.tsx` — thumbnail, name, NPR price, delete confirm.

## 7. i18n

All new strings added to `src/locales/en.ts` and mirrored in `ne.ts` under new
`onboarding.*`, `design.*`, `products.*` key groups. Dict parity is a compile
error, so a missing Nepali word cannot ship silently.

## 8. Money & data rules (unchanged invariants, restated)

- `priceNpr` is an integer, 0 ≤ price ≤ 10,000,000 (Zod `int().min(0).max(...)`).
- Every `storeId`-scoped query goes through `requireStore()`'s store — no value
  is ever read or written outside the owner's store.
- `Store.slug` and `Store.ownerId` unique constraints give the DB the final
  word on collisions; the friendly error is the app's window dressing.

## 9. New infra: vitest (flagged, small)

No test runner exists. Add **vitest** for pure logic only: `slugify`,
`nepal.ts` invariants, onboarding Zod schema. ~2 small config files + 3–4
test files. No DOM/React/component testing this phase. Rationale: these pure
modules are the pieces most likely to regress and the cheapest to pin down.

## 10. Out of scope (Phase 2/3)

Storefront `[shop]` rendering, cart/checkout, order management, stock &
availability controls, payment/delivery settings pages, photo cloud storage
(Cloudinary), subdomains/custom domains.

## 11. Definition of Done

1. `npm run build` passes; `npm run dev` boots.
2. Live walkthrough: sign up → `/dashboard` → onboarding → create store →
   design (pick template + color + logo) → products: add one product with a
   single photo; a second with a 2-photo gallery; a third in bulk mode →
   all three listed, editable, deletable.
3. Tenant check: owner B (new signup) sees empty/no other owner's products.
4. Re-running onboarding redirects to `/dashboard` (already has a store).
5. §5.8 review pass runs clean (or findings fixed + logged) before commit.