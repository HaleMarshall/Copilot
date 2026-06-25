"""Deterministic synthetic-assignment engine.

Implements the §1-§5 rules from the synthetic-assignment design note:
 - Profession → risk-class distribution (anchored on real 3-level risk_score where present)
 - Risk-class → PM-target % of wealth (with wealth-modifier)
 - Wealth label → € value (seeded, snapped to a clean step)
 - Age + wealth + profession → children imputation
 - Follower alert → derived from the investor's largest underweight strategy

Every draw is `hash(investor_id, field)`-seeded so the same demo investor produces
byte-identical assignments on every run. Marked synthetic so the UI can label
it illustrative.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"

# Authoritative country/profession mappings from the handoff bundle (audited:
# 0 RoW fall-throughs on 65+91 distinct real country values; all 9 real profession
# groups covered). See data/_handoff_archive/MAPPINGS_AND_TRACKRECORD.md.
sys.path.insert(0, str(Path(__file__).parent / "mappings"))
try:
    from country_to_region import country_to_region as _authoritative_ctr
    from profession_remap  import remap_profession  as _authoritative_rp
    USE_AUTHORITATIVE = True
except ImportError:
    USE_AUTHORITATIVE = False

RISK_CLASSES = [
    "income_resilience",
    "balanced_compounding",
    "equity_growth",
    "innovation_ai_alpha",
    "opportunistic_advanced",
]
RISK_SHORT = {
    "income_resilience":      "Income & Resilience",
    "balanced_compounding":   "Balanced Compounding",
    "equity_growth":          "Equity Growth",
    "innovation_ai_alpha":    "Innovation & AI Alpha",
    "opportunistic_advanced": "Opportunistic / Advanced",
}

# ---------- §1 profession → risk-class distribution (sums to 100) ----------
PROFESSION_RISK_DIST = {
    "Exec/Owner":         { "income_resilience": 0,  "balanced_compounding": 15, "equity_growth": 35, "innovation_ai_alpha": 35, "opportunistic_advanced": 15 },
    "Financial Services": { "income_resilience": 0,  "balanced_compounding": 20, "equity_growth": 35, "innovation_ai_alpha": 30, "opportunistic_advanced": 15 },
    "Eng/Tech":           { "income_resilience": 0,  "balanced_compounding": 20, "equity_growth": 30, "innovation_ai_alpha": 35, "opportunistic_advanced": 15 },
    "Consulting":         { "income_resilience": 10, "balanced_compounding": 40, "equity_growth": 35, "innovation_ai_alpha": 15, "opportunistic_advanced": 0 },
    "Legal":              { "income_resilience": 20, "balanced_compounding": 45, "equity_growth": 25, "innovation_ai_alpha": 10, "opportunistic_advanced": 0 },
    "Medical":            { "income_resilience": 20, "balanced_compounding": 50, "equity_growth": 20, "innovation_ai_alpha": 10, "opportunistic_advanced": 0 },
    "Investor/PE":        { "income_resilience": 30, "balanced_compounding": 35, "equity_growth": 15, "innovation_ai_alpha": 5,  "opportunistic_advanced": 15 },
    "Family Office":      { "income_resilience": 0,  "balanced_compounding": 35, "equity_growth": 25, "innovation_ai_alpha": 15, "opportunistic_advanced": 25 },
    "Pro Services":       { "income_resilience": 15, "balanced_compounding": 45, "equity_growth": 25, "innovation_ai_alpha": 10, "opportunistic_advanced": 5 },
    "Other":              { "income_resilience": 20, "balanced_compounding": 40, "equity_growth": 25, "innovation_ai_alpha": 10, "opportunistic_advanced": 5 },
}

# real 3-level risk_score → restricted draw set
REAL_RISK_RESTRICT = {
    "low":    {"income_resilience", "balanced_compounding"},
    "medium": {"balanced_compounding", "equity_growth"},
    "high":   {"equity_growth", "innovation_ai_alpha", "opportunistic_advanced"},
}

# ---------- §2 risk-class → PM-target % of wealth ----------
# Per the Moonfare house-view model spec (the model PM-allocation target per risk class).
# These ARE the "Model" PM bar on Page 1 — exact, no wealth modifier, so the bar equals the
# class target. Still a MODELLED assumption (labelled), not a captured target.
RISK_PM_TARGET_BASE = {
    "income_resilience":      10,
    "balanced_compounding":   15,
    "equity_growth":          20,
    "innovation_ai_alpha":    25,
    "opportunistic_advanced": 40,
}
WEALTH_MODIFIER = {   # zeroed: the model target is the class value exactly (house-view spec)
    "Mass Affluent":  0, "HNW": 0, "VHNW": 0, "UHNW": 0, "Family Office": 0,
}

# ---------- §3 wealth segment → € range ----------
WEALTH_BANDS = {
    "Mass Affluent": (1_000_000,   5_000_000,   1_000_000),
    "HNW":           (5_000_000,   25_000_000,  1_000_000),
    "VHNW":          (25_000_000,  50_000_000,  5_000_000),
    "UHNW":          (50_000_000,  75_000_000,  5_000_000),
    "Family Office": (100_000_000, 500_000_000, 25_000_000),
}

# ---------- §4 children probabilities ----------
P_HAS_KIDS_BY_AGE = [
    (0,  35, 0.25),
    (35, 45, 0.55),
    (45, 55, 0.75),
    (55, 65, 0.80),
    (65, 200, 0.82),
]
KID_COUNT_DIST = [(1, 0.30), (2, 0.45), (3, 0.20), (4, 0.05)]

# ---------- §5 country → fine region split (the Bucket-A 8-way taxonomy) ----------
COUNTRY_TO_REGION = {
    # DACH
    "Germany": "DACH", "Austria": "DACH", "Switzerland": "DACH", "Liechtenstein": "DACH",
    # UK
    "United Kingdom": "UK", "Ireland": "UK",
    # N-Europe
    "Sweden": "N-Europe", "Norway": "N-Europe", "Denmark": "N-Europe", "Finland": "N-Europe",
    "Netherlands": "N-Europe", "Belgium": "N-Europe", "Luxembourg": "N-Europe",
    # S-Europe
    "Italy": "S-Europe", "Spain": "S-Europe", "Portugal": "S-Europe", "Greece": "S-Europe",
    "France": "S-Europe",
    # Middle East
    "United Arab Emirates": "Middle East", "Saudi Arabia": "Middle East", "Israel": "Middle East",
    "Qatar": "Middle East", "Kuwait": "Middle East", "Bahrain": "Middle East",
    # US / CA
    "United States": "US/CA", "Canada": "US/CA",
    # Asia
    "Singapore": "Asia", "Hong Kong": "Asia", "Japan": "Asia", "South Korea": "Asia",
    "China": "Asia", "Taiwan": "Asia",
    # RoW (default fallback)
}
def country_to_region(country: str | None) -> str:
    """Authoritative country→region (handoff bundle); falls back to legacy inline map."""
    if USE_AUTHORITATIVE:
        return _authoritative_ctr(country)
    if not country:
        return "RoW"
    return COUNTRY_TO_REGION.get(country.strip(), "RoW")


def remap_profession(profession_group: str | None,
                      user_segment: str | None = None,
                      partner_category: str | None = None) -> str:
    """Authoritative profession 9→10 remap with Family Office override from segment."""
    if USE_AUTHORITATIVE:
        return _authoritative_rp(profession_group, user_segment, partner_category)
    return profession_group or "Other"


# ---------- §A: age bucket (Bucket-A remap) ----------
def age_to_bucket(age: int | None) -> str | None:
    if age is None: return None
    if age < 18 or age > 100:
        return None  # clamp impossible ages (9, 126)
    if age < 35:  return "20-35"
    if age < 50:  return "35-50"
    if age < 65:  return "50-65"
    return "65+"


# ===================== seeded hash helpers =====================
def _h(*parts: Any) -> int:
    """Deterministic 64-bit hash from the parts, suitable for repeated draws."""
    s = "|".join(str(p) for p in parts)
    return int(hashlib.blake2b(s.encode(), digest_size=8).hexdigest(), 16)


def _weighted_pick(weights_dict: dict[str, float | int], seed: int) -> str:
    """Pick a key from a {key: weight} dict, deterministic via seed."""
    keys = list(weights_dict.keys())
    total = sum(max(0, weights_dict[k]) for k in keys)
    if total <= 0:
        return keys[seed % len(keys)]
    r = (seed % 10_000) / 10_000.0 * total
    cum = 0.0
    for k in keys:
        cum += max(0, weights_dict[k])
        if r < cum:
            return k
    return keys[-1]


# ===================== §1 risk class draw =====================
def assign_risk_class(investor_id: str, profession: str, age: int | None,
                       real_risk_score: str | None = None) -> str:
    """Draw a risk class for this investor — anchored on real 3-level score
    when present, refined by profession & age."""
    base = PROFESSION_RISK_DIST.get(profession, PROFESSION_RISK_DIST["Other"]).copy()

    # restrict by real risk_score if present
    if real_risk_score:
        allowed = REAL_RISK_RESTRICT.get(real_risk_score.lower(), set(RISK_CLASSES))
        for k in list(base.keys()):
            if k not in allowed:
                base[k] = 0

    # age modifier — shift toward R1 if ≥65, toward R4 if ≤40
    if age is not None:
        if age >= 65:
            # double the income_resilience weight; halve the top-end
            base["income_resilience"] *= 2
            base["innovation_ai_alpha"] = max(0, base["innovation_ai_alpha"] // 2)
            base["opportunistic_advanced"] = max(0, base["opportunistic_advanced"] // 2)
        elif age <= 40:
            base["innovation_ai_alpha"] = int(base["innovation_ai_alpha"] * 1.5)
            base["income_resilience"]   = max(0, base["income_resilience"] // 2)

    return _weighted_pick(base, _h(investor_id, "risk_class"))


# ===================== §2 PM-target =====================
def assign_pm_target_pct(risk_class: str, wealth_segment: str) -> int:
    base = RISK_PM_TARGET_BASE.get(risk_class, 15)
    mod  = WEALTH_MODIFIER.get(wealth_segment, 0)
    return min(50, base + mod)


# ===================== §3 wealth € =====================
def assign_wealth_eur(investor_id: str, wealth_segment: str) -> int:
    band = WEALTH_BANDS.get(wealth_segment)
    if not band: return 5_000_000
    lo, hi, step = band
    span = hi - lo
    raw = lo + (_h(investor_id, "wealth_eur") % (span + 1))
    return ((raw - lo) // step) * step + lo


# ===================== §4 children =====================
def assign_children(investor_id: str, age: int | None, wealth_segment: str) -> dict[str, Any]:
    has_kids_p = 0.55
    if age is not None:
        for lo, hi, p in P_HAS_KIDS_BY_AGE:
            if lo <= age < hi:
                has_kids_p = p
                break
    seed = _h(investor_id, "has_kids")
    has = (seed % 100) / 100.0 < has_kids_p
    if not has:
        return {"has_kids": False, "count": 0, "ages": "None"}

    # count
    bias = 0.0
    if wealth_segment in ("UHNW", "Family Office"):
        bias = 0.3
    weights = {str(c): max(0, p + (0.05 * bias if c >= 3 else -0.05 * bias)) for c, p in KID_COUNT_DIST}
    count = int(_weighted_pick(weights, _h(investor_id, "kid_count")))
    age_class = _weighted_pick({"Teen": 1, "Adult": 1}, _h(investor_id, "kid_age"))
    return {"has_kids": True, "count": count, "ages": age_class}


# ===================== §5 follower-alert generator =====================
def follower_alert(you_allocation: dict[str, float], model_allocation: dict[str, float],
                    fund_universe: dict[str, list[dict]], follow_group_label: str,
                    investor_id: str) -> dict[str, Any]:
    """Largest-underweight-strategy + real Moonfare fund pick."""
    # deltas vs model
    deltas: dict[str, float] = {}
    for k, v in model_allocation.items():
        deltas[k] = (you_allocation.get(k, 0) or 0) - v
    # largest underweight (most negative)
    if not deltas:
        return {}
    worst = min(deltas, key=lambda k: deltas[k])
    gap = abs(round(deltas[worst], 1))
    funds = fund_universe.get(worst, [])
    if not funds:
        # try a related strategy
        for fallback in ("Large-Cap Buyout", "Growth / Tech", "Private Credit"):
            funds = fund_universe.get(fallback, [])
            if funds:
                worst = fallback
                break
    fund_pick = funds[_h(investor_id, "fund_pick") % len(funds)] if funds else {"name": "EQT XI"}
    # #17/#12 fix: NO fabricated social proof. The old copy asserted "investors in your
    # group just committed to X" — an event that may never have happened, manufactured from
    # the user's own gap. This version states only facts: the user's modelled gap and that the
    # fund is currently open. No "your peers just bought this" claim, no action-priming.
    return {
        "follow_group": follow_group_label,
        "strategy": worst,
        "fund_name": fund_pick.get("name", "EQT XI"),
        "fund_issuer": fund_pick.get("issuer", ""),
        "gap_ppt": gap,
        "headline": f"Moonfare · {worst} is open",
        "body": (
            f"Your {worst} allocation is {gap:.0f}pp below your modelled target "
            f"(target % is a model assumption, not captured from you). "
            f"{fund_pick.get('name','')} is a currently-open {worst} fund on Moonfare."
        ),
        "is_modelled_gap": True,
        "not_advice": True,
        "time": "Today · 09:42",
    }


# ===================== §6 AI look-through (REAL, #10) =====================
# #10 fix: the previous version multiplied allocation by an INVENTED coefficient
# (commented "55% of Growth/Tech is effectively AI", no source). That single number
# was the most quotable fake in the product. It is removed. Economic AI exposure is
# now the REAL Information-Technology share from portfolio-company GICS look-through
# (computed in ingest_real.py -> sector_mix["AI"]), with coverage disclosed.
def ai_lookthrough(allocation: dict[str, float],
                   sector_mix: dict[str, float] | None = None,
                   coverage: float | None = None) -> dict[str, float]:
    stated = float((allocation or {}).get("AI", 0) or 0)
    # economic AI = real IT/AI look-through share of the portfolio (NAV-weighted)
    economic = float((sector_mix or {}).get("AI", 0) or 0)
    out = {
        "stated_ai_pct": round(stated, 1),
        "economic_ai_pct": round(economic, 1),
        "lookthrough_coverage_pct": round((coverage or 0) * 100, 0) if coverage is not None else None,
        "_basis": "Real portfolio-company GICS Information-Technology look-through "
                  "(AI proxy). No invented multiplier.",
    }
    if coverage is not None and coverage < 0.6:
        out["_caveat"] = (f"Look-through covers ~{round(coverage*100)}% of NAV; "
                          "economic AI is computed on the covered portion only.")
    return out


if __name__ == "__main__":
    # Smoke test
    rc = assign_risk_class("u_joe_schmall", "Consulting", 45, "medium")
    target = assign_pm_target_pct(rc, "HNW")
    wealth = assign_wealth_eur("u_joe_schmall", "HNW")
    kids = assign_children("u_joe_schmall", 45, "HNW")
    print(f"risk={rc} target={target}% wealth=€{wealth:,} kids={kids}")
    look = ai_lookthrough({"AI": 15, "Growth / Tech": 14, "Direct & Co-Investments": 6, "Large-Cap Buyout": 15})
    print(f"AI look-through: {look}")
