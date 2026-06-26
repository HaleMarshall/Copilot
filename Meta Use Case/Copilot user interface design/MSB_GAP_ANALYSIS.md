# MSB Live-Model mockup — functional gap analysis

**What this is.** A purely *functional* comparison (graphs + information, not design) between the
**MSB "PE Portfolio — Live Model"** mockup (`PE_Portfolio_LiveModel (2).html`, 6 tabs, Chart.js,
a bottom-up cash-flow engine) and the current **Alpha Co‑Pilot** app
(`Alpha Copilot - Overview.dc.html`). It lists every capability the MSB model shows that Alpha
**does not have yet**, and tags each with **who it's for** — the **Investor** (self-serve), the
**Advisor / RM** (modelling & client prep), or **Both**.

> Each "absent in Alpha" claim below was checked against the current build (grep on the source):
> no IRR-from-cash-flows, no recycling, no max-drawdown metric, no equalizer/lock, no
> subscribe/pass workflow, no year-by-year table, no position-level or company-level look-through,
> no 80-fund pipeline, no execution-quartile scenario selector. Items where Alpha has a *lighter*
> version are flagged "partial".

**Audience legend:** 🧑‍💼 Advisor · 👤 Investor · 👥 Both

---

## Summary table

| # | Capability (MSB) | Audience | Alpha today |
|---|------------------|----------|-------------|
| 1 | Bottom-up per-strategy call/dist/NAV schedules | 👥 Both (engine) | ✗ none |
| 2 | Programme **Net IRR** (Newton's method on cash flows) | 👥 Both | ✗ none |
| 3 | DPI on **no-recycling** basis vs TVPI **with recycling** | 🧑‍💼 Advisor | ✗ none |
| 4 | **Max Drawdown / peak capital at risk** | 👥 Both | ✗ none |
| 5 | 32-year **year-by-year cash-flow table** | 🧑‍💼 Advisor | ✗ none |
| 6 | **Recycling** input (recycle-until-year + rate) | 🧑‍💼 Advisor | ✗ none |
| 7 | **Execution-quartile scenario** (top-Q / top-decile / median) | 🧑‍💼 Advisor | ✗ none (partial: macro scenarios) |
| 8 | **Targets that grade KPIs** green/amber/red (IRR/DPI/DD) | 👥 Both | partial (targets, no grading) |
| 9 | Slider **lock + live equalizer + optimizer + presets** | 🧑‍💼 Advisor | partial (sliders only) |
| 10 | **DPI/TVPI trajectory** chart + DPI=1.0 line | 👥 Both | ✗ none (have NAV + J-curve) |
| 11 | **Quarterly TVPI/DPI evolution** (since inception) | 👤 Investor | ✗ none |
| 12 | **Sample Pipeline** — 80 named funds, multi-platform access | 🧑‍💼 Advisor | partial (follow/candidate funds) |
| 13 | **Quarterly Decisions** subscribe/pass → fill-to-target loop | 👥 Both | partial (single NBA) |
| 14 | **Investor View** ranked slate + next-Q preview + pacing plan | 👤 Investor | partial |
| 15 | **Position-level performance table** (per holding) | 👤 Investor | ✗ none |
| 16 | **Fund → portfolio-company look-through** (your pro-rata NAV) | 👥 Both | ✗ none |
| 17 | **Save & propagate** allocation → rescale pipeline | 🧑‍💼 Advisor | ✗ none |
| 18 | **Methodology / benchmark-source** appendix | 👥 Both | partial ("Alpha's read") |
| 19 | **Multi-platform access** routing per fund | 🧑‍💼 Advisor | ✗ none (Moonfare only) |

---

## A. The cash-flow model engine (the core gap)

Alpha's Future page projects NAV/J-curve heuristically from a few sliders. MSB runs a real
fund-level model and every number flows from it.

### 1. Per-strategy call / distribution / NAV schedules — 👥 Both
Twelve fund-year curves per strategy (Buyout NA/EU, Co-invest, Secondaries, Credit, Growth,
Infra) for calls, distributions and NAV-%-of-commitment. Cash flows are built bottom-up by
vintage × commitment × schedule.
- **Advisor:** the modelling substrate — set/justify assumptions, run what-ifs.
- **Investor:** never sees the curves directly, but every outcome (J-curve, DPI timing) depends on them.
- **Alpha:** ✗ none — we don't have strategy-level cash-flow curves.

### 2. Programme Net IRR via Newton's method — 👥 Both
True IRR solved on the net annual cash-flow stream (distributions − calls), not a static label.
- **Investor:** headline "what return am I actually earning."
- **Advisor:** the number they're held to; flexes live with assumptions.
- **Alpha:** ✗ none — we display IRR figures but never compute IRR from cash flows.

### 3. DPI (no-recycling) vs TVPI (with recycling) — 🧑‍💼 Advisor
DPI shadow-run at 0% recycling ("when does capital come back" is a return characteristic);
TVPI reflects real recycling. A deliberate methodological split.
- **Advisor:** technically important for honest reporting; explains it to the client.
- **Alpha:** ✗ none.

### 4. Max Drawdown / peak capital at risk — 👥 Both
Deepest cumulative-net-cash trough ÷ total fresh capital — how much is underwater at the J-curve bottom.
- **Investor:** "how much of my money is at risk before it comes back."
- **Advisor:** a constraint to manage (and a target to grade against, see #8).
- **Alpha:** ✗ none (our only "drawdown" is a stress-scenario sentence, not a metric).

### 5. 32-year year-by-year cash-flow table — 🧑‍💼 Advisor
Per year: Calls · Distributions · Cum Net CF · NAV · DPI · TVPI, full horizon, with the DPI-target
year highlighted.
- **Advisor:** the audit trail behind the charts; export/justify.
- **Investor:** usually too granular (kept behind a "details" disclosure in MSB).
- **Alpha:** ✗ none.

---

## B. Inputs / controls

### 6. Recycling (recycle-until-year + recycle rate) — 🧑‍💼 Advisor
Reinvest distributions into new commitments until year N at X%. Materially changes pacing & TVPI.
- **Advisor:** a core planning lever; investor sees the *effect*, not the dial.
- **Alpha:** ✗ none.

### 7. Execution-quartile scenario (Top-Quartile / Top-Decile / Median) — 🧑‍💼 Advisor
Three full schedule sets modelling manager dispersion; median compresses IRR ~3–5pp and slips
DPI=1 by 2–3 years.
- **Advisor:** sets the honesty band ("here's the downside if managers are only median").
- **Investor:** benefits from seeing the downside case framed.
- **Alpha:** partial — we have *macro* scenarios (soft landing / higher-for-longer / AI super-cycle), not manager-execution quartiles.

### 8. Performance targets that grade the KPIs — 👥 Both
Target Net IRR, Target DPI multiple, Max-DD limit → KPI tiles turn **green / amber / red** and a
**dashed target line** moves on the trajectory chart.
- **Investor:** instant "am I on track."
- **Advisor:** the conversation framing.
- **Alpha:** partial — we show targets (allocation %, etc.) but don't red/amber/green-grade IRR/DPI/DD.

### 9. Allocation slider lock + live equalizer + optimizer + presets — 🧑‍💼 Advisor
Per-strategy **🔒 lock**; **equalizer** (drag one → others redistribute proportionally);
**optimizer** that hill-climbs the mix toward IRR/DPI/DD targets; **Buyout-tilt / Yield-tilt /
Normalize / Reset** presets.
- **Advisor:** a portfolio-construction workbench.
- **Investor:** the simpler "Build my target with Alpha" is the investor-facing equivalent.
- **Alpha:** partial — sliders exist; no lock/equalizer/optimizer/presets.

---

## C. Charts we don't have

### 10. DPI / TVPI trajectory chart (+ DPI = 1.0 line) — 👥 Both
Multiples over time with the DPI=1.0 crossing marked — "when do I get my money back, and what's
the total multiple."
- **Investor:** intuitive payback view.
- **Advisor:** pairs with the target line (#8).
- **Alpha:** ✗ none — we have the NAV projection and the J-curve, but not a multiple-over-time line.

### 11. Quarterly TVPI/DPI "since inception" evolution — 👤 Investor
A per-quarter line of the *realised* portfolio's DPI/TVPI from inception to today.
- **Investor:** "how has my actual portfolio tracked."
- **Alpha:** ✗ none.

---

## D. Workflow tabs with no Alpha equivalent

### 12. Sample Pipeline — 80 named positions — 🧑‍💼 Advisor
A 20-year forward pipeline of real top-quartile managers (4/yr): strategy filter chips, search,
per-strategy summary cards (count / $ / %), $ commit, and **access platform** (Moonfare / iCapital
/ Titanbay / Direct / evergreen), grouped by year.
- **Advisor:** sourcing & programme planning ("here's the 20-year build, by manager").
- **Investor:** could browse, but it's an advisory artifact.
- **Alpha:** partial — we have follow/candidate funds, not a multi-year named pipeline with multi-platform sourcing.

### 13. Quarterly Decisions — subscribe/pass → fill-to-target — 👥 Both
80-quarter timeline; each quarter a slate of 4–5 funds opens for a window; **subscribe/pass per
fund**, editable ticket; a **live allocation tracker** showing actual-vs-target drift (green/amber/red
bars) with **NEEDED / OVER / HOT** badges driven by the gap, plus coverage %.
- **Investor:** the decision they actually make each quarter.
- **Advisor:** curates the slate and steers toward target.
- **Alpha:** partial — Opportunities is a single Next-Best-Action, not a quarter-by-quarter fill-to-target loop.

### 14. Investor View — ranked slate + next-quarter preview + pacing plan — 👤 Investor
For a specific investor mid-programme: existing positions (editable tickets); **this quarter's slate
ranked by diversification fit** (★ Subscribe / ~ Consider / ✗ Skip, each with a written reason from
the gap-to-target); **pre-announced next-quarter** funds (register interest); a **pacing & forward
plan** (capital deployed this Q, budget remaining, still-underweight strategies, what to watch next Q).
- **Investor:** the self-serve "what do I do this quarter and next."
- **Advisor:** prepares/co-pilots it.
- **Alpha:** partial — we have comparison + opportunities + the Future "act on your prediction," but not this ranked-slate + forward-pacing combination in one investor view.

---

## E. Reporting / look-through

### 15. Position-level performance table — 👤 Investor
Per holding: vintage, strategy, fund, age, committed, called, distributed, NAV, total value, DPI,
TVPI — each derived from the position's age × strategy schedule — with portfolio totals.
- **Investor:** their statement / holdings report.
- **Advisor:** reviews it with them.
- **Alpha:** ✗ none — we show portfolio-level KPIs and top holdings, not a per-position called/distributed/NAV/DPI/TVPI table.

### 16. Fund → portfolio-company look-through — 👥 Both
For a single fund: the underlying companies (sector, geo, invested date, **fund cost, current FV,
multiple**, **your pro-rata share NAV**, status) + NAV-by-holding pie.
- **Investor:** "what do I actually own underneath this fund."
- **Advisor:** diligence & transparency.
- **Alpha:** ✗ none — our fund page stops at the fund; no drill to companies or your-share-per-company.

---

## F. Cross-tab + transparency

### 17. Save & propagate — 🧑‍💼 Advisor
Editing the strategic allocation **rescales the whole 80-fund pipeline's $** so each strategy matches
the new weights, then refreshes every dependent tab.
- **Advisor:** the "apply this plan everywhere" action.
- **Alpha:** ✗ none.

### 18. Methodology / benchmark-source appendix — 👥 Both
Explicit per-strategy assumptions table (Net IRR / TVPI / fund life / pacing notes) + named
benchmark sources (Cambridge Associates, Preqin, MSCI Burgiss, PitchBook, Bain, ILPA,
Takahashi-Alexander/Yale, academic refs) + calculation definitions + "how allocation responds to inputs."
- **Advisor:** defensibility / compliance.
- **Investor:** trust ("where do these numbers come from").
- **Alpha:** partial — we surface "Alpha's read," not a formal assumptions/benchmark-source appendix.

### 19. Multi-platform access routing — 🧑‍💼 Advisor
Each fund tagged with where it's accessible (Moonfare / iCapital / Titanbay / Direct / evergreen).
- **Advisor:** sourcing & feasibility.
- **Alpha:** ✗ none — we reference Moonfare only.

---

## Recommended build order (highest leverage first)

1. **Cash-flow engine** (#1–#5): per-strategy curves → IRR (Newton), DPI/TVPI, NAV, drawdown,
   year-by-year. Everything else becomes "real" once this exists. *(👥 Both — powers investor
   outputs and advisor modelling.)*
2. **DPI/TVPI trajectory chart + year-by-year table** (#10, #5) on the Future page. *(👥 / 🧑‍💼)*
3. **Targets grade KPIs** + **recycling** + **execution-quartile** inputs (#8, #6, #7). *(mostly 🧑‍💼)*
4. **Position-level performance table** + **fund→company look-through** (#15, #16). *(👤 Investor)*
5. **Pipeline (#12) + Quarterly Decisions / Investor slate (#13, #14)** — the
   subscribe/pass-to-target loop. *(👥 Both)*

> Split by audience: the **Investor** mode should default to outcomes & decisions (#2, #4, #8, #10,
> #11, #14, #15, #16); the **Advisor** mode should expose the modelling levers & sourcing (#3, #5,
> #6, #7, #9, #12, #17, #19). Alpha already has an Investor / Advisor / Internal switch in the top
> bar — these gaps map cleanly onto it.
