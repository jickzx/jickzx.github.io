#!/usr/bin/env python3
"""
Flask server for GRID.
  - /              → entrance (landing)
  - /entrance.css   → entrance styles
  - /entrance.js    → entrance script
  - /app            → 3D Cesium dashboard (and /app/<path> for its assets)
  - POST /api/generate-report  → runs 7-day backtest + Gemini analysis → PDF
"""

import time as _time
from io import BytesIO
from pathlib import Path

from flask import Flask, request, send_file, send_from_directory, Response

from report_engine import generate_report

ROOT = Path(__file__).parent
CESIUM_DIR = ROOT / "cesium"

app = Flask(__name__)


@app.route("/")
def index():
    """Landing: serve entrance page."""
    return send_from_directory(str(ROOT), "entrance.html")


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
