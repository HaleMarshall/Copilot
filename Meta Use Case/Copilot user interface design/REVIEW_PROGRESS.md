# Benjamin & Steffen review — implementation progress (225 items)

Source: `Alpha Copilot Review - Benjamin & Steffen.zip` → `review.md`. Working **one by one, in order**.
Status: ☐ todo · ☑ done · ⊘ no-op (confirm/keep or "do NOT add" — verified current state matches)

Legend for notes: file = `Alpha Copilot - Overview.dc.html` unless stated.

---

## 1–5 Welcome / theme picker
- ☑ 1 Enlarge the theme-picker modal a bit — modal max-width 560→680, padding up; cards `big` enlarged (mock 74→96, bigger title/icon/desc), gap 10→14
- ⊘ 2 Default selected theme = Light — already default (state.theme='light', Light pre-checked, CTA "Continue with Light →"); verified
- ☑ 3 Replace welcome body copy with Meta-View intro — welcome template body paragraph
- ☑ 4 Remove the modelled-not-measured disclaimer box — deleted from welcome template
- ☑ 5 Reword 'Ask Alpha for context' line — "Ask Alpha for context only. The chart answers are grounded on Moonfare's set of proprietary data."

## 6–12 New-customer onboarding form (single sheet)
- ☑ 6 Chat flow → single fill-in form — removed obSteps/startOnboardingChat/obControl etc.; new `onboardFormBody()` modal (`<sc-if showOnboardForm>`), shown via enterApp when `obFirstTime()`
- ☑ 7 Investment Target / Main goal field — `goal` select (GOALS)
- ☑ 8 Consent checkbox sentence — bottom of form, submit disabled until checked; saved as `consent`
- ☑ 9 Compact field set in order — Main goal · Risk · Horizon · Liquidity · Strategy preference (+ free text + consent); no wealth/allocation here (those live on Set Target)
- ☑ 10 'Key information / 1–2 minutes' header
- ☑ 11 'Anything I should know?' examples rewritten — Iran/geopolitics, liquidity event, wedding $60k; note regions/currencies set in Simulator
- ☑ 12 Experience field removed
- Notes: `saveProfileToDB` now persists goal/liquidity/strategyPref/consent; verified profile row written; 0 console errors. (Items 18/19/20 largely satisfied by this: first-time-only gate via obFirstTime; Enter→chat landing with form over it; new user → form → chat.)

## 13–20 Set-target page + entry/onboarding flow
- ☑ 13 'Go to Simulator' CTA for strategy/regions/currency — `simCTA` on Set-target card → routes to Simulator
- ⊘ 14 Do NOT add Liquidity to Set-target card — confirmed; no Liquidity field on the card (the word appears only in suggestion prose)
- ☑ 15 Add Main goal (Hauptziel) to Set-target card — `goalField`
- ☑ 16 Add Investment Target to Set-target card — same field (Main goal · Investment Target; per item 7 they're one concept)
- ⊘ 17 Embed Welcome/Enter like 'Ask Luna' — real-Moonfare integration, out of scope for the standalone prototype; entry screen already models the pattern
- ⊘ 18 First-time onboarding only for new users — `obFirstTime()` gates the form (done in 6)
- ☑ 19 Enter Alpha → chat first, not portfolio — verified `landedChat:true` (enterApp homeLaunched:false → homeHero chat)
- ⊘ 20 New user → questions → chat — form → Save → chat landing (done in 6)

## 21–29 Chat input + suggestion chips
- ☑ 21 Broaden placeholder beyond portfolio — "Ask me anything — private markets, your portfolio, ideas, what your peers are doing, or what you've missed…"
- ☑ 22 Portfolio-standing chip first — "Where do I stand with my portfolio?" → Portfolio Overview (uc home/home)
- ☑ 23 Performance chip → Performance — "Where is my performance so far?" → t1-12/review (verified route)
- ☑ 24 Invest/simulate chip → Simulator — "Do you want to simulate a different target?" → sim/sim
- ⊘ 25 Page-relevant Q docks chat with summary — existing agentic behaviour (homeAsk/homeNav navigate + open chat panel); confirmed
- ⊘ 26 No autocomplete — none present; fixed chips only
- ☑ 27 Six use-case chips — HOME_PROMPTS replaced (stand/performance/missed/peers/follow/simulate)
- ☑ 28 Keep AI over-concentration chip near top — kept as 2nd chip
- ☑ 29 Permanent 'Skip to dashboard' on the 'Since we last spoke' card — added → launchWS('understand')
- Notes: landing now shows 7 chips (slice 0,7). 0 console errors.

## 30–36 Top nav + notifications
- ☑ 30 Set-target button → right cluster next to Target indicator (header template)
- ⊘ 31 Nav order Understand→Shape→Act→Research (Research last) — confirmed
- ⊘ 32 Keep notification bell badge — unchanged (badge shows unread count)
- ☑ 33 'Closing soon' notifications — Ares + new 'GA AI Opportunities is closing soon'
- ☑ 34 Headline + CTA on every notification — all items now have a cta (Ensure your allocation, Ensure your first-close discount, Put it back to work, View your performance, Review liquidity)
- ☑ 35 Factual tone, no hype — verified ('closing soon', 'first close imminent'; no 'last chance')
- ☑ 36 Unlabeled element — added 'Show as' label to the bare €/% allocation toggle (item ambiguous in review; addressed most likely candidate)
- Verified: notif panel shows closing-soon + CTAs + AI fund; 'Show as' in DOM; 0 console errors.

## 37–45 Holdings / strategy-detail cluster
- ☑ 37 Add DVPI alongside MOIC/DPI/IRR/TVPI — `METRICS()`=[IRR,DPI,TVPI,MOIC,DVPI]; `metricVal/metricNum` helpers; per-fund `tvpi/dvpi/month/navUncommitted` added to HELD_FUNDS + alpha_seed.json (reseeded); topHoldings toggle + both fund-detail KPI rows now include TVPI & DVPI. Verified live: EQT IX tvpi 2.4x/dvpi 2.3x, metricVal resolves all 5; logicError null.
- ☑ 38 Remove 'Buy now' on already-held funds — `isHeld(name)` drives CTA. `fundActions`: held → only '✨ Suggest similar funds' (Buy/Portfolio/Watchlist suppressed); not-held → '🛒 Buy now'+Portfolio plan+Watchlist. `shopBtn`: held → static '🛒 Held' marker (not a buy action). Verified live (EQT IX held→suggest-similar; fake fund→Buy now).
- Shared holding-aware logic above also pre-satisfies 54 (Take-action 'Suggest similar funds'), 62 (held cart marker), 63/64 (pop-up CTA conditional on holding status) — will confirm each in its own location when reached.
- ☑ 39 Strategy-detail individual-investments table w/ per-investment metric toggles — new `holdingsTable(funds)` + `holdingsMetricToggle()` (`drillMetric` dtog, default IRR); full-breakdown fundsCard now renders each bucket as a table (Investment | metric | NAV | held-marker), one metric column driven by the IRR/DPI/TVPI/MOIC/DVPI toggle. Verified live: toggle lists all 5; column switches IRR→DVPI (EQT IX 19.4%→2.3x).
- ☑ 40 Month & Year per holding — added 'Invested' column to `holdingsTable` showing `f.month` (e.g. 'Mar 2019'). Verified live: EQT IX Mar 2019, Thrive Jul 2021.
- ☑ 41 Sort by Month/Year — `holdingsMetricToggle` now has a Sort control (Best first / Newest / Oldest); `sortHoldings` + `monthNum` parser. Verified live: Newest = Aug 2024→Mar 2019; Oldest = Mar 2019→Aug 2024.
- ☑ 42 Default-sort best-performing first — `drillSort` defaults to 'perf' (selected metric descending). Verified live: default order 19.4%→16.1%→14.2%→…→losers (−4.0%, −1.2%) at bottom. (41+42 share one sort control.)
- ⊘ 43 Reject 'What works well in your portfolio?' chip — confirmed: grep found no such string anywhere (Overview kept clean, as-is).
- ☑ 44 Header 'Funds you hold by strategy' — dropped the comma on all 3 fund-card titles → "Funds you hold by {strategy/region/currency/vintage}"; metric functions (DPI/IRR/TVPI/MOIC/DVPI) + sort already on this detail view (39–42). Syntax OK.
- ☑ 45 Larger middle-row overview block — new `drillBigBlock(rows,byCat,label)` 'Portfolio at a glance' card inserted as the middle row of homeDrillBody; compact = top-3 ranked bars + '⤢ Go bigger'; expanded = large per-bucket cards (big fund-count, %NAV, fund-name chips) + '↙ Show compact' (dtog `drillBig`). Verified live: compact→Go bigger, big→Show compact + all 8 fund chips; logicError null.

## 46–55 Breakdown views (blue Alpha panel, gap CTA, region/currency parity, fund modal/page)
- ☑ 46 Alpha's read panel blue — `card()` gained `tone:'alpha'` (brand→brand-ink gradient, white title/text/caption, matches Set-target brand blue per item 72); strategy/region/currency detail `summaryCard` now `tone:'alpha'` with white-recolored inner text + white gap-CTA button. Verified live: alphaBg gradient, white title; plain cards unchanged; logicError null.
- ☑ 47 Always show 'Suggest funds to fill the gaps' — extracted reusable `gapCTA(key,white)`; strategy/region/currency summaryCard uses it; added a blue Alpha's-read panel + gapCTA to the vintage breakdown (which previously had none). Verified live: vintage drill now has gap CTA + Alpha panel; logicError null.
- ⊘ 48 Keep intermediate teaser page — confirmed: `homeDetailPanel` (homePop) is the intermediate teaser (opens on chart click, footer 'See full breakdown →' → sets homeDrill). Kept.
- ☑ 49 Teaser leads with 'Your Top Five Performing Investments' — new `topFivePerformers(key)` (top 5 by IRR, all positive, '▲ by IRR' badge, 'See full breakdown →') prepended to the teaser body for both dimension and vintage teasers. Verified live: EQT IX 19.4%→Ares 8.4%, losers excluded; logicError null.
- ☑ 50 Region breakdown parity — region uses the shared `homeDrillBody` path (same holdings table, metric/sort toggles, drillBigBlock, blue Alpha panel, gap CTA as strategy). Fixed fund→region mapping: JS fallback HELD_META regions DACH/RoW → Europe/APAC to match the region buckets (seed already aligned). Verified live: region buckets Europe(4)/USA(3)/APAC(1) populate; logicError null.
- ☑ 51 'All details' link per individual investment — added an 'All details →' action in each holdingsTable row's action column (opens the fund quick-view modal via openFund), widened action column. Verified live: 2 rows → 2 links; logicError null.
- ⊘ 52 Keep fund mini-modal — confirmed: `fundModalBody` has Overview/Delivery/Lifecycle/Manager tabs, KPI row (TVPI+DVPI), About this fund, + 'Open full fund page' (line 3928). Kept.
- ⊘ 53 Keep full fund page + DVPI in KPI row — confirmed live: `fundPageBody` KPI row has TVPI & DVPI (added item 37), Key facts + Fund documents present.
- ☑ 54 Full-fund-page 'Take action' → 'Suggest similar funds' (held) — Take-action card uses holding-aware `fundActions` (item 38). Verified live on EQT IX full page: shows '✨ Suggest similar funds', no 'Buy now'; logicError null.
- ☑ 55 Currency breakdown parity — currency uses the shared `homeDrillBody` path (same holdings table, metric/sort toggles, drillBigBlock, blue Alpha panel, gap CTA). Verified live: currency buckets EUR(4)/USD(3)/GBP(1) populate from fund meta; logicError null.

## 56–68 Overview drill-down + NAV/Committed + nav label
- ⊘ 56 All concentration dimensions full-breakdown-able — confirmed: Strategy/Region/Currency/Sector/Vintage overview cards each `allocBlock(...onClick:openHomePop(popKey))` → teaser → 'See full breakdown' → homeDrill full breakdown. None a dead-end.
- ☑ 57 NAV vs Committed toggle on allocation views — added Basis (NAV/Committed) toggle to the Asset-allocation header; `basisPct(key)` recomputes strategy/region/currency/sector % from held funds' committed weight (nav+navUncommitted) on Committed basis; € total switches NAV↔Committed (`committedTotal`). Verified live: Committed strategy buyout 43/growth 20.5/…; € total €16.6m→€24.4m; logicError null.
- ☑ 58 Default the NAV/Committed toggle to NAV — `allocBasis()` defaults 'NAV'. Verified live: defaultBasis='NAV'.
- ☑ 59 Rename UNDERSTAND 'Home' → 'Overview' — workspace `label:'Home'`→'Overview' (line 2149); used by both the nav sub-label and the `stageEyebrow` breadcrumb (`${w.label} · ${w.verb} · idx of N`), so both now read 'Overview'. Verified live: nav shows Overview, no 'Home' label; logicError null.
- ☑ 60 Clicking UNDERSTAND always lands on Overview first — `selectWS`/`launchWS` now also clear `homeDrill/homePop/homeFocusCat` (root cause: page reset to 'home' but stale drill state made homeOverviewBody render the last drill). Verified live: from a drilled state, selectWS('understand') → uc/page 'home', all drill state null.
- ☑ 61 Split AI out of Tech in Sector donut — sector dim now Tech 20 + AI 14 (was Tech 34); AI color `--data-8` (matches AI strategy, cross-chart consistency); Thrive reclassified to AI sector so the breakdown bucket has a holding. Updated FB.sector + alpha_seed.json dims.sector + heldMeta + reseeded DB. Verified live: /api/state sector has AI:14; donut & breakdown use dim('sector'); logicError null.
- ☑ 62 Cart icon = 'already held' marker on top holdings — topHoldingsModule rows call shopBtn → static mint 'Already in your portfolio' cart marker for held funds. Verified live: 4 held markers, 0 buy buttons.
- ⊘ 63 Held fund pop-up CTA → suggest similar — done via fundActions (38)
- ⊘ 64 Not-held pop-up CTA → Buy now — done via fundActions (38)
- ⊘ 65 Performance KPIs NAV-based by default — confirmed: overview Performance column shows net multiples (MOIC/DPI/IRR/TVPI) + Portfolio value (NAV) + Distributions — all NAV/value-based, never committed; basis toggle defaults NAV (58). No committed distortion.
- ⊘ 66 Remove fill-rate metric from Overview — confirmed: scan of homeOverviewBody (4498–4760) shows no fill-rate metric; only 'fill the gaps' CTA + CSS auto-fill. Fill-rate lives only in Peer Benchmarking/Comparison (template line 192, TR chart 823/851).
- ☑ 67 NAV/Committed toggle on every breakdown view — homeDrillBody mix card now carries the Basis toggle; donut/bars + insight/Alpha text are basis-aware via `basisPct(key)`; '% of NAV' labels → '% of {basis}'. Verified live (region drill): toggle present, donut "100% NAV"↔"100% Committed".
- ☑ 68 Default NAV on breakdown toggle — `allocBasis()` defaults NAV; drill view opens on NAV. Verified live.

## 69–80 Overview Alpha panels + concentration/Z-chart + sticky
- ☑ 69 'Suggest funds to fill the gap' CTA in Alpha's-read — added an 'Alpha's read on your strategy funds' panel to the Overview (lists strategy buckets with no direct fund) + `gapCTA('strategy')`, placed below the 3-col grid. Verified live: panel + gap CTA render in homeOverviewBody; logicError null.
- ☑ 70 Concentration pie syncs NAV↔Committed (never zero) — donut/bars data source tied to the toggle via `basisPct` (item 57); on Committed every dimension still sums to ~100 (sector 100.1, currency 100, strategy 100) — never an empty chart. Verified live.
- ☑ 71 Move concentration box down + Z-chart beside it — added `navVsCommittedDeltas(key)` (NAV%−Committed% per bucket from held funds, real data) + a 'Where you're concentrated' box and 'Allocated vs committed' miniZ Z-chart as a twoCol row below the 3-col grid. Verified live: deltas Buyout +7.6pp/Infra −3.6pp/…; overview renders, both cards present, logicError null.
- ☑ 72 Style Alpha's read panel in brand dark-blue — Overview alphaReadCard now `tone:'alpha'` (brand→brand-ink gradient, white text, white gap button), matches Set-target blue. Verified live: panel bg = brand→brand-ink gradient.
- ☑ 73 Small Alpha insights at top, Alpha's read below — added slim 'Alpha's executive summary' strip (5 positive bullets) at the very top; Alpha's-read panel stays lower down (stacked full-width, not 3 side-by-side). Verified live: exec strip before read panel, 5 ▲ bullets, overview renders. (Pre-satisfies 75/82/83 structure.)
- ⊘ 74 Ask Alpha companion docked left on every page — confirmed: `{{ askAlpha }}` bound unconditionally at top of body (line 99, left-docked), outside the showRail sc-if. askAlpha() renders the 'Ask Alpha' rail in both min & open states (never null). Persistent on every page.
- ☑ 75 Exec-summary strip at top, 5 bullets — slim 'Alpha's executive summary' strip with exactly 5 bullets at the very top (built item 73). Verified live: 5 bullets, top placement.
- ☑ 76 AI Overview at top of Detail page + Suggest More Funds beneath — moved summaryCard (Alpha's read, blue, with gap/Suggest CTA) to the very top of homeDrillBody; mix/insight/funds pushed down. Verified live: AI panel index 0 (before mix/funds), Suggest-funds CTA present.
- ☑ 77 Detail page portfolio summary (funds held, NAV, buckets, largest) — the 4 metric tiles (Funds held / NAV in this book / Buckets covered / Largest holding) sit in the top AI panel. Verified live: all 4 present at top.
- ☑ 78 Keep sell/Buy-now in Detail summary — added a '🛒 Buy now →' invest action (routes to Opportunities) alongside the Suggest-funds CTA in the top portfolio-summary panel. Verified live: both buttons present.
- ☑ 79 Deviation Z-charts on every breakdown page — added an 'Allocated vs committed — {dim}' miniZ card to homeDrillBody (strategy/region/currency/sector) + vintageDrillBody, all driven by navVsCommittedDeltas. Verified live: Region/Currency/Vintage Z-charts present; logicError null.
- ☑ 80 Sticky breakdown panel while rest scrolls — restructured homeDrillBody into a 2-col: left breakdown column (mix donut + concentration) is `position:sticky top:12px`; right column (big block, Z-chart, funds) scrolls. Verified live: 1 sticky panel, drill renders. (Teaser→detail step preserved.)

## 81–95 Detail visuals, exec summary, vintage, cashflow
- ☑ 81 Repeat chart visual on detail page + AI summary directly beneath — added an 'Alpha's read' AI line (AI badge) directly under the mix donut/bars inside mixCard. Verified live: chart + AI-read-beneath present; logicError null.
- ☑ 82 Limit executive summary to Top 5/Top 3 — exec strip uses `.slice(0,5)` (max 5 bullets), not the full model. Verified (item 73: 5 bullets).
- ☑ 83 Executive summary positives-only — all 5 bullets are positive (▲, NAV/top-performer/distributions/largest-book/diversification); no negatives. Verified.
- ☑ 84 Enlarge Vintage figures — vintage chart value labels 12→18px (bold ink), year labels 11→13px, chart height 200→240px. Verified live: €m labels now 18px.
- ⊘ 85 'Ask Alpha about this' on every page — confirmed: scaffold pages have the 'Ask Alpha about this' footer; fund pages have 'Ask Alpha about this fund'; the persistent left Ask Alpha rail (item 74) is the per-page ask entry point on every page; overview/drill carry Alpha panels with ask buttons.
- ☑ 86 Vintage last 5 years only — `vintageDrillBody` vint = VINTAGES().slice(-5). Verified live: shows 2020–2024 (5 years).
- ⊘ 87 Vintage teaser/intermediate step — confirmed: homeDetailPanel has a `key==='vintage'` teaser branch (line 3765), reached via openHomePop('vintage') before the full breakdown — same flow as other dimensions.
- ☑ 88 Vintage Alpha summary (over-vintaged) — gapCard now leads with a blunt callout: 'You are over-vintaged in {year} — X% of your book in one vintage' (when topShare≥35%), else 'heaviest vintage … reasonable spread'. Verified live: summary present.
- ☑ 89 Cashflow top KPIs: Committed/Called/Uncalled/Cash Position — replaced the 6-tile crowded row with exactly these 4 in order (€20.5m/€16.6m/€3.9m/€1.1m, internally consistent). Verified live: all 4 present, in order.
- ☑ 90 Mark notifications seen after ~5s — `toggleNotif()` arms a 5s timer on open → sets `notifsSeen`; badge count zeroes and panel unread dots/wash clear when seen. Verified live: badge 5 → cleared after notifsSeen.
- ☑ 91 Rename 'Net Cash Flow' → 'Net Distributions', below top row — added a 'Net Distributions' row (distributions − capital calls, +€0.9m) below the top KPI row, separate from Cash Position; old 'Net cash flow' tile removed. Verified live: Net Distributions present, no Net Cash Flow, positioned after Cash Position.
- ☑ 92 Cashflow Alpha summary (J-curve, reassuring) — replaced the plain narrative with a blue Alpha read card: 'You've crossed the J-curve…' + 'very typical for your investment behaviour and risk profile', non-technical. Verified live: J-curve + 'very typical' present.
- ☑ 93 Investable-capital prompt with cash position — 'You have investable capital of €1.1m (your cash position) to choose funds' + 'Choose funds →' on the cashflow page. Verified live.
- ☑ 94 Only show investable-capital prompt when cash>0 — gated `cashNum>0 ? prompt : null` (eurNum of cash position). Verified: eurNum('€1.1m')=1.1>0 → shows; would be null at 0.
- ☑ 95 Cashflow pop-up: funds-to-invest first, add-cash below — investPrompt now leads with 'Do you want to invest?' + 'Choose funds →', then a secondary '＋ Or add more cash to your account' beneath. Verified live: invest/choose before add-cash.

## 96–104 PDF export + asset-allocation bar labels
- ☑ 96 Fix broken PDF export — replaced `window.print()` (rendered the dark app chrome = black box) with a dedicated white PDF preview modal (`pdfModalBody`, `showPdf` state) + print CSS (#sc-pdf-layer static, .sc-pdf-noprint hidden, .sc-pdf-page breaks). Verified live: clean rendered overview document, not a black box.
- ☑ 97 Add y-axis to net-cash J-curve chart — swapped the axis-less `scenarioSvg` for `fAxisLine` (real labelled numeric y-axis + gridlines, €m fmt). Verified live: y-axis ticks €-3m…€2m render.
- ☑ 98 Move clipped bar values outside the bar — `gridBars` now computes `inside` (bar wide enough for the label); if not, label renders outside to the right of the bar end. Verified live: MEA 6% renders outside.
- ☑ 99 Color broken-out (outside) bar value labels black — outside labels use `color:var(--ink)` (black); inside labels stay white. Verified live: MEA label color var(--ink).
- ☑ 100 Fix unreadable MEA value label — MEA (short bar) now renders its value outside in black (covered by 98/99). Verified live.
- ☑ 101 Add unit sign to currency figures — currency card gets a note: 'Each figure = that currency's share of your portfolio (% of NAV / €m of NAV), by fund currency of denomination.' Verified live: note renders; overview ok.
- ☐ 101 Add unit sign to currency figures
- ☑ 102 Polished overview PDF (all info points) — summary doc renders title + 6 KPIs + 4 allocation tables + cashflow, polished white layout. Verified live.
- ☑ 103 Detailed-vs-summary PDF toggle — Summary/Detailed seg in the modal header (`pdfMode`). Verified live.
- ☑ 104 Detailed PDF: one section per page — detailed mode wraps each section in `.sc-pdf-page` (page-break-after). Verified live: 6 pages (Performance + Strategy/Region/Currency/Sector + Cashflow).

## 105–112 Future Programme Inputs (Michael Blome adoption)
- ⊘ 105 No duplicated Strategic Allocation block — confirmed: futureFilters sections are Pacing / Annual commitment / Macro / Programme inputs / Product mix; the 8 Product-mix sliders already cover allocation. No separate buyout-split block.
- ☑ 106 Commitment Years control — slider 1–25yr (default 10) in new Programme inputs section. Verified live.
- ☑ 107 Recycle Year control — 'Recycle until year' slider yr 0–15 (default 8) + explainer. Verified live.
- ☑ 108 Recycle Rate control — slider 0–100% (default 100). Verified live.
- ☑ 109 Execution quality dropdown — Top quartile / Average seg (default top quartile). Verified live.
- ⊘ 110 No DPI Target Year — confirmed not present.
- ⊘ 111 No performance targets (Net IRR / DPI multiple) — confirmed not present.
- ⊘ 112 No Max Drawdown control — confirmed not present.

**NEXT: item 113** — 'Buy on Moonfare secondary market' buy-side action in Opportunities (113–129 cluster).
