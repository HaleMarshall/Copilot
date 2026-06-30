# Moonfare UI — Component-Library Extraction (Design Spec)

**Date:** 2026-06-30
**Status:** Approved (design); pending spec review
**Author:** Alpha Co-Pilot session

## 1. Problem & Goal

The Alpha Co-Pilot product UI lives entirely in a single ~8,000-line custom Design
Component file (`Meta Use Case/Copilot user interface design/Alpha Copilot - Overview.dc.html`),
built on a bespoke "React-without-JSX via `this.h`" framework (`DCLogic` base class,
`<x-dc>` template, `support.js` runtime) and backed by a live SQLite server (`/api/state`).

That form **cannot be synced to claude.ai/design**: the design tool ingests a library of
reusable, individually-importable, compiled React components (exposed as
`window.<globalName>.*`, rendered standalone in a sandbox with no data server) so its
design agent can assemble new on-brand screens. The `.dc.html` is one monolithic page with
a hard runtime + data dependency, and the design-sync skill explicitly forbids
reimplementing a whole app.

**Goal:** extract the dashboard's *design language* — its tokens and reusable
primitives/charts — into a small, self-contained **React + Tailwind component library** that
(a) faithfully reproduces the Moonfare look and (b) is in the exact shape the design-sync
converter can bundle, grade, and upload. This unlocks designing future UI (including the
parked Market News Feed) on-brand inside claude.ai/design, and gives engineers components
that map 1:1 to shippable code.

**Non-goal:** porting the page, its business logic, its data layer, or its 25-dataset DB.
Only reusable presentational primitives are extracted.

## 2. Hard Constraints (shape every component)

1. **Pure presentational, data via props.** claude.ai/design renders each component
   standalone with no `/api/state`. No `fetch`, no `DCLogic`, no `this.DB`, no Next.js
   server features, no `next/image`, no React Server Components. All data enters through a
   typed `Props` interface.
2. **esbuild-bundlable in isolation.** Pure client React + Tailwind utility classes only,
   so the converter can bundle each component into `_ds_bundle.js`.
3. **Typed props.** Every component exports a `Props` interface — this generates the `.d.ts`
   contract the design agent codes against.
4. **On-palette only.** Colors come exclusively from the authoritative Moonfare palette in
   the project `CLAUDE.md` (no off-palette hex). Fonts: Source Serif 4 (headings/big stats),
   Inter (body/figures).

## 3. Location & Packaging

- Library lives in the existing `web/` app (already React 19 + TypeScript + Tailwind):
  `web/src/components/moonfare/`.
- One barrel `web/src/components/moonfare/index.ts` re-exports every component → bundled
  under global name **`MoonfareUI`**.
- Each component file: `web/src/components/moonfare/<Name>.tsx` exporting the component +
  its `<Name>Props` interface, plus a short **usage example** (used by the sync to author
  preview cards, since there is no Storybook; graded on the absolute rubric).
- `.design-sync/config.json`:
  - `shape: "package"`
  - `globalName: "MoonfareUI"`
  - `componentSrcMap` — maps each component to its source file
  - `tokensGlob` — the Tailwind preset + `globals.css`
  - `readmeHeader: ".design-sync/conventions.md"` — names the token vocabulary, the
    wrap/usage idiom, where the real stylesheet lives, and one idiomatic build snippet.

## 4. Component Set (~14)

Mapped to existing `.dc.html` render helpers (the proven design language).

### Foundations (8)
| Component | Source helper(s) | Core props |
|---|---|---|
| `Card` | `card()` | `title?`, `eyebrow?`, `cta?`, `children` |
| `Badge` | `badge()`, `coverageBadge` | `label`, `tone` |
| `Pill` | `pill()`, `homePill` | `label`, `active?`, `onClick?` |
| `Stat` | `fpStat`, `oppStat`, `perfTiles` | `value`, `label`, `sub?`, `delta?`, `deltaDir?` |
| `KpiTiles` | `kpiTiles()` | `tiles: {label, value, sub?}[]` |
| `Legend` | `legend()`, `lineLegend()` | `items: {name, colorToken, dash?}[]` |
| `DataTable` | `dataTable()`, `simpleTable()` | `columns`, `rows` |
| `Gauge` | `gauge()`, `modeGauge()` | `value`, `segments`, `label?` |

### Core charts — hand-rolled SVG (6)
| Component | Source helper(s) | Core props |
|---|---|---|
| `Donut` | `donut`, `donutNamed`, `donutLabel` | `slices: {label, value, colorToken}[]`, `centerLabel?` |
| `BarChart` | `gridBars`, `groupedBars`, `stackBars`, `archBars` | `series`, `categories`, `variant: "grouped" \| "stacked"` |
| `LineChart` | `fAxisLine`, `blChart` | `series`, `categories`, `area?` |
| `Sparkline` | the `vz()` sparklines | `values: number[]`, `colorToken?` |
| `JCurve` | `jCurveChart`, `jCurveGraph` | `points: {x, y, label, logo?}[]`, `refCurve?` |
| `ScorecardTable` | `scorecard()` | `rows: {label, you, peer, up}[]` |

**Charts are hand-rolled SVG** (not recharts/visx): matches the specific Moonfare
donut/J-curve/bar look exactly, keeps the bundle lean, stays dependency-free (cleaner for
the converter).

## 5. Styling — Tailwind Preset (token contract)

A `web/src/components/moonfare/moonfare-preset.ts` Tailwind preset encodes the authoritative
palette from `CLAUDE.md`:

- **Brand/neutrals:** `brand` `#2C2DFE`, `brand-2` `#5B5CFF`, `indigo` `#1417C2`,
  `mint` `#2D8F6F`, `ink` `#0E0E0E`, `muted` `#6B6B6B`, `line` `#E5E2DC`, `navy` `#20243A`.
- **Categorical ramp** `data-1`…`data-9` (incl. burnt-orange `#E8732C`, crimson `#C8392F`,
  warm-brown `#7A6A55`, clay `#B5A98F`, deep-teal `#3E5A5C`).
- **Semantic** `over` `#2D8F6F` / `under` `#1417C2` (always paired with ▲/▼ + sign).
- **Surfaces** `surface` (white), `surface-2` (warm), `surface-hero` (cream).
- **Fonts** `font-serif` = Source Serif 4, `font-sans` = Inter.

Components style with these utilities (`bg-surface`, `text-ink`, `fill-data-1`, `text-over`,
`font-serif`, …). The design agent receives a clean, enumerable family table. Fonts are
bundled under `fonts/` so previews render with real type.

## 6. Fidelity & Testing

- **Visual fidelity gate (per component):** render the React component side-by-side against
  its `.dc.html` counterpart (Playwright screenshot of the live page region vs the React
  component) — color, type, spacing must match.
- **Render safety (per component):** renders with its example props with zero console errors.
- **Sync gate (follow-on):** the design-sync verification grades every preview card before
  upload.

## 7. Sequencing

1. Tailwind preset + bundled fonts + token sanity check.
2. Foundations (8) — each with usage example + fidelity check.
3. Core charts (6) — each with usage example + fidelity check.
4. Barrel export (`index.ts`) + `.design-sync/config.json` + `conventions.md` header.
5. **Then** run the design-sync skill against the library → bundles, grades, uploads to a
   new Claude Design project.

## 8. Out of Scope / Deferred

- The Market News Feed feature (separate, parked design — live Marketaux proxy + dedicated
  page + contextual tabs).
- Composite/page-level components (FundCard, ManagerTile, BenchTable, LifecycleCard,
  FeaturedFundCard) and specialty chart variants (heatmap, headroom bar, etc.) — candidates
  for a later breadth expansion if the ~14-component kit proves the approach.
- The actual claude.ai/design upload is run via the design-sync skill after build (step 5);
  this spec covers building the library.

## 9. Success Criteria

- ~14 pure React components under `web/src/components/moonfare/`, each with typed props +
  usage example, styled only via the Moonfare Tailwind preset.
- Each component visually matches its `.dc.html` source and renders error-free standalone.
- `.design-sync/config.json` (package shape) + `conventions.md` present and valid.
- The design-sync converter bundles the library and grades all previews without manual
  source edits beyond config.
