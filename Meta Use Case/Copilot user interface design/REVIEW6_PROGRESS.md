# Review 6 — re-audit + alignment/sizing polish pass (LIVE meta view), Playwright-verified
Brief: re-verify all 3 PDFs (Opportunities, portfolio overview, simulate) built one-by-one; fix things that "look weird / too large / not in line"; verify each with Playwright.

## Verified already-built (no change needed)
- Future J-curve hero: COMPLETE — dips to −4.6 (2022 trough) → +1.2 at TODAY (solid→dashed) → 7.5; commit(down)/dist(up) bars; callouts; recycle panel; per-year editor. (user cited as example; it is done)

## Fixes (one at a time)
- [x] A. Portfolio Overview: duplicate page title removed — chrome pagehead suppressed on home view (showPageHead), body keeps single title + Alpha's read to its right. Verified: title count 1, chrome still on sim/opp/future, home suppressed.
- NEXT: B. audit remaining portfolio-overview PDF items + simulate PDF items + opportunities alignment
