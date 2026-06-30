# Review 8 — wire hardcoded literals → DB atoms (per DATA_MODEL.md), one section at a time, Playwright-verified (use ?v= cache-buster).

- [x] 1 Cash KPI boxes (cash pop + full cash page) + Net Distributions + PDF committed → portfolio/bank atoms. Verified: Called €13.0m, Uncalled €7.5m, Net dist −€2.4m (cumulative), no old €3.9m/+€0.9m.
- [x] 2 MGR_META (firm records: AUM/MOIC/since/scores/est, ~15 managers) → DB `managers` atom, DB-first accessor; verified reads DB, AUM renders, 0 errors
- NEXT: 3 offerings/platform-funds arrays (size €8.0bn/€6.5bn, min €50k/€100k, close, status) → `offerings` atom
- 3 offerings/waitlist/followFunds tickets + min (€150k/€50k/€100k) → offerings atom
- 4 scorecard sparkline arrays + peer/scenario projection arrays (secondary use-case panels) → scorecards/scenario atoms
- 5 lifecycle figures + ticket sizes (€128k/€158k) → lifecycle/peer atoms
- 6 final grep sweep: no data literals left in render code
