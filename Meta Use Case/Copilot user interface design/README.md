# Moonfare Alpha Co‑Pilot — prototype

A clickable, single‑file prototype of the Moonfare private‑markets AI co‑pilot. It turns the
25 use cases from `Moonfare AI Copilot Use Cases .docx` into **one connected flow** rather than
a list of pages.

## What's here

| File | What it is |
|------|------------|
| `Alpha Copilot - Overview.dc.html` | The app. A "Design Component" HTML file rendered by `support.js` (a small React‑without‑JSX runtime: `h()` = createElement). |
| `support.js` | The runtime the `.dc.html` loads. Keep it next to the HTML. |
| `assets/` | Logos, fonts refs, fund/manager marks. |
| `USE_CASE_IMPLEMENTATION.md` | **Where every one of the 25 use cases lives** in the flow — entry point, sub‑layers, AI involvement, required data, and build status. Start here. |
| `flow.bpmn` | The end‑to‑end user journey as a BPMN 2.0 diagram (opens in Camunda Modeler / bpmn.io / draw.io). Each verb is a drill‑in sub‑process; lanes = Investor / Alpha AI / Moonfare Data. |
| `CLAUDE.md` | The brand/colour system (authoritative palette + fonts). |

## How to run it

The app now has a small **backend** (`server.py`) that serves the static `.dc.html` **and** a
JSON API backed by a SQLite database (`alpha.db`). Every number on the dashboard is read live
from that database; investor-profile saves and simulation saves are written back to it.

```
cd "Meta Use Case/Copilot user interface design"
python3 server.py
# then open http://localhost:8731/Alpha%20Copilot%20-%20Overview.dc.html
```

Click **Enter Alpha** → **Skip to dashboard** (entry is chatbox-first by design).

### The database
- `alpha_seed.json` — the reference dataset (KPIs, holdings, allocations, JP Morgan model
  portfolios, cash-flows, follow-funds). `server.py` loads it into `alpha.db` on first run.
- API: `GET /api/state` (everything the dashboard renders), `POST /api/profile`,
  `POST /api/simulation`.
- **Prove it's DB-driven:** with the server running, delete `alpha.db` and refresh — the
  dashboard switches to its *"No data — the database is empty"* state (reads never auto-recreate
  the file). Restore it with `python3 server.py --seed` (saves you made are preserved).
- Saving an investor profile (Profile → Save, or onboarding) or a simulation (Simulator →
  Save target) writes a row you can see in `/api/state` under `profiles` / `simulations`.

## The flow (4 verbs)

```
UNDERSTAND → SHAPE → ACT → RESEARCH → (loop)
 Overview     Simulator  Opportunities  Funds & Managers
```

- **Overview** — performance, allocation (strategy/region/currency/sector/vintage) and cash‑flows.
  Click any chart → a left **overlay** breaks it down *about you* (incl. the funds you hold).
- **Simulator** — per‑dimension **current pie → sliders → live target pie → live gap (z‑chart)**;
  "✦ Build my target with Alpha" and per‑row "✦ Suggest funds".
- **Opportunities** — ranked Next Best Action; click an action for the **decision modal**
  (Why this / Why not / Compare / Questions / Demand) and see the "What you passed on" lane.
- **Funds & Managers** — open any fund for **Overview / Delivery & consistency / Lifecycle /
  Manager patterns** tabs.
- **Ask Alpha** (left rail) is the natural‑language router to any of the above.

The deeper analyses don't clutter the rail: each workspace shows its primary canvas, with the
rest under a collapsible **"More analyses"** — most are also reachable in‑flow from a chart,
recommendation or fund.

## Status

22 of 25 use cases are fully built and interactive. The 3 remaining
(**Investor Sentiment**, **Secondary Market Intelligence**, **Platform Demand**) render honest
"awaiting‑feed" states — they each name the proprietary feed required and what they'll show once
connected, rather than fabricating signal data. See `USE_CASE_IMPLEMENTATION.md` for the full map.
