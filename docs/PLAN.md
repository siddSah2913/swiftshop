# 📦 Plan: SwiftShop — Nepal's E-commerce Website Builder

---

## 1. Big Picture (Context)

**The problem:** A Nepali business owner (e.g., a clothing brand owner) has almost no easy way to get their **own** website where customers can see products and order. Their options today are bad:

- **Instagram / Facebook / WhatsApp selling** — photos + comments + orders tracked in a notebook; easy to lose track.
- **Daraz** — the owner is "a small fish" among thousands of sellers, pays fees, and has no own brand or own link.
- **Shopify / WooCommerce** — powerful, but they don't properly support **Nepali payments** (eSewa, Khalti, Fonepay QR) or **Nepali delivery partners**, and they're too technical/expensive for a small Nepali shop.

**What we build:** A platform (one website) where many owners each build **their own small e-commerce website** in minutes — like Shopify, but built only for Nepal. The owner: signs up, answers a few questions, picks a template, adds products (phone photos + caption + price in NPR), connects payment (COD + QR) and delivery (Nepal Can Move / Pathao / inDrive), gets a short link for their bio, and manages everything from their **phone**. 

**Our three combined differentiators:**
- 🧵 **Social-media-to-store** — owners selling with phone photos move into a real store fast.
- 📱 **Phone-first** — full owner experience on mobile; WhatsApp for customer contact.
- 🚚 **Automatic delivery handoff** — order in → pickup summary prepared + customer auto-notified → owner just confirms.

One **payment correction:** "PhonePe" is an **Indian** app that does **not** work in Nepal. The right Nepali options are **eSewa, Khalti, Fonepay QR**, plus **Cash on Delivery (COD)**. Version 1 = COD + QR; version 2 = real eSewa/Khalti online payment.

---

## 2. How It Feels — For the Owner

Example owner **"Sita"** with clothing brand **"Sita's Fashion"**:
1. Opens platform on her phone → taps **"Create my shop"**.
2. Answers 3 questions: *Shop name*, *what do you sell*, *which city*.
3. Picks the **"Clothing"** template.
4. Adds a product: photo of a kurta → "Kurta, black, cotton" → **Rs. 1,500** → save.
5. Payment: ticks **Cash on Delivery** + uploads her **eSewa QR photo**.
6. Delivery: picks **Nepal Can Move**, enters her courier account number.
7. Store live at **`sitasfashion.app`** → pastes link into her bio. 🎉
8. Customer orders → Sita's phone buzzes: **"New order #12"**.
9. She taps → Confirm order → **"Hand to Nepal Can Move"** → sees pickup summary → WhatsApp auto-sends to customer: *"Order #12 is on the way 🚚"*.
10. Money goes **directly** to Sita's own bank/eSewa account (or COD to the rider). **We never hold money.**

---

## 3. How It Feels — For the Customer

1. Opens `sitasfashion.app` → product photos, prices in NPR, **Nepali/English switch** at top.
2. Adds to cart → checkout → **COD** or **scan eSewa/Khalti/Fonepay QR**.
3. Gets **WhatsApp** order confirmation + delivery updates.
4. Talks to the shop via a WhatsApp button; sees the shop's phone number.

---

## 4. Tools We Will Use

You know JavaScript, Python, Node.js (learning) → this stack fits you and is the most common web stack (easiest to find help for).

| Tool | What it is | Why |
|---|---|---|
| **Next.js 14/15** (App Router) | JavaScript/Node.js web framework | One codebase for customer store + owner dashboard; server + browser in one project. |
| **TypeScript (strict mode)** | JS with safety checks | Catches mistakes before they are bugs. |
| **Tailwind CSS** | Styling tool | Fast, mobile-friendly, no messy CSS files. |
| **PostgreSQL** | Database ("filing cabinet") | Free, powerful, standard. |
| **Prisma** | Talks to the database from code | Safest, easiest data access. |
| **NextAuth (v5)** | Login/signup | Saves many hours of auth work. |
| **Zod** | Checks user input | Stops bad/corrupt data before it reaches the database. |
| **ESLint + Prettier** | Auto-checks code quality + formatting | Keeps code uniform = fewer reading errors. |

### Exact initial setup commands (Windows PowerShell, inside `D:\#helpweb`)
```bash
npx create-next-app@latest .        # Next.js + TypeScript + Tailwind + ESLint in one answer
npm i prisma @prisma/client         # database helper
npx prisma init                     # creates prisma/schema.prisma + .env
npm i @auth/prisma-adapter next-auth@beta   # login system
npm i zod                           # input validation
npm i bcryptjs                      # password security (plain) — or next-auth's own hashing
npm i date-fns                      # easy date formatting (en+ne)
```
> Versions: install **latest stable** at the time. `--dry-run` first if unsure.

---

## 5. Code Standards (to keep code readable + fewer errors)

These rules apply to **every file** from day one.

### 5.1 Naming rules
- **Files:** `kebab-case` (e.g., `order-actions.ts`, `product-form.tsx`).
- **React components:** `PascalCase` (e.g., `ProductCard.tsx`).
- **Functions/variables:** `camelCase` (e.g., `getOrderById`, `orderTotal`).
- **Database models/tables:** `PascalCase` (e.g., `OrderItem`), fields `camelCase`.
- **Route URLs:** `kebab-case`, never show database ids in URLs — always use slugs or short ids.

### 5.2 Comment standard (balanced — not too many, not too few)
- **Explain WHY, not WHAT.** The code shows *what*; comments explain *why this choice* or *why this special case exists*.
- **One JSDoc/TSDoc-style header** on every shared/public function: what it does, params, what it returns, when it might error.
- **Section banner comments** in long files: `// ===== Orders: status transition =====`.
- **Always comment** a "magic number" or a non-obvious business rule (e.g., delivery fee rules, tax 13% VAT).
- **Never** leave a comment that just repeats the code (`// adds 1 to x`). ❌
- **Never** commit `console.log` debug noise; use a small logger (section 5.6).

### 5.3 TypeScript safety (fewer bugs)
- `"strict": true` in `tsconfig.json` — always on.
- No `any`. If type truly unknown, use `unknown` and check before using.
- All API function param/returns typed. Zod types reused between form and server.

### 5.4 Folder organization (feature-based)
- Group by **feature**, not by type: `src/features/orders/`, `src/features/products/`, `src/features/shop/`, `src/features/auth/`.
- Each feature folder holds its own server actions, components, helpers, and tests.
- Shared code (auth, db, adapters, i18n) lives in `src/lib/`.
- Reason: when a future developer opens `src/features/orders/` they see *everything* about orders in one place.

### 5.5 Keep components small
- One component = one job. If a file grows past ~150 lines, split it.
- Presentational (visual) components get NO database calls — data comes in as props (this keeps them testable and reusable).

### 5.6 Error handling standard (the big bug-reducer)
Every server action / API route follows ONE pattern:
```ts
try {
  // 1. validate input with Zod
  // 2. check the owner is allowed (requireStore)
  // 3. do the work (db write)
  // 4. return { ok: true, data }
} catch (e) {
  log("feature:some-action", e);          // server-side log w/ context
  return { ok: false, error: "Friend message" }; // NEVER leak stack traces to browser
}
```
- One shared `log()` helper in `src/lib/log.ts` — timestamp + tag + message (server only).
- Client shows friendly text only; console keeps details.

### 5.7 Git / safety rules
- `git init` on day one. Commit after **each phase**, tagged `phase-0`, `phase-1`, etc.
- Main branch protected; always work on a feature branch per phase, merge on completion.
- `.env` (secrets) never committed — only `.env.example`.

### 5.8 Review Skills — which one to use, WHEN and WHERE
Installed in **Phase 0, Step 0**. Use them after **every phase finishes** (and after any bug-fix burst), before committing.

| When (trigger) | Where (scope) | Skill to run | What it checks |
|---|---|---|---|
| **End of every phase** | Whole phase's new code | `differential-review` (Trail of Bits) | Security review of the code changes vs. git history |
| **End of every phase** | Whole phase's new code | `clean-code` + `refactoring` (ciembor) | Readability: naming, small functions, structure |
| **End of every phase** | `package.json` dependencies | `supply-chain-risk-auditor` (Trail of Bits) | npm packages with known hacks/vulnerabilities |
| **After any auth/payment/delivery code** | `src/lib/auth.ts`, `src/lib/payments/`, `src/lib/delivery/` | `insecure-defaults` + `sharp-edges` (Trail of Bits) | Hardcoded secrets, weak crypto, dangerous config |
| **Add-a-new-feature** | Whole feature folder (e.g., `src/features/orders/`) | `static-analysis` (CodeQL/Semgrep, Trail of Bits) | Injection (SQL/XSS), unsafe data access, bugs |
| **Before any release / going live** | Entire codebase | `second-opinion` (Trail of Bits) + built-in `/security-review` | Fresh-cyes security pass by a second reviewer |
| **When a security report/bug arrives** | The affected file(s) | `vulnerability-triage-brocards` + `fp-check` (Trail of Bits) | Check if the report is real, not a false alarm |
| **Same-time quick check** | Whole phase's new code | Built-in `/code-review` + `/security-review` | Fast built-in safety net (works without plugins) |
| **Once per week (or per 5 phases)** | `.claude/settings.json`, `.env*` | `insecure-defaults` | Secrets/keys accidentally saved to the repo |

> **Golden rule:** review BEFORE commit, never after. A review that finds nothing is a normal good result — do not let it block progress. Log each review result in `PROGRESS.md` (one line: what ran, findings fixed?).

---

## 6. Working Across Many Sessions (how context is never lost)

This is a big project — it WILL span many conversations. To survive context-compaction (when an old conversation is shortened), we keep everything recoverable on disk.

### 6.1 `PROGRESS.md` (in repo root) — updated at the END of every session
Headers fixed, so the next session (or the model after compaction) instantly knows state:
```md
# PROGRESS
## Phase status        ← 0..6 each marked ✅done / 🔄in progress / ⬜pending
## Done in this session ← list files + decisions
## Next step           ← the very next concrete action
## Gotchas             ← bugs/quirks discovered (save hours later)
## How to run          ← npm install && npm run dev ...
```

### 6.2 `docs/DECISIONS.md` — every important choice + WHY
e.g., *"Chose manual-first delivery: no partner has a public API yet (2026-09)."* Why survives even if the plan file is forgotten.

### 6.3 Rules of work
- **One phase per session.** Start a session by reading `PROGRESS.md` + `docs/PLAN.md`, never from memory.
- Copy this plan into the repo as **`docs/PLAN.md`** right after approval — future sessions read it there.
- Each phase ends by (1) passing its Definition of Done tests, (2) running the **review pass** in `5.8` and fixing any findings, (3) committing with a phase tag, (4) updating `PROGRESS.md`.
- If compaction happens mid-phase, the model re-reads `PROGRESS.md` + `docs/PLAN.md` + the phase folder and continues — nothing is lost.

---

## 7. Project Structure (full tree to build)

```
D:\#helpweb\
├── PROGRESS.md                  ← session state (section 6)
├── docs/PLAN.md                 ← this plan, copied in
├── docs/DECISIONS.md            ← choices + reasons
├── .env.example                 ← what secrets to fill (DB URL, auth secret, later gateway keys)
├── prisma/schema.prisma         ← database shapes (section 8)
├── public/uploads-original/     ← safe folder for owner product photos (v1)
├── src/
│   ├── app/
│   │   ├── layout.tsx           ← root: language switcher, fonts
│   │   ├── page.tsx             ← marketing landing ("Create my shop")
│   │   ├── signup/  login/      ← auth pages
│   │   ├── onboarding/          ← "Create my shop" wizard (3 steps)
│   │   ├── dashboard/           ← OWNER area (mobile-first)
│   │   │   ├── layout.tsx       ← sidebar + top bar (bottom tab bar on phones)
│   │   │   ├── page.tsx         ← "Today" overview: new orders, sales today
│   │   │   ├── orders/page.tsx  ← order list (search, filter by status)
│   │   │   ├── orders/[id]/page.tsx ← order detail: customer, items, status buttons, WhatsApp
│   │   │   ├── orders/actions.ts     ← SERVER actions: confirm, handover, deliver, markPaid
│   │   │   ├── products/page.tsx     ← product list + bulk add
│   │   │   ├── products/new/next.tsx ← quick-add form (photo, caption, price)
│   │   │   ├── products/[id]/edit/page.tsx
│   │   │   ├── products/actions.ts
│   │   │   ├── customers/page.tsx    ← customer list + WhatsApp message
│   │   │   ├── customers/actions.ts
│   │   │   ├── settings/page.tsx     ← shop name, slug, city; payment QR; delivery partner
│   │   │   └── design/page.tsx       ← template, colors, logo
│   │   └── [shop]/                 ← CUSTOMER store (public)
│   │       ├── layout.tsx          ← reads store by slug, theme
│   │       ├── page.tsx            ← product grid (home)
│   │       ├── product/[id]/       ← product detail
│   │       ├── cart/               ← cart page
│   │       └── checkout/           ← COD or QR, order placed thanks page
│   ├── features/                   ← feature folders (section 5.4)
│   │   ├── orders/  products/  shop/  customers/  settings/  auth/
│   ├── lib/
│   │   ├── db.ts                   ← Prisma client (single shared instance)
│   │   ├── auth.ts                 ← NextAuth config + session helpers
│   │   ├── require-store.ts        ← TENANT GUARD (used by every dashboard page)
│   │   ├── log.ts                  ← standard logger
│   │   ├── i18n.ts                 ← t(locale, key) helper
│   │   ├── payments/               ← payment adapter registry
│   │   │   ├── types.ts  index.ts  cod.ts  qr.ts  (later: esewa.ts khalti.ts)
│   │   └── delivery/               ← delivery adapter registry
│   │       ├── types.ts  index.ts  self.ts  ncm.ts  pathao.ts  indrive.ts
│   ├── components/                 ← shared UI buttons, cards, modals, LanguageSwitcher
│   ├── locales/en.ts  ne.ts        ← ALL text in one file each (section 10)
│   └── middleware.ts               ← protects /dashboard (redirects to login)
```

---

## 8. Database Shapes (Prisma schema — field by field)

```prisma
model User {
  id        String  @id @default(cuid())
  email     String  @unique
  name      String?
  passwordHash String?
  store     Store?
  createdAt DateTime @default(now())
}

model Store {
  id        String @id @default(cuid())
  owner     User @relation(fields: [ownerId], references: [id])
  ownerId   String @unique
  slug      String @unique           // "sitasfashion" — the URL word
  name      String
  category  String                   // clothing | electronics | general
  city      String
  template  String @default("clothing")
  primaryColor String @default("#0F766E")
  logoUrl   String?
  tagline   String?
  paymentCod Boolean @default(true)
  qrImageUrl String?                 // owner's eSewa/Khalti/Fonepay QR photo
  deliveryPartner String @default("self")  // self | ncm | pathao | indrive
  courierAccountNo String?           // owner's id at the courier
  whatsappNumber String?             // shop GW / owner phone for customer chat
  products  Product[]
  orders    Order[]
  customers Customer[]
}

model Product {
  id        String @id @default(cuid())
  storeId   String
  store     Store @relation(fields: [storeId], references: [id])
  name      String
  caption   String @default("")
  priceNpr  Int                      // integers only — no ₹paise floating errors
  stock     Int @default(0)          // -1 = unlimited/sold-out handled by stock==0 + available
  available Boolean @default(true)
  imageUrls String[]                 // photo paths
  createdAt DateTime @default(now())
  @@index([storeId])
}

model Customer {
  id       String @id @default(cuid())
  storeId  String
  name     String
  phone    String
  address  String?
  orders   Order[]
  createdAt DateTime @default(now())
  @@index([storeId])
}

model Order {
  id          String @id @default(cuid())
  storeId     String
  orderNo     Int                    // human number: 1,2,3 per store (increment)
  status      String @default("new") // new→confirmed→handed→delivered | cancelled
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  items       OrderItem[]
  totalNpr    Int
  paymentType String @default("cod") // cod | qr | (later: esewa|khalti)
  paymentStatus String @default("unpaid") // unpaid|paid
  deliveredAt DateTime?
  createdAt   DateTime @default(now())
  @@unique([storeId, orderNo])
  @@index([storeId, status])
}

model OrderItem {
  id        String @id @default(cuid())
  orderId   String
  order     Order @relation(fields: [orderId], references: [id])
  productId String?
  name      String                   // snapshot of product name at order time
  priceNpr  Int
  qty       Int
}

model Delivery {
  id          String @id @default(cuid())
  orderId     String @unique
  partner     String                 // self|ncm|pathao|indrive
  status      String @default("ready") // ready|handed|in_transit|delivered
  trackingRef String?                // courier tracking number
  manifest    String?                // the copy-paste pickup summary
  handedAt    DateTime?
  deliveredAt DateTime?
}
```
- **Money = integers** (NPR paisa avoided) — prevents the most common money bug.
- Every `storeId` column has an index → fast, correct lookups.
- Order total is **snapshot** of items at purchase time (price changes later don't rewrite history).

---

## 9. Payment — How It Works (adapter design)

**Design rule:** platform **never holds money.** Money goes customer → owner's account. This avoids needing an NRB PSP license.

### Payment adapter interface (`src/lib/payments/types.ts`)
```ts
export interface PaymentAdapter {
  id: string;                 // 'cod' | 'qr' | 'esewa' | 'khalti'
  label: string;              // "Cash on Delivery", "Scan QR"
  supportsOnline: boolean;    // false for v1; true once gateway API connected
  // v1 (COD + QR):
  markPaidAdaptersAvailable: true;  // owner taps "Received ✓"
  // v2 (real online gateways):
  createPayment(order): Promise<PaymentInitResult>;   // later
  verifyPayment(txnId): Promise<'paid'|'pending'|'failed'>; // later, SERVER-side only
}
```
Registry `src/lib/payments/index.ts`:
```ts
const adapters: Record<string, PaymentAdapter> = { cod, qr };
export function getAdapter(id: string): PaymentAdapter { ... }
```
- **COD:** order saved as `unpaid`; becomes `paid` when owner marks it (or COD = automatically "paid" on delivered).
- **QR:** checkout shows owner's `qrImageUrl`; owner taps "Received ✓" to mark paid.
- **Later (phase 5):** eSewa/Khalti adapters with **server-side verification** (never trust the browser callback — a security must). Sandbox first (fake money) — Khalti and eSewa both offer test environments.

---

## 10. Delivery — How It Works (adapter design)

No delivery partner has a fully public API today (2026-09); Nepal Can Move is the most promising. So: **manual-first, API-ready.**

### Delivery adapter interface (`src/lib/delivery/types.ts`)
```ts
export interface DeliveryAdapter {
  id: string;                 // 'self' | 'ncm' | 'pathao' | 'indrive'
  label: string;
  isApiConnected: boolean;    // false in v1
  generateManifest(order, customer): string;  // v1: copy-paste pickup summary
  // v2 (when partner provides API):
  createPickup(order, manifest): Promise<DeliveryInitResult>;
  track(ref): Promise<TrackingInfo | null>;
}
```
Registry in `src/lib/delivery/index.ts`; `self.ts` for shop's own delivery.

### Order status flow (single source of truth)
```
new → confirmed → handed → delivered
           ↘ cancelled
```
Status actions (all in `orders/actions.ts`, all guarded by tenant + Zod):
1. **Confirm order** (`new → confirmed`) — optionally replies to customer via WhatsApp link.
2. **Hand to partner** (`confirmed → handed`) — REQUIRES choosing partner; writes `manifest` + optional `trackingRef`; produces the WhatsApp message; customer gets notification link.
3. **Mark delivered** (`handed → delivered`) — sets `deliveredAt`, sets COD to paid.
4. **Cancel** (any → `cancelled`) — with required reason.
Delivery screen shows the **manifest** in a copy-paste box — owner pastes into Nepal Can Move/Pathao/inDrive app. For **self-delivery**, owner just marks delivered after visiting.

---

## 11. Social-to-Store (the 🧵 difference)

- **Quick-add products:** phone photo + caption + price → saved in seconds. Multi-photo select → caption each → save all.
- **Ads-ready link:** store on `slug.app` → owner pastes in IG/FB/TikTok bio.
- **WhatsApp ordering button** on each product and the store home — chat-first buyers can order that way too.
- (Phase 6, later) import existing Facebook/Instagram album photos.

---

## 12. Bilingual English + Nepali (नेपाली)

- All UI text lives in **two typed files**: `src/locales/en.ts` and `ne.ts`. Same shape (so TypeScript catches a missing word).
- Helper `src/lib/i18n.ts`: `t(locale, "orders.new")` → returns the right string. Default locale comes from a `?lang=` + stored preference cookie; the **LanguageSwitcher** component flips it.
- Storefront and dashboard both switch instantly — customers read the shop in **their** language.

---

## 13. Templates (3 skins, one shared component system)

1. **Clothing / Fashion** — large hero photo, tidy grid, size/colour tags.
2. **Electronics / Gadgets** — dense product grid, spec lines, stock badges.
3. **General / Kirana / Handmade** — friendly, colorful, simple.
Each = `src/components/templates/<name>/` with shared `ProductCard`, `CartDrawer`, `Footer`. Switching template **never deletes products** (template is just a design choice on the store).

---

## 14. Build Phases (one-per-session; each phase ends with tests passing AND reviews run per 5.8)

> **How to read these phases:** each one lists Tasks → **Done** (what "finished" means) → **✍️ Cross-check for YOU** (open these files, run these commands, and SEE it working yourself). If any cross-check fails, the phase is NOT done — tell Claude and it gets fixed before moving on.

### Phase 0 — Foundation ✅
Tasks:
- **Step 0 — Install review skills (DO FIRST, before any code) — ✅ DONE 2026-09-12, verified:**
  - **Trail of Bits security skills** — ✅ installed & enabled (8 plugins, scope=project).
    ```bash
    claude plugin marketplace add trailofbits/skills
    claude plugin install static-analysis@trailofbits -s project -y
    claude plugin install differential-review@trailofbits -s project -y
    claude plugin install insecure-defaults@trailofbits -s project -y
    claude plugin install sharp-edges@trailofbits -s project -y
    claude plugin install supply-chain-risk-auditor@trailofbits -s project -y
    claude plugin install second-opinion@trailofbits -s project -y
    claude plugin install vulnerability-triage-brocards@trailofbits -s project -y
    claude plugin install fp-check@trailofbits -s project -y
    ```
    Installed from `trailofbits/skills` → cache: `C:\Users\sidds\.claude\plugins\cache\trailofbits\`. Enabled state saved in project `.claude/settings.json` (`enabledPlugins`).
  - **Readability/book skills** — ✅ installed (project `.claude/skills/` + `.agents/skills/`).
    ```bash
    npx skills add ciembor/agent-rules-books --skill clean-code
    npx skills add ciembor/agent-rules-books --skill refactoring
    npx skills add ciembor/agent-rules-books --skill code-complete
    ```
    Verified active: `clean-code`, `refactoring`, `code-complete` (all appear in the session's available-skills list).
  - **Next time a session starts:** confirm `claude plugin list` shows the 8 plugins enabled and the 3 readability skills load. No re-install needed. If a plugin needs an external tool (e.g., Semgrep/CodeQL for `static-analysis`), install that tool only when the plan's 5.8 table first calls for it (after new auth/payment/delivery code).
- Fill the two secret values (DB connection + auth secret) — see `.env.example`.
- Scaffold Next.js+TS+Tailwind; git init (branch `main`, first commit tagged `phase-0`).
- Prisma models (section 8) + `prisma migrate dev` + a seed script (`prisma/seed.ts`) that makes a demo owner + store + products.
- NextAuth v5: signup/login, `src/lib/auth.ts`, guard `/dashboard` in middleware.
- i18n skeleton: `en.ts`/`ne.ts` + `t()` + `LanguageSwitcher`.
- `src/lib/log.ts`, `src/lib/db.ts`, `.env.example`, `PROGRESS.md`, `docs/PLAN.md`, `docs/DECISIONS.md`.
**Definition of Done:** `npm run dev` → from landing page you can sign up, log in, and flip the site to नेपाली. Demo store rows exist (check via Prisma Studio: `npx prisma studio`). All review skills from **Step 0** load correctly, and the `clean-code` + `differential-review` passes come back clean (or findings fixed).

**✍️ Cross-check for YOU (open these to verify Phase 0 is really done):**
- Open `package.json` → see `next`, `react`, `prisma`, `@prisma/client`, `next-auth`, `zod` listed.
- Open `prisma/schema.prisma` → see the `User`, `Store`, `Product`, `Customer`, `Order`, `OrderItem`, `Delivery` models (section 8 of the plan).
- Open `src/app/page.tsx` (landing), `src/app/login/page.tsx`, `src/app/signup/page.tsx` → they exist.
- Open `src/locales/en.ts` and `ne.ts` → same text in both languages.
- Run `npm run build` → must say "Compiled successfully" (no errors).
- Run `npm run dev` → open `http://localhost:3000` → sign up → log in → flip to नेपाली.
- Run `npx prisma studio` → you should SEE the demo owner + store + products rows.

### Phase 1 — Welcoming the owner (onboarding + products)
Tasks:
- `app/onboarding/` wizard: shop name → category → city → slug auto-suggest (validate availability; Zod + friendly error "that name is taken") → creates `Store` + links owner.
- Template picker + design page (logo upload, primary color).
- Products: quick-add form; list; edit; delete; bulk photo add; photo stored in `public/uploads-original/<storeId>/` (filename = cuid).
**Done:** Owner creates a store, picks Clothing template, adds products, sees them in a list.

**✍️ Cross-check for YOU:**
- In the browser (or phone-width via Chrome `Ctrl+Shift+M`), sign up → tap **"Create my shop"** → answer the 3 questions → pick the Clothing template.
- Open `src/app/onboarding/` → each step's page is there.
- Add a product: photo + caption + price → go back to the product list → **your product appears**.
- Open the design page → change the **primary color** → refresh the store view → color changed.
- In `npx prisma studio`, open **Store** and **Product** → the row you created is there with your data.

### Phase 2 — Customer storefront + checkout
Tasks:
- `app/[shop]/` pages: home grid, product detail, cart, checkout.
- Checkout collects name+phone+address (Zod: Nepali phone pattern `98|97|96…`, address required when delivery); creates Customer + Order + OrderItem + Delivery.
- Payment choice: COD or Scan QR (shows `qrImageUrl` larger). Thank-you page shows order number.
- Per-store notes: shop can set a "Thank you" message.
**Done:** Place a COD order as a "customer" and a QR order; both appear in the owner dashboard; tenant rule verified (see 16-testing).

**✍️ Cross-check for YOU:**
- Open the customer store at your own slug (`http://localhost:3000/<yourshop>` — the link shown after setup). See the product grid.
- Add a product to cart → checkout → enter a name/phone/address → pick **COD** → order success page shows your order number.
- Place a second order, pick **Scan QR** → the QR image you uploaded appears bigger.
- In `npx prisma studio`: open **Order**, **OrderItem**, **Customer**, **Delivery** → the orders you just placed are stored with correct totals.
- **Tenant rule test (important):** log in as a *second* owner → open the first owner's order URL → you must get a "not found" / access-denied page, NOT the order.

### Phase 3 — Owner dashboard: Orders + Customers (phone-first)
Tasks:
- Dashboard shell with **bottom tab bar on mobile** (Orders / Products / Customers / More).
- Orders list (search by name/phone/orderNo; filter chips: New/Confirmed/Handed/Delivered/Cancelled).
- Order detail: items, customer, WhatsApp-me button (pre-filled message), status action buttons.
- Customers list: name+phone+address, order history count, WhatsApp message button.
- All server actions in `features/orders/actions.ts` etc., guarded + validated.
**Done:** Full order lifecycle usable from a phone-width window; search and filters work.

**✍️ Cross-check for YOU:**
- Open `http://localhost:3000/dashboard` on phone-width (`Ctrl+Shift+M` → iPhone) → see the **bottom tab bar** (Orders / Products / Customers / More).
- Your test orders from Phase 2 are listed with status "New".
- Tap one order → see the customer's name, phone, address, the items, and the total.
- Tap **"Confirm order"** → status becomes "Confirmed". Then tap **"Mark delivered"** → "Delivered".
- Open **Customers** → your tester's name shows with how many orders they placed.
- Try the **search** box: type the customer's name → only their orders show.
- Tap the **WhatsApp** button → a `wa.me` link opens with a pre-filled message.

### Phase 4 — Delivery automation
Tasks:
- Delivery adapters: `self`, `ncm`, `pathao`, `indrive` — with `generateManifest()` each (full manifest: order no, shop, customer, address, phone, items, total, payment type).
- "Hand to partner" button flow: choose partner → preview manifest → copy → enter tracking ref (optional) → status `handed`.
- **Auto-WhatsApp:** generated `wa.me/<customerPhone>?text=<message>` links on status changes (v1 = click-to-chat, free, no Meta approval). Seen on Order detail + order page.
- Order status flow enforcement in one helper `transitionOrder()` (rejects illegal jumps, logs reason).
**Done:** Place order → confirm → hand to NCM → copy manifest → see WhatsApp message preview → delivered.

**✍️ Cross-check for YOU:**
- Open the delivery adapters: `src/lib/delivery/self.ts`, `ncm.ts`, `pathao.ts`, `indrive.ts` → each has a `generateManifest()`.
- In the dashboard, open an order → **"Hand to partner"** → choose **Nepal Can Move**.
- You see the **pickup summary (manifest)** as copy-paste text: order no, shop, customer, address, phone, items, total, payment type. Copy it → open the Nepal Can Move app/portal → paste → it's complete.
- Enter (or let it auto-fill) a **tracking number** → tap "Mark handed over" → status becomes "Handed".
- Look at the **WhatsApp message preview** sent to the customer → it mentions the order number and tracking reference.
- Mark **Delivered** → status reaches the end of the flow. Confirm the status bar never lets you skip (e.g., "New" can't jump straight to "Delivered").

### Phase 5 — Real online payments (later, still spec'd)
- eSewa adapter (Intent flow) then Khalti adapter, in `src/lib/payments/`.
- SERVER-side `verifyPayment` on the payment-callback route before marking `paid`. Sandbox keys first.
- Owner benefits: money lands directly in their gateway merchant account; platform sees `paymentStatus` only.
**Done:** A sandbox payment returns to our site and the order flips to `paid` after server verification.

**✍️ Cross-check for YOU (safe — fake money only):**
- Open `src/lib/payments/esewa.ts` (and `khalti.ts`) → both implement `createPayment` + `verifyPayment` (server-side; the browser is NEVER trusted to say "paid").
- Use the gateway's **sandbox/test** account (fake money — safe).
- Place an order → choose **eSewa** → you're taken to the test payment page → complete it (fake money).
- You come back to the site → the order status flips to **"Paid"** — but only after the **server** double-checked the payment with eSewa. (Look for `verifyPayment` being called in the callback route — this is the security step.)
- Now proving we designed it right: an order marked "unpaid" **cannot** be marked delivered without payment, if that's the shop's chosen setting.

### Phase 6 — Polish (later)
- WhatsApp Business API (auto-send w/o tap; needs Meta approval + fee), product link sharing, Excel order/customer export, analytics (best sellers, top customers), Nepal Can Move real API when released, custom domains (`.com.np`), proper photo cloud storage (Cloudinary), storefront analytics, refund/return flow.

---

## 15. Legal Checklist (plain guidance — NOT legal advice)

1. Register the company in Nepal (Pvt. Ltd.), get **PAN/VAT**.
2. **Trademark:** check if "SwiftShop" is already registered/taken in Nepal (Nepal's Department of Industry, Industrial Property Division) + domain availability; apply to register the mark if clear. Note: "Swift" overlaps with Apple's programming-language brand — the lawyer should confirm no conflict.
3. Publish: Terms of Service, **Privacy Policy** (Privacy Act 2075/2018), Refund/Return policy template for shops.
4. Payments: shop owners register as merchants with eSewa/Khalti/Fonepay (PAN + company + bank + KYC). **No escrow** on our platform → no NRB PSP license needed. Reconfirm NRB rules (Payment System Act 2019) at go-live.
5. Delivery: simple written agreements with Nepal Can Move / Pathao / inDrive; owners open their own courier accounts; COD settlement terms in the courier agreement.
6. **Before launch:** lawyer review ✓ sandbox payment tests ✓ privacy + terms pages live ✓.

---

## 16. How to Test End-to-End (local, Windows)

Per phase, run its checklist:
- **Every phase:** `npm run build` (must pass) + `npm run dev`.
- **Every phase, right after tests pass:** run the review pass from **5.8** (`differential-review`, `clean-code`/`refactoring`, `supply-chain-risk-auditor`) and fix every real finding before the phase commit. Log one line per review in `PROGRESS.md`.
- **Login as 2 owners** → owner B must get a **"not found"** page opening owner A's order (tenant safety — the #1 must-pass test).
- **Storefront in one tab, dashboard in another:** place order → it appears in dashboard instantly → confirm → hand to partner → copy manifest text looks right → WhatsApp message preview looks right → delivered.
- **Phone test:** Chrome `F12` → device toolbar / `Ctrl+Shift+M` → set "iPhone 14" → dashboard bottom tab bar works, buttons tappable.
- **Language:** flip English ↔ नेपाली on storefront and dashboard → every label changes (any missing key shows immediately because `t()` types its keys).
- **Phase 5:** Khalti sandbox with test method to confirm callback → server verify → `paid`.
- `npx prisma studio` to inspect rows at any time.

---

## 17. Glossary (hard words, simply explained)

- **API** — the "menu" a program gives other programs to talk to it.
- **Adapter** — a small bridge so we can swap partners (eSewa ↔ Khalti, NCM ↔ Pathao) without rebuilding.
- **COD** — Cash on Delivery: customer pays when the parcel arrives.
- **Dashboard** — the owner's control panel after login.
- **Database / table** — electronic filing cabinet; a table is one drawer ("Orders").
- **Gateway** — the licensed company that moves the money (eSewa, Khalti, Fonepay).
- **KYC** — "Know Your Customer": proving identity + business before a gateway lets you accept money.
- **Locale / i18n** — making a site multilingual (English + Nepali).
- **MVP** — Minimum Viable Product: the smallest useful version, built first.
- **Multi-tenant** — one platform serving many separate stores, each isolated.
- **NPR** — Nepali Rupees.
- **PSP** — Payment Service Provider; licensed money company (eSewa, Khalti).
- **Sandbox** — safe practice world with fake money.
- **Slug** — the short word in a link (`sitasfashion` in `sitasfashion.app`).
- **Template** — ready-made page design the owner picks and customizes.
- **Webhook / callback** — a gateway computer's message to our computer confirming payment.
- **QR** — the square barcode you scan to pay.
- **Escrow** — holding customer money and passing it on (we avoid this by law).
- **Server-side verification** — the computer (not the browser) double-checks the payment happened — a security must.
- **Zod** — a tool that validates/municipal-checks user input before it enters the database.
- **Prisma Studio** — a visual browser for the database, great for checking data during dev.

---

## 18. Open Points (to settle before coding starts)

- **Platform name: "SwiftShop" — DECIDED 2026-09-12** (user + other-AI brainstorm). Alternatives considered: Pasal, Sanduk, DigiPasal, OwnPasal. **Open before launch:** check "SwiftShop" trademark clearance in Nepal + domain availability (`swiftshop.com.np` / `.com`); "Swift" overlaps with Apple's programming language brand — verify it's safe to use. Add findings to `docs/DECISIONS.md`.
- Whether stores live on a subdomain (`sitasfashion.<platform>.com`) in v1; custom domains later.
- Which province/districts the owner can pick as shop city (a small dropdown list).
- Owner pricing (free while building; monetization later — out of v1 scope).
- Photo storage stays local for v1 (Cloudinary later per Phase 6).
- WhatsApp auto-messages v1 = click-to-chat links only (free). Full auto-send = Phase 6.