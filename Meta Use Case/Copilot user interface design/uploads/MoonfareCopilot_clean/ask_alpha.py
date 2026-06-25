"""Ask Alpha — wraps the user's logged-in Claude CLI session.

Why a subprocess and not the SDK with an API key:
- Ben uses Claude Max — the CLI is already authenticated for free.
- The same session that's running this server can also answer chat queries
  without provisioning a separate ANTHROPIC_API_KEY.
- When this ships to the Moonfare laptop, the Moonfare user will run
  `claude login` once and Alpha works.

Calls `claude --print` (non-interactive mode) with a tightly-scoped system
prompt and the live database context. Strict instructions: answer only from
context, never give investment recommendations, never fabricate numbers.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import db

CLAUDE_BIN = shutil.which("claude") or "/Users/johnsteinbech/.local/bin/claude"


def _build_context(live: dict[str, Any] | None = None) -> str:
    """Snapshot of the database in a format Claude can read.

    `live` carries the user's current UI selections (current page, cohort
    filters, selected funds, latest scenario response). When present, Claude
    sees what the user is looking at right now and can answer in context."""
    you = db.get_you()
    rp = db.get_risk_profiles()
    endo = db.get_endowments()
    plat = db.get_platform_average()
    top = db.get_top_decile()
    open_funds = db.get_open_funds()
    rc_id = (you.get("profile") or {}).get("risk_profile_id", "balanced_compounding")
    user_model = next((p for p in rp if p["id"] == rc_id), rp[1] if rp else {})
    prof = you.get("profile", {})
    # Resolve THIS investor's own peer cohort (the "investors like me" set) so the chat can
    # explain the user's specifics, not just platform-wide info. Uses the live cohort filters
    # if present, else derives a cohort from the user's own region/profession/wealth/risk.
    cohort_filter = (live or {}).get("cohort") if live else None
    if not cohort_filter:
        cohort_filter = {
            "region": [prof.get("region")] if prof.get("region") else [],
            "prof":   [prof.get("profession")] if prof.get("profession") else [],
            "risk":   [rc_id] if rc_id else [],
        }
    cohort = db.get_cohort_average(cohort_filter) or {}
    snap = {
        "user": {
            "WHO_THIS_IS": ("This IS the logged-in investor. You have full access to all of their "
                            "profile, holdings, performance and derived analytics below — answer "
                            "about THEM specifically, by name. (Display name is privacy-masked.)"),
            "profile": prof,
            "investor_id": you.get("id"),
            "assigned_risk_class": rc_id,
            "pm_target_pct_MODELLED": prof.get("target_pm_pct"),
            "current_allocation_pct": you.get("allocation", {}),
            "fill_rate_pct_of_target": you.get("fill_rate_pct"),
            "performance": you.get("performance", {}),
            "region_mix_pct": you.get("region_mix", {}),
            "format_mix_pct": you.get("format_mix", {}),
            "vintage_mix_pct": you.get("vintage_mix", {}),
            "sector_mix_pct": you.get("sector_mix", {}),
            "lookthrough_coverage": you.get("lookthrough_coverage"),
            "funds_held_by_strategy": you.get("funds_by_strategy", {}),
            "assigned_model_portfolio_name": user_model.get("short_name"),
            "assigned_model_allocation_pct": user_model.get("allocation"),
            "_data_notes": ("Peer/platform are real export data. PM-target %, wealth €, model "
                            "portfolios are MODELLED (not captured). IRR is GP-marked/unrealised; "
                            "young vintages not ranked. This is information, not advice."),
        },
        "your_peer_cohort": {
            "filter_used": cohort_filter,
            "n_investors": cohort.get("n"),
            "relaxed_dims": cohort.get("relaxed_dims"),
            "peer_average": cohort.get("avg", {}),
        },
        "platform_average": plat,
        "top_decile_performance": top.get("performance", {}),
        "risk_profile_models": {
            p["short_name"]: p["allocation"] for p in rp
        },
        "endowments_strategy_mix": {
            e["name"]: e["allocation"] for e in endo
        },
        "currently_open_moonfare_funds": [
            {
                "id": f.get("id"),
                "name": f.get("name"),
                "issuer": f.get("issuer"),
                "strategy": f.get("strategy"),
                "region": f.get("region"),
                "category": f.get("category"),
                "min_eur": f.get("min_investment_eur") or f.get("min_eur"),
                "target_moic": f.get("target_net_moic"),
                "close": f.get("expected_initial_close"),
                "description": f.get("description"),
                "tags": f.get("tags"),
            }
            for f in open_funds
        ],
    }
    if live:
        snap["user_live_session"] = {
            "current_page": live.get("page"),
            "cohort_filters_in_use": live.get("cohort"),
            "funds_user_has_selected_to_add": live.get("selectedFunds") or [],
            "scenario_if_added": live.get("scenario"),
        }
    return json.dumps(snap, indent=2, default=str)


PAGE_SCOPES = {
    1: ("Overview",          "PM allocation (you vs peer vs platform vs Moonfare house-view model), fill-rate, strategy mix, over/under-weight vs benchmark"),
    2: ("Region",             "geographic exposure mix (US / Europe / Asia / RoW) and over/under-weight vs benchmark"),
    3: ("Format",             "investment-format mix (Primary / Secondary / Direct/Co-Invest / FoF / Evergreen)"),
    4: ("Strategy deep-dive", "the SPECIFIC strategy currently picked (state.pickedStrategy) — your funds in that strategy vs peer weighted-average funds, plus per-vintage track record"),
    5: ("Sector look-through","sector exposure (Tech / AI / Energy / Industrials / Consumer / Financial / Defense / Healthcare) vs cohort"),
    6: ("Performance",        "returns (DPI, MOIC, IRR) vs peer cohort and top-decile"),
    7: ("Vintage",            "vintage-year pacing — concentration, dry powder timing, j-curve position"),
    8: ("Follower",           "the gap-driven follower alert — what peers / top-decile bought that the user has not"),
    9: ("What's next",        "the live Moonfare opportunities feed, ranked by fit to the user's model-gap. The user can select funds + a capital amount and a scenario is computed."),
}


SYSTEM_PROMPT_BASE = (
    "You are Alpha, Moonfare's Private Markets co-pilot. Your job is to convert the "
    "data the user is looking at right now into a concrete next action that drives "
    "more capital into Moonfare funds. Sales co-pilot, not a chatbot.\n"
    "\n"
    "Page-scoping rule (DEFAULT BEHAVIOUR):\n"
    "- The user is on a SPECIFIC page right now. Your answer must focus on what's on "
    "  that page only. Do NOT volunteer cross-page analysis.\n"
    "- Cross-page analysis is allowed ONLY when the user explicitly asks for it: "
    "  'overall', 'across my whole portfolio', 'everything', 'broader picture', or "
    "  asks about a topic that isn't on the current page.\n"
    "\n"
    "Concrete-recommendation rule (EVERY ANSWER):\n"
    "- Every answer ends with one specific next-step line in this exact shape:\n"
    "  'Your next move: [specific concrete action]'\n"
    "- Examples of acceptable next moves:\n"
    "  'Your next move: commit €250k to Buyout — closes 4 of your 11pt Growth/Tech gap and gets your fill rate to platform-average 73%.'\n"
    "  'Your next move: add the Moonfare AI Fund (€100k min, closes June). You hold 0% of the AI sleeve top-decile holds 11%.'\n"
    "  'Your next move: re-up into Mid-Cap Buyout — your 12% vs the 15% model is the only sleeve where peers in your cohort are pulling ahead this vintage.'\n"
    "\n"
    "FOMO / sales framing (active, not pushy):\n"
    "- Compare to PEERS and TOP-DECILE explicitly. 'You hold X. Your cohort holds Y. "
    "  Top-decile holds Z.' Numbers ground the FOMO so it doesn't read as fluff.\n"
    "- Name a specific fund from currently_open_moonfare_funds whenever a gap maps to "
    "  one. Cite its min investment, target MOIC, close window.\n"
    "- Quantify the OPPORTUNITY COST of inaction: 'Every quarter you wait, your "
    "  vintage concentration in 2024 keeps the j-curve drag from clearing.'\n"
    "\n"
    "Formatting rule (CRITICAL — the chat bubble renders plain text + minimal markdown):\n"
    "- DO NOT use asterisks for emphasis (**bold** does NOT render — it shows literal **).\n"
    "- DO NOT use markdown headings (#, ##).\n"
    "- DO use plain paragraphs separated by blank lines.\n"
    "- DO use dash bullets for lists: '- item one' on its own line.\n"
    "- Numbers can carry weight on their own — 'Growth/Tech: 14% vs 25% target (-11pt)' "
    "  is more persuasive than '**Growth/Tech**'.\n"
    "\n"
    "Hard rules:\n"
    "- Answer ONLY from the snapshot. Never fabricate fund names, returns, or peer "
    "  statistics.\n"
    "- Adapt to the user's live selections. If they've picked funds, reference them by "
    "  name and discuss `scenario_if_added`. If cohort filters change, your 'peers' "
    "  numbers must reflect the new cohort.\n"
    "- Compliance: every fund mention ends with '— Idea, not an Investment Recommendation.'\n"
    "- If the snapshot lacks the data, say 'Not in my current data — your sales associate "
    "  can pull it.' Don't fabricate.\n"
    "- Keep answers to 3-6 sentences unless the user asks for more. Numbers > prose.\n"
    "- No filler, no apologies, no 'I'd be happy to'.\n"
)


def _build_system_prompt(live: dict[str, Any] | None) -> str:
    page = (live or {}).get("page") or 1
    name, focus = PAGE_SCOPES.get(int(page), PAGE_SCOPES[1])
    page_line = (
        f"\nCURRENT PAGE: {page} — {name}. Scope your answer to: {focus}. "
        "Broaden ONLY if the user's question clearly asks for it.\n"
    )
    if int(page) == 4 and live and live.get("pickedStrategy"):
        page_line += f"The picked strategy on this page right now is: '{live['pickedStrategy']}'. Answer about THAT strategy specifically.\n"
    return SYSTEM_PROMPT_BASE + page_line


def ask(question: str, live: dict[str, Any] | None = None, timeout_s: int = 90) -> dict[str, Any]:
    """Run a question through Claude CLI; return {answer, source_summary, ok}.

    `live` is the optional user-live-session block (current page, cohort,
    selected funds, scenario response) passed from the frontend so Claude's
    answer reflects what the user is looking at right now.
    """
    if not question or not question.strip():
        return {"ok": False, "answer": "Empty question.", "source_summary": ""}

    context_json = _build_context(live)
    full_prompt = (
        f"{_build_system_prompt(live)}\n\n"
        f"=== DATABASE SNAPSHOT (JSON) ===\n{context_json}\n=== END SNAPSHOT ===\n\n"
        f"User question: {question.strip()}"
    )
    try:
        # --model selects Opus 4.8 (best reasoning available, Ben's Max sub covers it).
        # --disallowedTools keeps the chat in pure-Q&A mode (no Bash/Read/Write/Web —
        # answers come only from the snapshot we embed in the message).
        proc = subprocess.run(
            [CLAUDE_BIN, "--print",
             "--model", "claude-opus-4-8",
             "--permission-mode", "bypassPermissions",
             "--disallowedTools", "Bash Read Write Edit Glob Grep WebFetch WebSearch Task"],
            input=full_prompt,
            capture_output=True, text=True, timeout=timeout_s,
            cwd=str(Path(__file__).parent),
        )
        if proc.returncode != 0:
            return {
                "ok": False,
                "answer": f"Claude CLI returned exit {proc.returncode}.",
                "stderr": proc.stderr.strip()[:500],
                "source_summary": "",
            }
        answer = proc.stdout.strip()
        return {
            "ok": True,
            "answer": answer or "(empty)",
            "source_summary": "Snapshot covers user profile, peer + platform averages, top-decile performance, 5 risk-profile model portfolios, endowments, open funds.",
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "answer": f"Claude CLI timed out after {timeout_s}s.", "source_summary": ""}
    except FileNotFoundError:
        return {"ok": False, "answer": f"Claude CLI not found at {CLAUDE_BIN}. Run: claude login", "source_summary": ""}


_SUMMARY_SYSTEM = (
    "You are writing the executive-summary paragraph of a Private Markets portfolio review "
    "document for ONE investor. Neutral, factual, third-person ('This investor…'). NO sales "
    "language, NO 'Your next move', NO fund pitch, NO markdown, NO headings. 110-160 words, "
    "2-3 short paragraphs. Cover: who they are (age band, region, profession, wealth band, risk "
    "posture), how their PM allocation and performance compare to their peer group and the "
    "platform (cite the real numbers from the snapshot), and their most material over/under-weights. "
    "State plainly that PM-target %, wealth €, and the model portfolios are MODELLED assumptions and "
    "that performance uses unrealised GP marks (young vintages not ranked). End with a one-line "
    "neutral risk note. This is information for a review, explicitly not investment advice."
)


def investor_summary(live: dict[str, Any] | None = None, timeout_s: int = 90) -> str:
    """Neutral AI-written investor-profile summary for the PDF report (no sales framing)."""
    context_json = _build_context(live)
    full_prompt = (f"{_SUMMARY_SYSTEM}\n\n=== DATA SNAPSHOT (JSON) ===\n{context_json}\n"
                   f"=== END ===\n\nWrite the summary now.")
    try:
        proc = subprocess.run(
            [CLAUDE_BIN, "--print", "--model", "claude-opus-4-8",
             "--permission-mode", "bypassPermissions",
             "--disallowedTools", "Bash Read Write Edit Glob Grep WebFetch WebSearch Task"],
            input=full_prompt, capture_output=True, text=True, timeout=timeout_s,
            cwd=str(Path(__file__).parent),
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.strip()
        return "(AI summary unavailable — Claude CLI returned no output. The data tables below are authoritative.)"
    except Exception as e:
        return f"(AI summary unavailable: {e}. The data tables below are authoritative.)"


_BLURB_SYSTEM = (
    "You are writing short factual captions for a Private Markets portfolio-review PDF, one per "
    "section, for ONE investor (third person, neutral, no sales, no advice, no markdown). Each caption "
    "is 1-2 sentences citing the investor's real numbers vs their peer group/platform from the snapshot. "
    "Sections: overview (PM allocation + biggest over/under-weight), region, format, strategy, sector "
    "(IT/AI look-through), performance (DPI/MOIC/IRR, note GP-marked/young-vintage), vintage, follower "
    "(their largest modelled gap), opportunities (fit of open funds to their gaps). "
    "Return ONLY a JSON object with exactly these keys: overview, region, format, strategy, sector, "
    "performance, vintage, follower, opportunities. No prose outside the JSON."
)


def report_blurbs(live: dict[str, Any] | None = None, timeout_s: int = 90) -> dict[str, str]:
    """One Claude call → {section: caption} for the PDF. Falls back to {} on any error."""
    ctx = _build_context(live)
    prompt = f"{_BLURB_SYSTEM}\n\n=== DATA SNAPSHOT (JSON) ===\n{ctx}\n=== END ===\n\nReturn the JSON now."
    try:
        proc = subprocess.run(
            [CLAUDE_BIN, "--print", "--model", "claude-opus-4-8",
             "--permission-mode", "bypassPermissions",
             "--disallowedTools", "Bash Read Write Edit Glob Grep WebFetch WebSearch Task"],
            input=prompt, capture_output=True, text=True, timeout=timeout_s, cwd=str(Path(__file__).parent))
        out = proc.stdout.strip()
        s, e = out.find("{"), out.rfind("}")
        if s >= 0 and e > s:
            return json.loads(out[s:e+1])
    except Exception:
        pass
    return {}


if __name__ == "__main__":
    import sys
    q = " ".join(sys.argv[1:]) or "Why am I underweight Buyout vs my peers?"
    print(f"Q: {q}\n")
    print(json.dumps(ask(q), indent=2))
