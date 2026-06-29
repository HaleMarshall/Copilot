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

## Verified built + aligned this pass (Playwright screenshots/measure)
- Overview: full Performance page (KPIs + contribution + IRR charts + full table) ✓ built, aligned
- Overview: full Cash-flows page (KPIs + calls/dist chart + full list) ✓ built, aligned
- Overview: Format large breakdown = tree diagram + investments below ✓ (L4115/4127)
- Overview: top-3 quick summaries → full pages ✓
- Simulate: Peers auto-selects investor (age 50-65/risk innovation_ai_alpha/wealth 5-25M/DACH/Investor-PE); Custom blank ✓ (verified fc)
- Opportunities: distance donuts 150px consistent; page proportionate ✓

## Fix C (real bug found via audit)
- [x] C. peerData()/peerBaseMedian() crashed when Custom cohort selected (fc={} → fc.wealth/prof/risk .includes on undefined). Guarded with ||[]. Verified: 0 console errors across compare/sim/home custom path; direct calls no throw. (25d78eb)

## Final pass — verified
- Overview: strategy large-number handling — labels inside bars, axis auto-scales (niceStep), no horizontal overflow ✓
- Overview: Ask-Alpha open → quick-info panel shifts right of the chat; both visible side-by-side, aligned to chat edge ✓
- CLEAN CONSOLE SWEEP: 0 console errors across home, perf-review, perf-full, cash-full, sim, compare-peers, compare-custom, future, opp, missed, secondaries, drill-strategy, drill-format ✓

## === AUDIT COMPLETE ===
3 real fixes shipped: A overview dup title (27db4cd), B sim dup title (98a5c70), C Custom-cohort render crash (25d78eb).
All 3 PDFs (Opportunities/overview/simulate) re-verified built + aligned. Future J-curve confirmed complete. App renders clean across every page.
