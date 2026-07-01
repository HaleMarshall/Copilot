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

## STILL TO WALK
- [ ] Intake/profile: age/profession/PM-yes-no/amount/target/risk edits persist + save round-trips to DB profile_saves.
- [ ] Simulator/comparison page L1 (adjust-only) vs L2 (strategy+compare) vs L3 (all dims incl. Vintage €/%): each control moves outputs; benchmark data DB-sourced.
- [ ] advClientCohort maps client→cohort (fc) correctly for each book client.
- [ ] Model-portfolio page: strategy mix reflects target/inputs (L1/L2 real strategies; L3 redundant page removed).
- [ ] Manager research (L3): filters/toggles change firm/fund tables from DB managerTree.
- [ ] Currency: displayCcy change converts every €-figure incl. advisor header; home-ccy derives from region.
- [ ] Lifecycle / what's-changed / follower iPhone previews: no emojis, logos+graph, real.
- [ ] Levels differ: L1 Revolut-simple, L2 fewer toggles, L3 Bloomberg-dense — across pregate/new/existing/inactive.
- [ ] Fund pages: consume filled CSV once user delivers it (DB wiring pending user's data).
