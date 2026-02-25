// ══════════════════════════════════════════════════════════════════
//  TOKEN — fetched from backend broker; never stored in this file
// ══════════════════════════════════════════════════════════════════
let ionToken = null;

async function fetchCesiumToken() {
  // 1. Try the backend token broker (works when Flask is serving)
  try {
    const resp = await fetch("/api/cesium-token");
    if (resp.ok) {
      const data = await resp.json();
      if (data.token) return data.token;
    }
  } catch (_) { /* backend unreachable — fall through */ }

  // 2. Fallback: gitignored token.local.js may have set this (local dev)
  if (window.CESIUM_ION_TOKEN) return window.CESIUM_ION_TOKEN;

  console.warn("No Cesium Ion token available — terrain & buildings disabled.");
  return null;
}

ionToken = await fetchCesiumToken();
if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

// ══════════════════════════════════════════════════════════════════
//  VIEWER
// ══════════════════════════════════════════════════════════════════
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: ionToken ? Cesium.Terrain.fromWorldTerrain() : undefined,
  baseLayer: new Cesium.ImageryLayer(
    new Cesium.OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/",
    })
  ),
  timeline: true,
  animation: true,
  shouldAnimate: true,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  navigationHelpButton: false,
  sceneModePicker: false,
  infoBox: false,
  selectionIndicator: false,
});

viewer.scene.globe.depthTestAgainstTerrain = false;

viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(-1.15, 52.75, 180000),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-70), roll: 0 },
  duration: 2,
});

async function loadBuildings() {
  try {
    const b = await Cesium.createOsmBuildingsAsync();
    viewer.scene.primitives.add(b);
  } catch (e) { console.warn("OSM buildings skipped:", e); }
}

// ══════════════════════════════════════════════════════════════════
//  COLOUR HELPERS
// ══════════════════════════════════════════════════════════════════
function usageToCesiumColor(pct, alpha) {
  const t = Math.max(0, Math.min(1, pct));
  if (t < 0.25) {
    const s = t / 0.25;
    return new Cesium.Color(0, 0.4 + 0.6 * s, 0.2 * (1 - s), alpha);
  }
  if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return new Cesium.Color(s, 1.0, 0, alpha);
  }
  if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return new Cesium.Color(1.0, 1.0 - s * 0.5, 0, alpha);
  }
  const s = (t - 0.75) / 0.25;
  return new Cesium.Color(1.0, 0.5 - s * 0.5, 0, alpha);
}

function usageToHex(pct) {
  const t = Math.max(0, Math.min(1, pct));
  const r = Math.round(255 * Math.min(1, t * 2));
  const g = Math.round(255 * Math.min(1, (1 - t) * 2));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}00`;
}

// ══════════════════════════════════════════════════════════════════
//  GEO HELPERS
// ══════════════════════════════════════════════════════════════════
const DEG2RAD = Math.PI / 180;
const EARTH_R = 6371;

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) *
    Math.sin(dLng / 2) ** 2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ══════════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════════
let tsData  = null;
let tsIndex = 0;
const heatEntities = [];

const HEATMAP_RADIUS = 1500;
const GLOW_RADIUS    = 3000;

const dataCentres  = [];
let   placingDC    = false;
let   dcCounter    = 1;

const windTurbines = [];
let   placingWT    = false;
let   wtCounter    = 1;

let dcImpactPerSub = [];

const DC_IMPACT_RADIUS_KM = 25;
const WT_IMPACT_RADIUS_KM = 20;

// ── Replace this constant ────────────────────────────────────────
// const K_NEIGHBORS      = 5;        // ← remove
const CASCADE_RADIUS_KM = 40;      // ← all substations within 40 km are candidates
const EPSILON           = 0.0001;
const MAX_SUPPORTERS = 4;

let substationNeighbors    = [];  // radius-based neighbour graph
let cascadeEdges           = [];  // { from, to, amount, depth } per tick
let cascadeSupportGiven    = [];  // MVA shed by each substation
let cascadeSupportReceived = [];  // MVA absorbed by each substation

const cascadeLinePool = [];
const wtLinePool      = [];

// ══════════════════════════════════════════════════════════════════
//  RADIUS-BASED NEIGHBOUR GRAPH  (replaces k-NN)
// ══════════════════════════════════════════════════════════════════
function computeNeighbors() {
  substationNeighbors = tsData.substations.map((sub, i) =>
    tsData.substations
      .map((other, j) => {
        if (i === j) return null;
        const dist = haversineKm(sub.lat, sub.lng, other.lat, other.lng);
        if (dist > CASCADE_RADIUS_KM) return null;
        return { idx: j, dist };
      })
      .filter(Boolean)
      .sort((a, b) => a.dist - b.dist)   // closest first — scoring still uses dist
  );
}

// ══════════════════════════════════════════════════════════════════
//  CASCADE COMPUTATION  — every neighbor in radius is a candidate
// ══════════════════════════════════════════════════════════════════
function computeCascadeSupport() {
  const n = tsData.substations.length;

  cascadeEdges.length = 0;
  cascadeSupportGiven    = new Array(n).fill(0);
  cascadeSupportReceived = new Array(n).fill(0);

  const capacity = tsData.substations.map(s => s.peak_mva * 1.25);
  const load     = tsData.substations.map((s, i) =>
    (s.values[tsIndex] ?? 0) + (dcImpactPerSub[i] ?? 0)
  );

  // Seed BFS with every initially overloaded node
  const processedAsSource = new Set();  // nodes we have already shed load FROM
  const queue = [];
  for (let i = 0; i < n; i++) {
    if (load[i] > capacity[i]) queue.push({ idx: i, depth: 0 });
  }

  while (queue.length > 0) {
    const { idx: i, depth } = queue.shift();
    if (processedAsSource.has(i)) continue;
    processedAsSource.add(i);

    const overflow = load[i] - capacity[i];
    if (overflow <= 0) continue;

    // All radius neighbors — including those that are themselves stressed,
    // as long as they have ANY headroom left
    const candidates = substationNeighbors[i]
      .map(nb => {
        const headroom = capacity[nb.idx] - load[nb.idx];
        if (headroom <= 0) return null;
        return {
          idx:      nb.idx,
          headroom,
          score:    headroom * (1 / (nb.dist + EPSILON)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)  // highest headroom and closest first;
      .slice(0, MAX_SUPPORTERS);              // limit to top N candidates to avoid thin spreading

    const scoreSum = candidates.reduce((s, c) => s + c.score, 0);
    if (scoreSum === 0) continue;

    for (const c of candidates) {
      const amount = Math.min(overflow * (c.score / scoreSum), c.headroom);
      if (amount <= 0) continue;

      load[c.idx]                   += amount;
      cascadeSupportReceived[c.idx] += amount;
      cascadeSupportGiven[i]        += amount;

      cascadeEdges.push({ from: i, to: c.idx, amount, depth });

      // Enqueue supporter if it is now itself overloaded
      if (load[c.idx] > capacity[c.idx] && !processedAsSource.has(c.idx)) {
        queue.push({ idx: c.idx, depth: depth + 1 });
      }
    }

    load[i] = capacity[i];
  }
}

// ══════════════════════════════════════════════════════════════════
//  STABLE CASCADE LINE POOL  (no blink — mutate in place)
// ══════════════════════════════════════════════════════════════════
function edgeColor(edge) {
  if (edge.depth > 0) {
    return edge.amount > 2
      ? Cesium.Color.fromCssColorString("#ff1f1f")
      : Cesium.Color.fromCssColorString("#ff7700");
  }
  if (edge.amount > 5) return Cesium.Color.fromCssColorString("#ff7700");
  if (edge.amount > 2) return Cesium.Color.fromCssColorString("#f5c400");
  return Cesium.Color.fromCssColorString("#00ff87");
}

function getOrCreateLineEntity(index) {
  if (cascadeLinePool[index]) return cascadeLinePool[index];

  const entity = viewer.entities.add({
    polyline: {
      positions:     [],
      width:         2,
      material:      new Cesium.PolylineGlowMaterialProperty({
        glowPower:  0.2,
        taperPower: 0.6,
        color:      Cesium.Color.YELLOW,
      }),
      clampToGround: false,
      arcType:       Cesium.ArcType.NONE,
      show:          false,
    },
  });

  cascadeLinePool[index] = entity;
  return entity;
}

function renderCascadeLines() {
  if (!tsData) return;

  cascadeEdges.forEach((edge, i) => {
    const from     = tsData.substations[edge.from];
    const to       = tsData.substations[edge.to];
    const altitude = 50 + edge.depth * 200;
    const width    = Math.max(1.5, Math.min(12, 1.5 + edge.amount * 0.8));
    const alpha    = Math.min(0.92, 0.35 + edge.amount * 0.06);
    const color    = edgeColor(edge).withAlpha(alpha);

    const entity   = getOrCreateLineEntity(i);
    const polyline = entity.polyline;

    polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights([
      from.lng, from.lat, altitude,
      to.lng,   to.lat,   altitude,
    ]);
    polyline.width    = width;
    polyline.material = new Cesium.PolylineGlowMaterialProperty({
      glowPower:  edge.depth > 0 ? 0.45 : 0.2,
      taperPower: 0.6,
      color,
    });
    polyline.show = true;
  });

  // Hide unused pool slots beyond the active edge count
  for (let i = cascadeEdges.length; i < cascadeLinePool.length; i++) {
    if (cascadeLinePool[i]) cascadeLinePool[i].polyline.show = false;
  }
}

// ══════════════════════════════════════════════════════════════════
//  WIND TURBINE SUPPORT LINES  (WT → benefited substations)
// ══════════════════════════════════════════════════════════════════
function renderWTLines() {
  if (!tsData) return;

  const edges = [];

  for (const wt of windTurbines) {
    const effectiveMVA = wt.capacityMW * wt.capacityFactor;
    const hits = [];
    let sumInvDist = 0;

    for (let i = 0; i < tsData.substations.length; i++) {
      const sub = tsData.substations[i];
      const km  = haversineKm(wt.lat, wt.lon, sub.lat, sub.lng);
      if (km <= WT_IMPACT_RADIUS_KM && km > 0.01) {
        const invD = 1 / km;
        hits.push({ idx: i, invD });
        sumInvDist += invD;
      }
    }

    if (sumInvDist === 0) continue;

    for (const h of hits) {
      const share = effectiveMVA * (h.invD / sumInvDist);
      if (share < 0.05) continue;
      edges.push({ wt, subIdx: h.idx, shareMVA: share });
    }
  }

  edges.forEach((edge, i) => {
    const sub      = tsData.substations[edge.subIdx];
    const altitude = 300;
    const width    = Math.max(1, Math.min(8, 1 + edge.shareMVA * 0.4));
    const alpha    = Math.min(0.85, 0.3 + edge.shareMVA * 0.05);
    const color    = Cesium.Color.fromCssColorString("#43ff8a").withAlpha(alpha);

    if (!wtLinePool[i]) {
      wtLinePool[i] = viewer.entities.add({
        polyline: {
          positions:     [],
          width:         2,
          material:      new Cesium.PolylineGlowMaterialProperty({
            glowPower:  0.3,
            taperPower: 0.5,
            color:      Cesium.Color.fromCssColorString("#43ff8a"),
          }),
          clampToGround: false,
          arcType:       Cesium.ArcType.NONE,
          show:          false,
        },
      });
    }

    const polyline = wtLinePool[i].polyline;
    polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights([
      edge.wt.lon, edge.wt.lat, altitude,
      sub.lng,     sub.lat,     altitude,
    ]);
    polyline.width    = width;
    polyline.material = new Cesium.PolylineGlowMaterialProperty({
      glowPower:  0.3,
      taperPower: 0.5,
      color,
    });
    polyline.show = true;
  });

  for (let i = edges.length; i < wtLinePool.length; i++) {
    if (wtLinePool[i]) wtLinePool[i].polyline.show = false;
  }
}

// ══════════════════════════════════════════════════════════════════
//  CASCADE METRICS  (for UI panel)
// ══════════════════════════════════════════════════════════════════
function getCascadeMetrics() {
  const totalSupport    = cascadeSupportReceived.reduce((a, b) => a + b, 0);
  const supportingCount = cascadeSupportReceived.filter(x => x > 0).length;
  const overloadedCount = cascadeSupportGiven.filter(x => x > 0).length;
  const maxDepth        = cascadeEdges.length > 0
    ? Math.max(...cascadeEdges.map(e => e.depth)) : 0;
  const maxFlow         = cascadeEdges.length > 0
    ? Math.max(...cascadeEdges.map(e => e.amount)) : 0;
  return { totalSupport, supportingCount, overloadedCount, maxDepth, maxFlow };
}

// ══════════════════════════════════════════════════════════════════
//  GRID IMPACT COMPUTATION  (DCs add load, Wind Turbines subtract)
// ══════════════════════════════════════════════════════════════════
function recomputeDCImpact() {
  if (!tsData) return;
  dcImpactPerSub = new Array(tsData.substations.length).fill(0);

  for (const dc of dataCentres) {
    _distributeImpact(dc.capacity * dc.pue, dc.lat, dc.lon, DC_IMPACT_RADIUS_KM);
  }

  for (const wt of windTurbines) {
    _distributeImpact(-(wt.capacityMW * wt.capacityFactor), wt.lat, wt.lon, WT_IMPACT_RADIUS_KM);
  }
}

function _distributeImpact(mva, lat, lon, radiusKm) {
  const distances = [];
  let sumInvDist = 0;
  for (let i = 0; i < tsData.substations.length; i++) {
    const sub = tsData.substations[i];
    const km  = haversineKm(lat, lon, sub.lat, sub.lng);
    if (km <= radiusKm && km > 0.01) {
      const invD = 1 / km;
      distances.push({ idx: i, invD });
      sumInvDist += invD;
    }
  }
  if (sumInvDist === 0) return;
  for (const { idx, invD } of distances) {
    dcImpactPerSub[idx] += mva * (invD / sumInvDist);
  }
}

function getDCViability(dc) {
  if (!tsData) return { status: "UNKNOWN", headroom: 0, worstPct: 0, nearby: 0 };

  const totalMVA = dc.capacity * dc.pue;
  const nearby   = [];
  let sumInvDist = 0;

  for (let i = 0; i < tsData.substations.length; i++) {
    const sub = tsData.substations[i];
    const km  = haversineKm(dc.lat, dc.lon, sub.lat, sub.lng);
    if (km <= DC_IMPACT_RADIUS_KM && km > 0.01) {
      const invD = 1 / km;
      nearby.push({ idx: i, invD, km });
      sumInvDist += invD;
    }
  }

  if (nearby.length === 0) return { status: "NO GRID", headroom: 0, worstPct: 0, nearby: 0 };

  let worstPct = 0, totalHeadroom = 0;

  for (const n of nearby) {
    const sub = tsData.substations[n.idx];
    if (sub.peak_mva <= 0) continue;
    const share      = (n.invD / sumInvDist) * totalMVA;
    const currentMVA = (sub.values[tsIndex] ?? 0) + (cascadeSupportReceived[n.idx] ?? 0);
    const withDC     = currentMVA + share;
    const pct        = withDC / sub.peak_mva;
    if (pct > worstPct) worstPct = pct;
    totalHeadroom += Math.max(0, sub.peak_mva - currentMVA);
  }

  const status =
    worstPct > 1.2  ? "OVERLOADED" :
    worstPct > 1.0  ? "STRESSED"   :
    worstPct > 0.85 ? "TIGHT"      : "VIABLE";

  return { status, headroom: totalHeadroom, worstPct: Math.round(worstPct * 100), nearby: nearby.length };
}

// ══════════════════════════════════════════════════════════════════
//  USAGE COLOR — includes cascade received load
// ══════════════════════════════════════════════════════════════════
function getUsageColor(idx, alpha) {
  if (!tsData) return Cesium.Color.TRANSPARENT;
  const sub = tsData.substations[idx];
  if (!sub || sub.peak_mva <= 0) return Cesium.Color.TRANSPARENT;
  const total = (sub.values[tsIndex]        ?? 0)
              + (dcImpactPerSub[idx]         ?? 0)
              + (cascadeSupportReceived[idx] ?? 0);
  return usageToCesiumColor(total / sub.peak_mva, alpha);
}

// ══════════════════════════════════════════════════════════════════
//  LOAD TIME-SERIES
// ══════════════════════════════════════════════════════════════════
async function loadTimeseries() {
  const resp = await fetch("grid_timeseries.json");
  if (!resp.ok) throw new Error("grid_timeseries.json not found");
  tsData = await resp.json();

  dcImpactPerSub         = new Array(tsData.substations.length).fill(0);
  cascadeSupportGiven    = new Array(tsData.substations.length).fill(0);
  cascadeSupportReceived = new Array(tsData.substations.length).fill(0);

  // Build neighbour graph once
  computeNeighbors();

  const start = Cesium.JulianDate.fromIso8601(tsData.timestamps[0]);
  const end   = Cesium.JulianDate.fromIso8601(tsData.timestamps[tsData.timestamps.length - 1]);

  viewer.clock.startTime   = start.clone();
  viewer.clock.stopTime    = end.clone();
  viewer.clock.currentTime = start.clone();
  viewer.clock.clockRange  = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier  = 1800;
  viewer.timeline.zoomTo(start, end);

  const dateEl = document.getElementById("current-date");
  if (dateEl) dateEl.textContent = tsData.day;

  for (let i = 0; i < tsData.substations.length; i++) {
    const sub      = tsData.substations[i];
    const position = Cesium.Cartesian3.fromDegrees(sub.lng, sub.lat);

    const coreEnt = viewer.entities.add({
      position, name: sub.name,
      ellipse: {
        semiMajorAxis: HEATMAP_RADIUS,
        semiMinorAxis: HEATMAP_RADIUS,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => getUsageColor(i, 0.55), false)),
        height: 5,
      },
      properties: { idx: i, type: "heatmap" },
    });

    viewer.entities.add({
      position,
      ellipse: {
        semiMajorAxis: GLOW_RADIUS,
        semiMinorAxis: GLOW_RADIUS,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => getUsageColor(i, 0.18), false)),
        height: 2,
      },
    });

    viewer.entities.add({
      position,
      ellipse: {
        semiMajorAxis: GLOW_RADIUS * 1.8,
        semiMinorAxis: GLOW_RADIUS * 1.8,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => getUsageColor(i, 0.07), false)),
        height: 1,
      },
    });

    heatEntities.push(coreEnt);
  }

  updateStatsPanel();
  startClockTick();
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ══════════════════════════════════════════════════════════════════
//  CLOCK TICK
// ══════════════════════════════════════════════════════════════════
function startClockTick() {
  viewer.clock.onTick.addEventListener(() => {
    if (!tsData) return;
    const iso = Cesium.JulianDate.toIso8601(viewer.clock.currentTime).slice(0, 19);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < tsData.timestamps.length; i++) {
      const d = Math.abs(Date.parse(iso) - Date.parse(tsData.timestamps[i].slice(0, 19)));
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best !== tsIndex) { tsIndex = best; updateTimeDisplay(); }
  });
}

// ── Master update ────────────────────────────────────────────────
function updateTimeDisplay() {
  if (!tsData) return;

  // 1. Recompute cascade for this tick
  computeCascadeSupport();

  // 2. Redraw support lines (stable pool — no blink)
  renderCascadeLines();

  renderWTLines(); 

  // 3. Update cascade metrics panel
  const m  = getCascadeMetrics();
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el("cascade-total",      m.totalSupport.toFixed(1) + " MVA");
  el("cascade-supporting", m.supportingCount);
  el("cascade-overloaded", m.overloadedCount);
  el("cascade-depth",      m.maxDepth);

  // 4. Clock label
  const ts = tsData.timestamps[tsIndex];
  el("current-time", ts ? ts.slice(11, 16) : "--:--");

  // 5. Stats + feeds
  updateStatsPanel();
  if (dataCentres.length > 0)  updateDCFeed();
  if (windTurbines.length > 0) updateWTFeed();
}

function updateStatsPanel() {
  if (!tsData) return;
  let totalPct = 0, maxMVA = 0, count = 0;
  for (let i = 0; i < tsData.substations.length; i++) {
    const sub = tsData.substations[i];
    if (sub.peak_mva <= 0) continue;
    const val = (sub.values[tsIndex]        ?? 0)
              + (dcImpactPerSub[i]           ?? 0)
              + (cascadeSupportReceived[i]   ?? 0);
    totalPct += val / sub.peak_mva;
    if (val > maxMVA) maxMVA = val;
    count++;
  }
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el("st-count", count);
  el("st-avg",   count > 0 ? (totalPct / count * 100).toFixed(1) + "%" : "–");
  el("st-peak",  maxMVA.toFixed(1));
}

// ══════════════════════════════════════════════════════════════════
//  CLICK HANDLER
// ══════════════════════════════════════════════════════════════════
const infoPanel = document.getElementById("info");
const handler   = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

handler.setInputAction((click) => {
  if (placingDC || placingWT) {
    const pos = getGroundPosition(click.position);
    if (!Cesium.defined(pos)) return;
    const carto = Cesium.Cartographic.fromCartesian(pos);
    const lon   = Cesium.Math.toDegrees(carto.longitude);
    const lat   = Cesium.Math.toDegrees(carto.latitude);
    const h     = Math.max(0, carto.height);
    if (placingDC) placeDataCentre(lon, lat, h);
    else           placeWindTurbine(lon, lat, h);
    return;
  }

  const picked = viewer.scene.pick(click.position);
  if (Cesium.defined(picked) && picked.id?.properties) {
    const props = picked.id.properties;
    if (props.type?.getValue() === "heatmap") {
      showSubstationInfo(props.idx.getValue());
      return;
    }
  }
  if (infoPanel) infoPanel.style.display = "none";
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

function showSubstationInfo(idx) {
  if (!tsData || !infoPanel) return;
  const sub      = tsData.substations[idx];
  const baseMVA  = sub.values[tsIndex] ?? 0;
  const dcExtra  = dcImpactPerSub[idx] ?? 0;
  const cascade  = cascadeSupportReceived[idx] ?? 0;
  const totalMVA = baseMVA + dcExtra + cascade;
  const pct      = sub.peak_mva > 0 ? totalMVA / sub.peak_mva : 0;

  infoPanel.style.display = "block";
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el("info-name",  sub.name);
  el("info-mva",   totalMVA.toFixed(2) + " MVA");
  el("info-peak",  sub.peak_mva.toFixed(2) + " MVA");
  el("info-usage", (pct * 100).toFixed(1) + "%");
  el("info-date",  (tsData.timestamps[tsIndex] || "").replace("T", " ").slice(0, 16));

  // Net DC + wind impact line
  const dcEl = document.getElementById("info-dc-impact");
  if (dcEl) {
    if (Math.abs(dcExtra) > 0.01) {
      const sign = dcExtra > 0 ? "+" : "";
      dcEl.textContent   = `${sign}${dcExtra.toFixed(2)} MVA net impact (DCs + wind)`;
      dcEl.style.display = "block";
      dcEl.style.color   = dcExtra > 0 ? "var(--red)" : "var(--green)";
    } else {
      dcEl.style.display = "none";
    }
  }

  // Cascade absorption line
  const csEl = document.getElementById("info-cascade-impact");
  if (csEl) {
    csEl.textContent   = `+${cascade.toFixed(2)} MVA absorbed from cascade`;
    csEl.style.display = cascade > 0.01 ? "block" : "none";
  }

  const bar = document.getElementById("info-bar");
  if (bar) {
    bar.style.width      = Math.min(pct * 100, 100) + "%";
    bar.style.background = usageToHex(pct);
  }
}

function getGroundPosition(sp) {
  if (viewer.scene.pickPositionSupported) {
    const p = viewer.scene.pickPosition(sp);
    if (Cesium.defined(p)) return p;
  }
  const ray = viewer.camera.getPickRay(sp);
  if (!ray) return undefined;
  const gp = viewer.scene.globe.pick(ray, viewer.scene);
  if (Cesium.defined(gp)) return gp;
  return viewer.camera.pickEllipsoid(sp, viewer.scene.globe.ellipsoid);
}

// ══════════════════════════════════════════════════════════════════
//  DATA CENTRE PLACEMENT
// ══════════════════════════════════════════════════════════════════
const DC_SIZES = {
  5:   { w: 150,  d: 100, h: 80,  label: "Edge" },
  15:  { w: 250,  d: 180, h: 120, label: "Small" },
  50:  { w: 400,  d: 300, h: 200, label: "Medium" },
  100: { w: 600,  d: 400, h: 300, label: "Large" },
  250: { w: 900,  d: 600, h: 400, label: "Hyperscale" },
  500: { w: 1300, d: 900, h: 500, label: "Mega Campus" },
};

function placeDataCentre(lon, lat, groundH) {
  const name     = document.getElementById("dc-name").value || `DC-${dcCounter}`;
  const capacity = parseInt(document.getElementById("dc-capacity").value);
  const pue      = parseFloat(document.getElementById("dc-pue").value) || 1.3;
  const cooling  = document.getElementById("dc-cooling").value;
  const sz       = DC_SIZES[capacity] || DC_SIZES[50];

  const dc = { name, capacity, pue, cooling, lon, lat, id: dcCounter };
  dataCentres.push(dc);
  dcCounter++;
  document.getElementById("dc-name").value = `DC-${String(dcCounter).padStart(3, "0")}`;

  recomputeDCImpact();
  computeCascadeSupport();
  renderCascadeLines();
  

  const colour =
    capacity >= 250 ? Cesium.Color.fromCssColorString("#e53935").withAlpha(0.85) :
    capacity >= 100 ? Cesium.Color.fromCssColorString("#fb8c00").withAlpha(0.85) :
                      Cesium.Color.fromCssColorString("#38bdba").withAlpha(0.85);

  viewer.entities.add({
    name,
    position: Cesium.Cartesian3.fromDegrees(lon, lat, groundH + sz.h / 2),
    box: {
      dimensions: new Cesium.Cartesian3(sz.w, sz.d, sz.h),
      material:   new Cesium.ColorMaterialProperty(colour),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
    },
    label: {
      text: `${name}\n${capacity} MW`,
      font: "12px JetBrains Mono",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -sz.h - 10),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    ellipse: {
      semiMajorAxis: Math.max(sz.w, sz.d) * 2,
      semiMinorAxis: Math.max(sz.w, sz.d) * 2,
      material:      colour.withAlpha(0.12),
      outline:       true,
      outlineColor:  colour.withAlpha(0.4),
      height: 1,
    },
  });

  placingDC = false;
  document.getElementById("btn-place").classList.remove("active");
  document.body.style.cursor = "default";

  updateDCFeed();
  updateStatsPanel();

  const viability = getDCViability(dc);
  document.getElementById("place-hint").textContent =
    `${name} → ${viability.status} (${viability.nearby} substations, worst ${viability.worstPct}%)`;
}

function updateDCFeed() {
  const tbody   = document.getElementById("dc-feed");
  const countEl = document.getElementById("dc-count");
  const summEl  = document.getElementById("dc-summary");
  if (!tbody) return;

  if (dataCentres.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim)">No data centres placed</td></tr>';
    if (countEl) countEl.textContent = "0";
    if (summEl)  summEl.textContent  = "Total demand: 0 MW";
    return;
  }

  let totalMW = 0, totalHeadroom = 0, rows = "";
  for (const dc of dataCentres) {
    totalMW += dc.capacity;
    const v = getDCViability(dc);
    totalHeadroom += v.headroom;
    const [badgeClass, badgeText] =
      v.status === "OVERLOADED" ? ["high",   "OVERLOAD"] :
      v.status === "STRESSED"   ? ["high",   "STRESSED"] :
      v.status === "TIGHT"      ? ["medium", "TIGHT"]    :
      v.status === "NO GRID"    ? ["medium", "NO GRID"]  :
                                  ["low",    "VIABLE"];
    rows += `<tr>
      <td>${dc.name}</td>
      <td>${dc.capacity}</td>
      <td>${v.worstPct}%</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
    </tr>`;
  }
  tbody.innerHTML = rows;
  if (countEl) countEl.textContent = dataCentres.length;
  const avgPUE = dataCentres.reduce((s, d) => s + d.pue, 0) / dataCentres.length;
  if (summEl) summEl.textContent =
    `Total: ${totalMW} MW · PUE-adj: ${(totalMW * avgPUE).toFixed(0)} MW · Headroom: ${totalHeadroom.toFixed(0)} MVA`;
}

// ══════════════════════════════════════════════════════════════════
//  WIND TURBINE PLACEMENT
// ══════════════════════════════════════════════════════════════════
function placeWindTurbine(lon, lat, groundH) {
  const name       = document.getElementById("wt-name").value || `WF-${wtCounter}`;
  const perTurbine = parseInt(document.getElementById("wt-capacity").value);
  const count      = parseInt(document.getElementById("wt-count").value) || 1;
  const cf         = parseFloat(document.getElementById("wt-cf").value) || 0.35;
  const capacityMW = perTurbine * count;

  const wt = { name, perTurbine, count, capacityMW, capacityFactor: cf, lon, lat, id: wtCounter };
  windTurbines.push(wt);
  wtCounter++;
  document.getElementById("wt-name").value = `WF-${String(wtCounter).padStart(3, "0")}`;

  recomputeDCImpact();
  computeCascadeSupport();
  renderCascadeLines();
  renderWTLines();  

  const displayCount = Math.min(count, 5);
  const boxH  = 80 + perTurbine * 12;
  const green = Cesium.Color.fromCssColorString("#43a047");

  for (let t = 0; t < displayCount; t++) {
    const offsetLon = lon + (t - Math.floor(displayCount / 2)) * 0.003;
    viewer.entities.add({
      name: `${name}-T${t + 1}`,
      position: Cesium.Cartesian3.fromDegrees(offsetLon, lat, groundH + boxH / 2),
      box: {
        dimensions: new Cesium.Cartesian3(40, 40, boxH),
        material:   green.withAlpha(0.85),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#81c784").withAlpha(0.6),
      },
    });
  }

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, groundH + boxH + 20),
    label: {
      text: `${name}\n${capacityMW} MW · CF ${Math.round(cf * 100)}%`,
      font: "12px JetBrains Mono",
      fillColor: Cesium.Color.fromCssColorString("#81c784"),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    ellipse: {
      semiMajorAxis: 2000,
      semiMinorAxis: 2000,
      material:      green.withAlpha(0.08),
      outline: true,
      outlineColor:  green.withAlpha(0.3),
      height: 1,
    },
  });

  placingWT = false;
  document.getElementById("btn-place-wt")?.classList.remove("active");
  document.body.style.cursor = "default";

  updateWTFeed();
  updateStatsPanel();

  document.getElementById("wt-hint").textContent =
    `${name} placed — ${count} turbine${count > 1 ? "s" : ""}, ${(capacityMW * cf).toFixed(1)} MW effective output`;
}

function updateWTFeed() {
  const tbody   = document.getElementById("wt-feed");
  const countEl = document.getElementById("wt-total-count");
  const summEl  = document.getElementById("wt-summary");
  if (!tbody) return;

  if (windTurbines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim)">No wind farms placed</td></tr>';
    if (countEl) countEl.textContent = "0";
    if (summEl)  summEl.textContent  = "Total output: 0 MW";
    return;
  }

  let totalMW = 0, totalEffective = 0, rows = "";
  for (const wt of windTurbines) {
    totalMW += wt.capacityMW;
    const effective = wt.capacityMW * wt.capacityFactor;
    totalEffective += effective;
    rows += `<tr>
      <td>${wt.name}</td>
      <td>${wt.count}</td>
      <td>${wt.capacityMW}</td>
      <td>${effective.toFixed(1)}</td>
    </tr>`;
  }
  tbody.innerHTML = rows;
  if (countEl) countEl.textContent = windTurbines.length;
  if (summEl) summEl.textContent =
    `Capacity: ${totalMW} MW · Effective: ${totalEffective.toFixed(1)} MW (avg CF ${(totalEffective / totalMW * 100).toFixed(0)}%)`;
}

// ══════════════════════════════════════════════════════════════════
//  UI WIRING
// ══════════════════════════════════════════════════════════════════
document.getElementById("btn-place")?.addEventListener("click", () => {
  placingDC = !placingDC;
  if (placingDC) placingWT = false;
  document.getElementById("btn-place-wt")?.classList.remove("active");
  document.getElementById("btn-place").classList.toggle("active", placingDC);
  document.getElementById("place-hint").textContent = placingDC
    ? "Click the map to place the data centre."
    : "Click 'Place Data Centre' to begin.";
  document.body.style.cursor = placingDC ? "crosshair" : "default";
});

document.getElementById("btn-place-wt")?.addEventListener("click", () => {
  placingWT = !placingWT;
  if (placingWT) placingDC = false;
  document.getElementById("btn-place")?.classList.remove("active");
  document.getElementById("btn-place-wt").classList.toggle("active", placingWT);
  document.getElementById("wt-hint").textContent = placingWT
    ? "Click the map to place the wind farm."
    : "Click 'Place Wind Farm' to begin.";
  document.body.style.cursor = placingWT ? "crosshair" : "default";
});

document.getElementById("btn-clear-dc")?.addEventListener("click", () => {
  dataCentres.length  = 0;
  windTurbines.length = 0;
  dcCounter = 1;
  wtCounter = 1;
  document.getElementById("dc-name").value = "DC-001";
  document.getElementById("wt-name").value = "WF-001";
  dcImpactPerSub = new Array(tsData?.substations.length ?? 0).fill(0);

  // Reset cascade state
  cascadeSupportGiven.fill(0);
  cascadeSupportReceived.fill(0);
  cascadeEdges.length = 0;

  cascadeLinePool.forEach(e => { if (e) e.polyline.show = false; });
  wtLinePool.forEach(e => { if (e) e.polyline.show = false; });     // ← add

  // Remove DC/WT entities only — skip heatmap layer and pool lines
  const heatmapCount = (tsData?.substations.length ?? 0) * 3;
  const all = viewer.entities.values.slice();
  for (let i = heatmapCount; i < all.length; i++) {
    if (!cascadeLinePool.includes(all[i]) && !wtLinePool.includes(all[i])) {  // ← add wtLinePool guard
      viewer.entities.remove(all[i]);
    }
  }

  updateDCFeed();
  updateWTFeed();
  updateStatsPanel();
  document.getElementById("place-hint").textContent = "All placements cleared. Grid impact reset.";
  document.getElementById("wt-hint").textContent    = "All wind farms cleared.";
});

document.getElementById("search")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  for (const ent of heatEntities) {
    ent.show = q === "" || ent.name.toLowerCase().includes(q);
  }
});

const speedBtns = [
  { id: "speed-1x",  mult: 60   },
  { id: "speed-5x",  mult: 300  },
  { id: "speed-30x", mult: 1800 },
  { id: "speed-60x", mult: 3600 },
];
for (const sb of speedBtns) {
  document.getElementById(sb.id)?.addEventListener("click", () => {
    viewer.clock.multiplier = sb.mult;
    for (const s of speedBtns) {
      document.getElementById(s.id)?.classList.toggle("active", s.id === sb.id);
    }
  });
}

document.getElementById("btn-refresh")?.addEventListener("click", () => location.reload());

document.getElementById("btn-report")?.addEventListener("click", async () => {
  const btn  = document.getElementById("btn-report");
  const hint = document.getElementById("report-hint");

  if (dataCentres.length === 0 && windTurbines.length === 0) {
    hint.textContent = "Place at least one data centre or wind farm before generating.";
    return;
  }

  btn.disabled     = true;
  btn.textContent  = "Generating report …";
  hint.textContent = "Computing 7-day backtest, calling Gemini AI …";

  const payload = {
    dataCentres: dataCentres.map(dc => ({
      name: dc.name, capacity: dc.capacity,
      pue: dc.pue, cooling: dc.cooling,
      lat: dc.lat, lon: dc.lon,
    })),
    windTurbines: windTurbines.map(wt => ({
      name: wt.name, perTurbine: wt.perTurbine,
      count: wt.count, capacityMW: wt.capacityMW,
      capacityFactor: wt.capacityFactor,
      lat: wt.lat, lon: wt.lon,
    })),
  };

  // Guard: report generation requires the Flask backend (not available on GitHub Pages)
  const isStaticHost = window.location.hostname.includes("github.io") || window.location.protocol === "file:";
  if (isStaticHost) {
    hint.textContent = "Report generation is not available in the static demo. Run the Flask backend locally for this feature.";
    btn.disabled    = false;
    btn.textContent = "📊 Generate Viability Report";
    return;
  }

  try {
    const resp = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || "Report generation failed");
    }
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `grid-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click(); URL.revokeObjectURL(url);
    hint.textContent = "Report downloaded successfully.";
  } catch (err) {
    console.error("Report error:", err);
    hint.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled    = false;
    btn.textContent = "📊 Generate Viability Report";
  }
});

// ══════════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════════
async function boot() {
  loadBuildings().catch(e => console.warn("Buildings:", e));
  try { await loadTimeseries(); }
  catch (err) { console.error("loadTimeseries failed:", err); }
}

boot();