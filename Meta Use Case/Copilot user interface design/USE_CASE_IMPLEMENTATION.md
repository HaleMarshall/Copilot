# Moonfare Alpha Co‑Pilot — Use‑Case Implementation Map

**File this documents:** `Alpha Copilot - Overview.dc.html`
**Source spec:** `Moonfare AI Copilot Use Cases .docx` (mirrored in `usecases_extracted.txt`)
**Status legend:** ✅ built & interactive · ◐ surfaced as in‑flow entry but inner view is a scaffold · ○ scaffold / not‑connected (signal‑gated)

---

## 1. The flow philosophy (why this isn't 25 pages)

The product is **one continuous loop**, not a menu of 25 tools. The investor moves
through four *verbs*, and every use case is surfaced **at the moment it is useful**,
as a panel or button inside the verb where the question naturally arises:

```
UNDERSTAND  →  SHAPE  →  ACT  →  RESEARCH  →  (back to UNDERSTAND)
 Overview      Simulator  Opportunities  Funds & Managers
 "where am I"  "where to"  "do what"      "know one deeply"
```

The bridges between verbs are **panels, not navigation**:

- On **Overview**, clicking any chart opens a left **detail overlay** ("about‑me"
  breakdown of that dimension + the funds you hold). Its footer carries the *next verb*:
  **"Adjust this in the Simulator →"**.
- In the **Simulator**, each dimension row carries **"✦ Suggest funds"** which routes
  into **Opportunities/Research** (the recommendation + fund‑comparison surface).
- In **Opportunities**, a chosen action carries **"Open fund →"** into **Research**
  (one fund deep), and **"Why this?"** into the Explainable Recommendation panel.
- **Ask Alpha** (left rail, omnipresent) is the cross‑cutting natural‑language entry to
  *any* use case from *any* page — every chip and number is clickable and grounded.

This means a use case can be reached **three ways**: (a) the verb's own canvas,
(b) an in‑flow panel handoff from the previous verb, (c) Ask Alpha. That is the
"seamless, where it makes sense" requirement.

---

## 2. Master map — all 25 use cases → where they live

`tN‑M` = Tier N, use case M from the spec. Workspace IDs in code: `understand / shape / act / research` (see `WS()` in the HTML).

### UNDERSTAND · "Where am I & how am I doing?" (workspace `understand`)
| ID | Use case | In‑flow entry point | Sub‑layers | AI involvement | Key data | Status |
|----|----------|---------------------|-----------|----------------|----------|--------|
| home | Portfolio Overview (landing) | The Overview canvas itself (Performance / Asset Allocation / Cash Flows cards) | per‑card detail overlays | Ask Alpha context on every figure | holdings, NAV, calls/distributions | ✅ |
| t1‑12 | Performance Attribution & Review | **Overview → click Performance card** → "How your portfolio is performing" overlay (funds by contribution) | quarterly/yearly, top contributors/detractors, NAV/call/distribution attribution, J‑curve flags | ranks contributors, narrates the quarter | holdings & cash‑flow history, fund‑level perf | ✅ overlay / ◐ deep tabs |
| t1‑9 | Portfolio Look‑Through & Concentration Radar | **Overview → click Currency / Sector / Region** → detail overlay → "See full breakdown" | sector/geo/currency/manager/vintage concentration, company overlap, hidden bets | flags hidden concentration vs your intent | portfolio‑company look‑through, fund metadata | ✅ overlay+breakdown / ◐ overlap tabs |
| t1‑7 | Cash‑flow, Liquidity & Commitment Intelligence | **Overview → click Cash Flows card** → "Your cash‑flow position" overlay (calls vs distributions, funds by called %) | call/distribution forecast, overcommitment, liquidity stress, investable capacity | "can I safely commit?" judgement | commitments, fund cash‑flow forecasts | ✅ overlay / ◐ forecast tabs |
| t1‑10 | Investor Sentiment & Intent | Bridge from Simulator → Peer Benchmarking → **"Buying vs waiting" → "See the full Sentiment & Intent dashboard →"**; then the Understand rail exposes it | buying/waiting/selling mode, concern heatmap, sentiment by segment | classifies intent from transcripts | call transcripts, question logs, engagement | ○ signal‑gated (now reachable) |

### SHAPE · "Where should I be?" (workspace `shape` — the Simulator)
| ID | Use case | In‑flow entry point | Sub‑layers | AI involvement | Key data | Status |
|----|----------|---------------------|-----------|----------------|----------|--------|
| sim | Simulator (landing) | Simulator canvas: per‑dimension **current pie → sliders → live target pie → live z‑chart** | strategy / region / currency / sector | **"✦ Build my target with Alpha"** generates the house‑view target (new‑investor onboarding) | current mix, model portfolios | ✅ |
| t1‑1 | Private Markets Allocation Architect | Simulator **Strategy** row + the AI build‑target button | total PM %, strategy mix, # funds, core/satellite | AI proposes optimal architecture from risk/targets | overall asset allocation, targets, model portfolios | ✅ strategy row / ◐ core‑satellite tabs |
| t1‑4 | Commitment Pacing Planner | Simulator → pacing sub‑view (per‑vintage cadence) | 3y/5y plan, vintage over/under, ticket pacing, J‑curve smoothing | recommends cadence to smooth J‑curve | commitment history, fund lifecycle | ◐ |
| t1‑5 | Multi‑Layer Peer Benchmarking | Control‑panel **Peer group** lever drives every chart; deep tabs: Strategy/Region/Format/Vintage (full views) + **Ticket & count** and **Buying vs waiting** (bespoke) | cohort / risk / profession / regional benchmarks; ticket & activity; buying/waiting mode | builds cohort, computes medians, reads activity mode | demographics, profile, holdings, intent signals | ✅ |
| t1‑6 | Excellence Benchmarking | Simulator/peer lever → "Best performers / PE pros / family office" comparators | best performers, competent investors, FO, institutional | surfaces "what the best do differently" | segmented investor outcomes | ◐ |
| t1‑13 | Forward Portfolio Projection | Simulator → projection of the *saved target* (base/optimistic/downside) | NAV projection, J‑curve, "add fund X", secondary‑heavy | projects forward under assumptions | cash‑flow histories, lifecycle, macro | ◐ |
| t2‑1 | Portfolio Completion Engine | Simulator dimension card → **"✦ Suggest funds"** modal (named funds per under‑target bucket) → "Rank in Opportunities" | missing strategy/vintage/geo/ballast, best fillers | identifies the missing piece + named filler fund, sized to the gap | portfolio, model, current inventory | ✅ (suggest‑funds modal) |
| t2‑2 | Model Portfolio Benchmarking | Simulator target vs model overlay; control‑panel **Target = Model** lever | gap to model, over/under, perf vs model, drift | computes drift & gap | model portfolios, drift | ◐ |
| t2‑3 | Peer Behaviour & Activity Benchmarking | Simulator/peer lever → behaviour tabs | tickets, counts, per‑vintage, activity mode | compares *how* peers behave | ticket sizes, counts, intent | ◐ |
| t2‑4 | Scenario‑Aware Rebalancing | Simulator → macro overlay lever → rebalance sub‑views | toward defence/growth, cut concentration, via secondaries | recommends future‑commitment rebalance (no forced selling) | exposures, constraints, macro | ◐ |
| t3‑3 | Trend, Regime & Macro Exposure | Simulator → "Macro overlay" lever; deep tabs (all bespoke): Offence/defence, Macro sensitivity, Inflation, Energy, Hidden bets, Resilience vs peers, Theme momentum, Regime shift | offence/defence, GDP/inflation/energy sensitivity, hidden bets, resilience, theme momentum, regime probability | maps portfolio to macro factors, detects unchosen bets, models regime shift | allocation trends, company exposures, macro | ✅ |

### ACT · "So what do I actually do?" (workspace `act` — Opportunities)
| ID | Use case | In‑flow entry point | Sub‑layers | AI involvement | Key data | Status |
|----|----------|---------------------|-----------|----------------|----------|--------|
| opp | Opportunities / Next Best Action (landing) | Opportunities canvas: ranked actions weighted by your priorities | priority weighting, target‑fit scoring | ranks the single best next action | sim output, profile, inventory | ✅ |
| t1‑2 | Next Best Action Engine | Opportunities canvas (the ranked list) + Simulator "Suggest funds" handoff | invest now/wait, primary vs secondary, buy vs rebalance, do‑nothing, ticket size, order | the core recommender | holdings, profile, pipeline, demand | ✅ ranked / ◐ modes |
| t1‑3 | Explainable Investment Recommendation | **Click any ranked action → decision modal → "Why this" tab** (top‑5 reasons) | why strategy/manager/team/fit, risks, who shouldn't | generates the explanation chain | IC memos, DD, suitability | ✅ (decision modal) |
| t1‑8 | Fund Selection & Fund‑vs‑Fund | Decision modal → **"Compare" tab** (this vs alternative vs passed‑on) | A vs B, vs passed‑on, fees/terms/team/vintage | side‑by‑side reasoning | performance, fees, DD, portfolio co. | ✅ (decision modal) |
| t1‑11 | Opportunity Gap / Missed Opportunity | **Opportunities → "What you passed on" lane** (3 missed funds + ex‑post perf + "resembles today" link + blind‑spot pattern); also in the decision‑modal Compare tab | best missed, by strategy/vintage/profile, pattern | finds plausibly‑should‑have‑done + the recurring blind‑spot | offering history, engagement, ex‑post perf | ✅ (passed‑on lane) |
| t2‑5 | Smart Question & DD Intelligence | Decision modal → **"Questions" tab** (peer/PE/team DD questions) | top questions by peer/profession/PE/best/team, DD map | surfaces better diligence questions | transcripts, question logs | ✅ (decision modal) |
| t2‑6 | Secondary Market Intelligence | Opportunities → "Sell / liquidity" lane | should‑I‑sell, clears‑best, demand history, discounts | sell‑decision + clearing estimate | internal secondary transactions, demand | ○ signal‑gated |
| t3‑1 | Platform Demand & Allocation | Decision modal → **"Demand" tab** (fill time, oversubscription, allocation odds) | heatmap, time‑to‑fill, oversubscription, my‑allocation odds | predicts fill & allocation likelihood | subscription/fill‑rate histories | ◐ (modal tab, signal‑gated data) |
| t3‑2 | Personalized Why‑Not / Suitability | Decision modal → **"Why not" tab** (who shouldn't + what'd change) | why not now/portfolio/ticket/liquidity, what'd change | explains the *negative* recommendation | risk profile, liquidity, suitability | ✅ (decision modal) |

### RESEARCH · "Understand one fund deeply" (workspace `research` — Funds & Managers)
| ID | Use case | In‑flow entry point | Sub‑layers | AI involvement | Key data | Status |
|----|----------|---------------------|-----------|----------------|----------|--------|
| t2‑7 | Delivery & Consistency Intelligence | **Open any fund → "Delivery & consistency" tab** (consistency score, distribution stability, mark‑up quality, last‑3‑funds MOIC) | consistency score, distribution stability, mark‑up quality | scores delivery vs level | quarterly histories, NAV paths | ✅ (fund modal tab) |
| t2‑8 | Fund Lifecycle & Activity Mode | **Fund → "Lifecycle" tab** (buying/harvesting badge, net deployment, called‑by‑year) | buying/selling mode, net deployment, vs schedule/size | classifies lifecycle phase | called vs committed, deployment | ✅ (fund modal tab) |
| t2‑9 | Top Manager Pattern Intelligence | **Fund → "Manager patterns" tab** (shared DNA, what they avoid, team blueprint) | shared DNA, what they avoid, industry map, team blueprint | extracts top‑manager patterns | manager histories, team/DD data | ✅ (fund modal tab) |

---

## 3. The natural handoff chains (the "buttons that appear where it makes sense")

1. **Reporting → reshaping:** Overview chart → detail overlay → *"Adjust this in the Simulator →"* → Simulator pre‑focused on that dimension (`simulateFromHome(key)` sets `simFocus`).
2. **Reshaping → acting:** Simulator dimension row → *"✦ Suggest funds"* → Opportunities/Research with the gap as context (`askFromPage(...)` today; dedicated panel next).
3. **Acting → understanding the bet:** Opportunity → *"Why this?"* (t1‑3) / *"Why not?"* (t3‑2) → reasons panel.
4. **Acting → researching one fund:** Opportunity → *"Open fund →"* → Research fund detail (t2‑7/8/9 tabs).
5. **Acting → liquidity:** Opportunity → *"Sell instead?"* → Secondary Market (t2‑6).
6. **Anywhere → anything:** Ask Alpha rail (NL) resolves to the right panel via `homeIntent()/ANSWERS()`.

---

## 4. Honest build status (be critical of own work)

- **Fully interactive today:** Overview (all cards clickable → about‑me overlays incl. funds held), the per‑dimension Simulator (live current→target pie + z‑chart, working sliders, AI build‑target), Opportunities ranked list **+ the decision modal** (Why‑this / Why‑not / Compare / Questions / Demand tabs — t1‑3, t3‑2, t1‑8, t2‑5, t3‑1 woven in at the decision point), Ask Alpha, cohort/peer & macro **levers**, fund detail modal.
- **Surfaced but inner view still a scaffold (◐):** the deep sub‑tabs of t1‑1/4/5/6/13, t2‑1/2/3/4, t1‑11, t2‑7/8/9, t3‑3. They have entry points and sub‑layer lists but render the generic `scaffold()` viz, not bespoke logic.
- **Signal‑gated (○):** t1‑10 Sentiment, t2‑6 Secondary Market — intentionally "not‑connected" states until the proprietary feeds are wired.
- **Iteration log:** *Iter 1* — map + `flow.bpmn`. *Iter 2* — Opportunities **decision modal**. *Iter 3* — Simulator **"Suggest funds"** (t2‑1). *Iter 4* — **fund modal tabs** (t2‑7/8/9) + dup‑`fundRow` fix. *Iter 5* — **left‑rail progressive disclosure**. *Iter 6* — audited `deepBody` coverage (most use cases already have bespoke views); built the two missing **t1‑5** views (Ticket & count, Buying vs waiting), completing Peer Benchmarking.
- **Coverage now:** all 13 Tier‑1, all 9 Tier‑2, and the 2 non‑gated Tier‑3 use cases (t3‑2, t3‑3) have real bespoke surfaces. Only the **3 ○ signal‑gated** use cases remain as intentional "not‑connected" states: t1‑10 Sentiment, t2‑6 Secondary Market, t3‑1 Platform Demand (await proprietary feeds).
- **Iter 7:** completed **t3‑3** (all 8 tabs). **Iter 8:** **t1‑11 "passed‑on" lane**. **Iter 9:** tailored awaiting‑feed panels for the 3 gated use cases. **Iter 10‑11:** verified `flow.bpmn` renders in bpmn‑js + cleaned its labels. **Iter 12:** handover `README.md`. **Iter 13:** fixed t1‑10 reachability via a Simulator→Sentiment bridge. **Iter 14:** closed a claim/reality gap — the **persistent Ask Alpha rail now actually routes** (it only chatted before): a shared `navFor()` matcher attaches an "Open …" jump button to answers, with keyword coverage across sentiment, peers, missed‑opps, allocation, pacing, NBA, secondary, look‑through, macro, liquidity, projection and performance. The "NL router to any use case" claim is now true for the rail, not just the home hero.
- **Iter 15 (nav rework):** removed the use‑case **list** from the left rail entirely (even collapsed, a 10‑item list overwhelmed). The rail now only anchors the workspace's primary canvas; deeper analyses surface in‑flow — canvas actions, the right‑side comparison **levers** (peers/model/macro), a contextual **"Take your target further"** strip on the Simulator (pacing · projection · stress‑test, in plain language), the decision/fund modals, and **Ask Alpha** (navFor expanded to route to every deeper use case incl. model, peer‑behaviour, excellence, rebalancing, completion). Deep pages show a single "‹ back to [canvas]".
- **Status: 22 of 25 use cases have real bespoke surfaces.** The only remaining 3 are the intentionally **○ signal‑gated** ones (t1‑10 Sentiment, t2‑6 Secondary Market, t3‑1 Platform Demand) — they render honest "not‑connected" states by design; building them now would mean fabricating proprietary feeds, which violates the app's provenance principle.
- **Next iterations (data‑gated only):** wire t1‑10 / t2‑6 / t3‑1 when the sentiment, secondary‑book and platform‑demand feeds are connected. No further UI work is required to satisfy the spec.

---

*Data‑provenance note:* every panel cites its source set ("grounded · snapshot id"). The
proprietary moat data (transcripts, secondary book, demand, look‑through) powers the ○/◐
panels and is the reason these use cases can't be replicated by a generic screener.

---

## Changelog — Meta-View & UC review build (24 Jun 2026)

Implemented from `AskAlpha_MetaView_Review_2026-06-24.md`. All items verified in-browser
(Playwright over localhost:8731), 0 console errors.

**Overview (do-now / Sunday-send blocking):**
- `A1` Heading-vs-value hierarchy fixed — section headings now 22px bold, metric values reduced to 20px (`card({big:true})`).
- `A2/A7/A12` Section headings enlarged (page title 28px; Performance / Asset Allocation / Cash Flows `big`).
- `A3/D1` Overview segmented into blocks; Asset Allocation sub-sections (Strategy → Region → Currency → Sector → Vintage) each carry an underlined heading + "details →".
- `A5/A6` Top Holdings module added under Performance, toggleable by IRR / DPI / MOIC (`topHoldingsModule()`); redundant KPI grid trimmed; Net/Gross table kept (`D5`).
- `A8/A9` Strategy MECE set confirmed (Buyout, Growth, Venture, Infra, Private Credit, AI/Tech); Region taxonomy → USA / Europe / APAC / MEA (DACH dropped, Asia→APAC) in `HOME_DIMS` (single source → propagates to drill + simulator).
- `A13/A14/A15` Cash-flow bars now carry data labels; "Net cash position" banner (+€1.3m ▲ cash-positive) with explicit definition (lifetime distributions − calls).
- `A16` "See your future cash flows & pacing →" link from Cash Flows → Commitment Pacing.
- `A4` Investment Wealth field added to the top profile toolbar.

**V1 features:**
- `D14` One-time onboarding modal (6 questions) on first Ask Alpha entry (`onboardBody()`, `seenOnboard`).
- `D15/A20/A21` Top-right "Your Investor Profile" button → modal with adjustable risk / horizon / wealth / PM-target + target-strategy bar chart; "Set your target" CTA at the foot of the Overview (`profileModalBody()`, `setTargetCTA()`).
- `A22/A23/D17` Simulator + Benchmarking merged into "Simulator & Comparison" (new **Comparison** tab): comparator toggle (Peer group / Platform / Model), You-vs-Target + You-vs-comparator strategy deltas, multi-layer peer benchmark scorecard (`comparisonBody()`).
- `A24–A28` Opportunities already drive off Distance-from-Target with per-rec AI reasoning, named funds, and a "What you passed on" missed-lane paired with Next Best Action.
- `A19/A27` Shopping-cart / buy flow: "🛒 Buy now" on every fund (`fundActions`), top-bar cart with count, slide-over commit panel with ticket steppers + "Proceed to commit" → confirmation (`cartPanelBody()`).
- `A29/A30` Notifications bell + panel ("since you last logged in", peer purchases, distributions, closings) and a demo toast on each visit (`notifPanelBody()`, `toastBody()`).
- `A31` Pacing page gained a Stress-test tab (base / stress / severe liquidity + resilience gauge); AI overview supplied by the `alphaRead()` band.
- `A18` Full-breakdown drill rebalanced — symmetric cards + "Alpha's read" AI summary filling the prior whitespace; Buy / Portfolio-plan / Watchlist on every fund.

- `A32` **Follow functions** — built: follow your peer group (cohort filters) or the top 10% performers; when the followed group commits, a bell notification + visit toast ("{group} just invested in KKR XIII") opens a prospective fund page (`FOLLOW_FUNDS`, `prospectFundBody`, `followCard` on the Comparison page). Group choice propagates to notifications, toast and the fund modal.

*Open per the doc (not built — decisions/data-gated):* `Q1–Q7` open questions; `R13` projected J-curve/NAV (post-V1); `DATA1–6` ontology/field mapping (backend track).

---

## Model-portfolio backend (J.P. Morgan / Moonfare, 24 Jun 2026)

Source: `Anlageziele_Risikoklasse private markets und model portfolio JP Morgan (2).docx`.
The five model portfolios are keyed to the existing risk classes, so **switching Risk class now
switches the strategy model everywhere** (previously `MIX.model` was static).

- `MODEL_PORTFOLIOS()` — coarse mapping onto the app's 9 strategy buckets (Large+Mid+Small-Cap Buyout → Buyout; Direct & Co-Investments → Venture) so "you vs model" compares like-for-like.
- `MODEL_PORTFOLIOS_FINE()` — the faithful doc breakdown (sub-cap buyout + directs) rendered in the Investor-Profile "target model portfolio" chart.
- `modelMix()` returns the model for `state.riskId`; wired into `cmpMix('model')`, `HOME_DIMS` strategy target, the Simulator default target, and the Comparison "vs Model" benchmark.
- Verified: switching Income & Resilience ↔ Innovation & AI Alpha updates the profile chart, the home target, the simulator and the Comparison deltas live (e.g. Income → Private Credit 40%, Infra 22%).

### Direct & Co-Investments — own strategy bucket (24 Jun 2026)

Promoted "Direct & Co-Investments" from a folded-into-Venture mapping to its **own strategy bucket**
(`directs`, label "Direct & Co-Invest", token `--data-10` = lavender `#8C8DFF` light / indigo `#1417C2`
dark — both from the official categorical ramp). Rationale: directs/co-investments are a distinct
institutional sleeve (direct company stakes or fee-free co-invests alongside a GP — return/fee
enhancement, selection control, shorter J-curve), and the JP Morgan model lists it explicitly.

- Added to `STRATS`; rebalanced `MIX.you` (directs 4%), `MIX.platform` (3%), `MIX.model` (3%).
- `MODEL_PORTFOLIOS` now maps Direct & Co-Investments to `directs` (venture → 0 in all five models);
  `MODEL_PORTFOLIOS_FINE` recoloured its directs line to `--data-10`.
- Surfaces automatically (STRATS-/Object.keys-driven): Home strategy bars (`bigStrats`), Simulator
  sliders, Comparison "you vs model/target" z-charts, profile model chart, all donuts/legends.

---

## Database backend + A11 / Q4 / R11 (24 Jun 2026)

Stood up a real backend so the dashboard is data-driven, not hardcoded.

- **`server.py`** (Python stdlib) serves the app on :8731 + a SQLite-backed API: `GET /api/state`,
  `POST /api/profile`, `POST /api/simulation`. **`alpha_seed.json`** is the reference dataset.
- Frontend: `componentDidMount` fetches `/api/state`; `applyDB()` populates `MIX/PM/STRATS` and the
  `HELD_FUNDS / HELD_META / MODEL_PORTFOLIOS(_FINE) / FOLLOW_FUNDS / HOME_DIMS / cashflows / portfolio`
  accessors. Overview KPIs, allocations, cash-flows, holdings and models all render from the DB.
- **Delete test:** removing `alpha.db` makes `/api/state` return `{empty:true}`; the Overview shows a
  clean "No data — the database is empty" state (verified, no crash). Reads never recreate the file;
  a *save* creates only the tables (dataset stays empty) so it never silently restores reference data.
  `python3 server.py --seed` repopulates; saved profiles/simulations survive reseeds.
- **Profile saves** (Profile → Save, onboarding Confirm/Skip) and **simulation saves** (Simulator →
  Save target) POST to the DB and appear under `/api/state` `profiles` / `simulations`.
- **DATA1 resolved** via the seed: Distributions €10.6m (= sum of the cash-flow bars), DPI 0.8x,
  paid-in €13.0m, NAV €16.6m, net TVPI 2.10x — internally consistent.

- `A11` €/% toggle on the allocation breakdowns (€ derived from DB NAV) — Strategy/Region bars and
  Currency/Sector legends switch units.
- `Q4` dismissible mini-nudge on the Overview: biggest gap to the model target → "Adjust in Simulator".
- `R11` Bars / J-curve toggle on the Overview cash-flow card (J-curve = cumulative distributions − calls).

---

## Agentic chat + theming (loop iteration 2, 24 Jun 2026)

- **Shop button on fund names** — reusable `shopBtn`; added to Top Holdings rows and the "What you passed on" (missed) rows (fund modal / suggest / held / prospect already had it).
- **Three theme modes corrected** — Light (fully light incl. topbar), Hybrid (navy top + light body), Dark (full dark). New `--topbar-*` vars threaded through header, wsNav, risk/horizon/wealth, notifications, profile, cart + theme-aware logo filter. Chat panels now follow the theme via `--chat-*` (rail + header).
- **Agentic Ask Alpha** (`agenticIntent` + `agentAdjust` / `agentSuggestFunds` / `agentChart`, wired into `askSend` and `homeSend`):
  - "adjust my portfolio" → chat docks left and the canvas navigates to the Simulator with the target set (⚡ "Navigated to Simulator" badge). Verified.
  - "which funds can I buy…" → ranked fund cards in chat (fit score + **5-point rationale** + 🛒 Buy + "Model it"). Verified.
  - "show me a chart of…" → renders a live chart (donut/miniZ/grouped bars) from the user's data in the chat bubble. Verified.
- **Time-of-day greeting** — real `new Date().getHours()` (morning/afternoon/evening/late).

Remaining (next iterations): chat persistence + permanent memory in DB (chat log + RM/sales follow-ups: news/sentiment on flagged concerns, liquidity-event check-ins); homeHero (chatbox landing) theming; more shopBtn spots (homePop fund lists, opp rows); migrate scaffold scorecards to DB.

---

## Chat persistence + permanent memory + RM/sales behaviour (loop iteration 3, 24 Jun 2026)

- **Backend** (`server.py`): added `chat_log` + `memory` tables and `POST /api/chat`; `read_state`
  now returns recent `chats` + `memories`. `extract_memory()` mines each user turn for durable
  facts (US/Trump caution, a liquidity event + month, retirement horizon, ESG interest) and stores
  one row per kind (deduped).
- **Frontend**: `saveChat()` POSTs every user turn from `askSend`/`homeSend`; memories load on mount.
- **`proactiveNudge()`** — relationship-manager prompt surfaced when the chat opens, built from a
  stored memory: e.g. "You mentioned a liquidity event in March — did it land? I can line up funds"
  (→ ranked fund pitch) or "Following up on your US concern — sentiment has stabilised; you're 42% vs
  38% target — trim or hold?" (→ regional chart). Dismissible per memory.
- Verified end-to-end: a prior chat ("cautious about US because of Trump" / "liquidity event in
  March") persisted to the DB, the nudge appeared on reload, and its CTA produced the fund shortlist. 0 console errors.

Remaining: homeHero (chatbox landing) theming; more shopBtn spots (homePop lists, opp rows); migrate scaffold scorecards into the DB.

---

## homeHero theming + shop-button coverage (loop iteration 4, 24 Jun 2026)

- **homeHero (chatbox-first landing) now theme-aware** via new `--hero-*` vars (bg/ink/soft/line/chip)
  per theme: Light = light splash + dark text; Hybrid/Dark keep the premium dark radial. Logo uses
  `--logo-filter`. Verified light. The home transcript also renders the agentic `agentic`/`funds`/`chart`
  message content now.
- **Proactive RM nudge also surfaces on the homeHero landing** (not just the side chat).
- **More shop buttons**: cash-flow drill "Funds by capital called" rows, and the Opportunities
  recommended-sequence "add" action rows (a.fund). 0 console errors.

Remaining: migrate the deep scaffold scorecards (VIZMETA/vizBody hardcoded scorecard arrays in the far drill-ins) into the SQLite DB.

---

## Deep scorecards → DB (loop iteration 5, 24 Jun 2026)

- Added a `scorecards` dataset key to `alpha_seed.json` (keyed by viz id: ticket/capacity/consistency/demand),
  added it to `server.py` `DATASET_KEYS`, and `vizBody` now reads them via `scFromDB(id, fallback)` —
  DB-backed, literal fallback pre-load, and **empty when the DB is deleted**. API verified
  (`/api/state.scorecards` = ticket/capacity/consistency/demand); 0 console errors.
- **Honest scope note:** these are the 4 *reusable* `vizBody` scorecards. Most deep drill-ins use
  *bespoke custom renderers* (the `t1-*:page` / `t2-*:page` entries in `deepBody`) whose `scorecard([...])`
  arrays are still literal and override the scaffold viz. Fully DB-backing every one is a larger,
  per-use-case sweep (≈20–40 bespoke scorecards) — not done here; available on request.

### Status of the original request list — all delivered & verified (0 console errors):
shop buttons everywhere a fund appears · 3 theme modes (topbar + chat + hero) · agentic chat
(navigate-and-adjust, ranked funds w/ 5-pt rationale, charts) · time-of-day greeting · chat
persistence + permanent memory + RM proactive nudges · DB backend for all core/overview numbers
+ the 4 reusable deep scorecards. Remaining optional: DB-back the bespoke per-UC scorecards.

---

## Notifications with fund + logo (loop iteration 6, 24 Jun 2026)

- Notifications now carry `fund` + `logo` fields; the bell panel renders the **fund logo**
  (`assets/logos/{logo}.png`, e.g. KKR, Lexington, EQT, Ares) and a **fund-name chip** under each title.
- Visit toast moved to the **top-right** and shows the fund logo too. 0 console errors.

Remaining (next iterations): (a) peer & platform data in the DB so the comparison numbers actually
move when cohort filters change; (b) DB-back the bespoke per-UC scorecards (~20–40); (c) whitespace
fills — AI descriptions and/or enlarged graphs per page.

---

## Filter-responsive peer & platform data in the DB (loop iteration 7, 24 Jun 2026)

- Added `peer` (base median + wealth/profession/risk deltas, mix tilt, funds/ticket/irr bases) and
  `platform` (total, pm median, irr, funds, ticket) blocks to `alpha_seed.json`; added to `DATASET_KEYS`.
- `peerData()` now reads `this.DB.peer` coefficients (filters still drive it) and returns
  `median:0/mix:{}` when the DB is empty. The Comparison multi-layer benchmark scorecard's peer/platform
  figures (IRR, funds, ticket) now read from `this.DB.peer`/`this.DB.platform`.
- Verified live: switching the cohort to "Top performers" moved the peer PM-allocation median
  **8.9% → 14.3%** (the +5.4 coefficient sourced from the DB). 0 console errors.

Remaining: (a) bespoke per-UC scorecards → DB (~20–40); (b) whitespace fills (AI descriptions / enlarged graphs).

---

## Bespoke scorecards → DB + whitespace status (loop iteration 8, 24 Jun 2026)

- **Bespoke scorecards migrated:** a build script extracted the inline `this.scorecard([...])` arrays in
  the deep custom renderers; **23 static ones** are now routed through `scFromDB('scN', literalFallback)`
  and seeded into `alpha_seed.json` `scorecards` (27 keys total). **3 dynamic ones** (which compute from
  runtime vars — `seg`, `base[5]`, `on?…`) were correctly left as `this.scorecard([...])` since they
  can't be static DB data. Verified: deep drill-ins (e.g. Pacing→Ticket pacing "Discipline check",
  Liquidity "Safe new commitment") render from the DB and **empty on delete**; reseed restores them. 0 console errors.
- **Whitespace:** the main offenders were filled in earlier iterations (awaiting-feed pages, Opportunities
  sequence, full-breakdown drill, fund summaries, Simulator rail) and deep pages are framed by the
  alphaRead band + related-analyses footer. A further blanket "enlarge graphs / add paragraphs" pass is
  subjective and risks the dense layout — left for targeted, per-page requests rather than a blind sweep.

### Build complete. Loop stopped.
