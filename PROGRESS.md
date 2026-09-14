# PROGRESS — SwiftShop: Nepal's E-commerce Website Builder

_Last updated: 2026-09-14. Update this file at the END of every session/phase._

## Phase status
- ✅ **Phase 0 — Foundation** — DONE 2026-09-13 (build passes, auth + i18n verified live).
- ✅ **Phase 1 — Onboarding + products** — DONE 2026-09-14 (build + 31 tests + 9 task gates + review pass; tagged `phase-1`). Manual E2E walkthrough TBD (see Cross-check below).
- ⬜ Phase 2 — Customer storefront + checkout
- ⬜ Phase 3 — Owner dashboard: Orders + Customers
- ⬜ Phase 4 — Delivery automation
- ⬜ Phase 5 — Real online payments
- ⬜ Phase 6 — Polish

## Done so far (before Phase 0)
- ✅ **Plan written & approved** → full plan lives in `./webplan.md` (root). READ THIS FIRST.
- ✅ **Platform name DECIDED: "SwiftShop"** (2026-09-12). Alternatives considered: Pasal, Sanduk, DigiPasal, OwnPasal. Before launch: check trademark (Dept. of Industry, Nepal) + domain (`swiftshop.com.np`/`.com`). "Swift" overlaps with Apple's language brand — lawyer to confirm.
- ✅ **Review skills INSTALLED & verified**:
  - Trail of Bits security plugins (8, all enabled, scope=project): `static-analysis`, `differential-review`, `insecure-defaults`, `sharp-edges`, `supply-chain-risk-auditor`, `second-opinion`, `vulnerability-triage-brocards`, `fp-check`. Cache: `C:\Users\sidds\.claude\plugins\cache\trailofbits\`. Enabled in `.claude/settings.json`.
  - Readability/book skills (3, active): `clean-code`, `refactoring`, `code-complete` (via `npx skills add ciembor/agent-rules-books`). In `.claude/skills/` + `.agents/skills/`.
- ✅ **KEY DESIGN DECISIONS** (details in `docs/DECISIONS.md`): Next.js 14/15 + TypeScript (strict) + Tailwind + PostgreSQL + Prisma + NextAuth v5 + Zod. Multi-tenant per-store slug. Payment: v1 = COD + static QR (NO escrow → no NRB license), v2 = eSewa/Khalti with server-side verify. Delivery: manual-first adapters (self/ncm/pathao/indrive), API-ready. Bilingual en+ne locale files. Phone-first dashboard + WhatsApp (v1 = wa.me click-to-chat links). **PhonePe is INDIAN — not usable in Nepal.**
- ✅ User's follow-along requirement: every phase (0–5) in `webplan.md` §14 now has a **✍️ Cross-check for YOU** block (open these files / run this command / see this result). Golden rule: if a cross-check fails, phase is NOT done.

## Next step
- **Phase 1 review gate CLOSED (2026-09-14)** — `phase-1` tag on `e5647df`. Hard gates green: `npm run build` (routes incl. `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/[id]/edit`), `npm run test` 31/31, dashboards 307→/login unauthenticated live.
- **✍️ Phase 1 Cross-check for you (user):** with `npm run dev` on :3000 — sign up → dashboard shows "set up your shop" CTA → onboarding wizard (name/category/province→district/slug with live availability) → Create → auto-redirect to design (template/color/logo) → Save → auto-redirect to products → add single product w/ photos, add via bulk, edit, delete. Then a second account must see NO trace of the first's orders/products (tenant). Optional: `npx prisma studio` → `Store` row has `name/category/city(district)/template/primaryColor/slug`, `Product` rows have `imageUrls`.
- Then start **Phase 2 — Customer storefront + checkout** (read `docs/PLAN.md` §14 Phase 2). `/dashboard` home + `[shop]/` grid next.
- Old folder `D:\#helpweb` still on disk (desktop app pins Bash/preview to it → busy). Delete after app restart.

## Done in Phase 0 (2026-09-13)
- **⚠️ PROJECT MOVED: `D:\#helpweb` → `D:\SwiftShop`.** The `#` in the folder name broke Next.js builds (Turbopack + webpack both insert a null byte in `file://` paths → `ERR_INVALID_ARG_VALUE`). Copied project (excl. node_modules/.next), reinstalled deps, build now passes. **Old folder `D:\#helpweb` left on disk — delete once session fully released.** NOTE: paths in docs below may still say `#helpweb`.
- Postgres in Docker `swiftshop-postgres` on :5433 (16-alpine), schema migrated + seeded.
- Next.js 16.3.5 + React 19.2.8 + TS strict + Tailwind v4 scaffolded; `git init` (branch `main`).
- Prisma 7.10.0 CLI+client MATCHED (was 8.0.0-rc vs 7.10.0 → pinned). `prisma-client` generator at `src/generated/prisma`, driver adapter `@prisma/adapter-pg`. Migration `init` → all 7 tables.
- Seed: demo owner `demo@swiftshop.local` / `demo1234`, store `sitasfashion`, 3 products. Login verified via real `/api/auth/callback/credentials`.
- NextAuth v5 (beta.32) credentials+JWT: `src/lib/auth.ts`, `/api/auth/[...nextauth]`, login + signup pages with Zod validation + bcrypt; errors translated via `t()`. Dashboard guarded in LAYOUT (`auth()` → redirect) — middleware deferred to Phase 3 (see DECISIONS).
- i18n: `src/locales/en.ts` + `ne.ts` (typed `Dict`), `src/lib/i18n.ts` `t()`/`getLocale()`, `LanguageSwitcher` (cookie `swiftshop_lang`); verified `lang="ne"` + नेपाली render.
- `src/lib/db.ts` (Prisma+adapter singleton), `src/lib/log.ts`, `docs/PLAN.md` copy, `.npmrc` `allow-scripts=sharp,prisma,@prisma/engines,@prisma/client`.
- Build: `npm run build` ✓ TypeScript ✓. Auth flow curl-verified: landing 200 / login 200 / signup 200 / dashboard 307→/login (no session) / dashboard 200 (with session).

## Done in Phase 1 (2026-09-13 → 14)
- Executed from committed plan `docs/superpowers/plans/2026-09-13-phase1-onboarding-products.md` (SDD, 9 tasks, one commit each → `e5647df`).
- T1 vitest 5 runner + `slugify` (`src/lib/slug.ts`, 6 tests) · T2 `nepal.ts` (7 provinces, 77 districts, province→district maps, 4 tests) · T3 upload infra (`files.ts`: `writeUpload`/`validateImageFile`/`uploadUrl`, uuid filenames, 5MB/6-file caps; `next.config.ts` bodySizeLimit 35mb; 7 tests) · T4 i18n keys (onboarding/design/products, `TranslationKey` parity en↔ne) · T5 `requireStore()` tenant guard (session + owner store, redirects) · T6 onboarding wizard (`schema.ts` object-level district↔province refine, `checkSlug`, 4-step `onboarding-form.tsx` w/ live slug check, `slug-field.tsx`, CTA on dashboard home; 6 tests) · T7 design page (`design-form.tsx` template/color presets/logo, `updateDesign`; consts split to `lib/design.ts` for the `"use server"` non-function-export rule) · T8 product actions (`parse-payload.ts` single+gallery `parseSingleForm`/bulk `parseBulkForm` w/ errorKey:TranslationKey, `createProduct`/`createProducts`/`updateProduct`/`deleteProduct` all tenant-scoped + requireStore-outside-try; 8 tests) · T9 product pages + components (list, quick-add single/bulk, edit w/ `params` Promise + `notFound()`, delete w/ confirm).
- **Build-time defect found & fixed (T9 ruling):** client `product-form` imported `MAX_PHOTOS_PER_SUBMISSION` from `@/lib/files`, which top-level-imports `node:fs/promises` → Turbopack panic (`chunking context does not support external modules`) on the browser chunk for `/dashboard/products/[id]/edit`. Fix: split the two pure caps to `src/lib/upload-limits.ts`; `files.ts` local-binds + re-exports; client imports the pure module. Existing `@/lib/files` imports unchanged.
- **Full test suite now 31 tests** (`npm test`): slug 6 + nepal 4 + files 7 + onboarding schema 6 + payload 8.

## Gotchas / notes for future sessions
- **Skills** are already installed — do NOT re-install. Verify with `claude plugin list` (8 enabled) + `clean-code`/`refactoring`/`code-complete` load. `static-analysis` needs Semgrep/CodeQL installed as a tool — only when §5.8 first calls for it (after auth/payment/delivery code).
- `/plugin`, `/compact` etc. are interactive only — not available in the desktop app directly; user runs them via keyboard/terminal.
- Project root currently: `webplan.md`, `skills-lock.json`, `.claude/` (settings + installed skills), `.agents/`. No code yet. NOT a git repo yet.
- Money = integers (NPR, no paisa) in DB. Every `storeId` column indexed. Order total snapshotted at purchase time.
- Never hold/escrow customer money — keeps us from needing an NRB PSP license (Payment System Act 2019).
- Environment: Windows, bash shell, Node v24.18.0, npm 12.0.1.

## Review log (§5.8 — one line per review after each phase)
- **Phase 1 task gates** (per-task reviewer gates 1–9, controller + reviewer): all 9 ✅ APPROVED, 0 Critical/Important. Load-bearing rulings applied: redirect-never-in-try (×3 tasks), `"use server"` async-only exports (design consts split), `errorKey: TranslationKey` (not `string`), cross-field district refine uses object-level `.superRefine` (Zod 4 has no `ctx.parent`), `useRef` needs `| undefined` (React 19), client imports must avoid Node-only modules (upload-limits split).
- **code-review** (built-in, high effort, whole-phase diff `f9a008d..e5647df`, 2026-09-14): **1 finding (PLAUSIBLE) — FIXED** — slug-field's live availability check probed the raw draft (`sita's fashion`) rather than the slugified submit value → could show "available" while the real slug was taken. Fix (`e5647df`): check `checkSlug(slugify(draft))`. No other findings: tenant scoping on every query, redirects at statement level, React-escaped output (no XSS surface), no `any`/`console.log`/TODO in authored code, i18n parity enforced by types.
- **differential-review** (Trail of Bits, 2026-09-13, focused-adaptation — greenfield baseline, no prior commit to diff): FIXED — JWT session now expires after 7 days (`maxAge`). ACCEPTED (documented, Phase 3): no login rate-limiting yet (bcrypt compare is a natural throttle; NextAuth doesn't rate-limit built-in); `trustHost:true` for self-hosted dev (drop on Vercel); signup reveals email-exists (standard, matching big platforms). VERIFIED CLEAN: `.env` gitignored, `.env.example` uses placeholders only, no secrets in diff.
- **supply-chain-risk-auditor** (2026-09-13): npm-native sweep (collector needs `uv`+`gh` — not in this env; coverage = `npm audit` on installed tree). **4 high, 0 critical**, ALL transitive inside Prisma CLI tooling: `deepmerge-ts` (stack-exhaustion merge), `mysql2` (auth-downgrade + zlib-DoS — MySQL only, we are Postgres). npm's offered "fix" = downgrade to `prisma@6.19.3` (major back) — REJECTED. ACTION TRACKED: re-check for a clean fix when bumping to a `prisma@7.x` patch.
- **clean-code** (ciembor, 2026-09-13): PASS. Minor accepted: login/signup form markup duplication (2 forms, extracting a shared `<Field>` is over-abstraction at this size).
- **refactoring** — not run as separate pass; clean-code covers this scope. Full `differential-review`, `static-analysis`, `insecure-defaults` → scheduled at Phase 1 end & whenever auth/payment/delivery code lands (5.8 table).
- **insecure-defaults** (Trail of Bits, 2026-09-13, Workflow pipeline, 14 agents / 204 files / 67 patterns, status=findings): **2 confirmed — 1 MEDIUM, 1 LOW; 16 refuted; 3 unadjudicated** (`fail-open-security` on `.env:2/4` + `prisma/seed.ts:9` — all dev-only gitignored/manual-seed, no deploy manifests exist to make them reachable). FINDINGS FIXED:
  - MEDIUM `db.ts:13` `DATABASE_URL ?? ""` — pg treats empty string as absent → silently connects to libpq defaults (localhost:5432) behind auth. **FIXED**: raising lookup, boots with a loud error if unset. Overlaps sharp-edges F4.
  - LOW `next.config.ts` — `X-Powered-By: Next.js` on every HTML response (unconditional; no config override). **FIXED**: `poweredByHeader: false`, verified absent on live response.
  - Refuted examples (all with trace): demo cred in `seed.ts` (manual-only npm script, Prisma v7 never auto-seeds), `.env` local dev fixture (gitignored, never ships), `trustHost:true` (deliberate, commented; absent config fails closed via `UntrustedHost`), `.env.example` placeholder (Next never loads `.env.example`, and missing AUTH_SECRET throws `MissingSecret` — fail-secure).
- **static-analysis** (Trail of Bits, 2026-09-13, Semgrep 1.177.0 in `.venv-semgrep`, `p/javascript`+`p/typescript`, 24 rules, 20 files): **0 findings**. No build-at-phase-0 scanning tool needed beyond this.
- **sharp-edges** (Trail of Bits, 2026-09-13, agent workflow, verdict = nothing blocks Phase 1): fixed before Phase 1 — **F1** `jwt` callback now throws if `authorize()` returns no `user.id` (prevents a silent id-less session from arming a cross-tenant leak via Prisma stripping `undefined` from `where`); **F4** DB URL fail-fast (same fix as insecure-defaults MEDIUM). Deferred with notes in code: F2 (error-state discriminated union — code is correct today, flagged for refactor), F3 (unknown-email login skips bcrypt → timing oracle; and 2 duplicated password zods → single `userCredentialsSchema` at Phase 1), F5 (`trustHost` conditional-ize + pin AUTH_URL before Phase 5 OAuth), F6 (demo account gate `NODE_ENV!==production`), F7 (`AUTH_SECRET` boot guard) — F6+F7 must land before any real deploy.
- **initial `npm audit`**: 13 vulns (2026-09-12) → after pinning `prisma@7.10.0` CLI+client to match: **4 high**, all the Prisma-transitive set above. No further drip.

## How to run (after Phase 0)
- `npm run dev` → `http://localhost:3000`
- `npm run build` (must pass), `npx prisma studio` (inspect DB), `npx prisma migrate dev` (schema changes)