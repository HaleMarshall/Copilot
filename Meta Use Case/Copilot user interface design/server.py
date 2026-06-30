#!/usr/bin/env python3
"""Alpha Co-Pilot backend.

Serves the static .dc.html app AND a small JSON API backed by SQLite (alpha.db).
Every number the dashboard renders is pulled from this database; investor-profile
saves and simulation saves are written back to it.

Test the dependency: delete alpha.db while the server runs, refresh the page —
the dashboard goes to its empty state because /api/state returns {"empty": true}
(reads never auto-recreate the file). Run `python3 server.py --seed` (or restart)
to repopulate it.
"""
import json, os, sqlite3, sys, datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "alpha.db")
SEED = os.path.join(HERE, "alpha_seed.json")
PORT = int(os.environ.get("PORT", "8731"))

# dataset keys mirrored 1:1 from alpha_seed.json
DATASET_KEYS = ["portfolio", "pm", "strats", "mix", "dims", "cashflows",
                "heldFunds", "heldMeta", "modelCoarse", "modelFine", "followFunds", "scorecards",
                "peer", "platform", "endowments", "benchTable", "fx", "lifecycle", "featured",
                "bank", "scenario", "managers", "offerings", "viz", "managerTree",
                "advisorFlows", "advisorMeta", "advisorPages", "advisorBook", "advisorSelf"]


def ensure_tables():
    """Create the schema (no reference data). Used by writes so saves work even
    against an otherwise-empty database — but it does NOT repopulate the dataset,
    so the dashboard stays in its empty state until an explicit reseed."""
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS dataset (key TEXT PRIMARY KEY, json TEXT NOT NULL)")
    cur.execute("CREATE TABLE IF NOT EXISTS profile_saves (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, json TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS simulation_saves (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, name TEXT, json TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS chat_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, role TEXT, text TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS memory (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, kind TEXT UNIQUE, note TEXT, payload TEXT)")
    con.commit()
    con.close()


import re
_MONTHS = "january february march april may june july august september october november december".split()


def extract_memory(text):
    """Naive relationship-manager memory extraction from a chat turn.
    Returns a list of (kind, note, payload_dict) the copilot should remember."""
    t = (text or "").lower()
    out = []
    if re.search(r"\b(us|u\.s\.|usa|america|american)\b", t) and re.search(r"trump|cautious|wary|worried|nervous|concerned|reduce|less|pull|avoid|exit", t):
        out.append(("us_caution", "Cautious on US exposure (cited Trump / US political risk)", {}))
    if re.search(r"liquidity event|cash out|cashing out|inheritance|bonus|sale of|exit event|sell my|proceeds|windfall", t):
        mon = next((m for m in _MONTHS if m in t), None)
        note = "Possible liquidity event" + (" in " + mon.capitalize() if mon else "")
        out.append(("liquidity_event", note, {"month": mon.capitalize() if mon else None}))
    if re.search(r"retir", t):
        out.append(("retirement", "Planning around a retirement horizon", {}))
    if re.search(r"\besg\b|sustainab|impact invest|climate", t):
        out.append(("esg", "Interested in ESG / impact / climate angle", {}))
    return out


def insert_chat(payload):
    ensure_tables()
    role = payload.get("role", "user")
    text = payload.get("text", "")
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    con = sqlite3.connect(DB)
    con.execute("INSERT INTO chat_log (ts, role, text) VALUES (?, ?, ?)", (ts, role, text))
    remembered = []
    if role == "user":
        for kind, note, pl in extract_memory(text):
            con.execute("INSERT OR IGNORE INTO memory (ts, kind, note, payload) VALUES (?, ?, ?, ?)",
                        (ts, kind, note, json.dumps(pl)))
            remembered.append(kind)
    con.commit()
    con.close()
    return {"ok": True, "remembered": remembered}


def insert_note(payload):
    """Store a free-text note (human-added on the Set-target page) in the memory
    table, tagged source=human so the UI can show who added it."""
    ensure_tables()
    text = (payload.get("text") or "").strip()
    if not text:
        return {"ok": False}
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    kind = "note:" + datetime.datetime.now().isoformat()  # unique per note
    con = sqlite3.connect(DB)
    con.execute("INSERT OR IGNORE INTO memory (ts, kind, note, payload) VALUES (?, ?, ?, ?)",
                (ts, kind, text, json.dumps({"source": "human"})))
    con.commit()
    con.close()
    return {"ok": True, "kind": kind, "ts": ts}


def seed_db():
    """(Re)create alpha.db and load the reference dataset from alpha_seed.json."""
    ensure_tables()
    with open(SEED, "r", encoding="utf-8") as f:
        data = json.load(f)
    con = sqlite3.connect(DB)
    for k in DATASET_KEYS:
        if k in data:
            con.execute("INSERT OR REPLACE INTO dataset (key, json) VALUES (?, ?)", (k, json.dumps(data[k])))
    con.commit()
    con.close()
    print(f"[seed] alpha.db populated with {len(DATASET_KEYS)} dataset rows")


def read_state():
    """Return the full dataset + saved profiles/simulations, or {'empty': True}
    if the database file is absent (deleted). Never creates the file on read."""
    if not os.path.exists(DB):
        return {"empty": True}
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    try:
        out = {}
        for row in cur.execute("SELECT key, json FROM dataset"):
            out[row["key"]] = json.loads(row["json"])
        if not out:
            con.close()
            return {"empty": True}
        profiles = []
        for r in cur.execute("SELECT id, ts, json FROM profile_saves ORDER BY id DESC LIMIT 50"):
            o = json.loads(r["json"]); o["id"] = r["id"]; o["ts"] = r["ts"]; profiles.append(o)
        sims = []
        for r in cur.execute("SELECT id, ts, name, json FROM simulation_saves ORDER BY id DESC LIMIT 50"):
            o = json.loads(r["json"]); o["id"] = r["id"]; o["ts"] = r["ts"]; o["name"] = r["name"]; sims.append(o)
        out["profiles"] = profiles
        out["simulations"] = sims
        chats = []
        for r in cur.execute("SELECT id, ts, role, text FROM chat_log ORDER BY id DESC LIMIT 40"):
            chats.append({"id": r["id"], "ts": r["ts"], "role": r["role"], "text": r["text"]})
        chats.reverse()
        memories = []
        for r in cur.execute("SELECT id, ts, kind, note, payload FROM memory ORDER BY id DESC LIMIT 20"):
            memories.append({"id": r["id"], "ts": r["ts"], "kind": r["kind"], "note": r["note"], "payload": json.loads(r["payload"] or "{}")})
        out["chats"] = chats
        out["memories"] = memories
        out["empty"] = False
        return out
    except sqlite3.OperationalError:
        return {"empty": True}
    finally:
        con.close()


def insert_profile(payload):
    ensure_tables()
    con = sqlite3.connect(DB)
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    con.execute("INSERT INTO profile_saves (ts, json) VALUES (?, ?)", (ts, json.dumps(payload)))
    con.commit()
    rid = con.execute("SELECT last_insert_rowid()").fetchone()[0]
    con.close()
    return {"ok": True, "id": rid, "ts": ts}


def insert_simulation(payload):
    ensure_tables()
    name = payload.get("name", "Simulation")
    con = sqlite3.connect(DB)
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    con.execute("INSERT INTO simulation_saves (ts, name, json) VALUES (?, ?, ?)", (ts, name, json.dumps(payload)))
    con.commit()
    rid = con.execute("SELECT last_insert_rowid()").fetchone()[0]
    con.close()
    return {"ok": True, "id": rid, "ts": ts, "name": name}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", "0") or "0")
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            return self._json(read_state())
        if path == "/api/health":
            return self._json({"ok": True, "db": os.path.exists(DB)})
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/profile":
            return self._json(insert_profile(self._body()))
        if path == "/api/simulation":
            return self._json(insert_simulation(self._body()))
        if path == "/api/chat":
            return self._json(insert_chat(self._body()))
        if path == "/api/note":
            return self._json(insert_note(self._body()))
        self._json({"error": "not found"}, 404)

    def log_message(self, fmt, *args):
        if "/api/" in (self.path or ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    if "--seed" in sys.argv:
        seed_db()
        sys.exit(0)
    if not os.path.exists(DB):
        seed_db()  # fresh install → populate reference data so the app works out of the box
    print(f"Alpha backend → http://localhost:{PORT}/Alpha%20Copilot%20-%20Overview.dc.html")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
