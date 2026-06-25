# Moonfare AI Copilot — Meta View Proposal

**Purpose of this document:** define *what the unified Copilot should be* before any single
use case is designed — the shared architecture, the customer flow, the grouping of the 25
use cases, the two user modes, and the design standards every screen must obey. This is a
brief to hand to a design pass; it intentionally does **not** specify visual design (colours,
pixels, components styling). It specifies structure, content, behaviour, and the rules.

It is written to resolve the core problems raised in the review:
1. The 25 use cases are currently built **independently** — there is no unified view and no
   shared brain. They must flow into one another.
2. 25 separate sections would **overload** a normal investor. Use cases must be **grouped**.
3. The biggest miss is **conceptualisation before execution** and **quality control of the
   output** — so this document leads with the model of the product, then the QC standards.

---

## 1. The one-sentence vision

> Moonfare Copilot is **one cockpit for an investor's private-markets life** — a living
> portfolio "twin" you *understand*, *shape*, and *act on* — not 25 separate tools bolted
> together.

Everything the investor does is a view onto the **same underlying state**. Changing a lever
in one place updates everything everywhere. The investor (or their agent) can drive it at
the depth they want — from "just pick the best for me" to "let me move every slider myself."

---

## 2. The four modes of the same twin (the meta-flow)

The whole product is four verbs over one shared state. This is the customer flow, and it is
also the spine the navigation is built on:

| Mode | Investor question | What it is |
|---|---|---|
| **Understand** | "Where am I and how am I doing?" | Home / Portfolio cockpit + monitoring |
| **Shape** | "Where *should* I be?" | The Simulator (targets, peers, model, macro) |
| **Act** | "So what do I actually do?" | Opportunities & Next Best Action → fund → execute |
| **Learn** | "What happened and what did I decide?" | Feedback loop, decision trail, re-personalisation |

A fifth thing is **always present, not a mode**: **Ask** — the conversational Copilot that can
answer any of the 25 use cases in plain language and deep-link the investor into the right
surface with the right state already set.

Understand → Shape → Act → Learn → (loop). This is the same backbone the process model
already uses; the UI should make the loop visible (e.g. after acting, Home reflects the change).

---

## 3. The persistent shell (the single most important decision)

Every workspace uses the **same three-zone shell** so the investor learns the product once.
This is what makes 25 use cases feel like one product, and it is the structural fix for the
"go back to a giant page to change one slider" problem.

- **Left — the Cockpit / Canvas.** The investor's portfolio and results: charts, numbers,
  the answer to the current question. This is where output lives and updates live.
- **Right — the Control Panel (the levers).** The inputs that shape what the left shows:
  target allocation, who my peers are, which model portfolio, macro/scenario assumptions,
  what to optimise for. Changing any lever here re-renders the left **immediately**.
- **Top — Workspace navigation** (the four mode-groups, §5) + the persona toggle (§4).
- **Omnipresent — the Ask bar** (Copilot): natural-language input that can read or set any
  lever, run any use case, and jump the investor to the relevant surface.

The right-hand Control Panel is **persistent across Shape and Act**, so the investor can tweak
their target while looking at recommended funds without navigating away. (This is the
"what-if without going back to the big page" requirement.) On Understand/Funds it collapses
to a context summary that can be expanded.

---

## 4. Two user modes — Guided vs Pro (one toggle, one data model)

The same surfaces serve two very different investors. Do **not** build two products; use
progressive disclosure over the identical state.

- **Guided** (the non-expert — "I don't know what DPI is, pick the best for me").
  - Levers are **pre-set** with sensible defaults; the Control Panel is collapsed.
  - Primary actions are **"Find the best for me"** style: best peers, best allocation, best
    next action — one recommended path, explained in plain language.
  - The Copilot does the driving; the investor mostly approves.
- **Pro** (the data-savvy investor / family office / their AI agent).
  - Full Control Panel: every slider, choose primary metrics (IRR / DPI / TVPI / PME),
    rearrange and pin cards, deep fund data, raw numbers.
  - "Match peers," "Build my own target," manual overrides, scenario stacking.

A single **Guided ↔ Pro** toggle (or automatic progressive reveal) switches the surface
complexity. Underneath, both write to the same twin, so an investor can start Guided and go
deeper without losing context.

---

## 5. The workspaces — how the 25 use cases group

Four workspaces in the top nav, plus the omnipresent Copilot. Every use case lives in exactly
one *primary* home and may be *reachable* contextually from others. (Full mapping in §8.)

### 5.1 Home — "Understand"
The landing surface. **Portfolio value is the first thing on the screen.** Then: performance,
holdings, what changed, liquidity/cash-flow position, alerts, and any signals worth surfacing.
Answers "where am I, how am I doing, what needs attention."
- Primary use cases: Performance Attribution & Review, Portfolio Look-Through & Concentration,
  Cash-flow/Liquidity Intelligence, Delivery & Consistency, Sentiment/Intent (as alerts).

### 5.2 Simulator — "Shape" (the cockpit Steffen described)
The heart of the product. Left = the portfolio cockpit (allocation wheel, Actual-vs-Target,
pacing, projection, peer overlay). Right = the levers: **target allocation, pacing plan, peer
group, model portfolio, macro/scenario assumptions, what to optimise for.** Move a lever →
the cockpit recomputes live. This is where "I believe in Trump → re-weight" happens, where
"Match Peers / Build my target / Moonfare Model Portfolio / Manual" lives.
- Primary use cases: Private Markets Allocation Architect, Commitment Pacing Planner,
  Multi-Layer Peer Benchmarking, Excellence Benchmarking, Peer Behaviour & Activity,
  Model Portfolio Benchmarking, Portfolio Completion, Scenario-Aware Rebalancing,
  Forward Portfolio Projection, Trend/Regime/Macro Exposure.

### 5.3 Opportunities — "Act"
Where shape becomes action. "Funds that move your target" with a **Fit Score** that depends on
what the investor is optimising for (set in the Simulator levers, carried over via the
persistent Control Panel). Drill into a fund → full investment data → decide → execute. Also
holds the *why*: explainable recommendation, why-NOT/suitability, what you missed, what's in
demand, secondary-market options, and the smart questions to ask before committing.
- Primary use cases: Next Best Action Engine, Fund Selection & Fund-vs-Fund Comparison,
  Explainable Investment Recommendation, Personalised Why-Not / Suitability, Opportunity Gap /
  Missed Opportunity, Platform Demand & Allocation, Secondary Market Intelligence,
  Smart Question & Due-Diligence Intelligence.

### 5.4 Funds & Managers — "Research / deep dive"
Reached contextually (from a fund in Opportunities or a holding on Home), not a cold tab.
Everything to understand a single fund or manager deeply: lifecycle/activity mode, manager
track-record patterns, delivery/consistency quality, full look-through, sentiment on it.
- Primary use cases: Fund Lifecycle & Activity Mode, Top Manager Pattern Intelligence,
  Delivery & Consistency, Portfolio Look-Through (fund-level), Investor Sentiment (fund-level).

### 5.5 Copilot / Ask — omnipresent
Not a tab. A persistent natural-language layer that can answer any of the 25 use cases, set
levers, and deep-link to the right surface with state pre-loaded. It is the Guided investor's
main driver and the Pro investor's shortcut.

---

## 6. The central brain (why everything flows into one another)

There is **one canonical state object** — call it the **Investor Twin** — that every surface
reads from and writes to:

- Profile, risk appetite, goals, liquidity preferences
- Holdings, commitments, transactions, cash-flow position
- **Target allocation** (and how it was set: Build / Match Peers / Model / Manual)
- **Selected peer group** (who am I compared to)
- **Selected model portfolio**
- **Macro / scenario assumptions** (the "I believe in X" overlays)
- **Optimisation objective** (what the Fit Score and recommendations optimise for)
- Decision trail (what was recommended, what was chosen)

Rules:
- The right-hand Control Panel **mutates the twin**; the left re-renders from it. Every
  workspace shares the same twin, so a change in the Simulator is already reflected in
  Opportunities and Home.
- Each action on a surface calls a **decoupled function** (the existing process/function
  registry) — the UI references *what* to do; the *how* lives behind the function. This is
  what lets the same number/recommendation appear consistently everywhere.
- This is the "central brain" the review asked for. It is the reason use cases can be
  decentralised into surfaces **only after** the shared twin and meta-flow are agreed.

---

## 7. Global design & quality-control standards (non-negotiable, apply to every screen)

The review made clear this is ~70% of what matters. These are product-wide rules, enforced on
every surface and every chart:

1. **One semantic colour system, everywhere.** A given strategy/sector/entity is the *same
   colour on every chart, in every workspace*. Never "all blue." Adjacent categories must be
   visually distinguishable at a glance (the Private Debt / Venture differentiation is the bar;
   the all-blue Strategy/Region/Currency/Sector charts are the failure).
2. **Never show a metric out of its context.** "Now / Peer" comparison values appear **only**
   in peer-compare mode. A value that only makes sense under one lever setting must not render
   under another.
3. **Actual vs Target is always paired and directly comparable.** e.g. vintage 2022–2026:
   show Actual and Target side by side, graphically, in one view — not numbers the investor has
   to mentally diff.
4. **Portfolio value first.** On any portfolio view, the value of the portfolio is the first
   thing the investor sees.
5. **Math must be correct and explainable.** Rebalancing re-weights **proportionally** and
   always sums to 100%; show *why* a weight moved. No silent or arbitrary reallocation.
6. **Every number is answerable.** Click any figure → "what is this / how is it computed"
   (backed by the decoupled function). No unexplained numbers.
7. **Layout discipline.** Consistent component heights and alignment; balanced whitespace (no
   crowded-left / empty-right pages); if a panel has nothing to change, the layout adapts
   rather than leaving dead space.
8. **Personalised metrics.** The investor chooses their primary metrics (IRR vs DPI vs TVPI vs
   PME) and the product remembers it (the a16z / Revolut "I see what I care about" model).

---

## 8. Use-case → surface mapping (all 25 placed)

| # | Use case | Primary workspace | Also reachable from |
|---|---|---|---|
| T1-01 | Allocation Architect | Simulator | Home, Copilot |
| T1-02 | Next Best Action | Opportunities | Home, Copilot |
| T1-03 | Explainable Recommendation | Opportunities | Funds, Copilot |
| T1-04 | Commitment Pacing Planner | Simulator | Home |
| T1-05 | Multi-Layer Peer Benchmarking | Simulator (peer lever) | Home, Opportunities |
| T1-06 | Excellence Benchmarking | Simulator (peer lever) | Opportunities |
| T1-07 | Cash-flow / Liquidity | Home | Simulator, Opportunities |
| T1-08 | Fund Selection / Comparison | Opportunities | Funds |
| T1-09 | Look-Through / Concentration | Home | Funds, Simulator |
| T1-10 | Sentiment / Intent | Home (alerts) | Funds |
| T1-11 | Missed Opportunity | Opportunities | Home |
| T1-12 | Performance Attribution & Review | Home | Funds |
| T1-13 | Forward Portfolio Projection | Simulator | Home |
| T2-01 | Portfolio Completion | Simulator | Opportunities |
| T2-02 | Model Portfolio Benchmarking | Simulator (model lever) | Home |
| T2-03 | Peer Behaviour & Activity | Simulator (peer lever) | Home |
| T2-04 | Scenario-Aware Rebalancing | Simulator | Opportunities |
| T2-05 | Smart Question / DD | Opportunities | Funds |
| T2-06 | Secondary Market | Opportunities | Home, Funds |
| T2-07 | Delivery & Consistency | Funds & Managers | Home, Opportunities |
| T2-08 | Fund Lifecycle / Activity Mode | Funds & Managers | Opportunities |
| T2-09 | Top Manager Patterns | Funds & Managers | Opportunities |
| T3-01 | Platform Demand & Allocation | Opportunities | Funds |
| T3-02 | Why-Not / Suitability | Opportunities | everywhere a recommendation appears |
| T3-03 | Trend / Regime / Macro | Simulator (macro lever) | Home |

---

## 9. Shared component inventory (build once, reuse across all 25)

The reason 25 use cases collapse into 4 workspaces is that they share components. Define these
once:

- **Target Allocation Editor** — the wheel/sliders with modes: Build my target / Keep my
  target / Match Peers / Moonfare Model Portfolio / Manual.
- **Peer Selector** — choose / define who I'm compared to (cohort, profession, region,
  excellence groups). Fixed-vs-editable behaviour must be explicit.
- **Allocation view (Actual vs Target)** — incl. the seed/wheel chart, shown larger when the
  control panel is collapsed.
- **Scenario / Macro lever panel** — "I believe in X" overlays that re-weight live.
- **Fit Score card** — score is a function of the current optimisation objective.
- **Fund card + Fund detail drawer** — performance (DPI/IRR/TVPI), terms, team, lifecycle.
- **Recommendation card** — with built-in explainability and the why-NOT/suitability view.
- **Cash-flow / J-curve chart.**
- **Comparison table** (fund-vs-fund, me-vs-peers, me-vs-model).
- **Ask bar + result→surface deep-link.**

---

## 10. Decisions to settle in the design session (don't pre-bake)

These genuinely change the design and are best decided live, not assumed:
1. Are **Simulator** and **Opportunities** two workspaces, or one split-screen (shape on the
   left, act on the right)?
2. How far does the **persistent Control Panel** follow the investor into Home and Funds?
3. Exact **default metric set** per persona (what Guided sees vs Pro).
4. Naming: **Moonfare Model Portfolio** vs "Model Portfolio" (branding), and the labels for the
   target-mode buttons.
5. Mobile / responsive priority — is this desktop-cockpit-first?
6. Which use cases get a **dedicated card on Home** vs only surfacing as an alert/Copilot answer.

---

## 11. How to use this document

Hand this to the design pass as the *frame*. The recommended first build is deliberately rough:
generate one **shared-shell screen** (the three-zone shell with the Simulator levers stubbed)
so the toggles/levers become visible, then move/re-level them — rather than perfecting any one
use case. The goal of the first iteration is to lock the **shared design and the meta-flow**,
because that determines how all 25 use cases are built.
