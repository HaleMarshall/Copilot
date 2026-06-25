# Ask Alpha — "Meta View & UC" Review · Action Log, Decisions & Revisions

**Meeting:** Meta View and UC
**Date:** 24 Jun 2026
**Participants:** Benjamin Pauls (builder / screen-share — "Me") · Steffen Pauls (founder / reviewer — "Them")
**Context:** Walkthrough of the **Overview / Meta-Use-Case page** of *Ask Alpha* (AI copilot embedded in the Moonfare platform). All 25 use cases are scaffolded in; ~30–40% are fleshed out. Numbers on screen are model-generated **placeholders**.

> **Legend** — `A#` Action / to-build · `D#` Decision (settled) · `R#` Revision (position changed mid-call) · `Q#` Open question / unresolved · `DATA#` Data/backend dependency · `P#` Process/logistics.
> **Persona note:** *"Coburger"* (transcribed; spelling uncertain) = the target end-investor persona — an **existing, logged-in Moonfare client**, big-picture thinker, ~55 yrs old. Used throughout as the design archetype.
> Names in **[brackets]** are ASR-garbled and should be confirmed.

> **Pre-call context (non-actionable):** opening chatter re: Jellyfish output (only the focus areas, "fürs Spielteam") and Steffen's off-site presentation built with AI in ~2 hrs vs. the old ~2 days, pending a final formatting pass. No product actions.

---

## 0. Cross-cutting / global UI

- `A1` **Heading hierarchy is inverted — fix globally.** The metric value (e.g. "11%") currently renders **larger than its section headline** ("Performance"). Headlines must outrank values. *("Jetzt ist die Elf größer als die Headline Performance.")*
- `A2` **Enlarge section headings** across the page: Portfolio Overview, Performance, Asset Allocation, Region, Cash Flow. Steffen: these "müssen bisschen größer sein."
- `A3` **Segment the one-pager into visually distinct blocks/sections** with separators, instead of one continuous scroll. Each theme becomes its own block. → see `D1`.
- `R1` **Number/font size for Currency & Sector:** Steffen first asked to enlarge the numbers ("vor allen Dingen bei currency und sektor"), then **reversed** after seeing the zoom-out — keep current sizes, "sieht von der Optik gut aus," no giant numbers. **Net: leave as-is.** (Heading fix `A1`/`A2` still applies.)
- `R2` **Large-font / accessibility variant** (Benjamin's offer of an enlarged "[Steffen]-version" for the older user) — **declined for now**: "lass es mal so." *Latent concern to revisit:* avg. user is ~55 and "sieht nicht mal richtig"; Benjamin reviews on a large screen so his read of sizing is biased. Keep on watch-list, not a V1 task.

---

## 1. Navigation & entry flow

- `D2` **Entry = chatbox first.** Level one is just the chat / "Enter Alpha" screen for the Coburger. Confirmed unchanged.
- `D3` From the entry screen → **Dashboard**, which shows **Overview only** — "nichts anderes," purely current-state.
- `D4` **Everything on the Overview is click-to-drill-in.** Click a tile (Performance, a strategy, region, etc.) → detail view. Confirmed behavior.
- `A4` **Add "Investment Wealth"** field to the top profile area (currently captured: risk class, allocation target, investment horizon; wealth still to add).

---

## 2. Overview — Performance block

- `A1`/`A2` apply (heading sizing).
- `DATA1` **Distributions / "return to date" is internally inconsistent with the multiples.** With DPI 2.1x the cash-returned figure should be ≈ **€32m, not €2.1m** ("der müsste ja zweiunddreißig haben, nicht zwei"). Reconcile distributions ↔ DPI/MOIC once real data lands. (Placeholder artifact, but flagged.)
- `D5` **Keep** the net/gross metric table (MOIC, TVPI, DPI, IRR) and the "across five managers" cash-returned detail — Steffen approved ("across five managers, super").
- `A5` **Remove the historical/individual sub-section** under Performance that Steffen flagged ("diesen Teil hier unten… willst Du das entfernt haben") — he finds the Net-IRR continuation there unjustified.
- `A6` **Fill the resulting whitespace** (from `A5`) with a **"Top Performing Companies / Top Holdings by performance"** module, **toggleable by metric** (IRR / DPI / MOIC) per the user's preferred metric.
- `Q1` **Net IRR curve behavior unexplained** — neither party knows why the curve "so weitergeht" ("Das weiß ich auch nicht"). Decide what it should represent or cut it (ties to `A5`).

---

## 3. Overview — Asset Allocation (Strategy / Region / Currency / Sector / Vintage)

- `D1` **Restructure Asset Allocation as one parent section with discrete sub-sections:** **Strategy → Region → Currency → Sector → Vintage**, each its own block (the basis for the segmentation in `A3`). Rationale Benjamin gives: each sub-section is independently drill-in-able.
- `A7` **Asset Allocation heading → larger**, not smaller ("nicht kleiner, eigentlich größer").
- `A8` **Expand Strategy categories to a full (MECE) set.** Steffen listed: **Buyout, Growth, Venture, Infra, (Private) Credit** (and "AI-Tech" — confirm whether that's a strategy bucket or belongs under Sector). Current Buyout/Growth/Venture is incomplete.
- `A9` **Region — replace the buckets.** Drop **DACH** ("macht keinen Sinn"). Use macro regions: **USA, Europe, APAC** (rename "Asia" → **APAC**), and consider **MEA / "[Middle East]-Africa"**. Confirm final region taxonomy.
- `D6` **Keep a dedicated Sector breakdown** distinct from the strategy/tech split up top. Purpose: true exposure read (e.g. "how exposed am I in Healthcare").
- `R3` **Sector block:** Steffen initially thought it duplicated something above ("Sektor hab ich doch oben schon?") → after Benjamin's rationale, **accepted as distinct and kept** ("find ich hervorragend").
- `A10` **Add Vintage** as an allocation sub-section. Currently being built by the AI agent in the background.
- `A11` **`€` / `%` toggle on the allocation breakdowns** — *(implied need; confirm)* show absolute euros, not just percentages. → `Q2`.
- `Q2` Confirm whether allocation breakdowns should support a €/% toggle (not explicitly settled in-call; strong fit with the "where do I actually stand" intent).

---

## 4. Overview — Cash Flows

- `A12` **Enlarge the Cash Flow block** ("Cash-Flow wieder bisschen größer").
- `A13` **Add the missing data labels/numbers** to the Capital Calls vs Distributions bars ("hier muss noch die Zahl hin. Da fehlen die Zahlen").
- `A14` **Add a "Net" figure** (net cash flow = Distributions − Capital Calls) so the investor sees **at a glance whether they're cash-positive**, without mental math ("muss im Kopf die Differenzen durchrechnen… Du brauchst unten Net").
- `A15` **Define "Net cash position" precisely** and confirm it equals "what I've gotten back, net" ("Ist das, was ich zurückhabe?" — "das können wir definieren"). Currently ambiguous.
- `D7` **Overview = current state only; no projections here.** Future/projected cash flows live elsewhere (Pacing page). Reinforced repeatedly.
- `A16` **Add an entry-point (button/section/link) from Cash Flows → Future Cash Flows / Pacing** ("ich brauch nur 'ne Section, wie die Future Cashflows sind").
- `A17` **Review [Andy Todd]'s existing cash-flow / "Total Portfolio" view** for best practices ("da gibt's doch schon ein Cash-Flow-Ding"). His emphasizes **future** cash flows; ours is current-state — keep the distinction. Asset not yet uploaded; **[Xi Jong]** reportedly already built/handled a version. → `P1`.
- `R11` **J-Curve vs bar chart:** Steffen liked the J-Curve ("Pacing and Performance" view) and asked whether to **swap it in for** the distribution bar chart. **Resolution:** J-Curve belongs with **projections** (separate page), because a new investor wants "I'm here now → here's where I'm projected." Bar chart stays on Overview; **possibly show both** (J-Curve top, bar chart below). Not finalized as "both" — confirm.
- `Q3` **Time axis:** [Andy]'s chart runs to 2025; Steffen expected 2026. Concluded his is a **quarterly review** only. Confirm our Overview/Pacing horizon (through 2026).

---

## 5. Drill-in / detail views (all sections)

- `D8` **Standard drill path:** Overview tile → contributing funds + "Ask Alpha" → click a fund → fund detail (more info, **add to simulator**, ask questions, view its holdings, info point).
- `D9` **"Ask your AI about this" button on every position/section** — lets the Coburger talk to the bot about that specific slice. Confirmed, keep everywhere.
- `A18` **Full-breakdown view fixes:** one element "muss noch runtergebracht werden" (reduce/reposition) and another area "muss noch mehr gefüllt werden" (needs more content). Already flagged to the build agent; in progress.
- `A19` **"Add to cart / Shopping Card" flow** — let the user add a fund/position directly to a cart ("ich will jetzt kaufen"). Applies to Strategy, Region, Sector drill-ins. Not yet built.
- `D10` **Vintage is view/ask-only — NOT adjustable.** No simulator entry from Vintage; only "Ask Alpha." (Confirms an earlier decision.)
- `D11` **Simulator entry exists for the four adjustable dimensions only:** Strategy, Region, Currency, Sector.

---

## 6. Simulator

- `D12` **Simulator** lets you adjust Strategy / Region / Currency / Sector; shows **current portfolio vs target with deltas** (e.g. "−8", "34% [X], 14% Growth, 10% Venture, ~2% Private Credit"). Full-screen toggle hides everything else to chat with Ask Alpha.
- `R8` **Simulator CTA label:** debated "adjust your target split" → leaning to **"Simulate this strategy / Simulate a region"**, since the user only simulates against their portfolio, doesn't change it. Tentative — confirm final copy.
- `D13` **Current-vs-target visualization (dotted target line, over/underweight) belongs in the Simulator/Comparison, NOT the Overview.** Overview answers "where am I today"; target comparison is a Simulator concern.
- `R14` Benjamin floated putting a current-vs-target dotted line on the Asset Allocation page → **moved to Simulator** instead.

---

## 7. Investor Profile & first-time onboarding flow  *(longest debate)*

- `D14` **One-time onboarding on first-ever Ask Alpha click** — even for existing Moonfare clients. Show the 6 profile questions **once** (confirm/adjust: investor will, risk appetite, investment horizon, + extra context for the chatbot). Serves as the product intro ("wie nutze ich dieses Produkt"). Not repeated, not a re-login.
- `R5` **Big reversal / convergence on the flow.** Path of the discussion:
  - Steffen wanted profile info **visible/confirmable up top, on entry**, framed via the Claude/ChatGPT "who are you / professional investor?" onboarding analogy — argument: Ask Alpha is a **new product inside the platform**, so the user may want to re-introduce themselves / re-set risk ("ich bereite mich auf die KI-Welt vor… vielleicht bin ich risikoreicher").
  - Benjamin pushed back: existing clients arrive **already logged in** from moonfare.com (not a separate site/app), KYC already done — why re-ask?
  - **Settled:** ask once on first use (`D14`); thereafter expose via a **profile button**, not forced on entry, shown as **toggles**.
- `D15` **Add a top-right "Your Investor Profile" button** (in the header area, near the "Steffen Pauls" name slot once the header shrinks). Opens a **quick profile/settings view**: target allocation (**as a bar chart**, like the simulator), risk, horizon. **Viewable AND adjustable** ("auch adjustieren").
- `A20` Build the profile/settings view with **target Strategy allocation rendered as a bar chart** ("so hatten wir damals Ihre Targets").
- `A21` **"Set your target" CTA at the bottom** of the relevant page (in addition to the top button).
- `D16` **Keep BOTH the Investor-Profile page and the Simulator.** Profile = **coarse, big-picture** target setting for the Coburger ("Trump changed America → I want less US," not fiddling with small toggles). Simulator = **granular** per-bucket adjustment.
- `R6` **Global target-allocation toggles in the header → rejected.** Too many toggles; target allocation is only relevant to Simulator/Comparison + the one-time onboarding + the Profile button. (Target *is* still surfaced, e.g. "Allocation Target 35%.")
- `Q4` **Mini-nudge for existing investors:** Benjamin proposed a tiny single-mini-graph prompt on first view ("you're very heavy in Buyouts — want to adjust?"). Deferred — "können wir hinzufügen, wenn Du möchtest." Decide in/out.
- `D21` **Design for existing customers, not new users.** ~**5,500 existing Moonfare clients** will use Ask Alpha first; the ~100 net-new users are "vollkommen irrelevant" for the Overview design. The Overview must answer "where do I stand now" for someone already onboarded.
- `D22` **Flow ordering for true new customers:** a genuinely new customer (never on Moonfare) hits **KYC first** and would not land on Ask Alpha first — so the one-time profile onboarding (`D14`) sits *inside* the platform, post-login, on first Ask Alpha click. Not a separate signup.

---

## 8. Comparison (Simulator + Benchmarking merge) & Peer benchmarking

- `D17` **Merge "Simulator" and "Benchmarking" into ONE "Comparison" page.** Reason: too many pages (already 4), and the two are tightly coupled — you must set your target in the simulator *before* you can benchmark. ("Da will ich das zusammenfassen zu comparison.") Confirm final name: **"Comparison"** vs **"Compare Yourself."**
- `A22` **Add toggles** on the Comparison view: **Target vs Peer Group** (and **Platform**) — and across **My Portfolio vs My Target**. Currently not built. (Alternative considered: treat "my target = the peer group," but prefer explicit toggle.)
- `A23` **Place the "multilayer peer benchmark"** within the Comparison page.
- `DATA2` **Peer/benchmark data is the dependency** — these are recorded calls; "kriegen wir dort die Datenintegration hin?" Flag feasibility.

---

## 9. Opportunities & Missed Opportunities

- `A24` **Build out the Opportunities page** driven by **"Distance from Target"**: show targets per bucket, "add more to X/Y," link back to Simulator. Needs more content ("muss noch ausgefüllt werden").
- `A25` **Add AI reasoning** per recommendation ("why Private Credit") — explanation on click.
- `A26` **Add the recommended-funds list** to each opportunity (currently missing — "sollte drin sein"; Benjamin already prompted the agent; in progress).
- `A27` **Wire Opportunities into the buy/shopping flow** ("Act on opportunities," "opportunities for Asia," → cart).
- `A28` **Add "Missed Opportunities / What you passed on."** Placement decision: pair it with **"Next Best Action"** under Opportunities ("Next Best Action… daneben missed opportunities").

---

## 10. Notifications / Messages

- `A29` **Add a notifications/messages feature** (top-right, "read your messages") surfacing **"since you last logged in…"** events — e.g. **"your peers have bought [Ecotev]."**
- `A30` **Demo behavior:** for the demo build, also surface it as a **small right-side notification on each visit**.

---

## 11. Pacing / Projections page

- `A31` **Build out the Pacing page** ("plan your pacing, projected forward and stress[-test]"): show **commitments**, **projected-forward vs peers**, **stress test**, plus the standard **AI overview**. Currently stubbed (bottom of the stack, minimal work so far).
- `R13` **Projected J-Curve / projected NAV → DEPRIORITIZED for V1.** Steffen: "nice to have… witziger Gimmick," unlikely to drive a sales decision. Keep out of V1; easy to add later.

---

## 12. Use-case scope & V1 priorities

- `R10` **Use-case count corrected: 22 → 25.** All 25 scaffolded; ~30–40% fleshed out; 100% present on the platform as stubs ("annual / total ticket / pacing," etc., per Steffen's doc).
- `D18` **Don't build everything for V1.** Per-feature test: "will this ever be needed?" If yes-someday, fine to integrate later — not blocking.
- `D19` **V1 priority set (Steffen's explicit wants):**
  1. **Peer benchmarking**
  2. **Follow functions** *(`A32` — define scope: follow peers? funds? — currently unspecified)*
  3. **Next best opportunity**
  4. **Missed opportunities** ("what I passed on")
- `D20` **V1 de-scope:** projected J-Curve / projected NAV (see `R13`).
- `Q5` **Information-overload risk** (Benjamin raised — even he lost his place among the toggles/pages). Open design constraint: curate what a 55-yr-old big-picture investor actually needs vs. everything technically possible.
- `Q6` Confirm overall coverage matches Steffen's spec; decide whether to **add use cases** beyond the current set.

---

## 13. Backend / Data / Ontology

- `DATA3` **Frontend is the critical path; backend is largely done.** The live re-compute when you adjust a slider = backend working. "build my target with alpha" (sets target off the model portfolio) = backend done. "Das Frontend ist die schwierigste Sache."
- `DATA4` **Ontology / data not finished — primary blocker.** "Die Ontologie ist nicht fertig." Real data not yet wired in.
- `DATA5` **Use [Sczepanski]'s data-fields sheet** (the "[Schließung]" reference — name garbled) — the concrete list of fields Moonfare currently has — as the starting point. "Wenn wir die Datenfelder haben, dann reicht das."
- `DATA6` **Map use cases → required data fields.** The use cases *are* the data spec ("die Use Cases sind die Beschreibung von den Daten"). Moonfare does **not yet hold all needed fields** (allocation etc. still to be collected/"abgefragt").
- `Q7` Was the data/ontology setup meant to be done **this week**? Uncertain — "Sollte das nicht diese Woche aufgesetzt werden? Ich weiß es nicht." Confirm status/owner.

---

## 14. Process, logistics & deadlines

- `P1` **Benjamin → send Steffen the best-practice references** ([Andy Todd]'s design + anything well-made / anything missing from our Overview). Mandate: "dass wir Best-Practice machen… uns genau angucken und lernen." Upload [Andy]'s asset (not yet uploaded).
- `P2` **Send deck/prototype to the team by Sunday evening** so they can review **before the meeting** → everyone arrives with a sharper view. Benjamin committed ("Mach ich").
- `P3` **The meeting is fixed — cannot be moved** ("Jetzt können wir nicht verschieben… ich hab doch keinen Flug").
- `P4` **V1 target: September.**

---

## 15. Consolidated REVISIONS (changes of mind during the call)

| ID | Topic | From → To |
|----|-------|-----------|
| `R1` | Currency/Sector number size | Enlarge → **keep as-is** |
| `R2` | Large-font accessibility variant | Build it → **declined (for now)** |
| `R3` | Sector breakdown | "duplicate?" → **keep, distinct** |
| `R4` | Overview layout | One continuous page → **segmented blocks** (`D1`) |
| `R5` | Profile/onboarding | Persistent on-entry toggles / re-intro every time / settings page → **one-time onboarding + top "Your Investor Profile" button** |
| `R6` | Target toggles in header | Global, up top → **only in Simulator/Comparison + Profile + onboarding** |
| `R8` | Simulator CTA copy | "Adjust your target split" → **"Simulate this strategy/region"** (tentative) |
| `R9` | Pages | Separate Simulator + Benchmarking → **single "Comparison" page** (`D17`) |
| `R10` | Use-case count | 22 → **25** |
| `R11` | Cash flow chart | Swap bar chart for J-Curve → **J-Curve to projections page; bar chart stays; maybe both** |
| `R13` | Projected J-Curve / NAV | In scope → **deprioritized, post-V1** |
| `R14` | Current-vs-target line | On Allocation page → **moved to Simulator** |

---

## 16. Open questions / unresolved

- `Q1` Net IRR curve — what it represents / keep or cut.
- `Q2` €/% toggle on allocation breakdowns — in or out.
- `Q3` Overview/Pacing time horizon (through 2026?); [Andy]'s appears quarterly-only.
- `Q4` Existing-investor mini-nudge ("you're heavy in Buyouts…") — in or out.
- `Q5` Information-overload curation for the 55-yr-old big-picture persona.
- `Q6` Use-case coverage vs spec; add more?
- `Q7` Ontology/data setup status & owner; was it due this week?
- Final naming: **"Comparison"** vs **"Compare Yourself."**
- Confirm Strategy taxonomy (is "AI-Tech" a strategy or a sector?) and final Region taxonomy (USA / Europe / APAC / MEA?).
- Names to confirm: **[Andy Todd]**, **[Xi Jong]**, **[Sczepanski / "Schließung"]**, **[Ecotev]**, **[Ask Luna]** reference.

---

## 17. Prioritized to-do checklist

**Do-now / blocking the Sunday send (`P2`):**
- [ ] `A1` Fix heading-vs-value hierarchy (11% > "Performance")
- [ ] `A2`/`A7`/`A12` Enlarge section headings (Performance, Asset Allocation, Region, Cash Flow)
- [ ] `A3`/`D1` Segment overview into blocks (Strategy/Region/Currency/Sector/Vintage)
- [ ] `A13` Add data labels to Cash Flow bars
- [ ] `A14`/`A15` Add + define "Net" cash position
- [ ] `A5`/`A6` Remove historical Net-IRR sub-section; replace with Top Holdings (toggle IRR/DPI/MOIC)
- [ ] `A8`/`A9` Fix Strategy taxonomy + Region taxonomy (drop DACH, Asia→APAC)
- [ ] `A10` Vintage sub-section (in progress)
- [ ] `P1` Upload [Andy]'s asset; send best-practice refs to Steffen

**V1 priority features (`D19`):**
- [ ] `A22`/`A23`/`D17` Comparison page (merge Simulator + Benchmarking; Target/Peer/Platform toggles; multilayer peer benchmark)
- [ ] `A32` Follow functions (define scope)
- [ ] `A24`–`A28` Opportunities + Next Best Action + Missed Opportunities + reasoning + fund lists
- [ ] `A29`/`A30` Notifications ("since last login," peer purchases)
- [ ] `D14`/`D15`/`A20`/`A21` One-time onboarding + "Your Investor Profile" button (bar-chart targets, view+adjust)
- [ ] `A19` Add-to-cart / buy flow across drill-ins
- [ ] `A18` Full-breakdown layout + content fill
- [ ] `A4` Add Investment Wealth field

**V1 nice-to-have / lower priority:**
- [ ] `A31` Pacing page build-out (commitments, projected-vs-peers, stress test)
- [ ] `R13` Projected J-Curve / NAV — **post-V1**

**Data track (parallel, gating real numbers):**
- [ ] `DATA5`/`DATA6` Pull [Sczepanski]'s field list; map use cases → fields; identify gaps Moonfare must collect
- [ ] `DATA1` Reconcile distributions ↔ DPI once real data lands
- [ ] `Q7` Confirm ontology setup status/owner
