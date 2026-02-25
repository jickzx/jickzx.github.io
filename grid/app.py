#!/usr/bin/env python3
"""
Flask server for GRID.
  - /              → entrance (landing)
  - /entrance.css   → entrance styles
  - /entrance.js    → entrance script
  - /app            → 3D Cesium dashboard (and /app/<path> for its assets)
  - POST /api/generate-report  → runs 7-day backtest + Gemini analysis → PDF
"""

import os
import time as _time
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file, send_from_directory, Response

from report_engine import generate_report

ROOT = Path(__file__).parent
CESIUM_DIR = ROOT / "cesium"

load_dotenv(ROOT / ".env")

CESIUM_ION_TOKEN = os.getenv("CESIUM_ION_TOKEN", "")
ALLOWED_ORIGINS  = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "https://jickzx.github.io,http://localhost:8765").split(",")
    if o.strip()
]

app = Flask(__name__)


@app.route("/")
def index():
    """Landing: serve entrance page."""
    return send_from_directory(str(ROOT), "index.html")


@app.route("/entrance.css")
def entrance_css():
    return send_from_directory(str(ROOT), "entrance.css")


@app.route("/entrance.js")
def entrance_js():
    return send_from_directory(str(ROOT), "entrance.js")


@app.route("/app")
@app.route("/app/")
def app_cesium():
    """3D dashboard: serve Cesium index with base href so assets load from /app/."""
    index_path = CESIUM_DIR / "index.html"
    html = index_path.read_text(encoding="utf-8")
    base_tag = '<base href="/app/">'
    if "<head>" in html and base_tag not in html:
        html = html.replace("<head>", "<head>\n    " + base_tag, 1)
    return Response(html, mimetype="text/html")


@app.route("/app/<path:path>")
def app_static(path):
    return send_from_directory(str(CESIUM_DIR), path)


# ── Cesium token broker ──────────────────────────────────────────
# Returns the Ion token only to allowed origins.
# The token never appears in any static file pushed to GitHub.

def _origin_allowed():
    """Check Origin (preferred) or Referer header against allow-list."""
    origin  = request.headers.get("Origin", "")
    referer = request.headers.get("Referer", "")
    for allowed in ALLOWED_ORIGINS:
        if origin == allowed or referer.startswith(allowed):
            return True, allowed
    return False, origin or referer


@app.route("/api/cesium-token")
def api_cesium_token():
    ok, caller = _origin_allowed()
    if not ok:
        return jsonify({"error": "origin not allowed", "caller": caller}), 403
    if not CESIUM_ION_TOKEN:
        return jsonify({"error": "token not configured on server"}), 500
    resp = jsonify({"token": CESIUM_ION_TOKEN})
    resp.headers["Cache-Control"] = "private, max-age=3600"  # cache 1 h in browser
    return resp


@app.route("/api/generate-report", methods=["POST"])
def api_generate_report():
    data = request.get_json(force=True)
    dcs = data.get("dataCentres", [])
    wts = data.get("windTurbines", [])

    seven_day_path = Path(CESIUM_DIR) / "grid_7day.json"
    if not seven_day_path.exists():
        return {"error": "grid_7day.json not found – run fetch_grid_data.py first"}, 404

    pdf_bytes, metrics, _ = generate_report(str(seven_day_path), dcs, wts)

    ts = _time.strftime("%Y%m%d-%H%M")
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"grid-report-{ts}.pdf",
    )


if __name__ == "__main__":
    print("GRID server")
    print("  Landing:     http://localhost:8765/")
    print("  3D dashboard: http://localhost:8765/app")
    app.run(host="0.0.0.0", port=8765, debug=False)
