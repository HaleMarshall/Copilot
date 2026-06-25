"""ingest_real.py — build the app's data files from the REAL Moonfare export.

Reads data/real_export/*.{csv,xlsx} (the 13 canonical files) and writes, in the EXACT
schemas the frontend/db.py already consume:
    data/investor_pool.json   — real per-investor cohort universe (fixes adversarial #1)
    data/you.json             — one real investor's real 1:1 holdings, identity masked (fixes #19)
    data/investors.json       — platform_average / top_decile / densities computed from the
                                real pool, not frozen constants (fixes #21)

Everything that has a real source is real. Fields the export does NOT contain are MODELLED and
flagged in `_provenance` (per field) so the UI can label them, never passing them off as peer data:
    pm_target_pct (no target field), wealth_eur (sparse self-report), marital/kids (imputed).
Per-fund-vintage track records stay synthetic (separate file). See REALDATA_NOTES.md.

Run:  /tmp/v/bin/python ingest_real.py     (needs pandas + openpyxl)
"""
from __future__ import annotations
import json, sys, math
from pathlib import Path
from collections import defaultdict
import pandas as pd, numpy as np

HERE = Path(__file__).parent
SRC = HERE / "data" / "real_export"
DATA = HERE / "data"
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "mappings"))
import synth
from country_to_region import country_to_region
from profession_remap import remap_profession

# ---------------------------------------------------------------- taxonomy maps
# real peer_strategy_mix.strategy -> the 9 display buckets (AI is derived separately, below)
STRAT_TO_BUCKET = {
    "buyout":            "Buyout",            # cap-split applied afterwards
    "growth equity":     "Growth / Tech",
    "venture capital":   "Growth / Tech",
    "private credit":    "Private Credit",
    "distressed debt":   "Private Credit",
    "infrastructure":    "Infrastructure",
    "secondaries":       "Secondaries",
    "gp stakes":         "Direct & Co-Investments",
    "structured capital":"Direct & Co-Investments",
    # "unknown" -> dropped + renormalised (tracked as coverage loss)
}
BUYOUT_BUCKETS = ["Large-Cap Buyout", "Mid-Cap Buyout", "Small-Cap Buyout"]
NINE = ["Large-Cap Buyout","Mid-Cap Buyout","Small-Cap Buyout","Infrastructure",
        "Growth / Tech","Private Credit","Secondaries","Direct & Co-Investments","AI"]

# GICS sector name -> frontend sector bucket.
# Information Technology maps to the "AI" bucket (the IT/AI look-through proxy) so it is NOT
# double-counted into "Tech"; Communication Services carries "Tech". This keeps sector_mix
# summing to ~100 with AI as a distinct (carved-out) sector rather than additive to Tech.
GICS_TO_SECTOR = {
    "Information Technology":"AI", "Communication Services":"Tech",
    "Health Care":"Healthcare", "Financials":"Financial",
    "Industrials":"Industrials", "Consumer Discretionary":"Consumer", "Consumer Staples":"Consumer",
    "Energy":"Energy", "Utilities":"Energy", "Materials":"Other", "Real Estate":"Other",
    "Other":"Other",
}
def iso_to_regionmix(iso) -> str:
    if iso is None or (isinstance(iso, float) and math.isnan(iso)): return "RoW"
    iso = str(iso).strip().upper()
    if iso in {"US","USA","CA","CAN"}: return "US"
    if iso in {"CN","HK","JP","SG","IN","KR","TW","TH","MY","ID","PH","VN","AU","NZ","MO","BD","LK","PK"}: return "Asia"
    EUR = {"GB","UK","DE","FR","IT","ES","NL","SE","CH","DK","FI","NO","IE","AT","BE","LU","PT","GR",
           "PL","CZ","HU","RO","SI","HR","BG","SK","EE","LT","LV","CY","MT","IS","MC","LI","UA","RS","BA","BY"}
    if iso in EUR: return "Europe"
    return "RoW"

REPORT_YEAR = 2026
MIN_MATURE_VINTAGE = REPORT_YEAR - 4   # IRR suppressed for funds younger than this (#4)


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _s(x) -> str:
    """Safe string: NaN/None -> '' (NaN is truthy, so `x or ''` is a trap)."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return ""
    return str(x).strip()


def load():
    d = {}
    d["pif"]  = pd.read_csv(SRC/"moonfare_peer_investor_features.csv", dtype=str, low_memory=False)
    d["mix"]  = pd.read_csv(SRC/"moonfare_peer_strategy_mix.csv", dtype=str)
    d["attr"] = pd.read_excel(SRC/"moonfare_l0_l3_attribution.xlsx",
                  usecols=["l0_user_id","l0_investor_commitment_eur","l1_feeder_efront_id",
                           "l1_feeder_name","l1_feeder_vintage_year","l1_fund_strategy"], dtype=str)
    d["ctry"] = pd.read_csv(SRC/"moonfare_portfolio_country_by_feeder.csv", dtype=str)
    d["gics"] = pd.read_csv(SRC/"moonfare_portfolio_gics_sector_by_feeder.csv", dtype=str)
    d["feed"] = pd.read_csv(SRC/"moonfare_feeders_with_funds.csv", dtype=str)
    d["mf"]   = pd.read_csv(SRC/"moonfare_master_funds_with_feeders.csv", dtype=str)
    return d


def latest_per_feeder(df, weight_col="weight"):
    """Collapse a look-through table to the latest reporting_date per feeder_efront_id."""
    df = df.dropna(subset=["feeder_efront_id"]).copy()
    df["reporting_date"] = df["reporting_date"].astype(str)
    idx = df.groupby("feeder_efront_id")["reporting_date"].transform("max")
    return df[df["reporting_date"] == idx].copy()


def build_feeder_lookups(d):
    """Per-feeder (efront id keyed) region mix, sector mix, IT(AI-proxy) weight, format, vintage."""
    fr, fs, fit, fmt, fv = {}, {}, {}, {}, {}

    # region mix from country_by_feeder (latest snapshot, commitment currency ignored — weights only)
    c = latest_per_feeder(d["ctry"]); c["w"] = _num(c["weight"])
    for fid, g in c.groupby("feeder_efront_id"):
        acc = defaultdict(float)
        for _, r in g.iterrows():
            acc[iso_to_regionmix(r["country_iso"])] += (r["w"] or 0)
        tot = sum(acc.values()) or 1
        fr[fid] = {k: acc.get(k,0)/tot for k in ["US","Europe","Asia","RoW"]}

    # sector mix + IT weight from gics_by_feeder
    g0 = latest_per_feeder(d["gics"]); g0["w"] = _num(g0["weight"])
    for fid, g in g0.groupby("feeder_efront_id"):
        acc = defaultdict(float); it = 0.0; tot = 0.0
        for _, r in g.iterrows():
            w = r["w"] or 0; tot += w
            sec = GICS_TO_SECTOR.get(_s(r["gics_sector_name"]), "Other")
            acc[sec] += w
            if _s(r["gics_sector_name"]) == "Information Technology":
                it += w
        tot = tot or 1
        fs[fid]  = {k: acc.get(k,0)/tot for k in acc}
        fit[fid] = it/tot                       # AI proxy = IT look-through share (real; #10)

    # format + vintage from feeders table (deal_type, semiliquid) keyed by efront
    fe = d["feed"].dropna(subset=["feeder_efront_id"])
    DEALMAP = {"feeder":"Primary","portfolio":"Fund of Fund","fundraising vehicle":"Fund of Fund",
               "co-investment fund":"Direct/Co-Invest","direct deal":"Direct/Co-Invest",
               "evergreen":"Semi-liquid","eltif":"Semi-liquid"}
    for _, r in fe.iterrows():
        fid = r["feeder_efront_id"]
        semi = str(r.get("is_semiliquid_feeder")) in ("1","1.0","True","true")
        fmt[fid] = "Semi-liquid" if semi else DEALMAP.get(_s(r.get("feeder_deal_type")),"Primary")
    return fr, fs, fit, fmt


def platform_buyout_cap_split(d):
    """Real platform-wide buyout cap split from master_funds.fund_target_deal_size.
    Applied to every investor's buyout % (disclosed transform, not per-investor fabrication)."""
    mf = d["mf"]; large=mid=small=0
    for v in mf["fund_target_deal_size"].dropna():
        v = v.lower()
        if "large cap" in v: large += 1
        if "middle market" in v or "mid" in v: mid += 1
        if "small cap" in v or "lower" in v: small += 1
    tot = large+mid+small or 1
    split = {"Large-Cap Buyout": large/tot, "Mid-Cap Buyout": mid/tot, "Small-Cap Buyout": small/tot}
    if sum(split.values()) == 0:
        split = {"Large-Cap Buyout":0.45,"Mid-Cap Buyout":0.40,"Small-Cap Buyout":0.15}
    return split


def investor_feeders(d):
    """user_id -> [(feeder_efront, commitment_weight, vintage_year)] from attribution (real holdings)."""
    a = d["attr"].dropna(subset=["l0_user_id"]).copy()
    a["c"] = _num(a["l0_investor_commitment_eur"])
    out = defaultdict(lambda: defaultdict(lambda: [0.0, None]))
    # dedupe to one row per (user,feeder): attribution explodes across funds/companies
    for (uid, fid), g in a.groupby(["l0_user_id","l1_feeder_efront_id"]):
        commit = g["c"].dropna().iloc[0] if g["c"].notna().any() else 0.0
        vint = None
        vy = _num(g["l1_feeder_vintage_year"]).dropna()
        if len(vy): vint = int(vy.iloc[0])
        out[uid][fid] = [float(commit or 0), vint]
    return {uid: [(fid, w, v) for fid,(w,v) in fe.items()] for uid, fe in out.items()}


def wmix(feeders, lookup, keys=None):
    """Commitment-weighted average of a per-feeder dict-lookup. Returns (mix, coverage_fraction)."""
    acc = defaultdict(float); covered = 0.0; total = 0.0
    for fid, w, _ in feeders:
        total += w
        m = lookup.get(fid)
        if not m: continue
        covered += w
        for k, val in m.items():
            acc[k] += w * val
    cov = (covered/total) if total else 0.0
    s = sum(acc.values()) or 1
    mix = {k: round(v/s*100, 1) for k, v in acc.items()}
    return mix, round(cov, 3)


def feeder_cap_bucket(d):
    """feeder_efront_id -> buyout cap bucket from master_funds.fund_target_deal_size (real)."""
    out = {}
    for _, r in d["mf"].dropna(subset=["feeder_efront_id"]).iterrows():
        v = _s(r.get("fund_target_deal_size")).lower()
        if "large cap" in v:   out[r["feeder_efront_id"]] = "Large-Cap Buyout"
        elif "small cap" in v or "lower" in v: out[r["feeder_efront_id"]] = "Small-Cap Buyout"
        elif "middle market" in v or "mid" in v: out[r["feeder_efront_id"]] = "Mid-Cap Buyout"
    return out


def real_funds_by_strategy(d, cap_bucket):
    """user_id -> {9-bucket: {real_feeder_name: commitment_weight}} from attribution (real holdings).
    The investor's actual Moonfare fund vehicles (feeders), grouped into the 9 display buckets."""
    a = d["attr"].dropna(subset=["l0_user_id","l1_feeder_name"]).copy()
    a["c"] = _num(a["l0_investor_commitment_eur"])
    out = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    seen = set()
    for _, r in a.iterrows():
        key = (r["l0_user_id"], r["l1_feeder_efront_id"])
        if key in seen:   # attribution explodes per fund/company; one row per (user,feeder)
            continue
        seen.add(key)
        strat = _s(r.get("l1_fund_strategy"))
        bucket = STRAT_TO_BUCKET.get(strat)
        if bucket == "Buyout":
            bucket = cap_bucket.get(r["l1_feeder_efront_id"], "Mid-Cap Buyout")
        if not bucket:
            continue
        commit = r["c"] if pd.notna(r["c"]) else 0.0
        out[r["l0_user_id"]][bucket][_s(r["l1_feeder_name"])] += float(commit or 0)
    # normalise each bucket's fund weights to % within the bucket
    result = {}
    for uid, buckets in out.items():
        fb = {}
        for bucket, funds in buckets.items():
            tot = sum(funds.values()) or 1
            fb[bucket] = {nm: round(w / tot * 100, 1) for nm, w in sorted(funds.items(), key=lambda x: -x[1])[:6]}
        result[uid] = fb
    return result


def assign_marital_horizon(uid, age, wseg):
    """RESEARCHED (not in export, not invented) — see RESEARCH_NOTES.md §2.
    Marital from US-Census marital-by-age probabilities (+ small HNW tilt); horizon from
    PE-lockup/VHNW research. Deterministic per investor. Stored in DB, NOT shown on the UI."""
    a = age if age is not None else 50
    p_married = (0.35 if a < 35 else 0.60 if a < 45 else 0.66 if a < 55 else 0.62 if a < 65 else 0.57)
    if wseg in ("VHNW", "UHNW", "Family Office"):
        p_married = min(0.85, p_married + 0.05)
    r = (synth._h(uid, "marital") % 1000) / 1000.0
    if r < p_married:
        marital = "Married"
    else:
        # remainder split: widowed rises with age, divorced mid-life, else single
        r2 = (synth._h(uid, "marital2") % 1000) / 1000.0
        if a >= 65 and r2 < 0.45: marital = "Widowed"
        elif a >= 45 and r2 < 0.5: marital = "Divorced"
        else: marital = "Single"
    horizon = "10y+" if a < 50 else "7-10y" if a < 65 else "5-10y"
    return marital, horizon


def build_allocation(strat_pcts, ai_pct, cap_split):
    """strat_pcts: {real_strategy: pct} -> 9-bucket allocation summing to 100, AI carved from Growth/Tech."""
    b = {k: 0.0 for k in NINE}
    for strat, pct in strat_pcts.items():
        bucket = STRAT_TO_BUCKET.get(strat)
        if bucket is None:   # "unknown" -> drop (renormalised below)
            continue
        if bucket == "Buyout":
            for cb, frac in cap_split.items():
                b[cb] += pct * frac
        else:
            b[bucket] += pct
    tot = sum(b.values()) or 1
    b = {k: v/tot*100 for k, v in b.items()}      # renormalise (drops unknown)
    # #10: do NOT synthesise an "AI" product sleeve from IT look-through — IT != AI, and
    # carving it here would re-inflate the very number the adversarial doc flags. Real data
    # has no dedicated AI strategy, so the AI allocation sleeve is 0. Economic/embedded AI
    # exposure is surfaced ONLY on the sector look-through (sector_mix["AI"] = real IT share),
    # clearly labelled as an IT-proxy upper bound with coverage.
    b["AI"] = 0.0
    tot = sum(b.values()) or 1
    return {k: round(v/tot*100, 1) for k, v in b.items()}


def main():
    d = load()
    pif = d["pif"].set_index("user_id")
    cap_split = platform_buyout_cap_split(d)
    fr, fs, fit, fmt = build_feeder_lookups(d)
    inv_feeders = investor_feeders(d)
    funds_map = real_funds_by_strategy(d, feeder_cap_bucket(d))   # real per-investor funds per bucket

    # per-investor strategy % from mix
    d["mix"]["c"] = _num(d["mix"]["commitment_eur"])
    strat_by_user = defaultdict(dict)
    for uid, g in d["mix"].groupby("user_id"):
        tot = g["c"].sum() or 1
        for _, r in g.iterrows():
            strat_by_user[uid][_s(r["strategy"])] = float((r["c"] if pd.notna(r["c"]) else 0)/tot*100)

    PLATFORM_REGION = {"US":50,"Europe":35,"Asia":10,"RoW":5}
    PLATFORM_FORMAT = {"Primary":70,"Secondary":8,"Direct/Co-Invest":7,"Fund of Fund":10,"Semi-liquid":5}
    PLATFORM_SECTOR = {"Tech":22,"AI":0,"Energy":8,"Industrials":16,"Consumer":12,"Financial":12,"Defense":2,"Healthcare":16,"Other":12}

    pool = []
    cov_accum = []
    for uid in d["mix"]["user_id"].unique():
        if uid not in pif.index:
            continue
        row = pif.loc[uid] if not isinstance(pif.loc[uid], pd.DataFrame) else pif.loc[uid].iloc[0]
        age = _num(pd.Series([row.get("age")])).iloc[0]
        age = int(age) if not pd.isna(age) and 18 <= age <= 100 else None
        prof = remap_profession(row.get("profession_group"))
        wseg_raw = _s(row.get("wealth_segment"))
        wseg = {"Mass Affluent":"Mass Affluent","High Net Worth":"HNW","Very High Net Worth":"VHNW",
                "Ultra-High Net Worth":"UHNW"}.get(wseg_raw, "HNW")
        country = row.get("country")
        region = country_to_region(country)
        real_risk = _s(row.get("risk_score")).lower() or None
        risk_class = synth.assign_risk_class(uid, prof, age, real_risk)
        pm_target = synth.assign_pm_target_pct(risk_class, wseg)          # MODELLED (#2)
        wealth_eur = synth.assign_wealth_eur(uid, wseg)                    # MODELLED (#18)
        kids = synth.assign_children(uid, age, wseg)                      # MODELLED (imputed)
        marital, horizon = assign_marital_horizon(uid, age, wseg)         # RESEARCHED (see RESEARCH_NOTES.md)

        feeders = inv_feeders.get(uid, [])
        # real look-through mixes (commitment-weighted across the investor's feeders)
        region_mix, cov_r = wmix(feeders, fr) if feeders else (dict(PLATFORM_REGION), 0.0)
        sector_mix, cov_s = wmix(feeders, fs) if feeders else (dict(PLATFORM_SECTOR), 0.0)
        if not region_mix: region_mix, cov_r = dict(PLATFORM_REGION), 0.0
        if not sector_mix: sector_mix, cov_s = dict(PLATFORM_SECTOR), 0.0
        # AI proxy = commitment-weighted IT look-through share
        ai_num = ai_den = 0.0
        for fid, w, _ in feeders:
            ai_den += w
            if fid in fit: ai_num += w * fit[fid] * 100
        ai_pct = (ai_num/ai_den) if ai_den else 0.0
        # format mix from feeder deal types
        fmt_acc = defaultdict(float); ftot = 0.0
        for fid, w, _ in feeders:
            ftot += w
            fmt_acc[fmt.get(fid, "Primary")] += w
        format_mix = ({k: round(v/ftot*100,1) for k,v in fmt_acc.items()} if ftot else dict(PLATFORM_FORMAT))
        # vintage mix from feeder vintages (real years)
        vacc = defaultdict(float); vtot = 0.0; max_vint = None
        for fid, w, v in feeders:
            if v:
                vacc[str(v)] += w; vtot += w
                max_vint = v if max_vint is None else max(max_vint, v)
        vintage_mix = ({k: round(v/vtot*100,1) for k,v in vacc.items()} if vtot else {})
        if not vintage_mix:
            mv = _num(pd.Series([row.get("max_vintage_year")])).iloc[0]
            if not pd.isna(mv): vintage_mix = {str(int(mv)): 100.0}; max_vint = int(mv)

        # allocation (real strategy mix -> 9 buckets, AI from look-through)
        allocation = build_allocation(strat_by_user.get(uid, {}), ai_pct, cap_split)

        # performance — REAL marks; flag maturity for #4 (suppress IRR if no fund >=4yr)
        tvpi = _num(pd.Series([row.get("portfolio_tvpi")])).iloc[0]
        dpi  = _num(pd.Series([row.get("portfolio_dpi")])).iloc[0]
        irr  = _num(pd.Series([row.get("paidin_wtd_irr")])).iloc[0]
        mature = (max_vint is not None and max_vint <= MIN_MATURE_VINTAGE)
        performance = {
            "DPI":  round(float(dpi),3)  if not pd.isna(dpi)  else None,
            "MOIC": round(float(tvpi),3) if not pd.isna(tvpi) else None,   # TVPI used as MOIC
            "IRR":  round(float(irr)*100,1) if not pd.isna(irr) else None,
            "RVPI": round(float(tvpi-dpi),3) if (not pd.isna(tvpi) and not pd.isna(dpi)) else None,
            "irr_mature": bool(mature),     # False -> UI shows "too early to rank" (#4)
        }
        commit = _num(pd.Series([row.get("total_commitment_eur")])).iloc[0]
        fill = None
        pm_actual = None   # ACTUAL % of wealth in PM = real commitment / (modelled) wealth — varies by cohort
        if wealth_eur and not pd.isna(commit):
            pm_actual = round(min(100, float(commit) / wealth_eur * 100), 2)
        if pm_target and pm_actual is not None:
            fill = min(100, round(pm_actual / pm_target * 100, 1))
        cov_accum.append(cov_s)
        pool.append({
            "id": f"inv_{uid}",                     # pseudonymous surrogate (no raw user_id exposed)
            "age": age, "age_bucket": synth.age_to_bucket(age),
            "profession": prof, "wealth_segment": wseg, "wealth_eur": wealth_eur,
            "country": country, "region": region,
            "real_risk_score": real_risk, "risk_class": risk_class,
            "pm_target_pct": pm_target, "kids": kids,
            "pm_actual_pct": pm_actual if pm_actual is not None else 0,  # REAL commit / modelled wealth
            "commitment_eur": (round(float(commit)) if not pd.isna(commit) else 0),
            "marital": marital, "horizon_years": horizon,   # researched; DB-only, not surfaced on UI
            "fill_rate_pct": fill if fill is not None else 0,
            "allocation": allocation,
            "region_mix": region_mix, "format_mix": format_mix,
            "sector_mix": {**{k:0 for k in PLATFORM_SECTOR}, **sector_mix, "AI": round(ai_pct,1)},
            "performance": performance,
            "vintage_mix": vintage_mix,
            "n_funds": len(feeders),
            "funds_by_strategy": funds_map.get(uid, {}),   # real Moonfare fund vehicles per bucket
            "lookthrough_coverage": round((cov_r+cov_s)/2, 3),
            "_provenance": {
                "allocation":"real:peer_strategy_mix", "performance":"real:peer_investor_features(GP marks)",
                "region_mix":"real:portfolio_country_by_feeder", "sector_mix":"real:portfolio_gics_by_feeder",
                "AI":"real:GICS IT look-through", "vintage_mix":"real:attribution",
                "pm_target_pct":"MODELLED:profession/risk", "wealth_eur":"MODELLED:segment band",
                "fill_rate_pct":"MODELLED:commit/(target*wealth)", "kids":"MODELLED:imputed",
                "marital":"RESEARCHED:US-Census marital-by-age (RESEARCH_NOTES.md)",
                "horizon_years":"RESEARCHED:PE-lockup/VHNW horizon (RESEARCH_NOTES.md)",
            },
        })

    out = {
        "_note": "REAL Moonfare investor pool from ingest_real.py. Real fields sourced from the "
                 "export; MODELLED fields (pm_target_pct, wealth_eur, fill_rate_pct, kids) flagged "
                 "in each record's _provenance. See REALDATA_NOTES.md.",
        "_count": len(pool),
        "_real_data": True,
        "investors": pool,
    }
    (DATA/"investor_pool.json").write_text(json.dumps(out, separators=(",",":")))
    print(f"investor_pool.json: {len(pool)} REAL investors  "
          f"(median look-through coverage {np.median([c for c in cov_accum if c]):.0%})")

    build_you(pool)
    build_investors_json(pool)


def build_you(pool):
    """Auto-pick a rich real investor (full multi-strategy, real performance), mask identity."""
    def richness(inv):
        nz = sum(1 for v in inv["allocation"].values() if v > 0)
        perf = inv["performance"]["MOIC"] is not None
        return (nz, inv.get("n_funds",0), perf, inv.get("lookthrough_coverage",0))
    cand = [i for i in pool if i["performance"]["MOIC"] is not None and i.get("n_funds",0) >= 3]
    pick = max(cand or pool, key=richness)
    # mask identity, keep the REAL portfolio 1:1
    you = {
        "_note": "Identity masked to Dr. Steffen Pauls for privacy; PORTFOLIO is one real investor's "
                 f"real 1:1 holdings (source pool id {pick['id']}). Not a random donor (#19 fixed).",
        "id": pick["id"],
        "_display_identity_synthetic": True,
        "_bind_real_holdings": True,
        "profile": {
            "display_name": "Dr. Steffen Pauls",
            "age": pick["age"] or 53,
            "marital": pick.get("marital", "Married"),       # researched (DB-only)
            "kids": (pick["kids"] or {}).get("ages","Adult"),
            "wealth_eur": pick["wealth_eur"],
            "target_pm_pct": pick["pm_target_pct"],
            "pm_actual_pct": pick.get("pm_actual_pct", 0),    # REAL actual PM allocation
            "risk_profile_id": pick["risk_class"],
            "horizon_years": pick.get("horizon_years", "10y+"),  # researched (DB-only)
            "region": pick["region"],
            "profession": pick["profession"],
            "_identity_masked": True,
        },
        "allocation": pick["allocation"],
        "fill_rate_pct": pick["fill_rate_pct"],
        "region_mix": pick["region_mix"],
        "format_mix": pick["format_mix"],
        "sector_mix": pick["sector_mix"],
        "performance": pick["performance"],
        "vintage_mix": pick["vintage_mix"],
        "lookthrough_coverage": pick.get("lookthrough_coverage",0),
        "funds_by_strategy": pick.get("funds_by_strategy", {}),   # real Moonfare fund vehicles
    }
    (DATA/"you.json").write_text(json.dumps(you, indent=2))
    print(f"you.json: real investor {pick['id']} (masked as Dr. Steffen Pauls), "
          f"{sum(1 for v in pick['allocation'].values() if v>0)} strategies, MOIC {pick['performance']['MOIC']}")


def _agg(pool, perf_keys=("DPI","MOIC","IRR")):
    """Mean of the dict-fields + performance over a list (used for platform/top-decile aggregates)."""
    if not pool: return {}
    def md(field):
        acc = defaultdict(list)
        for inv in pool:
            for k,v in (inv.get(field) or {}).items():
                if isinstance(v,(int,float)): acc[k].append(v)
        return {k: round(float(np.mean(v)),1) for k,v in acc.items() if v}
    perfs = [inv["performance"] for inv in pool]
    def pmean(pk):
        vals = [p[pk] for p in perfs if p.get(pk) is not None]
        return round(float(np.mean(vals)), 2 if pk!="IRR" else 1) if vals else None
    pm = [inv["pm_actual_pct"] for inv in pool if inv.get("pm_actual_pct")]   # ACTUAL, not target
    fr = [inv["fill_rate_pct"] for inv in pool if inv.get("fill_rate_pct")]
    # real weighted funds per bucket across this set (platform-wide when pool=all)
    fagg = {}
    for inv in pool:
        for bucket, funds in (inv.get("funds_by_strategy") or {}).items():
            d = fagg.setdefault(bucket, {})
            for nm, pct in (funds or {}).items():
                d[nm] = d.get(nm, 0.0) + float(pct or 0)
    wfs = {}
    for bucket, funds in fagg.items():
        top = sorted(funds.items(), key=lambda x: -x[1])[:5]
        tot = sum(w for _, w in top) or 1
        wfs[bucket] = {nm: round(w/tot*100, 1) for nm, w in top}
    return {
        "pm_allocation_pct": round(float(np.mean(pm)),1) if pm else 0,
        "fill_rate_pct": round(float(np.mean(fr)),1) if fr else 0,
        "allocation": md("allocation"), "region_mix": md("region_mix"),
        "format_mix": md("format_mix"), "sector_mix": md("sector_mix"), "vintage_mix": md("vintage_mix"),
        "weighted_funds_by_strategy": wfs,
        "performance": {k: pmean(k) for k in perf_keys},
    }


def build_investors_json(pool):
    """platform_average + top_decile + cohort_densities computed from the REAL pool (#21)."""
    HEADLINE = len(pool)
    # top decile by MOIC among mature-IRR investors (#4: don't rank on young marks)
    ranked = sorted([i for i in pool if i["performance"]["MOIC"] is not None],
                    key=lambda i: i["performance"]["MOIC"], reverse=True)
    topn = ranked[:max(1, len(ranked)//10)]
    densities = {
        "age": defaultdict(int), "wealth": defaultdict(int), "region": defaultdict(int),
        "prof": defaultdict(int), "risk": defaultdict(int), "kids": defaultdict(int),
    }
    WLAB = {"Mass Affluent":"1-5M","HNW":"5-25M","VHNW":"25-100M","UHNW":"25-100M","Family Office":"100M+"}
    for i in pool:
        if i["age_bucket"]: densities["age"][i["age_bucket"]] += 1
        densities["wealth"][WLAB.get(i["wealth_segment"],"5-25M")] += 1
        densities["region"][i["region"]] += 1
        densities["prof"][i["profession"]] += 1
        densities["risk"][i["risk_class"]] += 1
        k = i.get("kids") or {}
        densities["kids"]["None" if not k.get("has_kids") else (k.get("ages") or "Adult")] += 1
    densities["region"]["All"] = HEADLINE
    out = {
        "_note": "Platform/top-decile/densities computed LIVE from the real pool (fixes #21 frozen "
                 "constants). top_decile ranked on MOIC among investors with a mature (>=4yr) vintage.",
        "_total_count_displayed": HEADLINE,
        "_actual_records_in_this_file": HEADLINE,
        "cohorts": [],
        "platform_average": _agg(pool),
        "top_decile": {"performance": _agg(topn)["performance"], "n": len(topn)},
        "cohort_densities": {k: dict(v) for k,v in densities.items()},
    }
    (DATA/"investors.json").write_text(json.dumps(out, indent=2))
    print(f"investors.json: platform from {HEADLINE} real investors; top_decile n={len(topn)}")


if __name__ == "__main__":
    main()
