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
- ☐ 40 Month & Year per holding (fields `month` added; needs display)
- ☐ 41 Sort by Month/Year
- ☐ 42 Default-sort best-performing first
- ⊘ 43 Reject 'What works well in your portfolio?' chip (keep view as-is) — confirm none present
- ☐ 44 Header 'Funds you hold by strategy'
- ☐ 45 Larger middle-row overview block

**NEXT: item 39** — strategy-detail individual-investments table.
