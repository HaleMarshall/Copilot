# Advisor View 2 review — build one at a time, verify each (Playwright + logicError null), commit each.
Source: ~/Downloads/Advisor View 2 review.zip (click-comments.md). Status: [ ] todo, [x] done.

## Landing & shell
- [x] 1. Landing: "Welcome to Alpha" → choose Investor / Advisor / Internal, then the view changes by choice. Good-morning/afternoon greeting only for the investor view.
- [x] 2. Advisor desk: change the suggested level (L1/L2/L3) per client right on the desk, without opening the client.

## Executive summary / prepare-for-call
- [x] 3. Exec-summary "the case in three moves": click a case to see a fuller detail of what to achieve; top-3 actions clickable.
- [x] 4. Rename exec summary → "Prepare-for-call summary"; the Suggest button updates the exec summary content.
- [x] 5. Add a "Suggest calling the investor" button.

## Intake / profile
- [x] 6. Age = exact number, not a range (advisor + investor view).
- [x] 7. Fields genuinely editable + a visible Edit affordance/button (user still can't edit; add explicit edit toggle).
- [x] 8. Profession = "Founder of <company>" (add company field); drop "recent exit" wording.
- [x] 9. "Already in private markets?" = Yes/No dropdown; "Amount invested so far" appears only when Yes; the Add must work.
- [x] 10. PM target allocation editable; risk class editable; everything editable.
- [x] 11. "Notes from our conversation" — de-emphasize / make optional (called unnecessary).

## Tailored model portfolio
- [x] 12. Taxonomy: AI/Tech is a SECTOR (not strategy); Direct & Co-investments is a FORMAT; Secondaries is a FORMAT. Fix STRATS to real strategies; move AI→sector, directs/secondaries→format.
- [x] 13. L3 tailored-model page: strategy mix already shown prior page — remove the redundant page for L3, show more/other; L1/L2 strategy mix must show real strategies.

## Comparison
- [x] 14. Target adjusts based on the actual input target.
- [x] 15. Endowments selectable individually (not only combined) — a button to open individual endowments, in PM allocation + comparison.
- [ ] 16. De-duplicate "Compare Yourself / Strategy / Funds" (they're the same comparison).
- [ ] 17. Strategy drill-in: new investor → suggest a fund; existing investor → different (already invested).
- [ ] 18. Fill-rate "at your stage": for a new investor show only the current year, not years 1–7 range (also investor view).

## Future / cash-flow
- [x] 19. New investor has NO historical — remove historical from the J-curve.
- [x] 20. Cash-flow sliders must work: "over how many years" + Recycle Rate must move distributions & contributions (not only Commitments/Year).
- [x] 21. Year unit "M"/label not editable; the value is editable.
- [x] 22. PE Cash-Flow J-curve (Cumulative Net Cash Flows) should REPLACE the top J-curve; no historical for a new investor.
- [x] 23. Contributions vs Distributions rendered below the J-curve; fix off-page overflow.
- [x] 24. Layout: small charts (Planned Commitments, Cumulative Commitment, Projected NAV, Projections w/ product mix, Alpha's Read) to the side of the main charts / at bottom.
- [x] 25. Macro toggle Slow Growth / Moderate / Aggressive must move the J-curve.
- [x] 26. Execution Quality (Top Quartile / Average) must do something.
- [x] 27. Product-mix sliders (Buyout/Growth/…/Direct) must affect the projection.
- [x] 28. Remove the "act on your prediction" part.

## Next best / opportunities
- [ ] 29. Next-best based on prior steps (not hard-coded); curated multi-fund PORTFOLIOS per strategy (buyout, AI&tech, etc.), not a single fund or the whole fund page.
- [ ] 30. After selecting funds: show right-side pie of portfolio impact + comparison; drop the redundant re-simulate-target / re-peer-benchmark / re-manager-comparison steps.
- [x] 31. Prefer an "Invest Now" button (over reserve-interest).

## Follower / notifications
- [x] 32. "Follow what matters": realistic iPhone frame; fix in-app + website; correct favicon; real Moonfare site + logo in the note.
- [x] 33. Add a final "Next" button to end the flow.

## Levels & lifecycle
- [ ] 34. L2 visibly differs: simple/fewer toggles; only strategy adjustable (OK).
- [ ] 35. Pre-gate: no peer benchmarking (esp L2); simple future toggles; show opportunities to L2 (funds like EQT); selectable ideas → Moonfare accreditation.
- [ ] 36. L1 existing: "Model vs your portfolio today" shows the actual invested strategies; headline = 4 metrics (DPI etc.) + a performance graph.
- [ ] 37. "What's changed": no emojis; use logos + a graph; make it look real.
- [ ] 38. "Suggested vs current portfolio": add suggest-opportunities beneath.
- [ ] 39. Existing flow: remove the duplicate "your tailored target"; make opportunities selectable so reserve-interest/new-portfolio has something.
