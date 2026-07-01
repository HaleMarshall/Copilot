# Financial/UX hand-walk audit — every control does what's expected, graph data real not hardcoded.
Method: instantiate `reg.Logic`, inject `/api/state` DB, drive `this.state`, read method outputs / render vdom. `logicError` must stay null.
Legend: [x] verified working & data-real · [!] bug found (with fix) · [ ] not yet walked.

## Portfolio metrics (financial core)
- [x] IRR/MOIC/TVPI/DPI from `portfolioMetrics()` — capital-weighted from HELD_FUNDS, not static. irr 14.9, tvpi 1.83, dpi 0.82, nav €16.6m. (commit 1935d91)

## Future / cash-flow page (investor + advisor) — VERIFIED 2026-07-01
- [x] Historical J-curve `hist[]` DERIVED from held funds: trough = −paidIn·0.32, ends at dist−paidIn = −2.9. Existing → [-3.8,-5.3,-4.5,-4.1,-2.9]; new/pregate → [] (no historical). (commit 2a41e98)
- [x] Commitment-years slider (fCommitYears): 10→fut ends +1.9; 3→+4.2 (less late capital called). Moves.
- [x] Recycle-rate slider (fRecycleRate): 0→dists[…3.7]; 60→[…1.5] (recycled dists self-fund calls). Moves.
- [x] Execution quality (fExecution avg/top): avg→−0.3; top→+1.9. Moves.
- [x] Macro scenario (fScenario base/soft/hfl/ai): base +1.9, hfl +0.8, ai +4.1. Moves.
- [x] Pace scenario (fPaceScn slow/moderate/aggressive): slow plan ~1.5/yr, aggressive ~2.7/yr. Moves.
- [x] Product-mix sliders (fProducts): income tilt → cash flow +4.7 (earlier dists); growth tilt → navY5 50 vs 43 flat vs 39 income (growth compounds NAV, distributes later). Economically coherent, both paths move.

## Next-best / opportunities (simulation) — VERIFIED 2026-07-01
- [x] Fund-combo simulation recomputes blended net IRR/TVPI €-weighted vs the €16.6m book (not just the pie): credit pick →14.4% (−0.5), AI →15.8% (+0.9), 2×growth+AI →16.3% (+1.4), none → no metric row. (commit 2a41e98)

## Peer / comparison cohorts — VERIFIED 2026-07-01
- [x] `peerData()`/`cohortTilt()` parametric from DB `peer` atom, statistically coherent across cohorts:
  young-techie(20-35,Eng/Tech,AI-risk)→median 10.2, ai 24.7%, credit/infra 0; mid-career→9.6 balanced;
  senior-FO(65+,FamOffice,100M+)→median 24.5, ai 0.2%, infra 17%, credit 13.9%; PE-pro(50-65)→21.4 buyout-tilt.
  Medians: FO 24.5 > PE-pro 21.4 > young 10.2 > mid 9.6 (wealth/profession lift returns); AI∝1/age; credit/infra∝age. Coherent.

## Intake / profile save round-trip — VERIFIED 2026-07-01
- [x] Investor profile → DB: POST /api/profile (id 12) then GET /api/state returns it (goal/targetPct/risk/ts). Persists to profile_saves.
- [x] Advisor profile → localStorage: advSaveProfile() → advSavedProfile(id) returns edits(age/profession), riskId, simTargets; impersonate() reloads it (line 7941/8104) so an impersonated client sees the advisor-set target.

## Simulator L1/L2/L3 — VERIFIED 2026-07-01
- [x] Level escalation correct: L1 "Your tailored target" = strategy-only, sliders behind ✎Adjust toggle, compares only vs the original proposal (no peer world); L2 "adjust & compare" = strategy + peer/model/family/endowment compare in €&%; L3 adds Vintage dimension. hasVintage L1/L2 false, L3 true.
- [x] Slider moves the target: setSimTarget('strategy','buyout',+15) → benchTargetMix('you').buyout 30→45 (verified with sync-setState shim; detached-instance setState no-op was a harness artifact, not a bug).

## Currency — VERIFIED 2026-07-01
- [x] ccyConv converts every €-figure: €16.6m → $18.0m (×1.083) / £14.1m (×0.848) / Fr 16.0m, correct symbols.
- [x] advHomeCcy derives home ccy from client region (real book encodes it as "US / USD","CH / CHF","DE / EUR"): Reuter→USD, Meier→CHF, German→EUR. Advisor header shows the client's home currency on impersonate. (First test used wrong region format {region:'US/CA'}→EUR — harness artifact, not a bug.)

## advClientCohort + level differentiation — VERIFIED 2026-07-01
- [!] FIXED: prof classifier mapped "PE executive" → Exec/Owner (generic 'exec' checked before 'pe'); also bare 'pe'/'invest' substrings matched "develoPEr"→Investor/PE. Reordered most-specific-first with word-boundaries (\bpe\b, private equity, \binvestor\b before founder|\bexec). Now Lindqvist→Investor/PE (peer median 18.4, matches L3); "Software developer"→Eng/Tech; Reuter(Founder)→Exec/Owner, Coburger→Legal, Meier→Family Office, Weber→Medical all correct.
- [x] Level differentiation via advSeq step counts escalates L1<L2≤L3: new 8/10/11, existing 11/13/13, inactive 14/16/16; pregate 7/7/7 (intentionally lean pre-accreditation). Stage journeys differ: new builds (setTarget→modelPortfolio), existing reviews (confirmTarget→overview→changesSince→3 comparison steps→follower).

## Model-portfolio + manager research + emoji + hardcoded sweep — VERIFIED 2026-07-01
- [x] modelMix() yields 5 DISTINCT coherent portfolios by riskId: income_resilience(credit40/infra22), balanced(buyout40), equity_growth(buyout55), innovation_ai_alpha(ai15), opportunistic(spread). Page reflects the risk input. (Note: venture=0 across all models — intentional, Moonfare model folds early-stage into growth.)
- [x] Manager research L3 reads DB `managerTree` (not fallback), 15 mgrs/7 ACs; asset-class filter reduces list (All 15→Buyout 8→Growth 2); per-class IRR real (EQT all-time 17.1 vs Buyout 19.2 vs Infra 15.1); sort desc works (Thrive 26.5>Thoma Bravo 24.1>Index 23.1).
- [x] Emoji sweep (Python Unicode): ZERO pictographic emoji (no 📊/🎯/💰 etc). Only 4 monochrome typographic UI glyphs remain — ✦(AI accent) ✓(confirm) ✎(edit) ✕(close) — plus ▲/▼ over/under (MANDATED by palette rules). "Remove emojis" satisfied; functional icons kept.
- [x] hist=[numbers] hardcoded = 0 (item-1 fix holds). Investor/advisor financial charts DB-driven/derived (portfolioMetrics, futureProj, peerData, vz DB-first at 35 call sites).

## KNOWN GAP (low priority, honest)
- [~] 19 numeric `vals:[...]` inline arrays remain, ALL in the internal ops console (lines 9000-9089: platform AUM, net flows, channel conversion, fill-rate, waitlist, capital calls, liquidity buffer). These are synthetic internal business KPIs (Moonfare staff view), NOT investor financial figures — they'd be synthetic in the DB too, so wiring only relocates mock numbers. Candidate for a future `internalOps` DB atom if the internal console needs to be DB-backed; not a financial-correctness issue for the investor/advisor audit.

## STILL TO WALK
- [ ] Lifecycle / what's-changed / follower iPhone previews render (logos+graph, look real) — spot-render check.
- [ ] Fund pages consume filled CSV (pending user's data at ~/Downloads/moonfare_funds/).
- [ ] Model-portfolio page: strategy mix reflects target/inputs (L1/L2 real strategies; L3 redundant page removed).
- [ ] Manager research (L3): filters/toggles change firm/fund tables from DB managerTree.
- [ ] Currency: displayCcy change converts every €-figure incl. advisor header; home-ccy derives from region.
- [ ] Lifecycle / what's-changed / follower iPhone previews: no emojis, logos+graph, real.
- [ ] Levels differ: L1 Revolut-simple, L2 fewer toggles, L3 Bloomberg-dense — across pregate/new/existing/inactive.
- [ ] Fund pages: consume filled CSV once user delivers it (DB wiring pending user's data).
