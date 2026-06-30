# Alpha Co-Pilot — Full Data Model (every field, every calculation, every base subset)

Goal: nothing hard-coded. Every number, chart point and cumulative figure derives from a small set of **base atoms** stored in the database (`alpha_seed.json` → SQLite → `/api/state`). This document is the contract: it lists the atoms, then every derived field with its formula and the base subset it sums from.

## 0. Conventions
- **Base currency** = investor base (EUR here). Every € figure is in base currency unless suffixed `Native`.
- **Units**: `€m` millions base; `pct` = percent of a stated denominator; multiples `x`.
- **Derivation principle**: a field is either an **atom** (stored, no formula) or **derived** (formula over atoms). Never store a derived number that can drift from its atoms — recompute it.
- **Reconciliation rule**: all portfolio totals = Σ over the `funds` atom. All ratios use the portfolio totals. All time series = Σ over per-fund dated cash-flow events.

---

## 1. ATOMS (single source of truth — stored in DB)

### 1.1 `funds[]` — one record per holding (THE core atom; everything portfolio-level derives from this)
Per fund:
| field | type | meaning |
|---|---|---|
| id, name, mgrId, mgr, logo | str | identity |
| strategy, region, sector, format | str (key) | classification dimensions |
| currency | str | fund's native denomination |
| vintage | int | first-close year |
| stage | str | Buying / Deploying / Harvesting / Winding down |
| committed | €m | total commitment (base ccy) |
| committedNative | native m | commitment in fund currency |
| called | €m | capital drawn to date (= paid-in) |
| distributions | €m | cash returned to date (cumulative) |
| nav | €m | current marked value |
| navNative | native m | NAV in fund currency |
| cf[] | list of `{y:int, call:€m, dist:€m}` | dated cash-flow events per year (drives J-curve, calls-vs-dist, vintage timing) |
| contrib | pp | contribution to this quarter's portfolio NAV move |
| firstCashMonth | str | e.g. "Mar 2019" (J-curve x-origin) |

Per-fund DERIVED (never stored):
- `uncalled` = committed − called
- `paidIn` = called
- `DPI` = distributions / called
- `RVPI` = nav / called
- `TVPI` = (nav + distributions) / called
- `MOIC` = (nav + distributions) / called  *(net; gross variant applies fee add-back, see 1.6)*
- `DVPI` = distributions / committed
- `IRR` = XIRR over `cf[]` (calls negative, dists positive, NAV as terminal +inflow at as-of date)
- `calledPct` = called / committed
- `ageYears` = asOfYear − vintage
- `netCashToDate` = distributions − called  (J-curve y at as-of)

### 1.2 `fx` — currency atom
- base, asOf, rates{ccy→base-per-unit}, plus dated snapshots ratesRecord / ratesCall / ratesDist for the record/call/distribution dates (FX-reconciliation footnotes).

### 1.3 `target` — the investor's chosen targets (atom; set on the Set-target page / simulator)
- targetPct (private-markets % of investable wealth)
- mix{ strategy{}, region{}, currency{}, sector{}, format{} } — each a category→% map summing to 100.

### 1.4 `profile` — the investor atom
- name, riskId, ages[], wealthM (investable wealth €m), horizon, region, profession, consents, free-text advisor notes.

### 1.5 `cohorts` — peer / platform / top-10 / endowment stat atoms (for comparison; we don't hold per-peer rows)
- `peer`: baseMedian, wealthDelta{}, profDelta{}, regionDelta{}, ageDelta{}, riskMedianFactor, mixTilt{}, n.
- `platform`: total, pmMedian, irr, funds, ticket.
- `top10`: pmMedian, irrDelta, mixTilt{}.
- `endowments`: {harvard,yale,princeton,hyp} each {pm, mix{}}.

### 1.6 `modelPortfolios` — house-view target architectures per risk profile (atom)
- per riskId: pmTarget, coarse mix{}, fine mix{}.
- feeModel: { mgmtPct, carryPct, feeDragPct } to derive gross-from-net multiples.

### 1.7 `managers[]` — firm records (Funds & Managers atom)
- id, name, logo, hq, founded, aum (€bn), strategies[], style notes, track {irr, moic, dpi, funds, topQuartilePct}, classes[] (asset classes → funds[]).

### 1.8 `offerings[]` — investable funds (Opportunities atom)
- id, name, mgr, logo, strategy, region, currency, target multiple, min ticket, close date, status (open / pipeline / waitlist), prospect flag, fee terms, heroImage.

### 1.9 `featured` — the highlighted product (Moonfare Technology Fund) marketing atom
- name, desc, region, ac, tags[], kpis[], terms[][], seed managers[].

### 1.10 `lifecycle` — same-stage peer benchmark atom (for "investors at your stage")
- yearsIn, per-metric {you, peers, model, top10} for fill-rate, PM-alloc, commitment size, # deals, deal size hi/lo/avg, timing.

### 1.11 `scenario` — projection assumptions atom (Future page)
- navGrowthByScenario{base,soft,hfl,ai}, paceMultiplier{slow,moderate,aggressive}, recycleDefault, distCurveShape, executionQuartileDelta.

### 1.12 `scorecards` — signal-gated / illustrative panels atom (secondary use cases)
- per scorecard: rows[{label, you, peer, up}] + caption. (Explicitly illustrative; flagged `synthetic:true`.)

---

## 2. DERIVED — PORTFOLIO OVERVIEW (every number on the dashboard)

### Header hero
- **Total portfolio value** = Σ funds.nav  → €16.6m. *Base subset: each fund's nav.*
- **Currency toggle value** (ccy≠base) = nav × fx.rates[ccy]. **FX line** = `1 base = rate ccy`. **Blended FX** = Σ(currencyWeight_c × rate[target]/rate[c]) over fund currency mix.
- **Underlying currency mix** = Σ funds.nav grouped by funds.currency ÷ total nav.
- **TVPI** = (Σnav + Σdistributions) / Σcalled.
- **Net gain** (the "above" figure) = Σnav − Σcalled  (unrealised+realised value over paid-in… actually NAV over paid-in = €3.6m if called basis differs; canonical = Σnav − ΣpaidIn).
- **QoQ Δ** = Σ(fund.nav this q − fund.nav last q); pct = Δ / last-q nav.
- **Reporting line** = count(funds with current-q report) of count(funds).
- KPI cards: **Funds** = funds.length; **GPs** = distinct funds.mgrId; **Companies**, **Countries** = stored portfolio roll-ups (atoms — look-through counts).

### Alpha's read on your Portfolio
- value/TVPI/QoQ as above; **PM fill** = profile pmActual / target.targetPct; **largest gap** = argmax|target.mix.strategy − actualStrategyMix|; **biggest concentration** = argmax(actualStrategyMix).

### Net Performance card + full page
- IRR/DPI/TVPI/MOIC/DVPI = portfolio-level formulas (§1.1 applied to totals).
- Contribution chart = funds.contrib (pp) per fund.
- Net-IRR-by-investment = per-fund IRR.
- Holdings table = funds with per-fund metrics.

### Cash Flows + full page
- Boxes: **Committed** Σcommitted; **Called** Σcalled; **Uncalled** Σuncalled; **Distributions** Σdistributions; **Cash position** = stored bank balance atom; **Net distributions (cumulative)** = Σdistributions − Σcalled; **Net distributions (TTM)** = last-year cf.dist − cf.call.
- Calls-vs-distributions chart = Σ cf.call and Σ cf.dist grouped by year (`cashflows.cats/calls/distributions` are DERIVED from funds.cf, not stored separately).
- J-curve graph: per fund point x=ageYears, y=netCashToDate/called (DPI−1); reference curve from scenario.distCurveShape.
- "Each investment on the J-curve" = per fund netCashToDate sign.

### Asset allocation (Strategy / Sector / Region / Currency / Format)
- Each mix = Σ funds.nav (or committed, per basis toggle) grouped by that dimension ÷ basis total. (`mix`, `dims` become DERIVED views over funds; targets come from `target.mix`.)
- Currency card base€ = weight×basisTotal; nativeAmount = base€ × fx.rates[ccy].

### Vintage
- NAV-by-year = Σ funds.nav grouped by vintage; Committed-by-year = Σ committed grouped by vintage.
- Vintage × dimension heatmap cell = Σ funds.(nav|committed) grouped by (vintage, dimensionValue).
- Allocated-vs-committed Z = per-vintage (navWeight − committedWeight).

### Concentration / GP
- GP concentration = Σ funds.nav (or committed) grouped by mgrId ÷ total.

---

## 3. DERIVED — COMPARISON / SIMULATOR / FUTURE / OPPORTUNITIES / FUNDS

- **Comparison**: your actual mix (§2) vs cohort mix. Cohort median PM = peer.baseMedian + Σ active deltas (wealth/prof/region/age) + risk·riskMedianFactor. Cohort strategy mix = platform mix + aggr·mixTilt. Z = your − cohort.
- **Simulator target**: target.mix per dimension; "vs group" = modelPortfolios / cohort / endowments target mixes; Z = your target − their target.
- **Future projections**: from funds (current J-curve) + scenario assumptions + commitment plan; cumulative net = running Σ(dist−call+plan). All multipliers from `scenario`.
- **Opportunities**: gaps = target.mix − actual mix (§2); funds-to-close from `offerings` filtered by under-weight strategy; run-off candidates = funds in over-weight strategy sorted by age.
- **Funds & Managers**: cards from `managers` + `offerings`; IRR/MOIC/AUM per fund from offering/track atoms; backgrounds from `assets/bg`.
- **PDF**: every page reads the same derived values; cover KPIs = header hero; legend = static definitions.

---

## 4. RECONCILED BASE NUMBERS (the one consistent truth used to populate the DB)
Σcommitted = **20.5**, Σcalled (=paid-in) = **13.0**, Σuncalled = **7.5**, Σdistributions = **10.6**, Σnav = **16.6**.
Derived: DPI 0.82 · RVPI 1.28 · TVPI 2.09 · DVPI 0.52 · net-dist cumulative −2.4 (still net contributor on cash) · net-dist TTM +2.2 (annual crossover 2022) · total gain = nav+dist−paidIn = +14.2.
Cash position 1.1 is a separate bank-balance atom. (Legacy "Called €16.6m / Uncalled €3.9m" was inconsistent — corrected to called 13.0 / uncalled 7.5.)
