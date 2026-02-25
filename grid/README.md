# Geospatial Real-time Infrastructure Decision-Making (GRID) for Energy Infrastructure
- For Better Management of Resources

A 3D geospatial digital twin of the National Grid East Midlands electricity network, built on CesiumJS. It visualises live primary transformer usage as a heatmap and lets you simulate data centre placement to assess grid impact.

## What it does

**Grid heatmap** — 276 primary substations are rendered as overlapping translucent ellipses on the 3D globe. Colour shifts from green (low load) through yellow to red (high load) based on each substation's MVA relative to its daily peak. The three-layer overlap creates a continuous heatmap bleed across the region.

**Day simulation** — The full 24-hour load profile (288 five-minute intervals) is loaded from the National Grid Connected Data API. Cesium's timeline scrubs through the day so you can watch demand rise in the morning, peak during business hours, and fall at night. Playback runs at 1×, 5×, 30×, or 60× speed.

**Data centre placement** — Click to place data centres of varying capacity (5 MW edge to 500 MW mega campus) anywhere on the map. Each facility is rendered as a 3D box sized proportionally to its capacity. The feed table tracks all placed centres and their aggregate demand.

**Grid impact simulation** — Placed data centres distribute their PUE-adjusted load to nearby substations using inverse-distance weighting (25 km radius). The heatmap updates in real time to show increased stress. Each data centre's viability (VIABLE / TIGHT / STRESSED / OVERLOADED) is assessed per timestep.

**Viability report generation** — After placing data centres, generate a PDF report that runs a 7-day backtest against real grid data, computes 5 IEA energy-efficiency metrics, sends results to Google Gemini for AI analysis, and produces a professional PDF with metrics dashboard, trend tables, and actionable recommendations.

## Video

<a href="https://www.youtube.com/watch?v=P7K5_x-Nv_Q" target="_blank">
  Watch the video
</a>

## Architecture

```
HackLDN/
├── cesium/
│   ├── index.html              UI shell — top bar, side panels, Cesium container
│   ├── main.js                 All logic — heatmap, timeline, DC placement, report trigger
│   ├── style.css               Dark sci-fi theme (Detour-inspired)
│   ├── token.local.js          Cesium Ion token (gitignored)
│   ├── grid_timeseries.json    Full-day time series (generated)
│   ├── grid_7day.json          7-day time series for backtest reports (generated)
│   └── grid_usage.geojson      Snapshot GeoJSON (generated)
├── .gitignore
└── README.md

../                             (parent CityTwin directory)
├── fetch_grid_data.py          Data pipeline — fetches from National Grid API
├── app.py                      Flask server — serves UI + report API endpoint
├── report_engine.py            Scoring engine — 5 IEA metrics + Gemini + PDF
├── grid_timeseries.json        Copy of time series output
├── grid_7day.json              Copy of 7-day output
├── grid_usage.geojson          Copy of snapshot output
├── requirements.txt            Python dependencies
└── .env                        API keys (National Grid + Google Gemini)
```

## Data sources

| Source | What | API |
|--------|------|-----|
| [National Grid Connected Data](https://connecteddata.nationalgrid.co.uk) | Live 5-min transformer flows (MVA, Volts) for 350 East Midlands primary substations | CKAN Datastore API |
| [Primary Substation Locations](https://connecteddata.nationalgrid.co.uk/dataset/primary-substation-location-easting-northings) | Lat/lng coordinates for all NGED primary substations | CKAN Datastore API |

The pipeline joins these two datasets by fuzzy-matching substation names, then outputs both a snapshot GeoJSON and a full time-series JSON.

## Setup

### Prerequisites

- Python 3.10+
- A National Grid Connected Data API key (set in `.env`)
- A Cesium Ion access token (for 3D terrain and buildings — optional but recommended)

### 1. Install dependencies and generate data

```bash
cd CityTwin
pip install -r requirements.txt
```

Add your API keys to `.env`:
```
NATIONAL_GRID_API_KEY=your_key_here
GOOGLE_GEMINI=your_gemini_api_key
```

Fetch grid data (takes ~60s, pulls 7 days of 5-min interval data):
```bash
python fetch_grid_data.py
```

This writes `grid_timeseries.json`, `grid_7day.json`, and `grid_usage.geojson` into both the root directory and `HackLDN/cesium/`.

### 2. Set Cesium token

Add your Cesium Ion token to `.env` (this file is gitignored and never pushed):

```
CESIUM_ION_TOKEN=your_cesium_ion_token_here
ALLOWED_ORIGINS=https://jickzx.github.io,http://localhost:8765
```

The Flask server reads `.env` at startup and exposes a **token broker** endpoint (`/api/cesium-token`) that only responds to requests from allowed origins. The token is never embedded in any committed JavaScript file.

For local development without the Flask server, you can optionally create `cesium/token.local.js` (also gitignored):

```js
window.CESIUM_ION_TOKEN = "your_cesium_ion_token";
```

> **Security note:** go to [ion.cesium.com/tokens](https://ion.cesium.com/tokens) and restrict your token's **Allowed HTTP Referers** to `https://jickzx.github.io/*` for an extra layer of protection.

### 3. Run

```bash
python app.py
```

Open [http://localhost:8765](http://localhost:8765). The Flask server serves the Cesium frontend and provides the `/api/generate-report` endpoint for PDF report generation.

## UI guide

### Top bar

- **CityTwin** logo and region label
- **Refresh Data** — reloads the page
- **Last updated** timestamp

### Left panel — Grid Monitor

- **Search** — filters heatmap entities by substation name
- **Simulation time** — current time in the playback with the date
- **Speed controls** — 1× (real time), 5×, 30×, 60×
- **Grid statistics** — live count of substations, average load %, and current peak MVA
- **Data Centre Feed** — table of all placed data centres with name, capacity (MW), simulated load %, and status badge

### Right panel — Data Centre Config

- **Facility Name** — auto-increments (DC-001, DC-002, ...)
- **Capacity** — 5 MW (Edge), 15 MW (Small), 50 MW (Medium), 100 MW (Large), 250 MW (Hyperscale), 500 MW (Mega Campus)
- **PUE** — Power Usage Effectiveness (default 1.3)
- **Cooling** — Air-cooled, Evaporative, or Liquid
- **Place Data Centre** — toggles placement mode (crosshair cursor), click the map to drop
- **Summary** — total demand and PUE-adjusted demand across all placed centres
- **Clear All** — removes all placed data centres

### Right panel — Efficiency Report

- **Generate Viability Report** — runs a 7-day backtest simulation with all placed DCs, computes 5 IEA metrics, calls Google Gemini for AI analysis, and downloads a PDF report

### IEA Metrics computed

| # | Metric | IEA Section | Description |
|---|--------|-------------|-------------|
| 1 | PUE (Power Usage Effectiveness) | 4.2.1 | Weighted average PUE across placed DCs |
| 2 | Grid Utilization | 4.3.6 | Average load factor across affected substations |
| 3 | Idle Coefficient | 4.2.6 | Fraction of infrastructure below 20% load |
| 4 | Energy Intensity | 4.4.2 | DC energy draw vs grid throughput |
| 5 | Capacity Headroom | 5.2.2.2 | Minimum remaining grid capacity over 7 days |

### Map interactions

- **Click a heatmap zone** — shows substation detail panel (current MVA, peak, usage %, time)
- **Click map in placement mode** — drops a data centre at that location
- **Timeline scrubber** — drag to jump to any point in the day
- **Animation controls** — play/pause/reverse the simulation

## How the data pipeline works

1. Fetches all 2,072 primary substation locations (lat/lng) from the NGED location dataset
2. Fetches the resource catalogue for the East Midlands live primary dataset (350 CSV resources)
3. For each resource, fetches the full week of 5-minute MVA readings via the CKAN Datastore API (20 parallel workers)
4. Identifies the most recent complete day and filters to those 288 time steps
5. Fuzzy-matches substation names between the flow data and the location data (strips suffixes like "33 11kv S Stn")
6. Outputs `grid_timeseries.json` (compact: timestamps array + per-substation values array) and `grid_usage.geojson` (snapshot with latest/peak/usage%)

## Tech stack

- **CesiumJS 1.114** — 3D globe, terrain, OSM buildings, entity rendering
- **Flask** — backend server, report API endpoint
- **Google Gemini API** — AI-powered viability analysis
- **fpdf2** — PDF report generation
- **Python 3 + requests** — data pipeline
- **CKAN Datastore API** — data access (National Grid Connected Data platform)
- **Vanilla JS** — no framework, ES modules
- **CSS custom properties** — theming

## Licence

Data sourced under the WPD Open Data Licence from National Grid Electricity Distribution.
