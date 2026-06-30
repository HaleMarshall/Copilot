# Review 8 — wire hardcoded literals → DB atoms (per DATA_MODEL.md), one section at a time, Playwright-verified (use ?v= cache-buster).

- [x] 1 Cash KPI boxes (cash pop + full cash page) + Net Distributions + PDF committed → portfolio/bank atoms. Verified: Called €13.0m, Uncalled €7.5m, Net dist −€2.4m (cumulative), no old €3.9m/+€0.9m.
- [x] 2 MGR_META (firm records: AUM/MOIC/since/scores/est, ~15 managers) → DB `managers` atom, DB-first accessor; verified reads DB, AUM renders, 0 errors
- [x] 3 FVF_FUNDS (7 offerings: size/min/close/status/perf/fees/team) → DB `offerings` atom (extracted programmatically), DB-first; verified reads DB (ares €8.0bn), 0 errors
- NEXT: 4 scorecard sparkline arrays + peer/scenario projection arrays (secondary use-case panels) → scorecards/scenario atoms
- 4 scorecard sparkline arrays + peer/scenario projection arrays (secondary use-case panels) → scorecards/scenario atoms
- 5 lifecycle figures + ticket sizes (€128k/€158k) → lifecycle/peer atoms
- 6 final grep sweep: no data literals left in render code
