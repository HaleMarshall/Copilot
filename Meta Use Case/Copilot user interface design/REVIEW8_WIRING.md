# Review 8 — wire hardcoded literals → DB atoms (per DATA_MODEL.md), one section at a time, Playwright-verified (use ?v= cache-buster).

- [x] 1 Cash KPI boxes (cash pop + full cash page) + Net Distributions + PDF committed → portfolio/bank atoms. Verified: Called €13.0m, Uncalled €7.5m, Net dist −€2.4m (cumulative), no old €3.9m/+€0.9m.
- [x] 2 MGR_META (firm records: AUM/MOIC/since/scores/est, ~15 managers) → DB `managers` atom, DB-first accessor; verified reads DB, AUM renders, 0 errors
- [x] 3 FVF_FUNDS (7 offerings: size/min/close/status/perf/fees/team) → DB `offerings` atom (extracted programmatically), DB-first; verified reads DB (ares €8.0bn), 0 errors
- [x] 4 all 61 numeric chart series (sparklines + peer/scenario projections) → DB `viz` atom via this.vz(i,fb); scFromDB score-rows already DB-driven. Verified reads DB, 0 errors
- [x] 5 lifecycle already DB-driven (L.metrics/sizeRange); MANAGERS() firm→funds tree → DB `managerTree` atom (DB-first). Verified reads DB, profile renders, 0 errors
- [x] 6 final sweep DONE. Findings + fixes:
  - 0 numeric `vals:[ ]` chart arrays remain (all 61 → DB `viz`).
  - HELD_FUNDS()/FOLLOW_FUNDS() confirmed already DB-first (heldFunds/followFunds); their inline arrays are fallbacks.
  - Fixed 6 stale-DATA prose/scorecard spots that still showed the OLD inconsistent figures (Called €16.6m / Uncalled €3.9m / Net-dist +€0.9m), now DB-driven: PDF cash-flow summary line (→ portfolio.committed/calledText/uncalled, bank.cashPositionText, netDistCumulative/netDistTTM); 2× "Fits your liquidity" reasons + manager "Liquidity fit" reason (→ bank.cashPositionText + portfolio.uncalled); comparison "Dry powder" scorecard row + cash-pop "remains uncalled" prose (→ portfolio.uncalled).
  - Wired ticket-size data fields: recommended-ticket big stat "€150,000" (→ new peer.ticket.full atom) + "Commit €150k" heading (→ peer.ticket.you); cash-pop cashStr "€1.1m" (→ bank.cashPositionText).
  - DB-first proof: PDF line rendered TTM **+€4.1m** (DB value) where the code fallback was 2.2 → the DB path demonstrably executes, not the literal.
  - Remaining money literals are all intentional: 19 `||'€..'` DB-first fallbacks, 33 scFromDB fallback rows (already read DB.scorecards first), static brand/platform copy (€3.8bn AUM marketing stats), and the documented curated look-through allocation atoms.
- Playwright (cache-buster): logicError null across all edits; db_uncalled €7.5m, ticket.full €150,000 render from DB; no €3.9m in rendered view.
- === WIRING LOOP COMPLETE ===
