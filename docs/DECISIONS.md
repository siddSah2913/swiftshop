# DECISIONS — SwiftShop
_Record every important choice + WHY here. Matters survive compaction/sessions._

| Date | Decision | Why |
|---|---|---|
| 2026-09-12 | **Name: SwiftShop** (alternatives: Pasal, Sanduk, DigiPasal, OwnPasal) | User picked it after other-AI brainstorm. Note: "Swift" overlaps Apple's language brand — trademark check before launch (§15). |
| 2026-09-12 | **Stack: Next.js 14/15 + TypeScript (strict) + Tailwind + PostgreSQL + Prisma + NextAuth v5 + Zod** | One project for storefront+dashboard; user knows JS/Node (learning); huge ecosystem; multi-tenant via slugs is native. |
| 2026-09-12 | **Multi-tenant** — every store gets unique `slug`; ALL queries scoped by store (`requireStore()` guard) | One platform, many isolated shops; no owner sees another's data (must-pass test). |
| 2026-09-12 | **Payment v1 = COD + static QR; v2 = eSewa then Khalti (server-side verify)** | COD still ~40% of Nepal market; QR cheap + works everywhere; gateway API needs sandbox + merchant KYC. **No escrow → no NRB PSP license.** PhonePe is Indian — unusable. |
| 2026-09-12 | **Delivery: manual-first adapters** (`self`, `ncm`, `pathao`, `indrive`) with `generateManifest()`; API-ready upgrade path | No partner has a public API yet (2026-09); NCM most promising. Owner copies manifest → pastes in courier app. |
| 2026-09-12 | **Bilingual en+ne** — typed locale files `en.ts`/`ne.ts` + `t()` helper + `LanguageSwitcher` | Owners + customers read the site in their language; type-checked keys catch missing translations. |
| 2026-09-12 | **What'sApp v1 = wa.me click-to-chat links** (free, no Meta approval); full WhatsApp Business API = Phase 6 | Fastest legal MVP; auto-send needs Meta business approval + fees. |
| 2026-09-12 | **Money stored as integers (NPR)** | Prevents the classic floating-point money bug. |
| 2026-09-12 | **Common error-handling pattern** (`try/catch` → validate Zod → tenant guard → log → friendly error) | Reduces bugs; no stack traces leaked to browser. |
| 2026-09-12 | **Cross-check per phase** — every phase (0–5) ends with user-verifiable checks in `webplan.md` §14 | User wants to follow along and cross-check each phase himself. |
| 2026-09-12 | **Skills installed** — Trail of Bits (8 security plugins) + clean-code/refactoring/code-complete | Third-party security + readability reviews, better than built-in for our needs; run per §5.8 after every phase. |
| 2026-09-13 | **Project folder moved to `D:\SwiftShop`** | Original `D:\#helpweb` has a `#` → Next.js 16 can't build/run there (null byte injected into `file://` paths; both Turbopack and webpack fail). Folder name change (not move-to-subdomain) is the fix. |
| 2026-09-13 | **NextAuth v5: Credentials provider + JWT, NO PrismaAdapter wired in** | With email+password only and JWT sessions the adapter buys nothing and adds Prisma-7 import friction. Revisit only if we add OAuth (Phase 5+). |
| 2026-09-13 | **User id carried in JWT `token.sub`** (not a custom `token.id`) | `next-auth/jwt` re-exports JWT from `@auth/core`, so module augmentation doesn't merge there; `sub` is the standard subject claim, already typed as string. |
| 2026-09-13 | **Dashboard auth guard lives in `dashboard/layout.tsx` (server-side) for Phase 0; middleware deferred to Phase 3** | Layout guard is functionally identical protection (redirect to /login) and stays on Node runtime. True middleware needs an edge-safe `auth.config.ts` split (Prisma can't run on edge); build that in Phase 3 with the dashboard shell. |
| 2026-09-13 | **Store location = province → district two-step picker; picked district stored in `Store.city`** | The 77-district list via `src/lib/nepal.ts` (7 provinces) is a fixed, Nepal-accurate dataset — no free-text city risk. Province grouping lives in the picker/schema, not in the stored column. Server re-validates district∈province so a bypassed picker (direct POST) is rejected. |
| 2026-09-14 | **Phase 1 admin edit URL uses the product's cuid** (`/dashboard/products/[id]/edit`) | Plan-specified despite §5.1 "never show DB ids in URLs" — owner-only admin surface, cuid is non-enumerable, not customer-facing. Revisit for storefront URLs (Phase 2) where slugs matter. |
| 2026-09-14 | **Client components must not import server-only modules** — split browser-safe constants (`upload-limits.ts`) from Node-only helpers (`files.ts`) | Client `product-form` importing `MAX_PHOTOS_PER_SUBMISSION` from `files.ts` (which imports `node:fs`) made Turbopack trace `node:fs/promises` into the browser chunk → build panic. Same pattern as the `"use server"` async-only-exports rule: keep the client's import surface free of Node builtins. |
| 2026-09-14 | **Vitest + Vite 8 for pure-logic tests** (`slug`, `nepal`, `files`, schema, payload — 31 tests) | Server actions can't be unit-test-run by vitest (Next-bound), so pure parsers/validators live in `*.ts` modules separate from actions and are unit-tested; actions stay thin. |

## Open questions (to resolve later)
- Domain strategy v1: stores on subdomain (`sitasfashion.<platform>.app`)? Custom domains later.
- Store city list (province/district dropdown) — RESOLVED: Phase 1 ships province→district from `nepal.ts`.
- Monetization/pricing for owners (out of v1 scope).
- Photo storage: local v1, Cloudinary in Phase 6.