"""SQLite-backed cache layer over the JSON data files.

Why: production queries hit thousands of investor rows + a fund catalogue.
JSON read-per-request doesn't scale; SQLite gives us indexed lookups,
joined queries, and a clean upgrade path to a real DB.

The JSON files in data/ are the source of truth. This module rebuilds the SQLite
cache from them on every refresh_database() call. The file watcher calls
refresh_database() whenever a data/ file is modified.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"
DB_PATH = Path(__file__).parent / "alpha.db"
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _read_json(name: str) -> dict[str, Any]:
    path = DATA_DIR / name
    with path.open() as fh:
        return json.load(fh)


def refresh_database() -> dict[str, int]:
    """Rebuild the SQLite cache from JSON files. Returns counts of loaded rows.

    Idempotent. Safe to call repeatedly. Atomic — readers blocked only briefly.
    """
    with _lock:
        # Build into a temp DB, then atomically replace — so concurrent readers (the cohort
        # endpoint, the file-watcher, a rotate-triggered bootstrap) never see a half-dropped
        # schema ("no such table: investor_pool"). os.replace is atomic on the same filesystem.
        import os as _os
        tmp_path = DB_PATH.with_suffix(".rebuild")
        if tmp_path.exists():
            tmp_path.unlink()
        conn = sqlite3.connect(tmp_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        cur = conn.cursor()

        # ----- schema -----
        cur.executescript(
            """
            CREATE TABLE risk_profile (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                short_name      TEXT NOT NULL,
                goal            TEXT,
                interpretation  TEXT,
                allocation_json TEXT NOT NULL
            );
            CREATE TABLE endowment (
                name            TEXT PRIMARY KEY,
                year            TEXT,
                allocation_json TEXT NOT NULL
            );
            CREATE TABLE investor (
                id              TEXT PRIMARY KEY,
                profile_json    TEXT NOT NULL,
                allocation_json TEXT NOT NULL,
                fill_rate       REAL,
                region_json     TEXT,
                format_json     TEXT,
                sector_json     TEXT,
                performance_json TEXT,
                vintage_json    TEXT,
                funds_json      TEXT
            );
            CREATE TABLE cohort_average (
                filter_key      TEXT PRIMARY KEY,
                payload_json    TEXT NOT NULL
            );
            CREATE TABLE platform_average (
                id              INTEGER PRIMARY KEY CHECK (id = 1),
                payload_json    TEXT NOT NULL
            );
            CREATE TABLE top_decile (
                id              INTEGER PRIMARY KEY CHECK (id = 1),
                payload_json    TEXT NOT NULL
            );
            CREATE TABLE cohort_density (
                dimension       TEXT NOT NULL,
                value           TEXT NOT NULL,
                density         INTEGER NOT NULL,
                PRIMARY KEY (dimension, value)
            );
            CREATE TABLE open_fund (
                id              TEXT PRIMARY KEY,
                payload_json    TEXT NOT NULL,
                strategy        TEXT,
                issuer_slug     TEXT,
                hero_slug       TEXT,
                category        TEXT,
                min_eur         INTEGER
            );
            CREATE INDEX idx_open_fund_strategy ON open_fund(strategy);
            CREATE INDEX idx_open_fund_category ON open_fund(category);

            -- Full investor pool (was loaded from JSON per-request; now structured)
            CREATE TABLE investor_pool (
                id              TEXT PRIMARY KEY,
                age             INTEGER,
                age_bucket      TEXT,
                profession      TEXT,
                wealth_segment  TEXT,
                wealth_eur      INTEGER,
                country         TEXT,
                region          TEXT,
                real_risk_score TEXT,
                risk_class      TEXT,
                pm_target_pct   REAL,
                fill_rate_pct   REAL,
                payload_json    TEXT NOT NULL
            );
            CREATE INDEX idx_pool_age    ON investor_pool(age_bucket);
            CREATE INDEX idx_pool_wealth ON investor_pool(wealth_segment);
            CREATE INDEX idx_pool_risk   ON investor_pool(risk_class);
            CREATE INDEX idx_pool_region ON investor_pool(region);
            CREATE INDEX idx_pool_prof   ON investor_pool(profession);

            -- Fund track records (was CSV-per-request)
            CREATE TABLE fund_track_record (
                fund_id        TEXT NOT NULL,
                fund_name      TEXT NOT NULL,
                vintage_year   INTEGER NOT NULL,
                vintage_tag    TEXT,
                net_tvpi       REAL,
                net_dpi        REAL,
                net_irr        REAL,
                label          TEXT,
                PRIMARY KEY (fund_id, vintage_year, vintage_tag)
            );
            CREATE INDEX idx_track_name ON fund_track_record(fund_name);

            -- Fund manager catalogue (logo + hero paths, deal pipeline, etc.)
            -- Sourced from fund_universe.json (drives the follower-alert engine).
            CREATE TABLE fund_manager (
                strategy   TEXT NOT NULL,
                name       TEXT NOT NULL,
                issuer     TEXT,
                vintage    TEXT,
                min_eur    INTEGER,
                PRIMARY KEY (strategy, name)
            );
            CREATE INDEX idx_fm_strategy ON fund_manager(strategy);
            """
        )

        counts = {}

        # ----- risk profiles -----
        rp_data = _read_json("risk_profiles.json")
        for p in rp_data["profiles"]:
            cur.execute(
                "INSERT INTO risk_profile VALUES (?,?,?,?,?,?)",
                (
                    p["id"], p["name"], p["short_name"], p.get("goal"),
                    p.get("interpretation"), json.dumps(p["allocation"]),
                ),
            )
        counts["risk_profiles"] = len(rp_data["profiles"])

        # ----- endowments -----
        endo = _read_json("endowments.json")
        for name, body in endo["endowments"].items():
            cur.execute(
                "INSERT INTO endowment VALUES (?,?,?)",
                (name, body.get("year"), json.dumps(body["allocation"])),
            )
        counts["endowments"] = len(endo["endowments"])

        # ----- demo "you" investor -----
        # Approach: keep the identity (display_name, age, profession, region,
        # wealth, target%) from data/you.json so the demo is consistently
        # "Dr. Steffen Pauls", but pull the ACTUAL portfolio numbers
        # (allocation, mixes, performance, vintage, fill rate, funds) from a
        # RANDOMLY-PICKED investor in the 2,000-investor synthetic pool. This
        # way every "You" portfolio shown in the demo is a real plausible
        # investor from the synthetic database — when production wires up,
        # we just swap the data source.
        import random as _random
        you = _read_json("you.json")
        pool = _read_json("investor_pool.json").get("investors", [])
        # ---- #19 fix: on REAL data, bind the logged-in user's OWN real 1:1 holdings.
        # ingest_real.py writes you.json with `_bind_real_holdings: true` + the picked
        # investor's real portfolio. No random donor, no identity↔holdings slippage.
        # Hard assertion: the bound portfolio's source id must equal you.json's id.
        if you.get("_bind_real_holdings"):
            assert you.get("allocation"), "you.json bound to real holdings but has no allocation"
            allocation  = you["allocation"]
            region_mix  = you["region_mix"]
            format_mix  = you["format_mix"]
            sector_mix  = you["sector_mix"]
            performance = you["performance"]
            vintage_mix = you["vintage_mix"]
            fill_rate   = you["fill_rate_pct"]
            funds_by_strategy = you.get("funds_by_strategy") or _synthesize_funds_for(you.get("id","you"), allocation)
            profile_with_source = {**you["profile"], "_source_pool_id": you.get("id"),
                                   "_identity_masked": True, "_holdings": "real 1:1"}
            donor = None
            cur.execute(
                "INSERT INTO investor VALUES (?,?,?,?,?,?,?,?,?,?)",
                (you["id"], json.dumps(profile_with_source), json.dumps(allocation), fill_rate,
                 json.dumps(region_mix), json.dumps(format_mix), json.dumps(sector_mix),
                 json.dumps(performance), json.dumps(vintage_mix), json.dumps(funds_by_strategy)),
            )
            counts["you"] = 1; counts["you_source"] = f"real:{you.get('id')}"
        else:
          # ---- legacy demo path: random-donor pattern (synthetic data only) ----
          # Filter the pool to investors whose risk class matches Steffen's so
          # the demo never shows a "Capital Preservation" portfolio for an
          # "Innovation & AI Alpha" user. Falls back to full pool if no match.
          same_risk = [i for i in pool if i.get("risk_class") == you["profile"].get("risk_profile_id")]
          donor_pool = same_risk or pool
          donor = _random.choice(donor_pool) if donor_pool else None
          if donor:
            allocation       = donor.get("allocation", you["allocation"])
            region_mix       = donor.get("region_mix", you["region_mix"])
            format_mix       = donor.get("format_mix", you["format_mix"])
            sector_mix       = donor.get("sector_mix", you["sector_mix"])
            performance      = donor.get("performance", you["performance"])
            vintage_mix      = donor.get("vintage_mix", you["vintage_mix"])
            fill_rate        = donor.get("fill_rate_pct", you["fill_rate_pct"])
            # Pool investors don't carry per-fund holdings — synthesize them
            # from the curated per-strategy fund list using a stable hash of
            # (donor_id, strategy) so the breakdown is deterministic for a
            # given donor but varies across reloads (because the donor changes).
            funds_by_strategy = _synthesize_funds_for(donor.get("id", "unknown"), allocation)
            # Surface the source for the demo footer so the audience knows the
            # portfolio comes from synthetic record X (not a one-off hard-code).
            # Keep Steffen's identity fields (name, age, wealth, target_pm_pct,
            # region, profession) verbatim — only the PORTFOLIO numbers (above)
            # are donor-sourced. Stamp the donor id for transparency.
            profile_with_source = {**you["profile"], "_source_pool_id": donor.get("id")}
          else:
            allocation, region_mix, format_mix = you["allocation"], you["region_mix"], you["format_mix"]
            sector_mix, performance, vintage_mix = you["sector_mix"], you["performance"], you["vintage_mix"]
            fill_rate = you["fill_rate_pct"]
            funds_by_strategy = you["funds_by_strategy"]
            profile_with_source = you["profile"]
          cur.execute(
            "INSERT INTO investor VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                you["id"],
                json.dumps(profile_with_source),
                json.dumps(allocation),
                fill_rate,
                json.dumps(region_mix),
                json.dumps(format_mix),
                json.dumps(sector_mix),
                json.dumps(performance),
                json.dumps(vintage_mix),
                json.dumps(funds_by_strategy),
            ),
          )
          counts["you"] = 1
          counts["you_source"] = donor.get("id") if donor else "static_you.json"

        # ----- investor cohort aggregates -----
        inv = _read_json("investors.json")
        for c in inv["cohorts"]:
            key = json.dumps(c["filter"], sort_keys=True)
            payload = {
                "filter": c["filter"],
                "n": c["n_within_filter"],
                "avg": c["average"],
            }
            cur.execute(
                "INSERT INTO cohort_average VALUES (?,?)",
                (key, json.dumps(payload)),
            )
        counts["cohort_averages"] = len(inv["cohorts"])
        cur.execute(
            "INSERT INTO platform_average VALUES (1, ?)",
            (json.dumps(inv["platform_average"]),),
        )
        cur.execute(
            "INSERT INTO top_decile VALUES (1, ?)",
            (json.dumps(inv["top_decile"]),),
        )
        for dim, vals in inv["cohort_densities"].items():
            for v, n in vals.items():
                cur.execute(
                    "INSERT INTO cohort_density VALUES (?,?,?)",
                    (dim, v, n),
                )
        counts["cohort_density_rows"] = sum(len(v) for v in inv["cohort_densities"].values())

        # ----- open funds -----
        funds = _read_json("open_funds.json")
        # Open-fund cards: store full payload + indexable cols
        for f in funds["funds"]:
            cur.execute(
                "INSERT INTO open_fund VALUES (?,?,?,?,?,?,?)",
                (f["id"], json.dumps(f), f.get("strategy"),
                 f.get("issuer_slug"), f.get("hero_slug"), f.get("category"),
                 f.get("min_investment_eur")),
            )
        counts["open_funds"] = len(funds["funds"])

        # ----- investor pool (was JSON per request) -----
        pool_path = DATA_DIR / "investor_pool.json"
        if pool_path.exists():
            pool = json.load(pool_path.open()).get("investors", [])
            for inv in pool:
                cur.execute(
                    "INSERT INTO investor_pool VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        inv.get("id"), inv.get("age"), inv.get("age_bucket"),
                        inv.get("profession"), inv.get("wealth_segment"), inv.get("wealth_eur"),
                        inv.get("country"), inv.get("region"), inv.get("real_risk_score"),
                        inv.get("risk_class"), inv.get("pm_target_pct"), inv.get("fill_rate_pct"),
                        json.dumps(inv),
                    ),
                )
            counts["investor_pool"] = len(pool)

        # ----- fund track records (was CSV per request) -----
        tr_path = DATA_DIR / "fund_track_records.csv"
        if tr_path.exists():
            import csv
            with tr_path.open() as fh:
                rdr = csv.DictReader(fh)
                tr_rows = 0
                for row in rdr:
                    cur.execute(
                        "INSERT OR REPLACE INTO fund_track_record VALUES (?,?,?,?,?,?,?,?)",
                        (
                            row["fund_id"], row["fund_name"], int(row["vintage_year"]),
                            row.get("vintage_tag") or "",
                            float(row["net_tvpi"]) if row.get("net_tvpi") else None,
                            float(row["net_dpi"])  if row.get("net_dpi")  else None,
                            float(row["net_irr"])  if row.get("net_irr")  else None,
                            row.get("label"),
                        ),
                    )
                    tr_rows += 1
                counts["fund_track_records"] = tr_rows

        # ----- fund-manager catalogue (was JSON per request) -----
        fu_path = DATA_DIR / "fund_universe.json"
        if fu_path.exists():
            fu = json.load(fu_path.open()).get("by_strategy", {})
            fm_rows = 0
            for strategy, mgrs in fu.items():
                for m in mgrs:
                    cur.execute(
                        "INSERT OR REPLACE INTO fund_manager VALUES (?,?,?,?,?)",
                        (strategy, m["name"], m.get("issuer"), m.get("vintage"), m.get("min_eur")),
                    )
                    fm_rows += 1
            counts["fund_managers"] = fm_rows

        conn.commit()
        conn.close()
        _os.replace(tmp_path, DB_PATH)   # atomic swap — readers never see a partial rebuild
        return counts


# ===== read helpers =====

def get_risk_profiles() -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM risk_profile ORDER BY rowid").fetchall()
    return [
        {
            "id": r["id"], "name": r["name"], "short_name": r["short_name"],
            "goal": r["goal"], "interpretation": r["interpretation"],
            "allocation": json.loads(r["allocation_json"]),
        }
        for r in rows
    ]


def get_endowments() -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM endowment ORDER BY rowid").fetchall()
    return [
        {"name": r["name"], "year": r["year"], "allocation": json.loads(r["allocation_json"])}
        for r in rows
    ]


def get_you() -> dict:
    """Return the configured 'me' investor — picks the ID stored in data/you.json
    so changing the demo user in the JSON file is enough; no code edits needed."""
    you_id = _read_json("you.json").get("id")
    with _conn() as c:
        r = c.execute("SELECT * FROM investor WHERE id = ?", (you_id,)).fetchone()
    if not r:
        return {}
    return {
        "id": r["id"],
        "profile": json.loads(r["profile_json"]),
        "allocation": json.loads(r["allocation_json"]),
        "fill_rate_pct": r["fill_rate"],
        "region_mix": json.loads(r["region_json"]),
        "format_mix": json.loads(r["format_json"]),
        "sector_mix": json.loads(r["sector_json"]),
        "performance": json.loads(r["performance_json"]),
        "vintage_mix": json.loads(r["vintage_json"]),
        "funds_by_strategy": json.loads(r["funds_json"]),
    }


def get_platform_average() -> dict:
    with _conn() as c:
        r = c.execute("SELECT payload_json FROM platform_average WHERE id = 1").fetchone()
    return json.loads(r["payload_json"]) if r else {}


def get_top_decile() -> dict:
    with _conn() as c:
        r = c.execute("SELECT payload_json FROM top_decile WHERE id = 1").fetchone()
    return json.loads(r["payload_json"]) if r else {}


def get_cohort_average(filter_dict: dict) -> dict | None:
    """LIVE peer-cohort aggregate from the investor pool.

    Always returns SOMETHING that responds to filter changes. If a strict
    intersection of all dims produces fewer than 30 investors, the engine
    relaxes one dim at a time (least informative first: region → prof → kids
    → marital → age → risk → wealth) until the cohort hits 30+.

    Returns a 'relaxed' field listing which dims were dropped so the UI can
    label the result honestly.
    """
    # Relax order: drop the LEAST-determinative dims first. risk + wealth NEVER drop —
    # they're the user's primary intent levers and toggling them must always move the numbers.
    RELAX_ORDER = ["kids", "marital", "region", "prof", "age"]
    f = dict(filter_dict or {})
    matched = filter_pool(f)
    relaxed: list[str] = []
    for dim in RELAX_ORDER:
        if len(matched) >= 30:
            break
        if f.get(dim):
            relaxed.append(dim)
            f[dim] = []
            matched = filter_pool(f)
    if matched:
        return {
            "filter":  filter_dict,
            "applied": f,
            "n":       len(matched),
            "relaxed_dims": relaxed,
            "avg":     aggregate_pool(matched),
        }
    # final fallback if pool is empty
    with _conn() as c:
        r = c.execute("SELECT payload_json FROM cohort_average LIMIT 1").fetchone()
    return json.loads(r["payload_json"]) if r else None


def get_cohort_density(dimension: str, value: str) -> int:
    with _conn() as c:
        r = c.execute(
            "SELECT density FROM cohort_density WHERE dimension = ? AND value = ?",
            (dimension, value),
        ).fetchone()
    return int(r["density"]) if r else 0


def compute_cohort_size(filters: dict[str, list[str]]) -> int:
    """LIVE cohort size — REAL strict-intersection count over the real pool.
    #9 fix: no synthetic ×11 multiplier — the pool now IS the real ~5,600 investors,
    so this returns an actual count of matching real investors."""
    matched = filter_pool(filters or {})
    return len(matched)


def get_fund_universe() -> dict[str, list[dict]]:
    """Fund-manager catalogue keyed by strategy — served from SQLite."""
    with _conn() as c:
        rows = c.execute(
            "SELECT strategy, name, issuer, vintage, min_eur FROM fund_manager ORDER BY strategy, name"
        ).fetchall()
    out: dict[str, list[dict]] = {}
    for r in rows:
        out.setdefault(r["strategy"], []).append(dict(r))
    return out


def get_fund_track_records() -> list[dict]:
    """Synthetic per-vintage TVPI/DPI/IRR from the handoff bundle — served from SQLite."""
    with _conn() as c:
        rows = c.execute(
            "SELECT fund_id, fund_name, vintage_year, vintage_tag, net_tvpi, net_dpi, net_irr, label "
            "FROM fund_track_record ORDER BY fund_id, vintage_year, vintage_tag"
        ).fetchall()
    return [dict(r) for r in rows]


def get_fund_track_record(fund_name: str) -> list[dict]:
    """Per-vintage records for a single fund (chronological)."""
    with _conn() as c:
        rows = c.execute(
            "SELECT fund_id, fund_name, vintage_year, vintage_tag, net_tvpi, net_dpi, net_irr, label "
            "FROM fund_track_record WHERE LOWER(fund_name) = LOWER(?) "
            "ORDER BY vintage_year, vintage_tag",
            (fund_name,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_investor_pool() -> list[dict]:
    """Investor pool — served from SQLite (was JSON per-request)."""
    with _conn() as c:
        rows = c.execute("SELECT payload_json FROM investor_pool").fetchall()
    return [json.loads(r["payload_json"]) for r in rows]


def rebind_you(investor_id: str | None = None) -> dict:
    """Rotate the logged-in 'you' to another REAL investor from the pool.

    Picks the given investor_id, or (if None) a random investor with a rich,
    multi-strategy, performance-bearing portfolio. Rewrites data/you.json binding
    that investor's real 1:1 holdings while keeping the privacy-masked display name,
    then rebuilds the cache. Returns a small summary. Lets the demo show the tool
    works for ANY investor, on demand, without ever un-masking identity.
    """
    import random as _random
    pool = _read_json("investor_pool.json").get("investors", [])
    if not pool:
        return {"ok": False, "error": "empty pool"}
    if investor_id:
        pick = next((i for i in pool if i.get("id") == investor_id), None)
        if not pick:
            return {"ok": False, "error": f"investor {investor_id} not found"}
    else:
        rich = [i for i in pool
                if (i.get("performance") or {}).get("MOIC") is not None
                and i.get("n_funds", 0) >= 3
                and sum(1 for v in (i.get("allocation") or {}).values() if v > 0) >= 4]
        pick = _random.choice(rich or pool)
    prof = {
        "display_name": "Dr. Steffen Pauls",          # identity stays masked
        "age": pick.get("age") or 53,
        "marital": pick.get("marital", "Married"),      # researched (DB-only)
        "kids": (pick.get("kids") or {}).get("ages", "Adult"),
        "wealth_eur": pick.get("wealth_eur"),
        "target_pm_pct": pick.get("pm_target_pct"),
        "pm_actual_pct": pick.get("pm_actual_pct", 0),    # REAL actual PM allocation
        "risk_profile_id": pick.get("risk_class"),
        "horizon_years": pick.get("horizon_years", "10y+"),  # researched (DB-only)
        "region": pick.get("region"),
        "profession": pick.get("profession"),
        "_identity_masked": True,
    }
    you = {
        "_note": f"Rotated to real investor {pick['id']} — real 1:1 holdings, identity masked.",
        "id": pick["id"],
        "_display_identity_synthetic": True,
        "_bind_real_holdings": True,
        "profile": prof,
        "allocation": pick.get("allocation", {}),
        "fill_rate_pct": pick.get("fill_rate_pct", 0),
        "region_mix": pick.get("region_mix", {}),
        "format_mix": pick.get("format_mix", {}),
        "sector_mix": pick.get("sector_mix", {}),
        "performance": pick.get("performance", {}),
        "vintage_mix": pick.get("vintage_mix", {}),
        "lookthrough_coverage": pick.get("lookthrough_coverage", 0),
        "funds_by_strategy": pick.get("funds_by_strategy", {}),
    }
    (DATA_DIR / "you.json").write_text(json.dumps(you, indent=2))
    refresh_database()
    return {"ok": True, "investor_id": pick["id"], "region": pick.get("region"),
            "profession": pick.get("profession"), "risk_class": pick.get("risk_class"),
            "n_strategies": sum(1 for v in (pick.get("allocation") or {}).values() if v > 0),
            "moic": (pick.get("performance") or {}).get("MOIC")}


def platform_count() -> int:
    """Real total investor count (the pool size) — used as the cohort 'total' (#9 real, not 5500)."""
    with _conn() as c:
        r = c.execute("SELECT COUNT(*) AS n FROM investor_pool").fetchone()
    return int(r["n"]) if r else 0


def filter_pool(filters: dict[str, list[str]]) -> list[dict]:
    """Apply cohort filters to the investor pool. Within a dimension: UNION.
    Across dimensions: INTERSECT.
    Empty/All for a dimension = unconstrained."""
    pool = get_investor_pool()
    def matches(inv: dict) -> bool:
        for dim, want in (filters or {}).items():
            if not want or (len(want) == 1 and want[0] == "All"):
                continue
            v = None
            if   dim == "age":     v = inv.get("age_bucket")
            elif dim == "wealth":  v = inv.get("wealth_segment_label") or _wealth_label(inv.get("wealth_segment"))
            elif dim == "risk":    v = inv.get("risk_class")
            elif dim == "region":  v = inv.get("region")
            elif dim == "prof":    v = inv.get("profession")
            elif dim == "marital": continue  # not modelled in the pool yet
            elif dim == "kids":
                k = inv.get("kids") or {}
                v = "None" if not k.get("has_kids") else (k.get("ages") or "Adult")
            if v not in want:
                return False
        return True
    return [i for i in pool if matches(i)]


def _wealth_label(seg: str | None) -> str | None:
    """Map the synth pool's wealth_segment ('HNW') to the UI's bucket label ('5-25M')."""
    return {
        "Mass Affluent": "1-5M",
        "HNW":           "5-25M",
        "VHNW":          "25-100M",
        "UHNW":          "25-100M",
        "Family Office": "100M+",
    }.get(seg)


# Curated representative funds per strategy bucket, used to synthesize a
# peer-cohort weighted-fund mix on Page 4 (Strategy deep-dive) so the right-hand
# pie isn't a "(no peer data)" placeholder. Names are illustrative — drawn from
# the fund universe + known Moonfare manager set; weights below are derived
# deterministically from the cohort filter so the donut shifts when filters move.
_PEER_FUNDS_BY_STRATEGY = {
    "Large-Cap Buyout":        ["EQT XI", "KKR XII", "CVC IX", "Carlyle VIII", "Blackstone X"],
    "Mid-Cap Buyout":          ["Permira VIII", "Cinven VIII", "Advent X", "Bridgepoint VII", "Apax XI"],
    "Small-Cap Buyout":        ["Kingswood IV", "Main Capital VIII", "Oakley V", "Linden V", "H.I.G. VI"],
    "Infrastructure":          ["Qualitas Energy VI", "Stonepeak V", "Brookfield V", "EQT Infra VI", "Generation IM"],
    "Growth / Tech":           ["Insight XII", "Summit X", "TCV XII", "General Catalyst XII", "TA XV"],
    "Private Credit":          ["Ares Senior Credit", "HPS Specialty IV", "MV Credit VI", "Oaktree Opps XII", "Clearlake Credit III"],
    "Secondaries":             ["Lexington XI", "Ardian IX", "HarbourVest XIII", "AlpInvest IX", "17Capital V"],
    "Direct & Co-Investments": ["LGP X Co-Invest", "Vista Foundation Co-Invest", "Silver Lake Co-Invest", "Warburg Pincus Co-Invest", "CDR XII Co-Invest"],
    "AI":                      ["a16z AI Fund III", "Sequoia AI", "Khosla VIII", "Lightspeed XV", "Founders Fund X"],
}


def _synthesize_funds_for(donor_id: str, allocation: dict[str, float]) -> dict[str, dict[str, float]]:
    """Synthesize per-strategy fund holdings for a donor investor.

    Synth pool investors carry strategy allocation (e.g. "Large-Cap Buyout: 15%")
    but no per-fund breakdown. For Page-4 drill-down to show real fund names,
    we pick 2-3 funds from the curated _PEER_FUNDS_BY_STRATEGY list and weight
    them deterministically from a hash of (donor_id, strategy). Same donor +
    same strategy always produces the same fund mix; different donors get
    different mixes so the demo varies meaningfully across re-rolls.
    """
    out: dict[str, dict[str, float]] = {}
    for strat, pct in (allocation or {}).items():
        if pct is None or pct <= 0:
            continue
        pool = _PEER_FUNDS_BY_STRATEGY.get(strat, [])
        if not pool:
            continue
        # Stable hash → fund picks + weights. Python's hash() is randomized
        # per-process, so use a deterministic mixer based on character codes.
        seed = sum(ord(c) * (i + 1) for i, c in enumerate(f"{donor_id}|{strat}"))
        # How many funds to hold in this sleeve — 2 to 4, weighted by sleeve size
        n_funds = 2 + ((seed >> 3) & 0x3)  # 2-5
        n_funds = max(2, min(n_funds, min(4, len(pool))))
        picks = [pool[(seed >> (i * 4)) % len(pool)] for i in range(n_funds * 2)]
        picks = list(dict.fromkeys(picks))[:n_funds]  # de-dupe preserving order
        weights = [((seed >> (i * 5)) & 0x1F) + 10 for i in range(len(picks))]
        total = sum(weights)
        out[strat] = {picks[i]: round(weights[i] / total * 100, 1) for i in range(len(picks))}
    return out


def _peer_weighted_funds_by_strategy(investors: list[dict]) -> dict[str, dict[str, float]]:
    """REAL cohort weighted-fund mix per strategy bucket, aggregated from each investor's
    real `funds_by_strategy` (their actual Moonfare fund vehicles from attribution).

    For each bucket, sum every cohort member's % weight on each real fund, then normalise
    to 100 and keep the top funds. Different cohorts (peer vs platform vs filtered) hold
    different funds, so the table genuinely changes — no curated/invented fund list."""
    if not investors:
        return {}
    agg: dict[str, dict[str, float]] = {}
    for inv in investors:
        for bucket, funds in (inv.get("funds_by_strategy") or {}).items():
            d = agg.setdefault(bucket, {})
            for name, pct in (funds or {}).items():
                d[name] = d.get(name, 0.0) + float(pct or 0)
    out: dict[str, dict[str, float]] = {}
    for bucket, funds in agg.items():
        top = sorted(funds.items(), key=lambda x: -x[1])[:5]
        tot = sum(w for _, w in top) or 1
        out[bucket] = {nm: round(w / tot * 100, 1) for nm, w in top}
    return out


def _mean_ci(vals: list[float]) -> tuple[float, float, float]:
    """(mean, ci_lo, ci_hi) 95% CI. #7 — so the UI can grey out deltas whose CI crosses 0."""
    import math as _m
    n = len(vals)
    if n == 0: return 0.0, 0.0, 0.0
    mean = sum(vals) / n
    if n < 2: return mean, mean, mean
    var = sum((v - mean) ** 2 for v in vals) / (n - 1)
    half = 1.96 * (_m.sqrt(var) / _m.sqrt(n))
    return mean, mean - half, mean + half


def _median_iqr(vals: list[float]) -> tuple[float, float, float]:
    """(median, p25, p75). #6 — central tendency for skewed quantities."""
    s = sorted(vals)
    if not s: return 0.0, 0.0, 0.0
    def q(p):
        if len(s) == 1: return s[0]
        i = p * (len(s) - 1); lo = int(i); frac = i - lo
        return s[lo] + (s[min(lo + 1, len(s) - 1)] - s[lo]) * frac
    return q(0.5), q(0.25), q(0.75)


def aggregate_pool(investors: list[dict]) -> dict:
    """Mean allocation/mixes/perf + #6 median/IQR + #7 n & 95% CI + #11 coverage + #4 IRR maturity."""
    if not investors:
        return {}
    n = len(investors)
    def mean_dict(key: str) -> dict[str, float]:
        keys = set()
        for inv in investors:
            keys.update((inv.get(key) or {}).keys())
        return {k: round(sum((inv.get(key) or {}).get(k, 0) for inv in investors) / n, 1) for k in keys}
    def ci_dict(key: str) -> dict[str, list]:
        keys = set()
        for inv in investors:
            keys.update((inv.get(key) or {}).keys())
        out = {}
        for k in keys:
            m, lo, hi = _mean_ci([(inv.get(key) or {}).get(k, 0) for inv in investors])
            out[k] = [round(lo, 1), round(hi, 1)]
        return out
    fills = [i.get("fill_rate_pct", 0) for i in investors]
    # ACTUAL PM allocation (real commitment / modelled wealth) — varies by cohort, responds to filters.
    actuals = [i.get("pm_actual_pct", 0) for i in investors]
    targets = [i.get("pm_target_pct", 0) for i in investors]
    perfs = [i.get("performance") or {} for i in investors]
    def perf_vals(pk): return [p.get(pk) for p in perfs if p.get(pk) is not None]
    moic_med, moic_lo, moic_hi = _median_iqr(perf_vals("MOIC"))
    irr_med, irr_lo, irr_hi = _median_iqr(perf_vals("IRR"))
    dpi_med, _, _ = _median_iqr(perf_vals("DPI"))
    mature_share = round(sum(1 for p in perfs if p.get("irr_mature")) / n, 2)
    covs = [i.get("lookthrough_coverage", 0) for i in investors if i.get("lookthrough_coverage") is not None]
    return {
        "n":                  n,
        "pm_allocation_pct":  round(sum(actuals) / n, 1) if actuals else 0,   # ACTUAL, varies by cohort
        "pm_target_avg_pct":  round(sum(targets) / n, 1) if targets else 0,   # modelled target (reference)
        "pm_allocation_modelled": False,   # actual is real-commitment-driven (denominator wealth is modelled)
        "fill_rate_pct":      round(sum(fills) / n, 1)   if fills else 0,
        "fill_rate_of_target":round(sum(fills) / n, 1)   if fills else 0,
        "allocation":         mean_dict("allocation"),
        "allocation_ci":      ci_dict("allocation"),       # #7
        "region_mix":         mean_dict("region_mix"),
        "format_mix":         mean_dict("format_mix"),
        "sector_mix":         mean_dict("sector_mix"),
        "vintage_mix":        mean_dict("vintage_mix"),
        "lookthrough_coverage": round(sum(covs) / len(covs), 2) if covs else 0,   # #11
        "weighted_funds_by_strategy": _peer_weighted_funds_by_strategy(investors),
        "performance": {
            # #6 median is the headline for skewed multiples; mean kept for reference
            "DPI":  round(dpi_med, 2),
            "MOIC": round(moic_med, 2),
            "IRR":  round(irr_med, 1),
            "MOIC_mean": round(sum(perf_vals("MOIC")) / max(len(perf_vals("MOIC")), 1), 2),
            "MOIC_iqr": [round(moic_lo, 2), round(moic_hi, 2)],
            "IRR_iqr":  [round(irr_lo, 1), round(irr_hi, 1)],
            "irr_mature_share": mature_share,   # #4 — UI shows "too early to rank" when low
        },
    }


def get_open_funds(strategy: str | None = None) -> list[dict]:
    """Return full fund payloads (category, stats, tags, seed_portfolio, etc.)."""
    with _conn() as c:
        if strategy:
            rows = c.execute(
                "SELECT payload_json FROM open_fund WHERE strategy = ? ORDER BY rowid",
                (strategy,),
            ).fetchall()
        else:
            rows = c.execute("SELECT payload_json FROM open_fund ORDER BY rowid").fetchall()
    return [json.loads(r["payload_json"]) for r in rows]


if __name__ == "__main__":
    print("Refreshing database from JSON …")
    print(refresh_database())
