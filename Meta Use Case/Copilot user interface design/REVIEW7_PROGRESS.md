# Review 7 — moonfare-portfolio-dashboard-ui-review/action-items.md (31 items, LIVE meta view)
Build strictly one at a time, verify (node --check + Playwright render/logicError null + visual), commit+push each.

1. Alpha's read on STRATEGY card (overview header) is too large → ~half size
2. Rename that card → "Alpha's read on your Portfolio" + content about portfolio in general (not one strategy)
3. "3.6 above called capital" → call it Net Distributions (called=16.6, uncalled=3.9)
4. Currency switch always shows the FX conversion rate
5. Add the mixed/blended currency conversion rate (from underlying portfolios)
6. "Performance" → "Net Performance" (do NOT add Net to IRR/DPI/TVPI/MOIC individually)
7. Remove Portfolio Value + Distributions from performance section; add distributions to detailed cash-flows page
8. Row-by-row equal sizing: strategy/region/currency/sector all same size; format/vintage may differ
9. Region: rename MEA → Rest of World
10. Asset-allocation order: Strategy, Sector, Region, Currency, then Format, Vintage
11. Vintage NAV/Committed toggle = NAV by allocated capital in year ↔ commitments per year
12. All asset-allocation graphs same size = size of the largest
13. Currency graph: show base-currency amount next to USD/EUR/GBP/CHF/JPY/Other (always base amount too)
14. Currency toggle: don't convert all to EUR — show base currency AND actual invested currency both
15. Detailed view: always denote the FX conversion rate used
16. Move capital-calls-vs-distributions chart beside the committed/uncalled/cash/called/net-dist boxes (side by side) + per-year numbers
17. Cash-flows detail: J-curve = actual graph on right; click a fund → its point on J-curve; default shows every fund logo on the J-curve
18. Merge investments/committed/called/performance table WITH the J-curve in one view; click fund → highlight its logo; default = full J-curve with all logos
19. Name the merged table "Investments, Committed, Called, and Performance"
20. Everywhere: see fund/see investment/buy now → see opportunity / buy opportunity / invest in opportunity now
21. Portfolio-at-a-glance: show the "go bigger" chart by default (buyout/growth/AI counts)
22. Your-strategy detail: investments-you-hold-by-strategy collapsed under subgroups by default; click to expand
23. Collapsed subgroup shows aggregate IRR/DPI/TVPI/MOIC/DVPI/NAV for that area
24. REVERT: keep "investments you hold by region" exactly as is (no change)
25. Portfolio-at-a-glance options: clickable to unselect / back to full overview
26. Vintage detail: click into commitments-by-vintage chart / vintage-by-strategy heatmap (too small to read)
27. Semi-detailed: remove the 2nd (bottom) "top three performing investments" table, keep the top one
28. Detailed vintage page: commitments-by-vintage + vintage-by-strategy heatmap; toggles committed/nav + strategy/region/format/currency/sector; + detailed investments table
29. PDF button: select specific detailed pages (Performance/Cash Flow style) w/ charts, Moonfare branding, cover page, legend
30. Funds & Managers: all funds use the Moonfare-Technology-Fund style (logo bottom-left + background image)
31. Download many background images (city skyscrapers + landscapes US/Europe/worldwide), similar format

- [x] 1 Alpha's read card shrunk to ~half (concise read + CTA) — fd1075d
- [x] 2 renamed → "Alpha's read on your Portfolio" + portfolio-wide content — 483ae8f
- [x] 3 "€3.6m above called capital" → "€3.6m net gain" (Nettgewinn = NAV−paid-in; action-items mistranslated to 'net distribution') — verified visible
- [x] 4 hero currency switch now shows FX rate line ("FX 1 EUR = 1.0830 USD · as of …") on non-base ccy — verified
- [x] 5 blendedFxRate() helper + hero shows underlying currency mix line + "blended across your mix ≈ X" on the FX line (USD 1.069 vs 1.083 spot) — verified
- [x] 6 "Performance" section → "Net Performance" (overview card + full page + pop eyebrow); IRR/DPI/TVPI/MOIC left un-prefixed — verified
- [x] 7 removed Portfolio Value + Distributions from performance (pop + full page); Distributions kept on cash-flows — verified
- [x] 8 + 12 strategy/region/currency/sector equalised to one 4-col row (395x323 each, stretched to tallest); format+vintage own row — verified
- [x] 9 region MEA -> "Rest of World" (seed dims.region + HOME_DIMS fallback + region-name map; reseeded) — verified
- [x] 10 alloc order Strategy, Sector, Region, Currency, then Format, Vintage — verified
- [x] 11 vintage chart follows NAV/Committed basis (NAV-allocated-in-year vs commitments-per-year); +per-fund committed in seed; reseeded — verified
- [x] 12 (done with item 8 — equalised to largest)
- [x] 13/14/15 currency card: base € + native amount per currency + FX-rate note; FX rate also in currency drill detail — verified ($7.2m/£1.3m/Fr1.0m native, 1 EUR=1.083 USD…)
- [x] 16 cash boxes beside calls-vs-distributions chart (side by side) + per-year € numbers on bars — verified
- [x] 17 J-curve as actual graph (fund logos plotted by maturity x net-cash; click highlights point; all logos by default; also in cash pop) — verified
- [x] 18 merged the investments/committed/called/performance table WITH the J-curve graph in one card; row click highlights logo — verified
- [x] 19 named the merged card "Investments, Committed, Called, and Performance" — verified
- [x] 20 relabelled CTAs to opportunity language (shopBtn Buy→Seize, View fund→See opportunity, Open full fund page→See full opportunity, View detail(s)→See opportunity); body text untouched — verified
- [x] 21 go-bigger chart shown by default (drillBig default true) in portfolio-at-a-glance / strategy detail — verified
- [x] 22 strategy detail: investments collapsed under subgroups by default, click to expand (strategy only) — verified
- [x] 23 collapsed subgroup header shows aggregate IRR/DPI/TVPI/MOIC/DVPI/NAV (NAV-weighted) — verified
- [x] 24 region (and other non-strategy dims) kept exactly as-is (no collapse) — verified 0 chevrons, funds expanded
- [x] 25 at-a-glance buckets toggle — click again unselects (homeFocusCat toggles to null) — verified
- [x] 26+28 detailed vintage page: commitments-by-vintage chart (NAV/Committed toggle) + Vintage×dim heatmap (Strategy/Region/Sector/Currency/Format + NAV/Committed) + funds-by-vintage table — verified
- NEXT: item 27 (remove the 2nd / bottom top-three-performers table; keep the top one)
