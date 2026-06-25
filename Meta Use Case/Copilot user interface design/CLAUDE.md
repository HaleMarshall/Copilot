# Project: Alpha — Moonfare Private-Markets Co-Pilot

## Chart / graph colors (ALWAYS) — authoritative palette from reference frontend
Every chart, graph, donut, bar, line, treemap, gauge and data element MUST use the official
Moonfare palette below — never off-palette colors. These are the ONLY permitted colors
(sourced from the reference `frontend/app.js` `COL` + `CAT_COLORS` and `styles.css` `:root`):

Core brand + neutrals: blue `#2C2DFE`, blue-2 `#5B5CFF`, indigo `#1417C2`, mint `#2D8F6F`,
cream `#F4EFE2`, warm `#FAF6EC`, paper `#FAFAF8`, ink `#0E0E0E`, line `#E5E2DC`, muted `#6B6B6B`,
navy topbar `#20243A`. Comparator neutrals: peer `#7A6A55` (warm brown), platform `#B5A98F`
(muted clay), model/goldman `#3E5A5C` (deep teal).

Categorical chart ramp (the EXACT high-contrast category set — NOT a single blue→mint gradient):
`#1417C2` indigo · `#2C2DFE` brand blue · `#5B5CFF` bright blue · `#8C8DFF` · `#3E5A5C` deep teal ·
`#2D8F6F` forest green · `#7AB89E` sage · `#E8732C` burnt orange · `#C8392F` crimson ·
`#7A6A55` warm brown · `#B5A98F` clay. These map to the `--data-1..9` tokens. Burnt orange and
crimson ARE on-palette — they are the intended high-contrast category hues (Growth/Tech = orange,
AI = crimson). Keep the fixed strategy→color map so a category is the same color across every chart
and matches its donut on the same page (Z-bars reuse the donut's category color).

Over/under is a SEMANTIC overlay, separate from category color: over/positive `var(--over)`
= mint `#2D8F6F`; under/negative `var(--under)` = indigo `#1417C2`. Never amber/yellow for
semantics. Always pair with a ▲/▼ glyph + sign (accessibility).

Surfaces: `var(--surface)` white, `var(--surface-2)` warm, `var(--surface-hero)` cream,
`var(--line)`, `var(--ink)`, `var(--muted)`. Do NOT introduce new raw hex for data viz — pull from
the set above (tokens `--data-1..9`, `--brand*`, `--over/--under`).

## Brand system
- Fonts: Source Serif 4 (headings, page titles, big stat numbers), Inter (body, tabular figures).
- Topbar: dark navy `var(--navy)` with the white Moonfare wordmark (`assets/moonfare_logo_white.png`).
- Logos/heroes/manager marks live under `assets/`.

## Structure
Single Design Component `Alpha Copilot - Overview.dc.html`. Left pane = 25 use cases in 3 tiers;
top tab row = pages of the selected use case; right pane = Ask Alpha. Signal-gated use cases
(Sentiment t1-10, Secondary Market t2-6, Platform Demand t3-1) stay as "not-connected" states.
