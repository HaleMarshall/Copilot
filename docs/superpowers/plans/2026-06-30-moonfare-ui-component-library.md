# Moonfare UI Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the dashboard's design language into ~14 pure, presentational React + Tailwind components under `web/src/components/moonfare/`, ready for the design-sync converter.

**Architecture:** Pure presentational components (data via typed props, no fetch/server). One Tailwind preset encodes the Moonfare palette + fonts. Charts are hand-rolled SVG built on a shared geometry util. A `/gallery` Next route renders every component with example props for Playwright fidelity/smoke verification. Pure-logic (arc math, scales) is unit-tested with Vitest.

**Tech Stack:** React 19.2, Next 16.2, Tailwind 3.4, TypeScript 5.7, Vitest + @testing-library/react (added), Playwright (existing, via plugin).

## Global Constraints

- Pure presentational only: no `fetch`, no `/api/state`, no `DCLogic`/`this.DB`, no `next/image`, no Server Components. All data via props.
- Colors ONLY from the authoritative Moonfare palette in project `CLAUDE.md` — no off-palette hex. Over/under always paired with ▲/▼ + sign.
- Fonts: `font-serif` = Source Serif 4 (headings/big stats), `font-sans` = Inter (body/figures).
- Every component exports `<Name>Props` interface (generates the `.d.ts` contract).
- esbuild-bundlable in isolation (pure client React + Tailwind classes).
- Global bundle name: `MoonfareUI`. Library dir: `web/src/components/moonfare/`.

---

### Task 1: Scaffold — preset, tokens, fonts, test infra, gallery skeleton

**Files:**
- Create: `web/src/components/moonfare/moonfare-preset.ts`
- Modify: `web/tailwind.config.ts`
- Modify: `web/src/app/globals.css` (font faces + base tokens)
- Create: `web/src/app/gallery/page.tsx` (skeleton)
- Modify: `web/package.json` (add vitest, @testing-library/react, jsdom; `test` script)
- Create: `web/vitest.config.ts`

**Produces:** Tailwind tokens `brand, brand-2, indigo, mint, ink, muted, line, navy, data-1..9, over, under, surface, surface-2, surface-hero`; `font-serif`/`font-sans`; `colorToken(name): string` is NOT here (see Task 2).

- [ ] **Step 1:** Write `moonfare-preset.ts` exporting a Tailwind `Partial<Config>` preset with `theme.extend.colors` (all palette hex from CLAUDE.md), `fontFamily.serif`/`sans`, mapping `data-1..9` to the categorical ramp.
- [ ] **Step 2:** Wire `presets: [moonfarePreset]` into `tailwind.config.ts`; ensure `content` includes `./src/components/moonfare/**/*.{ts,tsx}` and `./src/app/**/*.{ts,tsx}`.
- [ ] **Step 3:** Add `@font-face`/import for Source Serif 4 + Inter in `globals.css` (Google Fonts `@import` for now; bundled woff2 added in Task 17).
- [ ] **Step 4:** Add Vitest + RTL + jsdom devDeps; `vitest.config.ts` (jsdom env, react plugin); `"test": "vitest run"` script.
- [ ] **Step 5:** Create `/gallery` page that imports nothing yet, renders `<main className="bg-surface-2 text-ink font-sans p-8">Gallery</main>`.
- [ ] **Step 6:** `cd web && npx tsc --noEmit` (types ok) and `npm run build` partial check; commit.

---

### Task 2: Geometry & token utilities (unit-tested)

**Files:**
- Create: `web/src/components/moonfare/lib/geometry.ts`
- Test: `web/src/components/moonfare/lib/geometry.test.ts`

**Interfaces — Produces:**
- `TOKEN_HEX: Record<string,string>` and `tokenHex(token: string): string` — maps `"data-1"|"over"|"brand"…` → hex (for SVG `fill`/`stroke`, which can't always use Tailwind classes reliably on `<path>`).
- `polarToCartesian(cx,cy,r,angleDeg): {x,y}`
- `donutArc(cx,cy,rOuter,rInner,startDeg,endDeg): string` (SVG path `d` for a donut segment)
- `linScale(domainMin,domainMax,rangeMin,rangeMax): (v:number)=>number`
- `niceMax(max:number): number` (round axis ceiling)

- [ ] **Step 1:** Write `geometry.test.ts`: `polarToCartesian(0,0,10,0)` ≈ `{x:10,y:0}`; `linScale(0,10,0,100)(5)===50`; `donutArc(...)` returns a string starting with `M`; `niceMax(187)===200`; `tokenHex("over")==="#2D8F6F"`.
- [ ] **Step 2:** Run `npm run test` → FAIL (module not found).
- [ ] **Step 3:** Implement `geometry.ts` (arc math, scales, `TOKEN_HEX` from CLAUDE.md palette).
- [ ] **Step 4:** Run `npm run test` → PASS.
- [ ] **Step 5:** Commit.

---

### Tasks 3–10: Foundations

Each foundation task follows the same shape: write component `.tsx` (with `<Name>Props` interface + an exported `<name>Example` const used by gallery + sync), add it to `/gallery`, run `tsc --noEmit` + load `/gallery` via Playwright asserting zero console errors and the component's marker present, commit. Full props per spec §4.

- [ ] **Task 3: `Card`** — `CardProps {title?, eyebrow?, cta?: {label,onClick?}, children}`. Renders `bg-surface border border-line rounded-xl p-5`, serif title, eyebrow uppercase muted, optional CTA button `text-brand`.
- [ ] **Task 4: `Badge`** — `BadgeProps {label, tone?: "neutral"|"over"|"under"|"brand"}`. Pill `text-[11px] font-bold uppercase` with tone color.
- [ ] **Task 5: `Pill`** — `PillProps {label, active?, onClick?}`. Toggle chip; active = `bg-brand text-white`, else `bg-surface-2 text-muted border border-line`.
- [ ] **Task 6: `Stat`** — `StatProps {value, label, sub?, delta?, deltaDir?: "up"|"down"}`. Serif value, muted label, delta in `text-over`/`text-under` with ▲/▼.
- [ ] **Task 7: `KpiTiles`** — `KpiTilesProps {tiles: {label,value,sub?}[]}`. Responsive grid of bordered tiles.
- [ ] **Task 8: `Legend`** — `LegendProps {items: {name,colorToken,dash?}[]}`. Inline row of swatch + name; dash → dashed line marker.
- [ ] **Task 9: `DataTable`** — `DataTableProps {columns: {key,label,align?}[], rows: Record<string,ReactNode>[]}`. Bordered table, header `text-muted uppercase`.
- [ ] **Task 10: `Gauge`** — `GaugeProps {value, segments: {label,color Token,from,to}[], label?}`. Horizontal segmented gauge with a marker at `value`.

For EACH: ` - [ ] write component+example`, ` - [ ] add to gallery`, ` - [ ] tsc --noEmit`, ` - [ ] Playwright /gallery: 0 console errors + marker present`, ` - [ ] commit`.

---

### Tasks 11–16: Core charts (hand-rolled SVG, use `geometry.ts`)

- [ ] **Task 11: `Donut`** — `DonutProps {slices: {label,value,colorToken}[], size?, centerLabel?}`. Uses `donutArc`; legend optional via `Legend`.
- [ ] **Task 12: `BarChart`** — `BarChartProps {categories: string[], series: {name,colorToken,values:number[]}[], variant?: "grouped"|"stacked", height?}`. Uses `linScale`/`niceMax`.
- [ ] **Task 13: `LineChart`** — `LineChartProps {categories: string[], series: {name,colorToken,values:number[]}[], area?, height?}`. Polyline + optional area fill.
- [ ] **Task 14: `Sparkline`** — `SparklineProps {values:number[], colorToken?, width?, height?}`. Minimal polyline, no axes.
- [ ] **Task 15: `JCurve`** — `JCurveProps {points: {x,y,label,logo?}[], refCurve?: [number,number][], height?}`. Scatter of points on a zero-baseline grid + optional reference curve.
- [ ] **Task 16: `ScorecardTable`** — `ScorecardTableProps {rows: {label,you,peer,up}[]}`. You-vs-peer table with ▲/▼ in over/under colors.

For EACH: same 5 sub-steps as foundations (component+example, gallery, tsc, Playwright marker + 0 console errors, commit). Charts additionally assert an `<svg>` is present in the gallery section.

---

### Task 17: Barrel export, design-sync config, conventions header, fonts

**Files:**
- Create: `web/src/components/moonfare/index.ts`
- Create: `.design-sync/config.json`
- Create: `.design-sync/conventions.md`
- Create: `web/public/fonts/` (bundled woff2) + update `globals.css` to use local faces
- Create: `web/src/components/moonfare/README.md` (optional)

- [ ] **Step 1:** `index.ts` re-exports all 14 components + their Props types.
- [ ] **Step 2:** `.design-sync/config.json`: `{ "shape":"package", "globalName":"MoonfareUI", "componentSrcMap":{…14 entries…}, "tokensGlob":["web/src/components/moonfare/moonfare-preset.ts","web/src/app/globals.css"], "readmeHeader":".design-sync/conventions.md" }`.
- [ ] **Step 3:** `conventions.md`: name the token family table (bg-/text-/fill- + data-1..9, over/under, font-serif/sans), the "pure props, no provider needed" idiom, where styles live, and one idiomatic snippet (e.g. a `Card` containing a `Donut`).
- [ ] **Step 4:** Bundle Source Serif 4 + Inter woff2 into `web/public/fonts/`, switch `globals.css` to local `@font-face`.
- [ ] **Step 5:** `tsc --noEmit` + `npm run build` clean; commit.

---

### Task 18: Full gallery fidelity verification

- [ ] **Step 1:** `npm run dev` (or build+start) on a free port.
- [ ] **Step 2:** Playwright load `/gallery`: assert 0 console errors, all 14 component markers present, every chart section contains `<svg>`.
- [ ] **Step 3:** Screenshot `/gallery`; spot-check colors/type against the live `.dc.html` palette.
- [ ] **Step 4:** Commit; update spec status → built.

---

## Self-Review

**Spec coverage:** §2 constraints → Global Constraints + Task structure. §3 packaging → Tasks 1,17. §4 component set (14) → Tasks 3–16. §5 styling preset → Task 1. §6 fidelity/testing → Tasks 2 (unit), 3–18 (render/Playwright). §7 sequencing → task order. All covered.
**Placeholders:** component tasks give exact props + class intent; chart math centralized in Task 2 (unit-tested) so per-chart code is bounded. No TBD.
**Type consistency:** `tokenHex`/`colorToken` naming unified on `tokenHex`; all components take `colorToken: string` matching preset keys.
