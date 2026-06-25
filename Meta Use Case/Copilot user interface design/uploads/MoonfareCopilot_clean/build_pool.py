"""Generate a 500-investor synthetic pool that the cohort endpoint aggregates live.

Each investor:
 - has a deterministic profile (age, profession, wealth_segment, country, real_risk_score)
   from hashing investor_id (so re-running this script produces the same pool)
 - is assigned a risk class via synth.assign_risk_class (real_risk_score anchors, profession+age refine)
 - is assigned a PM target via synth.assign_pm_target_pct
 - is assigned a wealth € via synth.assign_wealth_eur
 - is assigned a kids profile via synth.assign_children
 - gets an ALLOCATION that perturbs their model portfolio (so they're not all identical)
 - gets a fill_rate, region_mix, format_mix, sector_mix, performance, vintage_mix that perturb sensible bases

When you filter by age=35-50 + profession=Consulting, the cohort endpoint walks this
list, keeps the matching investors, computes mean allocations across them, and returns
them. The displayed numbers MOVE as you change filters.

Written to data/investor_pool.json. The file watcher picks up the change.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import synth

DATA_DIR = Path(__file__).parent / "data"
N = 2000


def h(*parts) -> int:
    s = "|".join(str(p) for p in parts)
    return int(hashlib.blake2b(s.encode(), digest_size=8).hexdigest(), 16)


PROFESSIONS = list(synth.PROFESSION_RISK_DIST.keys())
WEALTH_SEGMENTS = list(synth.WEALTH_BANDS.keys())
COUNTRIES = list(synth.COUNTRY_TO_REGION.keys()) + [None] * 6   # ~10% "Other" → RoW
REAL_RISK_VALUES = ["low", "medium", "high", None]


def perturb_allocation(model: dict[str, float], inv_id: str) -> dict[str, float]:
    """Return a 100%-normalised allocation that perturbs the model by ±30%
    per bucket, deterministic via investor_id."""
    raw = {}
    for i, (k, v) in enumerate(model.items()):
        seed = h(inv_id, "alloc", k)
        # multiplier ∈ [0.7, 1.3]
        m = 0.7 + ((seed % 600) / 1000.0)
        raw[k] = max(0, v * m)
    total = sum(raw.values()) or 1
    return {k: round(v * 100 / total, 1) for k, v in raw.items()}


def perturb_mix(base: dict[str, float], inv_id: str, key: str) -> dict[str, float]:
    raw = {}
    for k, v in base.items():
        seed = h(inv_id, "mix", key, k)
        m = 0.6 + ((seed % 800) / 1000.0)
        raw[k] = max(0, v * m)
    total = sum(raw.values()) or 1
    return {k: round(v * 100 / total, 1) for k, v in raw.items()}


def perturb_perf(inv_id: str) -> dict[str, float]:
    base = {"DPI": 0.55, "MOIC": 1.82, "IRR": 16.1}
    seed = lambda key: h(inv_id, "perf", key)
    return {
        "DPI":  round(base["DPI"]  + ((seed("DPI")  % 600) / 1000.0 - 0.30), 2),
        "MOIC": round(base["MOIC"] + ((seed("MOIC") % 800) / 1000.0 - 0.40), 2),
        "IRR":  round(base["IRR"]  + ((seed("IRR")  % 800) / 100.0 - 4.0),  1),
    }


def fill_rate(inv_id: str, target: int) -> int:
    seed = h(inv_id, "fill")
    return min(100, max(0, int(50 + (seed % 50))))   # 50-100%


def make_investor(idx: int) -> dict:
    inv_id = f"u_{idx:05d}"
    age   = 25 + (h(inv_id, "age") % 50)             # 25..74
    prof  = PROFESSIONS[h(inv_id, "prof") % len(PROFESSIONS)]
    wseg  = WEALTH_SEGMENTS[h(inv_id, "wseg") % len(WEALTH_SEGMENTS)]
    country = COUNTRIES[h(inv_id, "country") % len(COUNTRIES)]
    real_risk = REAL_RISK_VALUES[h(inv_id, "rrisk") % len(REAL_RISK_VALUES)]

    risk_class = synth.assign_risk_class(inv_id, prof, age, real_risk)
    pm_target  = synth.assign_pm_target_pct(risk_class, wseg)
    wealth_eur = synth.assign_wealth_eur(inv_id, wseg)
    kids       = synth.assign_children(inv_id, age, wseg)
    region     = synth.country_to_region(country)
    age_bucket = synth.age_to_bucket(age)

    # allocation = perturb the assigned model
    model = MODELS_BY_ID[risk_class]
    alloc = perturb_allocation(model, inv_id)

    return {
        "id": inv_id,
        "age": age,
        "age_bucket": age_bucket,
        "profession": prof,
        "wealth_segment": wseg,
        "wealth_eur": wealth_eur,
        "country": country,
        "region": region,
        "real_risk_score": real_risk,
        "risk_class": risk_class,
        "pm_target_pct": pm_target,
        "kids": kids,
        "fill_rate_pct": fill_rate(inv_id, pm_target),
        "allocation": alloc,
        "region_mix": perturb_mix({"US": 50, "Europe": 30, "Asia": 12, "RoW": 8}, inv_id, "region"),
        "format_mix": perturb_mix({"Primary": 55, "Secondary": 10, "Direct/Co-Invest": 10, "Fund of Fund": 20, "Semi-liquid": 5}, inv_id, "format"),
        "sector_mix": perturb_mix({"Tech": 20, "AI": 6, "Energy": 8, "Industrials": 14, "Consumer": 10, "Financial": 10, "Defense": 5, "Healthcare": 14, "Other": 13}, inv_id, "sector"),
        "performance": perturb_perf(inv_id),
        "vintage_mix": perturb_mix({"2022": 12, "2023": 20, "2024": 22, "2025": 24, "2026": 22}, inv_id, "vintage"),
    }


def main():
    # Load model portfolios (risk profiles)
    with (DATA_DIR / "risk_profiles.json").open() as fh:
        rp = json.load(fh)
    global MODELS_BY_ID
    MODELS_BY_ID = {p["id"]: p["allocation"] for p in rp["profiles"]}

    pool = [make_investor(i) for i in range(N)]
    out = {
        "_note": "Synthetic investor pool, deterministic. Each investor's assignments come from synth.py seeded by investor_id. Replace this entire file with Moonfare's real cohort export — schema is identical (one row per investor with the listed fields). Cohort endpoint filters + aggregates this pool live.",
        "_count": len(pool),
        "investors": pool,
    }
    target = DATA_DIR / "investor_pool.json"
    target.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {target}: {len(pool)} investors")


if __name__ == "__main__":
    main()
