# Alpha Copilot — Web (production rebuild)

The Moonfare Alpha Copilot as a real, deployable website: **Next.js (App Router) +
TypeScript + Tailwind + Drizzle ORM**, with **every datapoint served from a database**.

The database is an embedded Postgres (**PGlite**) seeded from `src/data/alpha_seed.json`
on startup — so the site runs and deploys **anywhere, free, with zero external services**.
For a persistent production database, point `DATABASE_URL` at a free
[Neon](https://neon.tech) Postgres (see below).

## Run locally

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

`npm run build` produces an optimized production build; `npm start` serves it.

## Architecture

```
web/
  src/
    app/
      layout.tsx        # shell (topbar)
      page.tsx          # Portfolio overview — reads KPIs + allocation from the DB
      globals.css       # Moonfare design tokens + Tailwind
      api/state/route.ts# GET = full state from DB · POST = save a profile to DB
    db/
      schema.ts         # Drizzle tables: dataset, profile_saves, simulations
      client.ts         # embedded Postgres (PGlite), seeded on first use
      queries.ts        # typed data accessors (pages never read raw JSON)
    data/alpha_seed.json# the Moonfare dataset → loaded into `dataset` on startup
  public/assets/        # logos, hero images, wordmarks
```

**Every figure rendered comes from the `dataset` table** (one row per dataset key:
`portfolio`, `pm`, `mix`, `dims`, `cashflows`, `heldFunds`, …).

## Deploy (Vercel) — public URL + auto-updating dev URL

1. Push this repo to GitHub (already done: `HaleMarshall/Copilot`).
2. On [vercel.com](https://vercel.com) → **Add New → Project → import the repo**.
3. Set **Root Directory = `web`** (Vercel auto-detects Next.js).
4. Deploy. You now get:
   - **Production URL** (the public link you share) — redeploys automatically on every
     push to **`main`**.
   - **Preview URLs** (your dev links) — every other branch / pull request gets its own
     auto-deployed URL. Work on a `dev` branch, share its preview while `main` stays the
     safe public version, then merge `dev → main` to promote.

No environment variables are required for the embedded-DB demo.

### Optional: persistent database (Neon)

Saved profiles are per-instance with the embedded DB. For real persistence:

1. Create a free Postgres at [neon.tech], copy its connection string.
2. In Vercel → Project → Settings → Environment Variables, add `DATABASE_URL`.
3. Swap the driver in `src/db/client.ts` from `drizzle-orm/pglite` to
   `drizzle-orm/postgres-js` (schema + queries are unchanged), and run the seed once.
