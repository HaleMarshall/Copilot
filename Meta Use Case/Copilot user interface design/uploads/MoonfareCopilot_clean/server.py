"""Alpha server — FastAPI backend + static frontend + file watcher.

Run:  python3 -m uvicorn server:app --reload --port 8787
or:   ./start.sh
"""
from __future__ import annotations

import asyncio
import json
import logging
import threading
from html import escape
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

import ask_alpha
import db
import synth

ROOT = Path(__file__).parent
DATA = ROOT / "data"
FRONTEND = ROOT / "frontend"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s %(name)s · %(message)s",
    handlers=[logging.FileHandler(ROOT / "logs" / "server.log"), logging.StreamHandler()],
)
log = logging.getLogger("alpha")

app = FastAPI(title="Alpha · Moonfare Co-Pilot", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8787", "http://127.0.0.1:8787",
        "http://localhost:5500", "http://127.0.0.1:5500",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ==================== file watcher ====================
class DataChangeHandler(FileSystemEventHandler):
    """Re-ingest the SQLite cache whenever a data/ file changes.

    Debounced: a flurry of edits within 500ms triggers a single refresh.
    """
    def __init__(self) -> None:
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()

    def on_any_event(self, event):
        if event.is_directory:
            return
        if not (event.src_path.endswith(".json") or event.src_path.endswith(".csv")):
            return
        with self._lock:
            if self._timer:
                self._timer.cancel()
            self._timer = threading.Timer(0.5, self._do_refresh)
            self._timer.start()

    def _do_refresh(self) -> None:
        try:
            counts = db.refresh_database()
            log.info("data file changed → rebuilt cache: %s", counts)
        except Exception as e:
            log.error("refresh failed: %s", e, exc_info=True)


_observer: Observer | None = None


@app.on_event("startup")
def on_startup():
    log.info("Alpha server starting")
    counts = db.refresh_database()
    log.info("initial DB build: %s", counts)
    global _observer
    _observer = Observer()
    _observer.schedule(DataChangeHandler(), str(DATA), recursive=False)
    _observer.start()
    log.info("watching %s for changes", DATA)


@app.on_event("shutdown")
def on_shutdown():
    global _observer
    if _observer:
        _observer.stop()
        _observer.join()


# ==================== API ====================

class CohortRequest(BaseModel):
    age: list[str] = []
    wealth: list[str] = []
    risk: list[str] = []
    region: list[str] = []
    prof: list[str] = []
    marital: list[str] = []
    kids: list[str] = []

    def to_dict(self) -> dict[str, list[str]]:
        return {k: getattr(self, k) for k in ("age", "wealth", "risk", "region", "prof", "marital", "kids")}


@app.middleware("http")
async def _no_cache_static(request: Request, call_next):
    """Always revalidate static assets so frontend edits show without a hard reload."""
    resp = await call_next(request)
    if request.url.path.startswith("/static"):
        resp.headers["Cache-Control"] = "no-store, must-revalidate"
    return resp


@app.get("/api/health")
def health():
    return {"ok": True, "ts": _now()}


@app.get("/api/risk_profiles")
def api_risk_profiles():
    return {"profiles": db.get_risk_profiles()}


@app.get("/api/endowments")
def api_endowments():
    return {"endowments": db.get_endowments()}


@app.get("/api/portfolio/you")
def api_you():
    return db.get_you()


@app.get("/api/portfolio/platform")
def api_platform():
    return db.get_platform_average()


@app.get("/api/portfolio/top_decile")
def api_top_decile():
    return db.get_top_decile()


@app.post("/api/cohort")
def api_cohort(req: CohortRequest):
    # #9 fix: real counts — the pool is the real investor set, no synthetic multiplier.
    n_strict = db.compute_cohort_size(req.to_dict())          # real strict-intersection count
    avg = db.get_cohort_average(req.to_dict()) or {}
    n_effective = int(avg.get("n") or 0)                       # real relaxed-cohort count
    relaxed = avg.get("relaxed_dims") or []
    return {
        "filter": req.to_dict(),
        "n": n_effective,
        "n_strict": n_strict,
        "relaxed_dims": relaxed,
        "total": db.platform_count(),
        # k-anonymity: block when even the relaxed cohort is below the k=10 floor.
        "below_floor": n_effective < 10,
        "k_floor": 10,
        "peer_average": avg.get("avg", {}),
    }


@app.get("/api/funds")
def api_funds(strategy: str | None = None):
    return {"funds": db.get_open_funds(strategy=strategy)}


@app.get("/api/fund_track_records")
def api_fund_track_records():
    return {"funds": db.get_fund_track_records(),
            "_source": "Indicative — synthetic placeholder per handoff bundle, not real fund performance"}


@app.get("/api/fund_track_record/{fund_name}")
def api_fund_track_record(fund_name: str):
    return {"fund_name": fund_name,
            "records":   db.get_fund_track_record(fund_name),
            "_source":   "Indicative — synthetic placeholder, not real fund performance"}


@app.get("/api/recommendations")
def api_recommendations():
    """Rank the open funds by their fit to the logged-in user's gap profile.
    Score = how much each fund closes the user's largest underweights vs their
    assigned model portfolio, weighted by strategy gap size."""
    you = db.get_you()
    rp = db.get_risk_profiles()
    rc_id = you.get("profile", {}).get("risk_profile_id", "balanced_compounding")
    model = next((p["allocation"] for p in rp if p["id"] == rc_id), rp[1]["allocation"])
    # Compute gaps (positive number = under-weight = good if the fund covers it)
    gaps = {k: max(0, v - (you.get("allocation", {}).get(k) or 0)) for k, v in model.items()}
    # Each fund's strategy maps loosely to one of these buckets
    STRAT_MAP = {
        "Venture Capital": "Growth / Tech", "Private Equity": "Large-Cap Buyout",
        "Buyout": "Large-Cap Buyout", "Private Credit": "Private Credit",
        "Secondaries": "Secondaries", "Infrastructure": "Infrastructure",
        "Growth / Tech": "Growth / Tech",
    }
    out = []
    for f in db.get_open_funds():
        bucket = STRAT_MAP.get(f.get("strategy", ""), f.get("strategy"))
        gap = gaps.get(bucket, 0)
        # Featured + new funds get a small boost; evergreen + waitlist a small dampener
        category_boost = {"featured": 1.5, "open": 1.0, "semi_liquid": 0.9, "waitlist": 0.7}.get(f.get("category", ""), 1.0)
        score = round(gap * category_boost, 2)
        out.append({**f, "fit_bucket": bucket, "fit_gap_ppt": round(gap, 1), "fit_score": score})
    out.sort(key=lambda x: x["fit_score"], reverse=True)
    return {"recommendations": out, "user_risk_class": rc_id}


class ScenarioItem(BaseModel):
    fund_id: str
    capital_eur: float


class ScenarioRequest(BaseModel):
    selected: list[ScenarioItem] = []


@app.post("/api/scenario")
def api_scenario(req: ScenarioRequest):
    """Apply selected funds to the user's current portfolio and return the resulting
    strategy allocation + gap-vs-model + new total commitment.
    """
    you = db.get_you()
    profile = you.get("profile", {})
    wealth_eur = profile.get("wealth_eur") or 10_000_000
    cur_target_pct = profile.get("target_pm_pct") or 20
    cur_pm_eur = wealth_eur * cur_target_pct / 100.0

    # Convert current pct allocation to € amounts
    cur_alloc_pct = you.get("allocation", {})
    cur_alloc_eur = {k: cur_pm_eur * v / 100.0 for k, v in cur_alloc_pct.items()}

    # Map each fund's strategy onto a strategy bucket the user holds
    STRAT_MAP = {
        "Venture Capital": "Growth / Tech", "Private Equity": "Large-Cap Buyout",
        "Buyout": "Large-Cap Buyout", "Private Credit": "Private Credit",
        "Secondaries": "Secondaries", "Infrastructure": "Infrastructure",
        "Growth / Tech": "Growth / Tech",
    }
    added_eur_by_strategy: dict[str, float] = {}
    added_funds: list[dict] = []
    total_added_eur = 0.0
    for item in req.selected:
        fund = next((f for f in db.get_open_funds() if f["id"] == item.fund_id), None)
        if not fund:
            continue
        bucket = STRAT_MAP.get(fund.get("strategy", ""), fund.get("strategy") or "Other")
        added_eur_by_strategy[bucket] = added_eur_by_strategy.get(bucket, 0) + float(item.capital_eur)
        total_added_eur += float(item.capital_eur)
        added_funds.append({"name": fund.get("name"), "strategy": bucket, "eur": item.capital_eur})

    # New allocation in €
    new_alloc_eur = dict(cur_alloc_eur)
    for k, eur in added_eur_by_strategy.items():
        new_alloc_eur[k] = new_alloc_eur.get(k, 0) + eur
    new_total_pm_eur = cur_pm_eur + total_added_eur
    new_alloc_pct = {k: round(v / new_total_pm_eur * 100, 1) for k, v in new_alloc_eur.items()} if new_total_pm_eur else {}

    # New target as % of wealth
    new_target_pct = round(new_total_pm_eur / wealth_eur * 100, 1) if wealth_eur else 0

    # Gap-vs-model after scenario
    rp = db.get_risk_profiles()
    rc_id = profile.get("risk_profile_id", "balanced_compounding")
    model = next((p["allocation"] for p in rp if p["id"] == rc_id), rp[1]["allocation"])
    gaps = {k: round((new_alloc_pct.get(k) or 0) - (model.get(k) or 0), 1) for k in model.keys()}

    return {
        "wealth_eur": wealth_eur,
        "before": {
            "pm_target_pct": cur_target_pct,
            "pm_eur":         round(cur_pm_eur),
            "allocation_pct": cur_alloc_pct,
            "allocation_eur": {k: round(v) for k, v in cur_alloc_eur.items()},
        },
        "added": {
            "total_eur":      round(total_added_eur),
            "by_strategy_eur":{k: round(v) for k, v in added_eur_by_strategy.items()},
            "funds":          added_funds,
        },
        "after": {
            "pm_target_pct":  new_target_pct,
            "pm_eur":         round(new_total_pm_eur),
            "allocation_pct": new_alloc_pct,
            "allocation_eur": {k: round(v) for k, v in new_alloc_eur.items()},
        },
        "gap_vs_model_ppt": gaps,
    }


@app.get("/api/synth/profile/{investor_id}")
def api_synth_profile(investor_id: str, profession: str = "Consulting",
                       age: int = 45, real_risk_score: str | None = None,
                       wealth_segment: str = "HNW"):
    """Deterministic synthetic assignment for one investor — §1-§4 of the spec."""
    risk = synth.assign_risk_class(investor_id, profession, age, real_risk_score)
    target = synth.assign_pm_target_pct(risk, wealth_segment)
    wealth = synth.assign_wealth_eur(investor_id, wealth_segment)
    kids = synth.assign_children(investor_id, age, wealth_segment)
    return {
        "investor_id": investor_id,
        "assigned_risk_class": risk,
        "assigned_risk_class_short": synth.RISK_SHORT.get(risk, risk),
        "assigned_pm_target_pct": target,
        "assigned_wealth_eur": wealth,
        "assigned_children": kids,
        "_governance": "Deterministic synthetic assignment (seeded by investor_id). Illustrative only — production sources from real onboarding capture.",
    }


@app.get("/api/synth/ai_lookthrough")
def api_ai_lookthrough():
    """AI double-count: stated AI sleeve vs economic AI exposure embedded inside Growth/Tech, Directs, etc."""
    you = db.get_you()
    return synth.ai_lookthrough(you.get("allocation", {}),
                                sector_mix=you.get("sector_mix", {}),
                                coverage=(db._read_json("you.json") or {}).get("lookthrough_coverage"))


@app.get("/api/synth/follower_alert")
def api_follower_alert(group: str = "Peer average"):
    """Gap-driven follower notification (§5). Picks a real Moonfare fund matched to the
    investor's largest underweight strategy vs their assigned model portfolio."""
    you = db.get_you()
    # find user's assigned risk-class model allocation
    rp_list = db.get_risk_profiles()
    rc_id = you.get("profile", {}).get("risk_profile_id", "balanced_compounding")
    model = next((p["allocation"] for p in rp_list if p["id"] == rc_id), rp_list[1]["allocation"])
    funds = db.get_fund_universe()
    alert = synth.follower_alert(
        you_allocation=you.get("allocation", {}),
        model_allocation=model,
        fund_universe=funds,
        follow_group_label=group,
        investor_id=you.get("id", "u_demo"),
    )
    return alert


class ChatRequest(BaseModel):
    question: str
    context: dict[str, Any] | None = None  # live UI state: {page, cohort, selectedFunds, scenario}


@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(400, "empty question")
    # claude --print is blocking; run in a thread so the event loop stays responsive.
    # `context` carries the user's current page / cohort / selectedFunds / scenario so
    # the answer adapts to what they're looking at right now.
    try:
        result = await asyncio.to_thread(ask_alpha.ask, req.question, req.context)
        return result
    except Exception as e:
        log.error("chat failed: %s", e, exc_info=True)
        return {"ok": False, "answer": f"Server error: {e}", "source_summary": ""}


_LOGO_DIR = FRONTEND / "assets" / "logos"
_HERO_DIR = FRONTEND / "assets" / "heroes"
_LOGO_TINTS = [
    ("#2C2DFE", "#FFFFFF"), ("#1417C2", "#FFFFFF"), ("#5B5CFF", "#FFFFFF"),
    ("#3E5A5C", "#FFFFFF"), ("#2D8F6F", "#FFFFFF"), ("#7A6A55", "#FFFFFF"),
    ("#B5A98F", "#0E0E0E"), ("#0E0E0E", "#F4EFE2"),
]


def _letter_tile_svg(label: str) -> str:
    label = (label or "?").strip() or "?"
    initials = "".join(w[0] for w in label.replace("-", " ").replace("_", " ").split()[:2]).upper() or label[0].upper()
    idx = sum(ord(c) for c in label) % len(_LOGO_TINTS)
    bg, fg = _LOGO_TINTS[idx]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">'
        f'<rect width="96" height="96" rx="14" fill="{bg}"/>'
        f'<text x="48" y="58" font-family="Inter,system-ui,sans-serif" font-size="38" '
        f'font-weight="700" fill="{fg}" text-anchor="middle">{initials}</text>'
        '</svg>'
    )


@app.get("/api/logo/{slug}")
def api_logo(slug: str):
    """Return the manager logo PNG if present, else a deterministic letter-tile SVG.
    Frontend can use <img src="/api/logo/{slug}"> without knowing which exist."""
    safe = "".join(c for c in slug if c.isalnum() or c in ("_", "-", " ")).strip()
    if safe:
        png = _LOGO_DIR / f"{safe}.png"
        if png.exists():
            return FileResponse(png, media_type="image/png")
    return Response(content=_letter_tile_svg(safe or slug), media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/hero/{slug}")
def api_hero(slug: str):
    """Return a hero/business-style image for the fund category."""
    safe = "".join(c for c in slug if c.isalnum() or c in ("_", "-")).strip()
    if safe:
        jpg = _HERO_DIR / f"{safe}.jpg"
        if jpg.exists():
            return FileResponse(jpg, media_type="image/jpeg")
    # Fallback gradient SVG
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#2C2DFE"/><stop offset="1" stop-color="#1417C2"/>'
        '</linearGradient></defs>'
        '<rect width="600" height="400" fill="url(#g)"/></svg>'
    )
    return Response(content=svg, media_type="image/svg+xml")


class RotateRequest(BaseModel):
    investor_id: str | None = None


@app.post("/api/rotate_investor")
def api_rotate_investor(req: RotateRequest):
    """Rotate 'you' to another real investor (random rich one, or a specific id)."""
    res = db.rebind_you(req.investor_id)
    log.info("rotated investor: %s", res)
    return res


def _investor_cohort_filter(you: dict) -> dict:
    p = you.get("profile", {})
    a = p.get("age")
    ab = None if a is None else ("20-35" if a < 35 else "35-50" if a < 50 else "50-65" if a < 65 else "65+")
    return {"region": [p["region"]] if p.get("region") else [],
            "prof": [p["profession"]] if p.get("profession") else [],
            "risk": [p["risk_profile_id"]] if p.get("risk_profile_id") else [],
            "age": [ab] if ab else []}


_REPORT_CSS = """
* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1a1a1a; margin: 0; }
.page { padding: 22mm 18mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
h1 { font-family: Georgia, serif; font-size: 30px; margin: 0 0 4px; }
h2 { font-family: Georgia, serif; font-size: 19px; margin: 26px 0 10px; border-bottom: 2px solid #2C2DFE; padding-bottom: 5px; }
.logo { height: 30px; margin-bottom: 26px; }
.eyebrow { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; color: #2C2DFE; font-weight: 600; }
.chips { margin: 10px 0 4px; }
.chip { display: inline-block; background: #F4EFE2; border-radius: 999px; padding: 4px 11px; font-size: 12px; margin: 0 6px 6px 0; }
.summary { font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; margin-top: 12px; }
.muted { color: #666; font-size: 11.5px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #eee; }
th { color: #666; font-weight: 600; font-size: 11px; }
.barrow { display: grid; grid-template-columns: 150px 1fr 52px; align-items: center; gap: 10px; margin: 5px 0; font-size: 12px; }
.bartrack { background: #EEE8DC; border-radius: 5px; height: 16px; position: relative; }
.bar { background: #2C2DFE; height: 16px; border-radius: 5px; }
.disclaimer { margin-top: 22px; font-size: 10.5px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; line-height: 1.5; }
@page { margin: 0; }
"""


def _bars(title, rows, maxv=None):
    """rows: list of (label, value, suffix). Returns an HTML bar group."""
    mx = maxv or (max((v for _, v, _ in rows), default=1) or 1)
    out = [f'<h2>{title}</h2>']
    for label, v, suf in rows:
        w = max(0, min(100, (v / mx) * 100))
        out.append(f'<div class="barrow"><div>{label}</div><div class="bartrack">'
                   f'<div class="bar" style="width:{w:.1f}%"></div></div><div>{v:g}{suf}</div></div>')
    return "".join(out)


def _mix_table(title, you, peer, keys=None):
    keys = keys or sorted(set(list(you.keys()) + list(peer.keys())))
    rows = "".join(
        f"<tr><td>{k}</td><td>{you.get(k,0):g}%</td><td>{peer.get(k,0):g}%</td>"
        f"<td>{(you.get(k,0)-peer.get(k,0)):+g} pp</td></tr>" for k in keys if (you.get(k,0) or peer.get(k,0)))
    return f'<h2>{title}</h2><table><tr><th>Bucket</th><th>You</th><th>Peer</th><th>Δ</th></tr>{rows}</table>'


def _build_report_html() -> str:
    you = db.get_you(); prof = you.get("profile", {})
    plat = db.get_platform_average(); top = db.get_top_decile()
    rp = db.get_risk_profiles()
    rc = prof.get("risk_profile_id", "balanced_compounding")
    model = next((p for p in rp if p["id"] == rc), {})
    cohort = db.get_cohort_average(_investor_cohort_filter(you)) or {}
    peer = cohort.get("avg", {})
    MODEL_PM = {"income_resilience":10,"balanced_compounding":15,"equity_growth":20,"innovation_ai_alpha":25,"opportunistic_advanced":40}
    try:
        summary = ask_alpha.investor_summary({"page": 1, "cohort": _investor_cohort_filter(you)})
    except Exception as e:
        summary = f"(AI summary unavailable: {e})"
    w = prof.get("wealth_eur") or 0
    chips = "".join(f'<span class="chip">{escape(str(x))}</span>' for x in [
        prof.get("profession"), f"age {prof.get('age')}", f"€{round(w/1e6)}M investable",
        f"{prof.get('target_pm_pct')}% PM target (modelled)", (model.get("short_name") or rc),
        prof.get("region"), f"horizon {prof.get('horizon_years')}", prof.get("marital")])
    you_perf = you.get("performance", {}); peer_perf = peer.get("performance", {}); plat_perf = plat.get("performance", {}); top_perf = top.get("performance", {})
    perf_rows = "".join(
        f"<tr><td>{m}</td><td>{you_perf.get(m,'—')}</td><td>{peer_perf.get(m,'—')}</td>"
        f"<td>{plat_perf.get(m,'—')}</td><td>{top_perf.get(m,'—')}</td></tr>" for m in ["DPI","MOIC","IRR"])
    # PM allocation comparison
    pm_rows = [("You", prof.get("target_pm_pct") or 0, "%"),
               ("Peer", peer.get("pm_allocation_pct") or 0, "%"),
               ("Platform", plat.get("pm_allocation_pct") or 0, "%"),
               ("Moonfare model", MODEL_PM.get(rc, 15), "%")]
    parts = []
    parts.append('<div class="page">')
    parts.append('<img class="logo" src="/static/moonfare_logo.png" alt="Moonfare">')
    parts.append('<div class="eyebrow">Private Markets Portfolio Review · Alpha Co-Pilot</div>')
    parts.append(f'<h1>{escape(prof.get("display_name","Investor"))}</h1>')
    parts.append(f'<div class="muted">Generated {_now()} · investor id {escape(str(you.get("id")))} (identity masked) · '
                 f'peer group n={cohort.get("n","—")}{" · relaxed: "+", ".join(cohort.get("relaxed_dims") or []) if cohort.get("relaxed_dims") else ""}</div>')
    parts.append(f'<div class="chips">{chips}</div>')
    parts.append('<h2>AI-written investor summary</h2>')
    parts.append(f'<div class="summary">{escape(summary)}</div>')
    parts.append(_bars("Private-markets allocation — % of investable wealth", pm_rows, maxv=50))
    parts.append('</div>')
    # page 2: strategy + perf
    parts.append('<div class="page">')
    parts.append(_mix_table("Strategy allocation — You vs Peer group", you.get("allocation",{}), peer.get("allocation",{}),
                            keys=["Large-Cap Buyout","Mid-Cap Buyout","Small-Cap Buyout","Infrastructure","Growth / Tech","Private Credit","Secondaries","Direct & Co-Investments","AI"]))
    parts.append(f'<h2>Performance — GP-marked, unrealised</h2><table>'
                 f'<tr><th>Metric</th><th>You</th><th>Peer</th><th>Platform</th><th>Top decile</th></tr>{perf_rows}</table>'
                 f'<div class="muted">IRR on &lt;4yr vintages is J-curve-distorted; DPI (realised) is the comparable measure.</div>')
    parts.append('</div>')
    # page 3: region/format/sector/vintage
    parts.append('<div class="page">')
    parts.append(_mix_table("Region mix — You vs Peer group", you.get("region_mix",{}), peer.get("region_mix",{})))
    parts.append(_mix_table("Format mix — You vs Peer group", you.get("format_mix",{}), peer.get("format_mix",{})))
    parts.append(_mix_table("Sector look-through — You vs Peer group", you.get("sector_mix",{}), peer.get("sector_mix",{})))
    parts.append(_mix_table("Vintage mix — You vs Peer group", you.get("vintage_mix",{}), peer.get("vintage_mix",{})))
    parts.append('<div class="disclaimer">Peer and platform figures are derived from Moonfare\'s real investor export. '
                 'MODELLED (not measured): PM-target %, investable-wealth €, the model portfolios (Moonfare house view), and '
                 'marital/horizon (research-based — see RESEARCH_NOTES.md). Endowment benchmarks are illustrative (total-endowment, '
                 'not a private-markets sleeve). Performance uses unrealised GP marks. Informational only — not investment advice.</div>')
    parts.append('</div>')
    body = "".join(parts)
    return (f'<!doctype html><html><head><meta charset="utf-8"><title>Alpha Portfolio Review</title>'
            f'<style>{_REPORT_CSS}</style></head><body onload="setTimeout(function(){{window.print()}},400)">'
            f'{body}</body></html>')


@app.get("/api/investor_summary")
def api_investor_summary():
    return {"summary": ask_alpha.investor_summary({"page": 1})}


@app.get("/api/report_blurbs")
def api_report_blurbs():
    """One Claude call → per-section captions for the client-side PDF builder."""
    return {"blurbs": ask_alpha.report_blurbs({"page": 1}),
            "summary": ask_alpha.investor_summary({"page": 1})}


@app.get("/api/report")
def api_report():
    return Response(content=_build_report_html(), media_type="text/html")


@app.post("/api/_pdfdump")
async def _pdfdump(req: Request):
    """DEBUG: receive a data-URI PDF from the client and write it to /tmp for verification."""
    import base64, re as _re
    body = (await req.body()).decode("utf-8", "replace")
    m = _re.search(r"base64,(.*)$", body, _re.S)
    if m:
        with open("/tmp/alpha_report.pdf", "wb") as f:
            f.write(base64.b64decode(m.group(1)))
    return {"ok": True}


@app.post("/api/refresh")
def api_refresh():
    """Manual trigger — same as a file edit."""
    counts = db.refresh_database()
    log.info("manual refresh: %s", counts)
    return {"ok": True, "counts": counts}


# ==================== static frontend ====================
@app.get("/")
def index():
    return FileResponse(FRONTEND / "index.html")

# Mount static assets at /static so they don't shadow /api routes
app.mount("/static", StaticFiles(directory=str(FRONTEND)), name="static")


def _now() -> str:
    import datetime as _dt
    return _dt.datetime.now().isoformat(timespec="seconds")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8787, reload=False)
