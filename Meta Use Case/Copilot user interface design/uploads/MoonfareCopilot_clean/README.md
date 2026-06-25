# Alpha · Private Markets Co-Pilot — engine + UI

Code-only distribution. **Contains no investor, fund, or portfolio data.** This is the
application engine (FastAPI backend) and the frontend (static JS/CSS) with no dataset attached.

## What's in here

- **Engine** — `server.py` (FastAPI app + endpoints), `db.py` (SQLite schema + access layer),
  `synth.py` (deterministic synthetic profile assignment), `ask_alpha.py` (chat via the
  `claude` CLI subprocess), `ingest_real.py` / `build_pool.py` (data-loading scripts),
  `mappings/` (country→region and profession taxonomy maps), `requirements.txt`, `start.sh`.
- **UI** — `frontend/` : `app.js`, `index.html`, `styles.css`, Chart.js, jsPDF/html2canvas
  vendors, branding/logo assets, and device mockups.

## Bring your own data

The engine reads from a SQLite cache (`alpha.db`) that `start.sh` rebuilds from JSON/CSV under
a `data/` directory. **Neither `data/` nor `alpha.db` is included.** To run, supply your own
dataset matching the schema in `db.py` (see the `CREATE TABLE` statements) and the loader
contracts in `ingest_real.py` / `build_pool.py`, then run `./start.sh`.

## Requirements

- Python 3.11+ (`pip install -r requirements.txt`)
- Optional: the `claude` CLI logged in (`claude login`) to enable in-app chat / AI summaries.
  Everything else runs without it.
