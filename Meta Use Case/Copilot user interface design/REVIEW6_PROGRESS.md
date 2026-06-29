# Review 6 — re-audit + alignment/sizing polish pass (LIVE meta view), Playwright-verified
Brief: re-verify all 3 PDFs (Opportunities, portfolio overview, simulate) built one-by-one; fix things that "look weird / too large / not in line"; verify each with Playwright.

## Verified already-built (no change needed)
- Future J-curve hero: COMPLETE — dips to −4.6 (2022 trough) → +1.2 at TODAY (solid→dashed) → 7.5; commit(down)/dist(up) bars; callouts; recycle panel; per-year editor. (user cited as example; it is done)

## Fixes (one at a time)
- [x] A. Portfolio Overview: duplicate page title removed — chrome pagehead suppressed on home view (showPageHead). Verified Playwright: title count 1, chrome intact on sim/opp/future. (27db4cd)
- [x] B. Target simulator 'we dont need this twice' — chrome pagehead suppressed on sim view, body owns single title. Verified: 1 title, chrome suppressed. (98a5c70)

## Verified already-correct (no change)
- Simulate: comparison target reflects actual input 35% (myPmTarget→targetPct) — live shows 'your 35% target', 'your target 35%'.
- Simulate: 'clear it simulates against the group's target' — banner 'Simulating your strategy target against the Model target'.
- Overview: performance page shows ONE Alpha's read (merge done).
- Overview: Alpha's read to right of title ✓; base currency BASE EUR + toggle + KPI cards ✓; asset-allocation grid below performance/cashflows ✓.

## Remaining to audit/verify next (one at a time, Playwright)
- Overview: funds-you-hold top-3 + open full Performance page (strategy-like, full table)
- Overview: full Cash-flows page (full investment list + J-curve part) + quick summary top-3
- Overview: full breakdown by Format includes investments
- Overview: Format large breakdown = tree diagram
- Overview: Ask-Alpha → quick info view shifts to middle aligned with chat edge
- Overview: strategy page large-number overflow doesn't break the graph
- Simulate: Peers comparator auto-selects this investor's peers; Custom stays blank
- Opportunities: donut/element sizing alignment vs rest (the 'too large' complaint)
- General: sweep each section for any element 'too large / not in line'
