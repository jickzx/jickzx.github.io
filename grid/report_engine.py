#!/usr/bin/env python3
"""
Computes 5 IEA energy-efficiency metrics from a 7-day grid backtest,
sends them to Google Gemini for analysis, and renders a PDF report.

Metrics (from IEA EDNA "Energy Efficiency Metrics for Data Centres"):
  1. PUE  (Power Usage Effectiveness)   – IEA 4.2.1
  2. Grid Utilization                   – IEA 4.3.6
  3. Idle Coefficient                   – IEA 4.2.6
  4. Energy Intensity                   – IEA 4.4.2
  5. Capacity Headroom                  – IEA 5.2.2.2
"""

import json
import math
import os
import time as _time
from io import BytesIO
from pathlib import Path

import google.generativeai as genai
from fpdf import FPDF

# ── Load .env ────────────────────────────────────────────────────────────
for _env_candidate in [Path(__file__).with_name(".env"), Path(__file__).parent.parent / ".env"]:
    if _env_candidate.exists():
        for _line in _env_candidate.read_text().splitlines():
            if "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())
        break

GEMINI_KEY = os.environ.get("GOOGLE_GEMINI", "")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

# ── Constants ────────────────────────────────────────────────────────────
DEG2RAD = math.pi / 180
EARTH_R = 6371
DC_IMPACT_RADIUS_KM = 25
WT_IMPACT_RADIUS_KM = 20

IEA_REFS = {
    "pue":              "IEA 4.2.1",
    "grid_utilization": "IEA 4.3.6",
    "idle_coefficient": "IEA 4.2.6",
    "energy_intensity": "IEA 4.4.2",
    "capacity_headroom":"IEA 5.2.2.2",
    "renewable_offset": "CityTwin",
}


def _haversine(lat1, lng1, lat2, lng2):
    d_lat = (lat2 - lat1) * DEG2RAD
    d_lng = (lng2 - lng1) * DEG2RAD
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(lat1 * DEG2RAD) * math.cos(lat2 * DEG2RAD) *
         math.sin(d_lng / 2) ** 2)
    return EARTH_R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _distribute_impact(substations, sources, radius_km):
    """Inverse-distance weighted load distribution onto substations."""
    impact = [0.0] * len(substations)
    for src in sources:
        mva = src["mva"]
        pairs, s = [], 0
        for i, sub in enumerate(substations):
            km = _haversine(src["lat"], src["lon"], sub["lat"], sub["lng"])
            if 0.01 < km <= radius_km:
                inv = 1.0 / km
                pairs.append((i, inv))
                s += inv
        if s == 0:
            continue
        for idx, inv in pairs:
            impact[idx] += mva * (inv / s)
    return impact


def _net_impact(substations, dcs, wts):
    """Combined grid impact: DCs add load, wind turbines subtract load."""
    dc_sources = [{"lat": dc["lat"], "lon": dc["lon"], "mva": dc["capacity"] * dc["pue"]} for dc in dcs]
    wt_sources = [{"lat": wt["lat"], "lon": wt["lon"], "mva": -(wt["capacityMW"] * wt["capacityFactor"])} for wt in wts]

    impact = _distribute_impact(substations, dc_sources, DC_IMPACT_RADIUS_KM)
    wt_impact = _distribute_impact(substations, wt_sources, WT_IMPACT_RADIUS_KM)
    return [dc + wt for dc, wt in zip(impact, wt_impact)]

#  METRICS COMPUTATION
def compute_metrics(seven_day, dcs, wts=None):
    """
    Compute 5 IEA-derived metrics across all available days.
    Also computes baseline (no infrastructure) metrics so we can show improvement.
    """
    if wts is None:
        wts = []
    subs = seven_day["substations"]
    days = seven_day["days"]
    impact = _net_impact(subs, dcs, wts) if (dcs or wts) else [0.0] * len(subs)
    total_dc_mva = sum(dc["capacity"] * dc["pue"] for dc in dcs) if dcs else 0
    total_wt_mva = sum(wt["capacityMW"] * wt["capacityFactor"] for wt in wts) if wts else 0
    net_demand = max(0, total_dc_mva - total_wt_mva)

    daily = []
    baseline_daily = []
    for day in days:
        max_steps = max((len(sub["daily"].get(day, [])) for sub in subs), default=0)
        if max_steps == 0:
            continue

        util_sum = 0.0
        base_util_sum = 0.0
        idle_ct = 0
        base_idle_ct = 0
        total_ct = 0
        min_headroom = 1.0
        base_min_headroom = 1.0
        grid_mva_sum = 0.0
        active_subs = 0

        for t in range(max_steps):
            step_utils = []
            base_step_utils = []
            for i, sub in enumerate(subs):
                if sub["peak_mva"] <= 0:
                    continue
                vals = sub["daily"].get(day, [])
                base = vals[t] if t < len(vals) else 0.0
                total = max(0, base + impact[i])
                util = total / sub["peak_mva"]
                base_util = base / sub["peak_mva"]
                step_utils.append(util)
                base_step_utils.append(base_util)
                grid_mva_sum += base

                if util < 0.2:
                    idle_ct += 1
                if base_util < 0.2:
                    base_idle_ct += 1
                total_ct += 1

                headroom = max(0.0, (sub["peak_mva"] - total) / sub["peak_mva"])
                base_headroom = max(0.0, (sub["peak_mva"] - base) / sub["peak_mva"])
                min_headroom = min(min_headroom, headroom)
                base_min_headroom = min(base_min_headroom, base_headroom)

            if step_utils:
                util_sum += sum(step_utils) / len(step_utils)
                base_util_sum += sum(base_step_utils) / len(base_step_utils)
                if t == 0:
                    active_subs = len(step_utils)

        avg_util = util_sum / max_steps if max_steps > 0 else 0
        base_avg_util = base_util_sum / max_steps if max_steps > 0 else 0
        idle_coeff = idle_ct / total_ct if total_ct > 0 else 0
        base_idle_coeff = base_idle_ct / total_ct if total_ct > 0 else 0
        avg_grid = grid_mva_sum / (max_steps * active_subs) if (max_steps > 0 and active_subs > 0) else 1
        e_intensity = net_demand / avg_grid if avg_grid > 0 else 0

        daily.append({
            "date": day,
            "grid_utilization": round(avg_util * 100, 2),
            "idle_coefficient": round(idle_coeff, 4),
            "energy_intensity": round(e_intensity, 4),
            "capacity_headroom": round(min_headroom * 100, 2),
        })
        baseline_daily.append({
            "date": day,
            "grid_utilization": round(base_avg_util * 100, 2),
            "idle_coefficient": round(base_idle_coeff, 4),
            "capacity_headroom": round(base_min_headroom * 100, 2),
        })

    if dcs:
        fleet_pue = sum(dc["pue"] * dc["capacity"] for dc in dcs) / sum(dc["capacity"] for dc in dcs)
    else:
        fleet_pue = 0

    n = len(daily) or 1
    num_dc_affected = len([i for i in range(len(subs)) if impact[i] > 0.01])
    num_wt_relieved = len([i for i in range(len(subs)) if impact[i] < -0.01])

    base_n = len(baseline_daily) or 1
    baseline_util = round(sum(d["grid_utilization"] for d in baseline_daily) / base_n, 2)
    baseline_headroom = round(min((d["capacity_headroom"] for d in baseline_daily), default=100), 2)
    baseline_idle = round(sum(d["idle_coefficient"] for d in baseline_daily) / base_n, 4)

    agg_util = round(sum(d["grid_utilization"] for d in daily) / n, 2)
    agg_headroom = round(min((d["capacity_headroom"] for d in daily), default=100), 2)
    renewable_offset_pct = round(total_wt_mva / total_dc_mva * 100, 1) if total_dc_mva > 0 else (100.0 if total_wt_mva > 0 else 0.0)

    return {
        "pue": round(fleet_pue, 3),
        "grid_utilization": agg_util,
        "idle_coefficient": round(sum(d["idle_coefficient"] for d in daily) / n, 4),
        "energy_intensity": round(sum(d["energy_intensity"] for d in daily) / n, 4),
        "capacity_headroom": agg_headroom,
        "daily": daily,
        "num_days": len(daily),
        "num_substations": len(subs),
        "num_affected": num_dc_affected,
        "num_wt_relieved": num_wt_relieved,
        "total_dc_mw": sum(dc["capacity"] for dc in dcs) if dcs else 0,
        "total_wt_mw": sum(wt["capacityMW"] for wt in wts) if wts else 0,
        "total_wt_effective_mw": round(total_wt_mva, 2),
        "num_wind_farms": len(wts),
        "total_turbines": sum(wt.get("count", 1) for wt in wts) if wts else 0,
        "renewable_offset_pct": renewable_offset_pct,
        "net_demand_mw": round(net_demand, 2),
        "baseline_grid_utilization": baseline_util,
        "baseline_capacity_headroom": baseline_headroom,
        "baseline_idle_coefficient": baseline_idle,
        "util_improvement": round(baseline_util - agg_util, 2) if total_wt_mva > 0 else 0,
        "headroom_improvement": round(agg_headroom - baseline_headroom, 2) if total_wt_mva > 0 else 0,
    }

# MARK: Gemini Models
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"]


def call_gemini(metrics, dcs, wts=None, max_retries=3):
    """Send metrics to Gemini with model fallback and retry."""
    if wts is None:
        wts = []
    model = None

    dc_summary = "\n".join(
        f"  - {dc['name']}: {dc['capacity']} MW, PUE {dc['pue']}, "
        f"{dc.get('cooling', 'N/A')} cooling, at ({dc['lat']:.4f}, {dc['lon']:.4f})"
        for dc in dcs
    ) if dcs else "  No data centres placed"

    wt_summary = "\n".join(
        f"  - {wt['name']}: {wt['capacityMW']} MW ({wt.get('count', 1)} turbines x "
        f"{wt.get('perTurbine', wt['capacityMW'])} MW), CF {wt['capacityFactor']:.0%}, "
        f"effective output {wt['capacityMW'] * wt['capacityFactor']:.1f} MW, "
        f"at ({wt['lat']:.4f}, {wt['lon']:.4f})"
        for wt in wts
    ) if wts else "  No wind farms placed"

    daily_table = "\n".join(
        f"  {d['date']}: Grid Util {d['grid_utilization']}% | "
        f"Idle Coeff {d['idle_coefficient']} | Energy Int {d['energy_intensity']} | "
        f"Headroom {d['capacity_headroom']}%"
        for d in metrics["daily"]
    )

    infra_context = ""
    if dcs and wts:
        infra_context = (
            "This simulation includes BOTH data centres (adding grid load) and wind farms "
            "(reducing grid strain by generating renewable energy). Evaluate how well the "
            "wind generation offsets the data centre demand."
        )
    elif wts and not dcs:
        infra_context = (
            "This simulation evaluates only wind farm placement with no data centres. "
            "Analyse the grid relief provided by the renewable generation."
        )
    else:
        infra_context = (
            "This simulation evaluates data centre placement with no on-site renewable generation. "
            "Consider recommending co-located renewables if grid stress is significant."
        )

    net_mw = metrics['total_dc_mw'] - metrics.get('total_wt_effective_mw', 0)
    offset_pct = metrics.get('renewable_offset_pct', 0)

    renewable_section = ""
    if wts:
        renewable_section = f"""
RENEWABLE ENERGY OFFSET
Renewable Offset: {offset_pct:.1f}% of DC demand covered by wind generation
Net Grid Demand: {metrics.get('net_demand_mw', net_mw):.1f} MW (after wind offset)
Baseline Grid Utilization (no infrastructure): {metrics.get('baseline_grid_utilization', 'N/A')}%
With Infrastructure Grid Utilization: {metrics['grid_utilization']}%
Grid Utilization Improvement from Wind: {metrics.get('util_improvement', 0):.2f} percentage points
Baseline Capacity Headroom: {metrics.get('baseline_capacity_headroom', 'N/A')}%
With Infrastructure Capacity Headroom: {metrics['capacity_headroom']}%
Headroom Improvement from Wind: {metrics.get('headroom_improvement', 0):.2f} percentage points

IMPORTANT: When wind generation exceeds DC demand, the NET impact on the grid is POSITIVE
(the grid is relieved of load). An offset above 100% means the wind farms generate MORE than
the data centres consume. This is a strong positive for grid viability."""

    prompt = f"""You are an expert energy analyst specialising in grid infrastructure integration,
using the IEA EDNA "Energy Efficiency Metrics for Data Centres" framework (October 2022).

Based on the following 7-day backtest simulation for infrastructure placement on the
UK East Midlands electrical grid, produce a detailed executive report.

{infra_context}

SIMULATION PARAMETERS
Data Centres Placed:
{dc_summary}
Total DC Demand: {metrics['total_dc_mw']} MW

Wind Farms Placed:
{wt_summary}
Total Wind Capacity: {metrics.get('total_wt_mw', 0)} MW (nameplate)
Effective Wind Output: {metrics.get('total_wt_effective_mw', 0)} MW (after capacity factor)
Total Turbines: {metrics.get('total_turbines', 0)}

Net Grid Impact: {net_mw:.1f} MW (positive = net load added, negative = net grid RELIEF)

Substations Monitored: {metrics['num_substations']}
Substations Under Additional DC Load: {metrics['num_affected']}
Substations Relieved by Wind: {metrics.get('num_wt_relieved', 0)}
{renewable_section}

IEA METRICS (7-Day Aggregate, with infrastructure impact)
1. PUE (Power Usage Effectiveness) [IEA 4.2.1]: {metrics['pue']}
   {"N/A - no data centres placed" if not dcs else "Benchmark: 1.0 = ideal, <1.2 = excellent, 1.2-1.4 = good, 1.4-1.6 = average, >1.6 = poor"}
2. Grid Utilization [IEA 4.3.6]: {metrics['grid_utilization']}%
   Benchmark: 40-65% = optimal. Note: if wind farms reduce utilization below baseline, this is
   a POSITIVE outcome showing grid relief, NOT underutilization.
3. Idle Coefficient [IEA 4.2.6]: {metrics['idle_coefficient']}
   Benchmark: <0.15 = excellent, 0.15-0.30 = acceptable, >0.30 = significant waste.
   Note: substations running at low load DUE TO wind generation offsetting demand is a positive
   outcome, not wasted infrastructure.
4. Energy Intensity [IEA 4.4.2]: {metrics['energy_intensity']}
   Ratio of NET demand (DC minus wind) to grid throughput. <0.05 = minimal, 0.05-0.15 = moderate, >0.15 = high.
   A value near 0 when wind farms are present means renewables are fully covering DC demand.
5. Capacity Headroom [IEA 5.2.2.2]: {metrics['capacity_headroom']}%
   Minimum remaining capacity over 7 days. >30% = comfortable, 15-30% = adequate, <15% = critical.
   Wind farms INCREASE headroom by reducing net load.

DAY-BY-DAY BREAKDOWN
{daily_table}

GRADING GUIDANCE
When wind farms are present and the net grid impact is negative (net relief):
- This is fundamentally POSITIVE — the infrastructure generates more energy than it consumes
- Grade A-B should be given when wind offset > 80% and headroom is comfortable
- Grade B-C when wind offset is 50-80%
- The presence of sufficient renewable generation to offset DC demand is a major positive factor
- Low grid utilization caused by wind relief should NOT be penalised

Produce a report with EXACTLY these sections (use plain text, no markdown symbols):

1. EXECUTIVE SUMMARY
Write 2-3 concise paragraphs summarising the overall viability of the proposed infrastructure placement(s).
Include the net grid impact and whether renewable generation adequately offsets DC demand.

2. METRIC-BY-METRIC ANALYSIS
For each of the 5 metrics, write one paragraph explaining:
- What the score means in the context of the IEA framework
- How it compares to industry benchmarks
- How wind generation impacts the metric positively (if wind farms are placed)
- Any concerning trends in the daily data

3. RISK ASSESSMENT
List 4-6 specific risks as bullet points with severity (HIGH/MEDIUM/LOW).
Include wind intermittency risks if applicable.

4. RECOMMENDATIONS
Provide 4-6 numbered actionable recommendations.

5. OVERALL VIABILITY GRADE
Assign a single letter grade (A through F) with a one-sentence justification.
A = Excellent viability, net-positive grid impact or minimal stress
B = Good viability, strong renewable offset, manageable residual stress
C = Acceptable with mitigations needed
D = Marginal, significant infrastructure upgrades required
E = Poor, major constraints identified
F = Not viable without fundamental changes

Keep language professional but accessible. Reference IEA section numbers.
Total response MUST be under 900 words."""

    import time
    last_exc = None
    for model_name in GEMINI_MODELS:
        model = genai.GenerativeModel(model_name)
        for attempt in range(max_retries):
            try:
                print(f"  Trying {model_name} (attempt {attempt + 1}) …")
                response = model.generate_content(prompt)
                return response.text
            except Exception as exc:
                last_exc = exc
                wait = 2 ** (attempt + 2)
                print(f"  {model_name} attempt {attempt + 1} failed: {exc}")
                if attempt < max_retries - 1:
                    time.sleep(wait)
        print(f"  All retries exhausted for {model_name}, trying next model …")
    raise last_exc

# MARK: creating a PDF
class ReportPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(56, 189, 186)
        self.cell(0, 8, "CityTwin  |  Infrastructure Viability Report", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(56, 189, 186)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def _metric_color(name, value, has_wind=False):
    """Return (r, g, b) indicating good/warn/bad for each metric."""
    GREEN = (67, 160, 71)
    AMBER = (255, 193, 7)
    RED   = (229, 57, 53)
    GREY  = (120, 120, 120)

    if name == "pue":
        if value == 0:    return GREY
        if value <= 1.3:  return GREEN
        if value <= 1.6:  return AMBER
        return RED
    if name == "grid_utilization":
        if has_wind and value < 35:
            return GREEN
        if 35 <= value <= 70: return GREEN
        if value <= 85:       return AMBER
        return RED
    if name == "idle_coefficient":
        if has_wind:
            return GREEN
        if value <= 0.15: return GREEN
        if value <= 0.30: return AMBER
        return RED
    if name == "energy_intensity":
        if value <= 0.05: return GREEN
        if value <= 0.15: return AMBER
        return RED
    if name == "capacity_headroom":
        if value >= 30:   return GREEN
        if value >= 15:   return AMBER
        return RED
    if name == "renewable_offset":
        if value >= 80:   return GREEN
        if value >= 40:   return AMBER
        return RED
    return GREY


def generate_pdf(metrics, dcs, wts, gemini_text):
    pdf = ReportPDF()
    pdf.set_auto_page_break(auto=True, margin=20)

    has_dcs = bool(dcs)
    has_wts = bool(wts)
    if has_dcs and has_wts:
        subtitle = "Infrastructure Viability Report"
    elif has_wts:
        subtitle = "Wind Farm Grid Impact Report"
    else:
        subtitle = "Data Centre Viability Report"

    # ── Title page ──────────────────────────────────────────────────
    pdf.add_page()
    pdf.ln(40)
    pdf.set_font("Helvetica", "B", 36)
    pdf.set_text_color(56, 189, 186)
    pdf.cell(0, 16, "Grid", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 10, subtitle, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(0, 8,
             f"East Midlands Grid  |  {metrics['num_days']}-Day Backtest  |  "
             f"Generated {_time.strftime('%Y-%m-%d %H:%M UTC')}",
             new_x="LMARGIN", new_y="NEXT", align="C")

    # Data Centres section
    pdf.ln(18)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 8, "Simulated Data Centres", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 10)
    if dcs:
        for dc in dcs:
            pdf.set_text_color(70, 70, 70)
            pdf.cell(0, 7,
                     f"{dc['name']}  --  {dc['capacity']} MW  |  PUE {dc['pue']}  |  "
                     f"{dc.get('cooling', 'N/A').title()} Cooling",
                     new_x="LMARGIN", new_y="NEXT", align="C")
    else:
        pdf.set_text_color(140, 140, 140)
        pdf.cell(0, 7, "No data centres placed",
                 new_x="LMARGIN", new_y="NEXT", align="C")

    # Wind Farms section
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 8, "Simulated Wind Farms", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 10)
    if wts:
        for wt in wts:
            count = wt.get("count", 1)
            per = wt.get("perTurbine", wt["capacityMW"])
            cf = wt["capacityFactor"]
            eff = wt["capacityMW"] * cf
            pdf.set_text_color(67, 160, 71)
            pdf.cell(0, 7,
                     f"{wt['name']}  --  {count} x {per} MW  |  "
                     f"CF {cf:.0%}  |  Effective: {eff:.1f} MW",
                     new_x="LMARGIN", new_y="NEXT", align="C")
    else:
        pdf.set_text_color(140, 140, 140)
        pdf.cell(0, 7, "No wind farms placed",
                 new_x="LMARGIN", new_y="NEXT", align="C")

    # Net impact summary
    if has_dcs or has_wts:
        net = metrics["total_dc_mw"] - metrics.get("total_wt_effective_mw", 0)
        pdf.ln(10)
        pdf.set_font("Helvetica", "B", 11)
        color = (229, 57, 53) if net > 0 else (67, 160, 71)
        pdf.set_text_color(*color)
        sign = "+" if net > 0 else ""
        pdf.cell(0, 8, f"Net Grid Impact: {sign}{net:.1f} MW",
                 new_x="LMARGIN", new_y="NEXT", align="C")

    # ── Metrics Dashboard ───────────────────────────────────────────
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 14, "IEA Energy Efficiency Metrics", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    metric_rows = [
        ("pue",              "PUE",               f"{metrics['pue']:.2f}" if metrics['pue'] > 0 else "N/A",
         "Total Facility Energy / IT Equipment Energy"),
        ("grid_utilization", "Grid Utilization",   f"{metrics['grid_utilization']:.1f}%",
         "Average load factor across affected substations"),
        ("idle_coefficient", "Idle Coefficient",   f"{metrics['idle_coefficient']:.3f}",
         "Fraction of infrastructure running below 20% load"),
        ("energy_intensity", "Energy Intensity",   f"{metrics['energy_intensity']:.4f}",
         "Net DC demand (after wind offset) relative to grid throughput"),
        ("capacity_headroom","Capacity Headroom",  f"{metrics['capacity_headroom']:.1f}%",
         "Minimum remaining grid capacity over simulation"),
    ]

    if has_wts:
        offset_val = metrics.get("renewable_offset_pct", 0)
        metric_rows.append((
            "renewable_offset", "Renewable Offset",
            f"{offset_val:.0f}%",
            "Wind generation as percentage of DC demand (>100% = net grid relief)",
        ))

    for idx, (key, name, value_str, desc) in enumerate(metric_rows):
        y = pdf.get_y()
        pdf.set_fill_color(245, 247, 250)
        pdf.rect(10, y, 190, 20, "F")

        val = metrics.get(key, metrics.get("renewable_offset_pct", 0) if key == "renewable_offset" else 0)
        r, g, b = _metric_color(key, val, has_wind=has_wts)

        pdf.set_xy(14, y + 2)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(80, 8, f"{idx + 1}. {name}")

        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(r, g, b)
        pdf.cell(40, 8, value_str, align="R")

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(140, 140, 140)
        pdf.cell(56, 8, IEA_REFS[key], align="R", new_x="LMARGIN", new_y="NEXT")

        pdf.set_xy(14, y + 12)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 6, desc, new_x="LMARGIN", new_y="NEXT")

        pdf.ln(4)

    # MARK: 7 Day trend
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, f"{metrics['num_days']}-Day Trend", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    col_defs = [("Day", 34), ("Grid Util %", 36), ("Idle Coeff", 36),
                ("Energy Int", 36), ("Headroom %", 36)]
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(56, 189, 186)
    pdf.set_text_color(255, 255, 255)
    for name, w in col_defs:
        pdf.cell(w, 8, name, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(50, 50, 50)
    for i, d in enumerate(metrics["daily"]):
        pdf.set_fill_color(250, 252, 255) if i % 2 == 0 else pdf.set_fill_color(255, 255, 255)
        pdf.cell(34, 7, d["date"], border=1, align="C", fill=True)
        pdf.cell(36, 7, f"{d['grid_utilization']:.1f}", border=1, align="C", fill=True)
        pdf.cell(36, 7, f"{d['idle_coefficient']:.3f}", border=1, align="C", fill=True)
        pdf.cell(36, 7, f"{d['energy_intensity']:.4f}", border=1, align="C", fill=True)
        pdf.cell(36, 7, f"{d['capacity_headroom']:.1f}", border=1, align="C", fill=True)
        pdf.ln()

    # MARK: Gemini Analysis
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 14, "AI-Powered Analysis", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(0, 6,
             "Generated by Google Gemini  |  IEA EDNA Energy Efficiency Metrics framework (Oct 2022)",
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    section_headers = [
        "1. EXECUTIVE SUMMARY", "2. METRIC-BY-METRIC ANALYSIS", "2. METRIC ANALYSIS",
        "3. RISK ASSESSMENT", "4. RECOMMENDATIONS", "5. OVERALL VIABILITY GRADE",
        "5. OVERALL GRADE", "EXECUTIVE SUMMARY", "METRIC-BY-METRIC", "METRIC ANALYSIS",
        "RISK ASSESSMENT", "RECOMMENDATIONS", "OVERALL VIABILITY", "OVERALL GRADE",
    ]

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(40, 40, 40)

    clean_text = gemini_text.encode("ascii", "replace").decode("ascii")

    def _safe_multi(w, h, txt):
        pdf.set_x(pdf.l_margin)
        try:
            pdf.multi_cell(w if w > 0 else 0, h, txt)
        except Exception:
            for chunk in [txt[i:i+90] for i in range(0, len(txt), 90)]:
                pdf.cell(0, h, chunk, new_x="LMARGIN", new_y="NEXT")

    for raw_line in clean_text.split("\n"):
        line = raw_line.strip().lstrip("#").strip()
        while line.startswith("**") and line.endswith("**"):
            line = line[2:-2].strip()
        line = line.replace("**", "").replace("__", "")
        if not line:
            pdf.ln(3)
            continue

        is_header = any(line.upper().startswith(h) for h in section_headers)
        if is_header:
            pdf.ln(4)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(56, 189, 186)
            _safe_multi(0, 6, line)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(40, 40, 40)
        elif line.startswith("-") or line.startswith("*"):
            bullet_text = line.lstrip("-* ").strip()
            pdf.set_x(pdf.l_margin + 6)
            try:
                pdf.multi_cell(0, 5, "- " + bullet_text)
            except Exception:
                pdf.set_x(pdf.l_margin)
                _safe_multi(0, 5, "- " + bullet_text)
        else:
            _safe_multi(0, 5, line)

    # ── Footer disclaimer ───────────────────────────────────────────
    pdf.ln(10)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(160, 160, 160)
    pdf.multi_cell(0, 4,
                   "This report is generated automatically using simulation data from the National Grid "
                   "East Midlands Connected Data API and AI analysis from Google Gemini. Metrics are derived "
                   "from the IEA EDNA framework. Results should be validated with detailed engineering studies "
                   "before making investment decisions.")

    return pdf.output()

# MARK: Generate Report
def generate_report(seven_day_path, dcs, wts=None):
    """
    Main entry point.  Returns (pdf_bytes, metrics_dict, gemini_text).
    """
    if wts is None:
        wts = []
    seven_day = json.loads(Path(seven_day_path).read_text())
    metrics = compute_metrics(seven_day, dcs, wts)
    gemini_text = call_gemini(metrics, dcs, wts)
    pdf_bytes = generate_pdf(metrics, dcs, wts, gemini_text)
    return pdf_bytes, metrics, gemini_text
