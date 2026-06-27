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

**NEXT: item 13** — Set-target page cluster (13–16).
