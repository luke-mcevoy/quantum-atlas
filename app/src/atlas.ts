// Types for data/build/atlas.json (the output of scripts/build.mjs) plus the in-memory indexes the UI runs on.

export type Modality = "superconducting" | "trapped_ion" | "neutral_atom" | "photonic" | "spin_silicon"
  | "topological" | "quantum_annealing" | "nv_other";
export const MODALITIES: Modality[] = ["superconducting", "trapped_ion", "neutral_atom", "photonic", "spin_silicon",
  "topological", "quantum_annealing", "nv_other"];

export type Review = "verified" | "flagged" | "unverified";
export type PeerReview = "peer_reviewed" | "preprint" | "company_claim";

export interface Source {
  id: string; title: string; publisher: string; url: string; doc_type: string; tier: 1 | 2 | 3;
  document_date: string; accessed: string; identifier?: string; doi?: string; arxiv?: string; archived_url?: string;
}
export interface Evidence { source: string; quote: string; locator: string; supports: string }
export interface GeoPoint { lat: number; lon: number; precision: string; address?: string }
interface Reviewed { review: Review; review_note?: string; best_tier: 1 | 2 | 3; evidence: Evidence[]; topic: string }

export interface Org {
  id: string; name: string; kind: "company" | "research_institution" | "government"; roles: string[];
  country: string; hq: GeoPoint; modalities: Modality[]; tickers?: string[]; sec_cik?: string; parent?: string;
  website?: string; evidence: Evidence[];
}
export interface Site extends Reviewed {
  id: string; name: string; operator: string; kind: string; location: GeoPoint; country: string; status: string;
}
export interface Figure { value: number; as_of: string; note?: string; evidence: Evidence[] }
export interface Metric { name: string; value: number; unit: string; definition: string; as_of: string; evidence: Evidence[] }
export interface System extends Reviewed {
  id: string; name: string; operator: string; modality: Modality; submodality?: string;
  status: "online" | "announced" | "retired"; site?: string; announced?: string; online_since?: string; retired?: string;
  physical_qubits?: Figure; logical_qubits?: Figure & { code: string }; metrics?: Metric[];
  location: GeoPoint; country: string; location_basis: "site" | "hq";
}
export interface Milestone extends Reviewed {
  id: string; orgs: string[]; systems?: string[]; date: string; category: string; claim: string;
  peer_review: PeerReview; doi?: string; arxiv?: string;
}
export interface Target extends Reviewed {
  id: string; org: string; system?: string; system_name?: string; target_date: string; statement: string;
  stated_on: string; status: "open" | "met" | "missed" | "revised" | "withdrawn"; superseded_by?: string; met_by?: string;
  roadmap_doc?: string;
  metric_kind?: "physical_qubits" | "logical_qubits" | "fidelity" | "error_rate" | "system_availability"
    | "product_launch" | "customer_access" | "error_correction_demo" | "other";
  target_value?: Figure;
  due?: { by: string; precision: "year" | "half" | "quarter" | "month" | "day" };
  /** Counts already computed by the build. The UI does not recompute them. */
  track_record?: TrackCounts;
}
export interface Snippet {
  code: string; source_url: string; language: string; sdk: string;
  sim_check: { status: "passed" | "failed" | "not_run"; simulator?: string; substitution?: string; sdk_version?: string;
    python_version?: string; ran_at?: string; output_excerpt?: string; notes?: string };
}
export type ProgramModel = "gate_circuit" | "annealing_qubo" | "analog_hamiltonian" | "photonic_circuit" | "pulse";
export type ProblemClass = "optimization" | "chemistry" | "physics_simulation" | "machine_learning" | "sampling" | "linear_algebra" | "other";
export type AvailabilityStatus = "available" | "limited" | "unavailable" | "unknown";

export interface AccessRoute extends Reviewed {
  id: string; system?: string; system_hint?: string; target_org: string; platform: string; platform_name: string;
  route: string; sdks: string[]; auth_model: string; tier: "open_free" | "paid" | "application" | "restricted";
  tier_note?: string; docs_url: string; snippet?: Snippet;
  program_models?: ProgramModel[];
  availability?: { status: AvailabilityStatus; as_of: string; windows?: string; stale?: boolean };
  pricing?: { quote: string; unit?: string; source: string };
  limits?: { max_qubits?: Figure; max_shots?: Figure; notes?: string };
  to_hardware?: { code_or_step: string; source_url: string };
}
export interface UseCase extends Reviewed {
  id: string; problem_class: ProblemClass; title: string; program_model?: ProgramModel; platform: string;
  sdk?: string; kind: "official_tutorial" | "customer_case_study" | "peer_reviewed_application";
  customer?: string; statement: string; outcome_quote?: string; example?: string;
}
export interface Example extends Reviewed {
  id: string; title: string; program_model: ProgramModel; sdk: string; source_url: string; code: string;
  harness_path: string; substitution?: string; sim_check: Snippet["sim_check"]; routes: string[];
}
export interface RoadmapDocument extends Reviewed {
  id: string; org: string; title: string; published: string;
  kind: "roadmap_page" | "blog" | "investor_presentation" | "sec_exhibit" | "keynote" | "press_release" | "paper";
  url: string; archived_url?: string; completeness: "all_items" | "partial"; items: string[];
}
export interface Outcome extends Reviewed {
  id: string; target: string;
  result: "met_on_time" | "met_early" | "met_late" | "partially_met" | "revised_before_due"
    | "acknowledged_missed" | "no_delivery_found" | "pending";
  resolved_on?: string; delivered_value?: Figure; delivered_by?: string; slip_months?: number;
  search_log?: { checked: string[]; queries: string[]; as_of: string };
  statement: string;
}
export interface Projection extends Reviewed {
  id: string; org: string; roadmap_doc: string;
  metric: "revenue" | "bookings" | "gross_margin" | "ebitda" | "customers" | "qubits" | "other";
  period: string; projected: Figure; actual?: Figure;
}
export interface ClaimRevision extends Reviewed {
  id: string; subject: string; kind: "retraction" | "correction" | "expression_of_concern" | "published_rebuttal";
  date: string; statement: string;
}
/** Descriptive counts from the build. Never a score. */
export interface TrackCounts {
  n: number; show_rates: boolean;
  on_time_or_early: number; late: number; partial: number; revised_before_due: number;
  acknowledged_missed: number; no_delivery_found: number; pending?: number; items: string[];
}
export interface Relationship extends Reviewed {
  id: string; from: string; to: string; kind: string; date: string; program?: string;
  amount?: { value: number; currency: string; note?: string }; description: string; status?: string;
}
export interface Gap { topic: string; why: string; would_need: string }

export interface Atlas {
  built_at: string; draft: boolean;
  stats: { counts: Record<string, number>; topics: Record<string, string> };
  sources: Source[]; orgs: Org[]; sites: Site[]; systems: System[]; milestones: Milestone[]; targets: Target[];
  access: AccessRoute[]; relationships: Relationship[]; gaps: Gap[];
  use_cases?: UseCase[]; examples?: Example[]; roadmap_docs?: RoadmapDocument[]; outcomes?: Outcome[];
  projections?: Projection[]; claim_revisions?: ClaimRevision[];
  track_record?: { companies: Record<string, TrackCounts>; industry?: TrackCounts };
}

export interface Index {
  atlas: Atlas;
  source: Map<string, Source>;
  org: Map<string, Org>;
  site: Map<string, Site>;
  system: Map<string, System>;
  milestone: Map<string, Milestone>;
  target: Map<string, Target>;
  access: Map<string, AccessRoute>;
  rel: Map<string, Relationship>;
  useCase: Map<string, UseCase>;
  example: Map<string, Example>;
  roadmapDoc: Map<string, RoadmapDocument>;
  outcome: Map<string, Outcome>;
  projection: Map<string, Projection>;
  claimRevision: Map<string, ClaimRevision>;
  outcomeByTarget: Map<string, Outcome>;
  systemsByOrg: Map<string, System[]>;
  sitesByOrg: Map<string, Site[]>;
  msByOrg: Map<string, Milestone[]>;
  msBySystem: Map<string, Milestone[]>;
  tgtByOrg: Map<string, Target[]>;
  accessBySystem: Map<string, AccessRoute[]>;
  accessByOrg: Map<string, AccessRoute[]>; // by target_org and by platform
  relsByOrg: Map<string, Relationship[]>;
  /** Display position per system: systems sharing a location are fanned out around it so each stays clickable. */
  pos: Map<string, [number, number]>;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };

export function buildIndex(atlas: Atlas): Index {
  const idx: Index = {
    atlas,
    source: new Map(atlas.sources.map((s) => [s.id, s])),
    org: new Map(atlas.orgs.map((o) => [o.id, o])),
    site: new Map(atlas.sites.map((s) => [s.id, s])),
    system: new Map(atlas.systems.map((s) => [s.id, s])),
    milestone: new Map(atlas.milestones.map((m) => [m.id, m])),
    target: new Map(atlas.targets.map((t) => [t.id, t])),
    access: new Map(atlas.access.map((a) => [a.id, a])),
    rel: new Map(atlas.relationships.map((r) => [r.id, r])),
    useCase: new Map((atlas.use_cases ?? []).map((u) => [u.id, u])),
    example: new Map((atlas.examples ?? []).map((e) => [e.id, e])),
    roadmapDoc: new Map((atlas.roadmap_docs ?? []).map((d) => [d.id, d])),
    outcome: new Map((atlas.outcomes ?? []).map((o) => [o.id, o])),
    projection: new Map((atlas.projections ?? []).map((p) => [p.id, p])),
    claimRevision: new Map((atlas.claim_revisions ?? []).map((c) => [c.id, c])),
    outcomeByTarget: new Map((atlas.outcomes ?? []).map((o) => [o.target, o])),
    systemsByOrg: new Map(), sitesByOrg: new Map(), msByOrg: new Map(), msBySystem: new Map(), tgtByOrg: new Map(),
    accessBySystem: new Map(), accessByOrg: new Map(), relsByOrg: new Map(), pos: new Map(),
  };
  for (const s of atlas.systems) push(idx.systemsByOrg, s.operator, s);
  for (const s of atlas.sites) push(idx.sitesByOrg, s.operator, s);
  for (const m of atlas.milestones) {
    for (const o of m.orgs) push(idx.msByOrg, o, m);
    for (const s of m.systems ?? []) push(idx.msBySystem, s, m);
  }
  for (const t of atlas.targets) push(idx.tgtByOrg, t.org, t);
  for (const a of atlas.access) {
    if (a.system) push(idx.accessBySystem, a.system, a);
    push(idx.accessByOrg, a.target_org, a);
    if (a.platform !== a.target_org) push(idx.accessByOrg, a.platform, a);
  }
  for (const r of atlas.relationships) { push(idx.relsByOrg, r.from, r); if (r.to !== r.from) push(idx.relsByOrg, r.to, r); }

  // Fan out co-located systems on a small circle so stacked dots stay distinct and clickable.
  const groups = new Map<string, System[]>();
  for (const s of atlas.systems) push(groups, `${s.location.lon.toFixed(2)},${s.location.lat.toFixed(2)}`, s);
  for (const g of groups.values()) {
    g.sort((a, b) => a.id.localeCompare(b.id));
    g.forEach((s, i) => {
      if (g.length === 1) { idx.pos.set(s.id, [s.location.lon, s.location.lat]); return; }
      const ang = (2 * Math.PI * i) / g.length, r = 0.3 + 0.07 * g.length;
      const k = Math.max(0.3, Math.cos((s.location.lat * Math.PI) / 180));
      idx.pos.set(s.id, [s.location.lon + (r * Math.cos(ang)) / k, s.location.lat + r * Math.sin(ang)]);
    });
  }
  return idx;
}

export function nodeName(idx: Index, id: string): string {
  return idx.org.get(id)?.name ?? idx.system.get(id)?.name ?? idx.site.get(id)?.name
    ?? idx.useCase.get(id)?.title ?? idx.example.get(id)?.title ?? idx.roadmapDoc.get(id)?.title ?? id;
}

/** Where to draw an org, site or system ([lon, lat]). */
export function locateAny(idx: Index, id: string): [number, number] | undefined {
  const p = idx.pos.get(id);
  if (p) return p;
  const g = idx.site.get(id)?.location ?? idx.org.get(id)?.hq;
  return g ? [g.lon, g.lat] : undefined;
}

/** Parse "2029", "2026-12" or "2026-12-09" to a UTC timestamp. With end=true a bare year is the END of that year
 *  ("by 2029") and a year-month the end of that month; with end=false, the start. */
export function timeOf(d: string, end = true): number {
  if (/^\d{4}$/.test(d)) return end ? Date.UTC(+d, 11, 31) : Date.UTC(+d, 0, 1);
  if (/^\d{4}-\d{2}$/.test(d)) { const [y, m] = d.split("-").map(Number); return end ? Date.UTC(y, m, 0) : Date.UTC(y, m - 1, 1); }
  return Date.parse(d);
}

/** Primary modality of an org (its first documented one), else of its first system. */
export function orgModality(idx: Index, id: string): Modality | undefined {
  return idx.org.get(id)?.modalities?.[0] ?? idx.systemsByOrg.get(id)?.[0]?.modality;
}

/**
 * The roadmap view at time t. Achievements and targets are kept in separate lists by construction:
 * `achieved` only ever contains Milestones dated on or before t; `pending` only ever contains Targets stated by t,
 * not yet superseded by t, and due on or after t. A met target is never shown as an achievement: it stays a target,
 * linked to the milestone that met it.
 */
export function roadmapState(idx: Index, t: number) {
  const achieved = idx.atlas.milestones.filter((m) => timeOf(m.date, false) <= t);
  const supersededBy = (x: Target) => (x.superseded_by ? idx.target.get(x.superseded_by) : undefined);
  const live = (x: Target) => timeOf(x.stated_on, false) <= t && !(supersededBy(x) && timeOf(supersededBy(x)!.stated_on, false) <= t);
  const pending = idx.atlas.targets.filter((x) => live(x) && timeOf(x.target_date) >= t);
  const lapsed = idx.atlas.targets.filter((x) => live(x) && timeOf(x.target_date) < t);
  return { achieved, pending, lapsed };
}

/** Every version of a target, oldest first (superseded_by chain through `t`). */
export function targetChain(idx: Index, t: Target): Target[] {
  const back = new Map<string, Target>();
  for (const x of idx.atlas.targets) if (x.superseded_by) back.set(x.superseded_by, x);
  let first = t;
  const seen = new Set([t.id]);
  while (back.has(first.id) && !seen.has(back.get(first.id)!.id)) { first = back.get(first.id)!; seen.add(first.id); }
  const chain = [first];
  let cur = first;
  while (cur.superseded_by && idx.target.has(cur.superseded_by) && chain.length < 20) { cur = idx.target.get(cur.superseded_by)!; chain.push(cur); }
  return chain;
}

export function formatMoney(a?: { value: number; currency: string }) {
  if (!a) return "—";
  const v = Math.abs(a.value);
  const s = v >= 1e9 ? `${+(a.value / 1e9).toFixed(2)}B` : v >= 1e6 ? `${+(a.value / 1e6).toFixed(1)}M` : a.value.toLocaleString();
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return `${sym[a.currency] ?? a.currency + " "}${s}`;
}

/** Entity lookup by id across every published collection. */
export function entityOf(idx: Index, id: string) {
  return idx.system.get(id) ?? idx.milestone.get(id) ?? idx.target.get(id) ?? idx.access.get(id) ?? idx.rel.get(id)
    ?? idx.site.get(id) ?? idx.org.get(id) ?? idx.useCase.get(id) ?? idx.example.get(id)
    ?? idx.roadmapDoc.get(id) ?? idx.outcome.get(id) ?? idx.projection.get(id) ?? idx.claimRevision.get(id);
}

/** Every evidence item on an entity, including nested (qubit counts, metrics). */
export function allEvidence(e: { evidence: Evidence[]; physical_qubits?: Figure; logical_qubits?: Figure; metrics?: Metric[] }): Evidence[] {
  return [...e.evidence, ...(e.physical_qubits?.evidence ?? []), ...(e.logical_qubits?.evidence ?? []), ...(e.metrics ?? []).flatMap((m) => m.evidence)];
}
