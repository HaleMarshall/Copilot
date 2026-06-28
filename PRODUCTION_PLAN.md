# Alpha Copilot → production website: plan & status

Goal: turn the prototype (a single Design-Component HTML file rendered by a local
Python server) into a real, hostable website — framework-based, backed by a real
database, with a stable public URL and an auto-updating dev URL.

## Repo layout (now)

```
Copilot/
  web/                         # NEW — the production website (Next.js + Drizzle + Postgres)
  meetings/                    # NEW — all meeting docs, transcripts & reviews
  Meta Use Case/
    Copilot user interface design/   # the original prototype (.dc.html + Python) — kept as the reference spec
```

## Decisions (agreed)

- **Framework rebuild** in Next.js (App Router) + TypeScript + Tailwind.
- **Real database**, seeded with the existing fake data; every datapoint served from it.
- **Hosting**: Vercel — free, auto-deploys from GitHub, gives a production (public) URL
  plus per-branch preview (dev) URLs. Work on `dev`, share its preview while `main`
  stays the safe public version; merge to promote.

## Status

- ✅ Repo reorganised; `meetings/` created.
- ✅ `web/` Next.js app scaffolded, builds and runs (`npm run build` passes).
- ✅ Database layer (Drizzle + embedded Postgres) seeded from the dataset; `/api/state`
  and the Portfolio Overview page read entirely from the DB.
- ⏳ Porting the full Understand / Shape / Act / Research experience page by page.
- ⏳ Go-live: connect the repo on Vercel (one-time login) → public + dev URLs.

## What needs you (one-time)

1. **Vercel**: sign in at vercel.com, import `HaleMarshall/Copilot`, set Root Directory
   to `web`. That produces the public URL and the auto-deploying preview URLs.
2. *(Optional)* **Neon Postgres** for persistent saved profiles — add `DATABASE_URL`
   in Vercel (see `web/README.md`). The demo works without it.

## Migration phases

1. **Foundation** (done): framework + DB + deploy model + first DB-backed page.
2. **Design system + shell**: port tokens, nav (Understand/Shape/Act/Research), Ask Alpha rail.
3. **Understand**: Portfolio Overview + dimension detail + funds detail pages.
4. **Shape**: Simulator (per-dimension target cards) + Comparison.
5. **Act**: Opportunities (sequence → fund logos), Secondaries, Missed.
6. **Research**: Manager Overview, manager & fund pages, comparison.
7. **Advisor / Internal** modes, onboarding, settings.

The original `.dc.html` app remains the authoritative spec for each page during the port.
