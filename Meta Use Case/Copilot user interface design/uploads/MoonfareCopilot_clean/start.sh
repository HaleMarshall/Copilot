#!/usr/bin/env bash
# Alpha · Moonfare Co-Pilot — start the production server.
#
# What this does:
#   1. Refreshes the SQLite cache from data/*.json
#   2. Starts the FastAPI server on http://localhost:8787
#   3. Starts the file watcher so edits to data/ files auto-reload the cache
#   4. Opens the app in your default browser
#
# Requirements:
#   - Python 3.11+
#   - `claude` CLI installed and logged-in (claude login)
#   - pip install fastapi uvicorn watchdog python-multipart python-docx

set -euo pipefail
cd "$(dirname "$0")"

PORT="${ALPHA_PORT:-8787}"
LOG="logs/server.log"
PID_FILE="logs/server.pid"

mkdir -p logs

# Kill any prior instance on this port
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping prior Alpha server (pid $OLD_PID)…"
    kill "$OLD_PID" || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# Sanity check Claude CLI is reachable
if ! command -v claude >/dev/null 2>&1; then
  echo "WARNING: 'claude' CLI not on PATH. Ask Alpha chat will fail until you 'claude login'."
fi

echo "Starting Alpha on http://localhost:${PORT}"
nohup python3 -m uvicorn server:app --host 127.0.0.1 --port "$PORT" >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Server failed to start. Tail of log:"
  tail -30 "$LOG"
  exit 1
fi

echo "PID: $(cat "$PID_FILE")"
echo "Log: $(pwd)/$LOG"
echo "Stop with: kill \$(cat $(pwd)/$PID_FILE)"

# Open in browser
open "http://localhost:${PORT}" 2>/dev/null || true
