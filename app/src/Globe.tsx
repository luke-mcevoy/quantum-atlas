import { useEffect, useMemo, useRef, useState } from "react";
import DeckGL, { type DeckGLRef } from "@deck.gl/react";
import { _GlobeView as GlobeView, LinearInterpolator, COORDINATE_SYSTEM, type PickingInfo, type GlobeViewState } from "@deck.gl/core";
import { GeoJsonLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry } from "@luma.gl/engine";
import { PathStyleExtension, type PathStyleExtensionProps } from "@deck.gl/extensions";
import type { Feature, Geometry } from "geojson";
import { type Index, type System, locateAny, orgModality, roadmapState, timeOf } from "./atlas";
import { arcPath, graticule, offsetEast, type World } from "./geo";
import { C, MODALITY_COLOR, REL_COLOR, ROUTE_COLOR } from "./theme";
import { useStore } from "./store";
import { useStoryFocus } from "./ui/Story";

type RGB = [number, number, number];
type RGBA = [number, number, number, number];
const rgba = (c: RGB, a: number): RGBA => [c[0], c[1], c[2], Math.round(a)];

const isTouch = typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches;
const VIEW = new GlobeView({ id: "globe", resolution: 5 });
const fitZoom = () => 1.05 + Math.log2((0.4 * Math.min(window.innerWidth, window.innerHeight - 90)) / 170);
const INITIAL = { longitude: -40, latitude: 38, zoom: fitZoom(), minZoom: 0.4, maxZoom: 9, bearing: 0 };
const OCEAN_MESH = new SphereGeometry({ radius: 6.36e6, nlat: 48, nlong: 96 });
const GRATICULE = graticule(20);
/** One-tap camera presets: [label, lon, lat, zoom]. */
const REGIONS: [string, number, number, number][] = [
  ["Atlantic", -40, 38, 1.6], ["N. America", -95, 40, 2.5], ["Europe", 8, 50, 2.8], ["East Asia", 125, 33, 2.5],
];
const DASH = new PathStyleExtension({ dash: true, highPrecisionDash: true });

/** Short name for a map label. The inspector still shows the full legal name. */
function mapName(name: string): string {
  const cut = name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/,?\s+\b(Inc\.?|Incorporated|Corporation|Corp\.?|Ltd\.?|Limited|GmbH|LLC|S\.A\.|SAS)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const short = cut
    .replace(/\s+(Quantum Technologies|Quantum Computers|Quantum Computing Technology|Quantum Computing|Quantum Inc\.?)$/i, "")
    .trim();
  const out = short.length >= 3 ? short : cut || name;
  return out.length > 26 ? `${out.slice(0, 24).trimEnd()}…` : out;
}

interface ArcDatum { id: string; path: [number, number, number][]; ts: number[]; color: RGB; dashed: boolean }

const pathCache = new Map<string, { path: [number, number, number][]; ts: number[] }>();
function arcFor(id: string, a: [number, number], b: [number, number], lift: number) {
  const key = `${id}|${a}|${b}`;
  let hit = pathCache.get(key);
  if (!hit) {
    const path = arcPath(a, b, lift);
    const phase = hashPhase(id);
    hit = { path, ts: path.map((_, i) => phase + (i / (path.length - 1)) * 1.6) };
    pathCache.set(key, hit);
  }
  return hit;
}
function hashPhase(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000 * 1.4;
}
const same = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05;

/** System marker radius (px): grows with log2 of the stated physical qubit count. */
export const sysRadius = (s: System) => 3.5 + (s.physical_qubits ? Math.min(7, Math.log2(Math.max(2, s.physical_qubits.value)) * 0.7) : 0);

export default function Globe({ idx, world }: { idx: Index; world: World }) {
  const s = useStore();
  const deckRef = useRef<DeckGLRef>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<Record<string, unknown>>(INITIAL);
  const [time, setTime] = useState(0);
  const idleSpin = useRef(true);
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  /** True from pointer-down through the coast, so deck's pan cannot rewrite the camera. */
  const turning = useRef(false);
  const vel = useRef<[number, number]>([0, 0]);
  const radiusPx = useRef(300);
  const touches = useRef(new Set<number>());
  const stopSpin = () => { idleSpin.current = false; };
  const zoomBy = (dz: number) => {
    stopSpin();
    setViewState((v) => ({ ...v, zoom: Math.max(0.4, Math.min(9, (v.zoom as number) + dz)),
      transitionDuration: 300, transitionInterpolator: new LinearInterpolator(["zoom"]) }));
  };

  // ── animation clock (pulses + idle rotation) ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((now / 1000) % 3.2);
      if (idleSpin.current) setViewState((v) => ({ ...v, bearing: 0, longitude: ((v.longitude as number) + dt * 2.2 + 540) % 360 - 180, transitionDuration: 0 }));
      else if (!drag.current && (Math.abs(vel.current[0]) > 0.02 || Math.abs(vel.current[1]) > 0.02)) {
        const [vx, vy] = vel.current;
        vel.current = [vx * 0.9, vy * 0.9];
        if (Math.abs(vel.current[0]) <= 0.02 && Math.abs(vel.current[1]) <= 0.02) turning.current = false;
        setViewState((v) => rotate(v, vx, vy));
      } else if (!drag.current) turning.current = false;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── fly-to requests from anywhere in the UI ──
  useEffect(() => {
    if (!s.flyTo) return;
    idleSpin.current = false;
    setViewState((v) => {
      const cur = v.longitude as number;
      let lon = s.flyTo!.lon;
      while (lon - cur > 180) lon -= 360;
      while (lon - cur < -180) lon += 360;
      return { ...v, bearing: 0, longitude: lon, latitude: s.flyTo!.lat, zoom: s.flyTo!.zoom ?? Math.max(v.zoom as number, 2.2),
        transitionDuration: 1400, transitionInterpolator: new LinearInterpolator(["longitude", "latitude", "zoom"]) };
    });
  }, [s.flyTo]);

  // ── bring a deep-linked entity into view once ──
  const firstSel = useRef(true);
  useEffect(() => {
    const id = s.selected;
    if (!id || !firstSel.current) return;
    firstSel.current = false;
    const anchor = idx.milestone.get(id)?.orgs[0] ?? idx.target.get(id)?.org ?? idx.access.get(id)?.system ?? idx.access.get(id)?.target_org ?? idx.rel.get(id)?.to ?? id;
    const p = locateAny(idx, anchor);
    if (p) s.focus(p[0], p[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.selected]);

  const storyFocus = useStoryFocus(idx);
  const focus = storyFocus;
  useEffect(() => {
    if (!storyFocus) return;
    const pts = [...storyFocus.frame].map((n) => locateAny(idx, n)).filter(Boolean) as [number, number][];
    if (!pts.length) return;
    const near = (a: [number, number], b: [number, number]) => angularDist(a[0], a[1], b[0], b[1]) < 35;
    const seed = pts.reduce((best, p) => (pts.filter((q) => near(p, q)).length > pts.filter((q) => near(best, q)).length ? p : best), pts[0]);
    const cluster = pts.filter((q) => near(seed, q));
    const r = Math.PI / 180;
    let x = 0, y = 0, z = 0;
    for (const [lo, la] of cluster) { x += Math.cos(la * r) * Math.cos(lo * r); y += Math.cos(la * r) * Math.sin(lo * r); z += Math.sin(la * r); }
    const lon = Math.atan2(y, x) / r, lat = Math.atan2(z, Math.hypot(x, y)) / r;
    const spread = Math.max(...cluster.map(([lo, la]) => angularDist(lo, la, lon, lat)));
    const zoom = spread < 4 ? 3.4 : spread < 15 ? 2.7 : spread < 35 ? 2.0 : 1.5;
    const small = window.innerWidth < 700;
    const zf = small ? zoom - 0.4 : zoom;
    s.focus(lon, small ? Math.max(-70, lat - 22 / 2 ** (zf - 1.5)) : lat, zf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyFocus]);
  const inFocus = (id: string) => !focus || focus.nodes.has(id);

  // ── filters ──
  const sysVisible = (y: System) => s.modalities.has(y.modality)
    && (s.showFlagged || y.review === "verified")
    && (s.showAnnounced || y.status !== "announced")
    && (s.showRetired || y.status !== "retired");
  const systems = useMemo(() => idx.atlas.systems.filter(sysVisible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx, s.modalities, s.showFlagged, s.showAnnounced, s.showRetired]);
  const hwOrgs = useMemo(() => idx.atlas.orgs.filter((o) => o.roles.includes("hardware")
    && (o.modalities.length === 0 || o.modalities.some((m) => s.modalities.has(m)))), [idx, s.modalities]);

  // Relationship arcs (modality view).
  const relArcs: ArcDatum[] = useMemo(() => {
    if (!s.showRelationships) return [];
    const out: ArcDatum[] = [];
    for (const r of idx.atlas.relationships) {
      if (!s.showFlagged && r.review !== "verified") continue;
      const a = locateAny(idx, r.from), b = locateAny(idx, r.to);
      if (!a || !b || same(a, b)) continue;
      out.push({ id: r.id, ...arcFor(r.id, a, b, 0.28), color: REL_COLOR[r.kind] ?? C.muted, dashed: r.kind === "partnership" });
    }
    return out;
  }, [idx, s.showRelationships, s.showFlagged]);

  // Access arcs: platform → machine.
  const accessArcs: ArcDatum[] = useMemo(() => {
    const out: ArcDatum[] = [];
    for (const a of idx.atlas.access) {
      if (!s.accessTiers.has(a.tier) || (!s.showFlagged && a.review !== "verified")) continue;
      const sys = a.system ? idx.system.get(a.system) : undefined;
      if (sys && !s.modalities.has(sys.modality)) continue;
      const from = locateAny(idx, a.platform), to = locateAny(idx, a.system ?? a.target_org);
      if (!from || !to || same(from, to)) continue;
      out.push({ id: a.id, ...arcFor(a.id, from, to, 0.24), color: ROUTE_COLOR[a.route] ?? C.muted, dashed: a.tier === "application" || a.tier === "restricted" });
    }
    return out;
  }, [idx, s.accessTiers, s.showFlagged, s.modalities]);
  // Vendor clouds serving a machine drawn at the vendor's own HQ have no second endpoint: draw rings instead.
  const accessRings = useMemo(() => {
    const m = new Map<string, { id: string; pos: [number, number]; n: number; route: string }>();
    for (const a of idx.atlas.access) {
      if (!s.accessTiers.has(a.tier)) continue;
      const from = locateAny(idx, a.platform), to = locateAny(idx, a.system ?? a.target_org);
      if (!from || !to || !same(from, to)) continue;
      const k = a.system ?? a.target_org;
      const r = m.get(k) ?? { id: a.id, pos: to, n: 0, route: a.route };
      r.n++; m.set(k, r);
    }
    return [...m.values()];
  }, [idx, s.accessTiers]);
  const platforms = useMemo(() => [...new Set(idx.atlas.access.map((a) => a.platform))]
    .map((id) => ({ id, pos: locateAny(idx, id)! })).filter((d) => d.pos), [idx]);
  const accessSystems = useMemo(() => {
    const ids = new Set(idx.atlas.access.filter((a) => s.accessTiers.has(a.tier)).map((a) => a.system).filter(Boolean) as string[]);
    return systems.filter((y) => ids.has(y.id));
  }, [idx, systems, s.accessTiers]);

  // Roadmap: per-org achieved and pending at the scrubbed date.
  const road = useMemo(() => {
    const st = roadmapState(idx, s.roadmapDate);
    const per = new Map<string, { id: string; pos: [number, number]; done: number; recent: number; pending: number; mod: RGB }>();
    const row = (id: string) => {
      let r = per.get(id);
      if (!r) {
        const pos = locateAny(idx, id);
        const m = orgModality(idx, id);
        if (!pos) return undefined;
        r = { id, pos, done: 0, recent: 0, pending: 0, mod: m ? MODALITY_COLOR[m] : C.muted };
        per.set(id, r);
      }
      return r;
    };
    for (const m of st.achieved) for (const o of m.orgs) {
      const r = row(o); if (!r) continue;
      r.done++;
      if (s.roadmapDate - timeOf(m.date, false) < 182 * 864e5) r.recent++;
    }
    for (const t of st.pending) { const r = row(t.org); if (r) r.pending++; }
    const rows = [...per.values()].filter((r) => { const m = orgModality(idx, r.id); return !m || s.modalities.has(m); });
    return { achieved: rows.filter((r) => r.done > 0), pending: rows.filter((r) => r.pending > 0), recent: rows.filter((r) => r.recent > 0) };
  }, [idx, s.roadmapDate, s.modalities]);

  const mode = s.mode;
  const dim = (on: boolean, a: number) => (on ? a : a * 0.14);
  const hoverId = s.hover?.id;

  const onHover = (info: PickingInfo) => {
    const o = info.object as { id?: string } | undefined;
    if (!o?.id) { if (s.hover) s.set({ hover: null }); return; }
    if (s.hover?.id !== o.id || Math.abs(s.hover.x - info.x) > 2 || Math.abs(s.hover.y - info.y) > 2)
      s.set({ hover: { id: o.id, kind: info.layer?.id ?? "", x: info.x, y: info.y } });
  };
  const onClick = (info: PickingInfo) => {
    idleSpin.current = false;
    const o = info.object as { id?: string } | undefined;
    if (!o?.id) { s.select(null); return; }
    s.select(o.id);
  };

  // Stable data arrays (deck.gl diffs by reference; rebuilding per frame cost the sister app 121→31 fps).
  const countryData = useMemo(() => world.countries.map((c) => ({ ...c.feature })) as unknown as Feature<Geometry>[], [world]);
  const sysHalo = useMemo(() => systems.filter((y) => y.id === s.selected || y.id === hoverId), [systems, s.selected, hoverId]);
  const orgsWithoutSystems = useMemo(() => hwOrgs.filter((o) => !systems.some((y) => y.operator === o.id)), [hwOrgs, systems]);
  const zoomTier = (viewState.zoom as number) < 1.6 ? 1 : (viewState.zoom as number) < 2.4 ? 2 : (viewState.zoom as number) < 3.4 ? 3 : 4;

  // HTML label overlay: org names at HQ by default; system names once zoomed in (and always for the selection).
  const overlay = useMemo(() => {
    type L = { id: string; text: string; full: string; lon: number; lat: number; dx: number; strong: boolean; rank: number };
    const out: L[] = [];
    const add = (id: string, text: string, p: [number, number] | undefined, dx: number, rank: number) => {
      if (p) out.push({ id, text: mapName(text), full: text, lon: p[0], lat: p[1], dx, strong: id === s.selected, rank: id === s.selected ? 1e9 : id === hoverId ? 1e8 : rank });
    };
    if (mode === "modality" || mode === "track") {
      const byOrg = new Map<string, number>();
      for (const y of systems) byOrg.set(y.operator, Math.max(byOrg.get(y.operator) ?? 0, y.physical_qubits?.value ?? 1));
      for (const [o, q] of byOrg) if (!focus || focus.nodes.has(o) || systems.some((y) => y.operator === o && focus.nodes.has(y.id))) add(o, idx.org.get(o)?.name ?? o, locateAny(idx, o), 10, 1000 + Math.log2(q + 1));
      if (zoomTier >= 3 || focus) for (const y of systems) if (!focus || focus.nodes.has(y.id)) add(y.id, y.name, idx.pos.get(y.id), sysRadius(y) + 5, Math.log2((y.physical_qubits?.value ?? 1) + 1));
      if (s.selected && idx.system.has(s.selected) && !out.some((l) => l.id === s.selected)) add(s.selected, idx.system.get(s.selected)!.name, idx.pos.get(s.selected), 10, 1e9);
    } else if (mode === "access" || mode === "today") {
      for (const p of platforms) add(p.id, idx.org.get(p.id)?.name ?? p.id, p.pos, 12, 2000 + (idx.accessByOrg.get(p.id)?.length ?? 0));
      if (zoomTier >= 3) for (const y of accessSystems) add(y.id, y.name, idx.pos.get(y.id), sysRadius(y) + 5, 10);
    } else {
      for (const r of [...road.achieved, ...road.pending]) if (!out.some((l) => l.id === r.id)) add(r.id, idx.org.get(r.id)?.name ?? r.id, r.pos, 12, r.done + r.pending);
    }
    return out.sort((a, b) => b.rank - a.rank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, systems, platforms, accessSystems, road, s.selected, hoverId, zoomTier, focus, idx]);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const labelsRef = useRef<HTMLDivElement>(null);

  const base = [
    new SimpleMeshLayer({
      id: "ocean", data: [0], mesh: OCEAN_MESH, coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: [0, 0, 0], getColor: rgba(C.ocean, 255),
      material: { ambient: 1, diffuse: 0, shininess: 0, specularColor: [0, 0, 0] },
    }),
    new PathLayer({ id: "graticule", data: GRATICULE, getPath: (d: [number, number][]) => d, getColor: rgba(C.graticule, 150), widthMinPixels: 0.6, widthUnits: "pixels", getWidth: 0.6 }),
    new GeoJsonLayer<unknown>({ id: "countries", data: countryData, filled: true, stroked: false, pickable: false, getFillColor: rgba(C.land, 255) }),
    new PathLayer({ id: "borders", data: world.borders.coordinates, getPath: (d: number[][]) => d as [number, number][], getColor: rgba(C.border, 255), getWidth: 0.7, widthUnits: "pixels" }),
    new PathLayer({ id: "coast", data: world.coastline.coordinates, getPath: (d: number[][]) => d as [number, number][], getColor: rgba([62, 78, 96], 255), getWidth: 0.9, widthUnits: "pixels" }),
  ];

  const systemLayers = (data: System[], id: string) => [
    new ScatterplotLayer<System>({
      id: `${id}-halo`, data: sysHalo, getPosition: (y) => [...idx.pos.get(y.id)!, 12_000] as [number, number, number],
      getRadius: (y) => sysRadius(y) + 7, radiusUnits: "pixels", getFillColor: (y) => rgba(MODALITY_COLOR[y.modality], 50),
      getLineColor: rgba(C.text, 230), stroked: true, lineWidthUnits: "pixels", getLineWidth: 1.2,
    }),
    new ScatterplotLayer<System>({
      id, data, pickable: true,
      getPosition: (y) => [...idx.pos.get(y.id)!, 10_000] as [number, number, number],
      getRadius: sysRadius, radiusUnits: "pixels", radiusMinPixels: 3,
      // Announced machines are drawn hollow; machines drawn at HQ (site undocumented) are fainter.
      filled: true,
      getFillColor: (y) => rgba(MODALITY_COLOR[y.modality], dim(inFocus(y.id), y.status === "announced" ? 40 : y.status === "retired" ? 90 : y.location_basis === "hq" ? 170 : 245)),
      stroked: true, lineWidthUnits: "pixels",
      getLineWidth: (y) => (y.status === "announced" ? 1.6 : y.review === "verified" ? 0.8 : 1.4),
      getLineColor: (y) => (y.status === "announced" ? rgba(MODALITY_COLOR[y.modality], dim(inFocus(y.id), 255)) : y.review === "verified" ? rgba([10, 12, 16], 200) : rgba(C.warn, dim(inFocus(y.id), 230))),
      updateTriggers: { getFillColor: [focus], getLineColor: [focus] },
      onHover, onClick,
    }),
  ];

  const layers = [
    ...base,
    // ─── MODALITY ───
    ...(mode === "modality" || mode === "track" ? [
      new PathLayer<ArcDatum, PathStyleExtensionProps<ArcDatum>>({
        id: "rel-arcs", data: relArcs, pickable: true, getPath: (d) => d.path,
        getColor: (d) => rgba(d.color, d.id === s.selected ? 255 : dim(!focus || focus.rels.has(d.id), 120)),
        getWidth: (d) => (d.id === s.selected ? 3 : 1.3), widthUnits: "pixels",
        getDashArray: (d) => (d.dashed ? [5, 4] : [0, 0]), dashJustified: true, extensions: [DASH],
        updateTriggers: { getColor: [s.selected, focus], getWidth: [s.selected] }, onHover, onClick,
      }),
      new ScatterplotLayer({
        id: "org-hq", data: orgsWithoutSystems, pickable: true,
        getPosition: (o: { hq: { lon: number; lat: number } }) => [o.hq.lon, o.hq.lat, 9_000],
        getRadius: 4, radiusUnits: "pixels", filled: false, stroked: true, lineWidthUnits: "pixels", getLineWidth: 1.2,
        getLineColor: (o: { id: string; modalities: string[] }) => rgba(MODALITY_COLOR[o.modalities[0] as keyof typeof MODALITY_COLOR] ?? C.muted, dim(inFocus(o.id), 200)),
        updateTriggers: { getLineColor: [focus] }, onHover, onClick,
      }),
      ...systemLayers(systems, "systems"),
    ] : []),

    // ─── ROADMAP ───
    ...(mode === "roadmap" ? [
      new ScatterplotLayer<(typeof road.recent)[number]>({
        id: "road-recent", data: road.recent, getPosition: (d) => [d.pos[0], d.pos[1], 8_000],
        getRadius: (d) => 9 + 4 * Math.sqrt(d.done) + 6 * ((time % 1.6) / 1.6), radiusUnits: "pixels",
        filled: false, stroked: true, lineWidthUnits: "pixels", getLineWidth: 1.5,
        getLineColor: (d) => rgba(d.mod, 200 * (1 - (time % 1.6) / 1.6)), updateTriggers: { getRadius: [time], getLineColor: [time] },
      }),
      // Targets: hollow, light-grey dashed-looking rings. Never filled, never in modality colour: a target is not an achievement.
      new ScatterplotLayer<(typeof road.pending)[number]>({
        id: "road-targets", data: road.pending, pickable: true, getPosition: (d) => [d.pos[0], d.pos[1], 9_000],
        getRadius: (d) => 8 + 4 * Math.sqrt(d.done) + 3 * Math.sqrt(d.pending), radiusUnits: "pixels",
        filled: false, stroked: true, lineWidthUnits: "pixels", getLineWidth: 1.4,
        getLineColor: (d) => rgba(C.target, dim(inFocus(d.id), 210)), updateTriggers: { getLineColor: [focus] }, onHover, onClick,
      }),
      // Achievements: filled discs in the org's modality colour, area ∝ milestones achieved by the scrubbed date.
      new ScatterplotLayer<(typeof road.achieved)[number]>({
        id: "road-achieved", data: road.achieved, pickable: true, getPosition: (d) => [d.pos[0], d.pos[1], 10_000],
        getRadius: (d) => 4 + 4 * Math.sqrt(d.done), radiusUnits: "pixels",
        getFillColor: (d) => rgba(d.mod, dim(inFocus(d.id), 235)), stroked: true, getLineColor: [10, 12, 16, 220], lineWidthUnits: "pixels", getLineWidth: 1,
        updateTriggers: { getFillColor: [focus] }, onHover, onClick,
      }),
    ] : []),

    // ─── ACCESS ───
    ...(mode === "access" || mode === "today" ? [
      new PathLayer<ArcDatum, PathStyleExtensionProps<ArcDatum>>({
        id: "access-arcs", data: accessArcs, pickable: true, getPath: (d) => d.path,
        getColor: (d) => rgba(d.color, d.id === s.selected ? 255 : s.selected && s.selected.startsWith("acc:") ? 60 : dim(!focus || focus.access.has(d.id), 150)),
        getWidth: (d) => (d.id === s.selected ? 3 : 1.4), widthUnits: "pixels",
        getDashArray: (d) => (d.dashed ? [5, 4] : [0, 0]), dashJustified: true, extensions: [DASH],
        updateTriggers: { getColor: [s.selected, focus], getWidth: [s.selected] }, onHover, onClick,
      }),
      new TripsLayer<ArcDatum>({
        id: "access-pulses", data: accessArcs, getPath: (d) => d.path, getTimestamps: (d) => d.ts,
        getColor: (d) => [Math.min(255, d.color[0] + 40), Math.min(255, d.color[1] + 40), Math.min(255, d.color[2] + 40)],
        getWidth: 2.2, widthUnits: "pixels", trailLength: 0.35, currentTime: time, fadeTrail: true, capRounded: true,
      }),
      new ScatterplotLayer<(typeof accessRings)[number]>({
        id: "access-rings", data: accessRings, pickable: true, getPosition: (d) => [d.pos[0], d.pos[1], 9_000],
        getRadius: 11, radiusUnits: "pixels", filled: false, stroked: true, lineWidthUnits: "pixels", getLineWidth: 1.3,
        getLineColor: (d) => rgba(ROUTE_COLOR[d.route] ?? C.gold, 190), onHover, onClick,
      }),
      ...systemLayers(accessSystems, "access-systems"),
      new ScatterplotLayer<(typeof platforms)[number]>({
        id: "platforms", data: platforms, pickable: true, getPosition: (d) => [d.pos[0], d.pos[1], 12_000],
        getRadius: 7, radiusUnits: "pixels", getFillColor: [16, 20, 26, 240], stroked: true,
        getLineColor: rgba(C.gold, 255), lineWidthUnits: "pixels", getLineWidth: 2.4, onHover, onClick,
      }),
    ] : []),
  ];

  // Drag tracking lives on window while a drag is active: it keeps working when the pointer crosses a panel,
  // and a drag may start anywhere on the globe, including on a site label. A label click counts only if
  // the pointer barely moved (dragMoved < 6px), so dragging past a label never selects it.
  const dragMoved = useRef(0);
  const win = useMemo(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || touches.current.size > 1) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      dragMoved.current += Math.abs(dx) + Math.abs(dy);
      const degPerPx = 180 / Math.PI / Math.max(60, radiusPx.current);
      const dLon = -dx * degPerPx, dLat = dy * degPerPx;
      const now = performance.now(), dt = Math.max(1, now - d.t);
      vel.current = [dLon * 16 / dt, dLat * 16 / dt];
      drag.current = { x: e.clientX, y: e.clientY, t: now };
      setViewState((v) => rotate(v, dLon, dLat));
    };
    const up = (e: PointerEvent) => {
      touches.current.delete(e.pointerId);
      if (drag.current && performance.now() - drag.current.t > 80) vel.current = [0, 0]; // paused before release: no fling
      drag.current = null;
      if (touches.current.size === 0) {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (Math.abs(vel.current[0]) <= 0.02 && Math.abs(vel.current[1]) <= 0.02) turning.current = false;
      }
    };
    return { move, up };
  }, []);
  useEffect(() => () => {
    window.removeEventListener("pointermove", win.move);
    window.removeEventListener("pointerup", win.up);
    window.removeEventListener("pointercancel", win.up);
  }, [win]);
  const onPointerDown = (e: React.PointerEvent) => {
    stopSpin();
    // Real controls keep their own behaviour; site labels do not block a drag.
    if ((e.target as HTMLElement).closest("button:not(.glabel), a, input, select, textarea")) return;
    // North stays up. Deck's globe pan rolls the camera (bearing), which tips the poles,
    // so this handler owns the turn and deck is not allowed to write it back.
    turning.current = true;
    setViewState((v) => ({ ...v, bearing: 0, transitionDuration: 0 }));
    touches.current.add(e.pointerId);
    window.addEventListener("pointermove", win.move);
    window.addEventListener("pointerup", win.up);
    window.addEventListener("pointercancel", win.up);
    if (touches.current.size > 1) { drag.current = null; return; } // two fingers: let pinch-zoom work
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    dragMoved.current = 0;
    vel.current = [0, 0];
  };

  const onAfterRender = () => {
    const vp = deckRef.current?.deck?.getViewports()[0];
    const box = labelsRef.current;
    if (vp && box) {
      const lon0 = viewState.longitude as number, lat0 = viewState.latitude as number;
      const els = box.children as HTMLCollectionOf<HTMLElement>;
      // Greedy de-overlap in priority order (selection, hover, then rank); colliding labels are hidden.
      const placed: [number, number, number, number][] = [];
      const rail = document.querySelector(".rail, .mode-panel")?.getBoundingClientRect();
      const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
      const pad = 5;
      overlayRef.current.forEach((l, i) => {
        const el = els[i];
        if (!el) return;
        const hide = () => { el.style.opacity = "0"; el.style.pointerEvents = "none"; };
        const d = angularDist(l.lon, l.lat, lon0, lat0);
        if (d > 80) return hide();
        const [px, py] = vp.project([l.lon, l.lat, 40_000]);
        const x = px + l.dx;
        const w = el.offsetWidth || 80;
        const h = el.offsetHeight || 17;
        const b: [number, number, number, number] = [x - pad, py - h / 2 - pad, x + w + pad, py + h / 2 + pad];
        const hitsRail = !!rail && b[0] < rail.right && b[2] > rail.left && b[1] < rail.bottom && b[3] > rail.top;
        const hitsTop = !!topbar && b[1] < topbar.bottom;
        if (!l.strong && (hitsRail || hitsTop || placed.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]))) return hide();
        placed.push(b);
        el.style.transform = `translate(${x}px, ${py}px) translateY(-50%)`;
        el.style.opacity = d > 70 ? String((80 - d) / 10) : "1";
        el.style.pointerEvents = "auto";
      });
    }
    const el = haloRef.current;
    if (!vp || !el) return;
    const lon = viewState.longitude as number, lat = viewState.latitude as number;
    const c = vp.project([lon, lat, 0]);
    const e = vp.project([...offsetEast(lon, lat, 89.5), 0]);
    const r = Math.hypot(e[0] - c[0], e[1] - c[1]);
    el.style.setProperty("--r", `${r}px`);
    radiusPx.current = r;
    el.dataset.view = `${lon.toFixed(2)},${lat.toFixed(2)},${Number(viewState.bearing ?? 0).toFixed(2)}`;
    el.style.setProperty("--cx", `${c[0]}px`);
    el.style.setProperty("--cy", `${c[1]}px`);
  };

  return (
    <div className="globe-wrap" onPointerDown={onPointerDown} onWheel={stopSpin}>
      <div className="halo" ref={haloRef} />
      {(mode === "access" || mode === "today") && idx.atlas.access.length === 0 && (
        <div className="empty-banner">No verified access routes yet. A route is drawn only after the platform’s own documentation has been checked.</div>
      )}
      <div className="labels" ref={labelsRef} aria-hidden="true">
        {overlay.map((l) => (
          <button key={l.id} className={`glabel${l.strong ? " strong" : ""}${l.id.startsWith("sys:") ? " sys" : ""}`} tabIndex={-1} title={l.full}
            onClick={() => { if (dragMoved.current > 6) return; stopSpin(); s.select(l.id); }} onPointerEnter={() => s.set({ hover: null })}>{l.text}</button>
        ))}
      </div>
      <div className="camera" role="group" aria-label="Camera">
        <div className="cam-regions">
          {REGIONS.map(([label, lon, lat, zoom]) => (
            <button key={label} onClick={() => s.focus(lon, lat, window.innerWidth < 700 ? zoom - 0.5 : zoom)} title={`Fly to ${label}`}>{label}</button>
          ))}
        </div>
        <div className="cam-zoom">
          <button aria-label="Zoom in" onClick={() => zoomBy(0.6)}>+</button>
          <button aria-label="Zoom out" onClick={() => zoomBy(-0.6)}>−</button>
          <button aria-label="Reset view" title="Reset view" onClick={() => { stopSpin(); setViewState((v) => ({ ...v, ...INITIAL, transitionDuration: 900, transitionInterpolator: new LinearInterpolator(["longitude", "latitude", "zoom"]) })); }}>⟲</button>
        </div>
      </div>
      <DeckGL
        ref={deckRef}
        views={VIEW}
        viewState={viewState as unknown as GlobeViewState}
        controller={{ dragPan: false, dragRotate: false, inertia: false, scrollZoom: { speed: 0.012, smooth: false },
          touchZoom: true, touchRotate: false, doubleClickZoom: true, keyboard: true }}
        pickingRadius={isTouch ? 14 : 6}
        onViewStateChange={({ viewState: v, interactionState }) => {
          if (interactionState?.isDragging || interactionState?.isZooming || interactionState?.isPanning) idleSpin.current = false;
          const deckTurn = !!(interactionState?.isDragging || interactionState?.isPanning || interactionState?.isRotating);
          // Pan start/end still fire with dragPan off, and they carry a rolled bearing.
          // Keep longitude, latitude, and north-up; zoom is the part deck may change.
          if (deckTurn || turning.current) {
            const zoom = (v as { zoom?: number }).zoom;
            setViewState((cur) => ({
              ...cur,
              bearing: 0,
              transitionDuration: 0,
              ...(typeof zoom === "number" && interactionState?.isZooming ? { zoom } : {}),
            }));
            return;
          }
          setViewState({ ...(v as Record<string, unknown>), bearing: 0 });
        }}
        layers={layers}
        onAfterRender={onAfterRender}
        getCursor={({ isHovering, isDragging }) => (isDragging ? "grabbing" : isHovering ? "pointer" : "grab")}
        onClick={(info) => { if (!info.object) onClick(info); }}
        useDevicePixels={isTouch ? 1.5 : Math.min(2, window.devicePixelRatio)}
      />
    </div>
  );
}

/**
 * North-up turn. Horizontal drag spins about the polar axis; vertical drag
 * changes latitude. Longitude is scaled by 1/cos(lat) so the point at the
 * middle of the screen keeps up with the pointer. Bearing stays 0: a rolled
 * camera tips the meridians.
 */
function rotate(v: Record<string, unknown>, dLon: number, dLat: number) {
  const lat = v.latitude as number;
  const cos = Math.max(0.2, Math.cos(lat * Math.PI / 180));
  return { ...v, bearing: 0, transitionDuration: 0,
    longitude: (((v.longitude as number) + dLon / cos + 540) % 360) - 180,
    latitude: Math.max(-80, Math.min(80, lat + dLat)) };
}

/** Great-circle angle between two lon/lat points, degrees. */
export function angularDist(lon1: number, lat1: number, lon2: number, lat2: number) {
  const r = Math.PI / 180;
  const c = Math.sin(lat1 * r) * Math.sin(lat2 * r) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon1 - lon2) * r);
  return Math.acos(Math.max(-1, Math.min(1, c))) / r;
}
