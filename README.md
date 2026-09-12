# SwiftShop

Nepal's easiest way to own a shop online. Business owners create their own e-commerce store in minutes — product photos + NPR prices, Nepali payments (CN → eSewa/Khalti/Fonepay QR), Nepali delivery (self / Nepal Can Move / Pathao / inDrive), and WhatsApp-first order management. Full plan: **`docs/PLAN.md`**, live state: **`PROGRESS.md`**, decisions: **`docs/DECISIONS.md`**.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 · PostgreSQL · Prisma 7 (driver adapter) · NextAuth v5 (credentials + JWT) · Zod · bcryptjs · date-fns

## Getting started (local)

Requires **Docker** (for Postgres) + **Node 20.19+**.

```bash
docker run -d --name swiftshop-postgres -p 5433:5432 \
  -e POSTGRES_USER=swiftshop -e POSTGRES_PASSWORD=swiftshop \
  -e POSTGRES_DB=swiftshop postgres:16-alpine

npm install
cp .env.example .env        # fill DATABASE_URL / AUTH_SECRET
npx prisma migrate dev      # create tables
npm run seed                # demo data
npm run dev                 # → http://localhost:3000
```

Demo login: `demo@swiftshop.local` / `demo1234`. Inspect rows anytime with `npx prisma studio`.

## Phase status

| Phase | What | Status |
|---|---|---|
| 0 | Foundation (scaffold, DB, auth, i18n) | ✅ |
| 1 | Onboarding + products | ⬜ |
| 2 | Customer storefront + checkout | ⬜ |
| 3 | Owner dashboard: orders + customers | ⬜ |
| 4 | Delivery automation | ⬜ |
| 5 | Real online payments (eSewa/Khalti) | ⬜ |
| 6 | Polish | ⬜ |