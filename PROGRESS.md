# PROGRESS — SwiftShop: Nepal's E-commerce Website Builder

_Last updated: 2026-09-13. Update this file at the END of every session/phase._

## Phase status
- ✅ **Phase 0 — Foundation** — DONE 2026-09-13 (build passes, auth + i18n verified live). Cross-check with user in progress.
- ⬜ Phase 1 — Onboarding + products
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
- **Run the Phase 0 ✍️ Cross-check WITH THE USER**, then run the review pass (§5.8: `clean-code`, `refactoring`, `supply-chain-risk-auditor`, `differential-review`) and fix real findings, then commit tagged `phase-0`. Then begin Phase 1 (read `docs/PLAN.md` §14 Phase 1).

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

## Gotchas / notes for future sessions
- **Skills** are already installed — do NOT re-install. Verify with `claude plugin list` (8 enabled) + `clean-code`/`refactoring`/`code-complete` load. `static-analysis` needs Semgrep/CodeQL installed as a tool — only when §5.8 first calls for it (after auth/payment/delivery code).
- `/plugin`, `/compact` etc. are interactive only — not available in the desktop app directly; user runs them via keyboard/terminal.
- Project root currently: `webplan.md`, `skills-lock.json`, `.claude/` (settings + installed skills), `.agents/`. No code yet. NOT a git repo yet.
- Money = integers (NPR, no paisa) in DB. Every `storeId` column indexed. Order total snapshotted at purchase time.
- Never hold/escrow customer money — keeps us from needing an NRB PSP license (Payment System Act 2019).
- Environment: Windows, bash shell, Node v24.18.0, npm 12.0.1.

## Review log (§5.8 — one line per review after each phase)
- **differential-review** (Trail of Bits, 2026-09-13, focused-adaptation — greenfield baseline, no prior commit to diff): FIXED — JWT session now expires after 7 days (`maxAge`). ACCEPTED (documented, Phase 3): no login rate-limiting yet (bcrypt compare is a natural throttle; NextAuth doesn't rate-limit built-in); `trustHost:true` for self-hosted dev (drop on Vercel); signup reveals email-exists (standard, matching big platforms). VERIFIED CLEAN: `.env` gitignored, `.env.example` uses placeholders only, no secrets in diff.
- **supply-chain-risk-auditor** (2026-09-13): npm-native sweep (collector needs `uv`+`gh` — not in this env; coverage = `npm audit` on installed tree). **4 high, 0 critical**, ALL transitive inside Prisma CLI tooling: `deepmerge-ts` (stack-exhaustion merge), `mysql2` (auth-downgrade + zlib-DoS — MySQL only, we are Postgres). npm's offered "fix" = downgrade to `prisma@6.19.3` (major back) — REJECTED. ACTION TRACKED: re-check for a clean fix when bumping to a `prisma@7.x` patch.
- **clean-code** (ciembor, 2026-09-13): PASS. Minor accepted: login/signup form markup duplication (2 forms, extracting a shared `<Field>` is over-abstraction at this size).
- **refactoring** — not run as separate pass; clean-code covers this scope. Full `differential-review`, `static-analysis`, `insecure-defaults` → scheduled at Phase 1 end & whenever auth/payment/delivery code lands (5.8 table).
- **initial `npm audit`**: 13 vulns (2026-09-12) → after pinning `prisma@7.10.0` CLI+client to match: **4 high**, all the Prisma-transitive set above. No further drip.

## How to run (after Phase 0)
- `npm run dev` → `http://localhost:3000`
- `npm run build` (must pass), `npx prisma studio` (inspect DB), `npx prisma migrate dev` (schema changes)