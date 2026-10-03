// Display rules for Run today and Track record. These functions decide what the UI is allowed to say.
// They read published fields. They do not recompute track-record rates.

import type { AccessRoute, Index, ProblemClass, ProgramModel, TrackCounts, UseCase } from "./atlas";
import { timeOf } from "./atlas";

export type ProblemPick = ProblemClass | "all";

export const PROBLEM_PICKS: { id: ProblemPick; label: string }[] = [
  { id: "optimization", label: "Optimization" },
  { id: "chemistry", label: "Chemistry" },
  { id: "physics_simulation", label: "Physics simulation" },
  { id: "machine_learning", label: "Machine learning" },
  { id: "sampling", label: "Sampling" },
  { id: "all", label: "Just show me" },
];

export const PROBLEM_LABEL: Record<ProblemClass, string> = {
  optimization: "Optimization",
  chemistry: "Chemistry",
  physics_simulation: "Physics simulation",
  machine_learning: "Machine learning",
  sampling: "Sampling",
  linear_algebra: "Linear algebra",
  other: "Other",
};

export const PROGRAM_LABEL: Record<ProgramModel, string> = {
  gate_circuit: "Gate circuit",
  annealing_qubo: "Annealing / QUBO",
  analog_hamiltonian: "Analog Hamiltonian",
  photonic_circuit: "Photonic circuit",
  pulse: "Pulse",
};

export const METRIC_KIND_LABEL: Record<string, string> = {
  physical_qubits: "Physical qubits",
  logical_qubits: "Logical qubits",
  fidelity: "Fidelity",
  error_rate: "Error rate",
  system_availability: "System availability",
  product_launch: "Product launch",
  customer_access: "Customer access",
  error_correction_demo: "Error-correction demonstration",
  other: "Other",
};

export const OUTCOME_WORD: Record<string, string> = {
  met_on_time: "Met on time",
  met_early: "Met early",
  met_late: "Met late",
  partially_met: "Partially met",
  revised_before_due: "Revised before due",
  acknowledged_missed: "Acknowledged missed",
  no_delivery_found: "No delivery found",
  pending: "Pending",
};

/** Collapse scraped markup so a pricing quote can be read. Digits are left as published. */
export function plainQuote(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

export interface AvailInput {
  stale?: boolean;
  status?: string;
  as_of?: string;
  tier?: string;
}

/**
 * Column text for an availability cell.
 * A stale row is "last confirmed <date>" and does not contain the word "available".
 */
export function availabilityLabel(a: AvailInput | undefined): string {
  if (a?.stale) return `last confirmed ${a.as_of ?? ""}`.trim();
  if (!a?.status) return "Not recorded";
  if (a.status === "unavailable" || a.status === "unknown") return "Not available";
  if (a.status === "limited" || a.tier === "application" || a.tier === "restricted") return "By application";
  if (a.tier === "open_free") return "Free tier";
  if (a.status === "available") return "Self-serve";
  return "Not available";
}

export interface SimCheck {
  status?: string;
  ran_at?: string;
  sdk_version?: string;
}

export interface TestedBadge {
  /** True only when sim_check.status is exactly "passed". */
  tested: boolean;
  text: string;
}

/**
 * "Tested here" only when sim_check.status is "passed".
 * The date and SDK version come from that same object. Every other status is "Not tested".
 */
export function testedHereBadge(sim: SimCheck | null | undefined): TestedBadge {
  if (sim?.status !== "passed") return { tested: false, text: "Not tested" };
  const when = sim.ran_at ? sim.ran_at.slice(0, 10) : "";
  const sdk = sim.sdk_version ?? "";
  const detail = [when, sdk].filter(Boolean).join(", ");
  return { tested: true, text: detail ? `Tested here · ${detail}` : "Tested here" };
}

const EMPTY_COUNTS: TrackCounts = {
  n: 0, show_rates: false, on_time_or_early: 0, late: 0, partial: 0, revised_before_due: 0,
  acknowledged_missed: 0, no_delivery_found: 0, items: [],
};

/** The counts already attached to a future target, else the company's published track_record. */
export function countsFor(idx: Index, orgId: string, attached?: TrackCounts): TrackCounts {
  return attached ?? idx.atlas.track_record?.companies[orgId] ?? EMPTY_COUNTS;
}

export interface RateView {
  showRates: boolean;
  sentence: string;
}

/**
 * Hide every rate when the build set show_rates to false or when n < 3.
 * The sentence is a count, never a trust score or a percentage.
 */
export function rateSummary(rec: TrackCounts | undefined): RateView {
  const row = rec ?? EMPTY_COUNTS;
  if (!row.show_rates || row.n < 3) {
    return { showRates: false, sentence: "Not enough resolved history to summarise." };
  }
  const parts = [
    `${row.on_time_or_early} on time or early`,
    `${row.late} late`,
    `${row.partial} partial`,
    `${row.revised_before_due} revised before due`,
    `${row.acknowledged_missed} acknowledged missed`,
    `${row.no_delivery_found} no delivery found`,
  ];
  return { showRates: true, sentence: `Past roadmap items, n = ${row.n}: ${parts.join(", ")}.` };
}

export function outcomeWord(result: string): string {
  return OUTCOME_WORD[result] ?? result;
}

/** A route matches a problem class when a published use case ties that class to the platform or the hardware organisation. */
export function routeMatchesProblem(route: Pick<AccessRoute, "platform" | "target_org">, problem: ProblemPick, useCases: Pick<UseCase, "problem_class" | "platform">[]): boolean {
  if (problem === "all") return true;
  return useCases.some((u) => u.problem_class === problem && (u.platform === route.platform || u.platform === route.target_org));
}

export function relatedUseCases(idx: Index, route: Pick<AccessRoute, "platform" | "target_org" | "id">): UseCase[] {
  return (idx.atlas.use_cases ?? []).filter((u) => u.platform === route.platform || u.platform === route.target_org || u.example && idx.example.get(u.example)?.routes.includes(route.id));
}

export interface HonestyItem {
  id: string;
  kind: "milestone" | "quote" | "outcome";
  text: string;
  peer?: string;
  sourceId?: string;
}

/** Advantage wording. Bare "advantage" is omitted so a product name is not treated as a claim. */
const ADVANTAGE = /\b(quantum advantage|supremacy|beyond[- ]classical|speed-?ups?|better than classical)\b/i;

/**
 * Sourced lines for "Will this beat my laptop?": milestone claims, quoted advantage wording, and outcome quotes.
 * Returns an empty list when none of those exist.
 */
export function honestyItems(idx: Index, scope: { systemId?: string; orgIds: string[]; problem?: ProblemPick; includeMilestones?: boolean }): HonestyItem[] {
  const orgs = new Set(scope.orgIds.filter(Boolean));
  const items: HonestyItem[] = [];
  const seen = new Set<string>();
  const push = (item: HonestyItem) => { if (!seen.has(item.id)) { seen.add(item.id); items.push(item); } };

  for (const m of idx.atlas.milestones) {
    const onSystem = !!scope.systemId && !!m.systems?.includes(scope.systemId);
    const onOrg = !scope.systemId && m.orgs.some((o) => orgs.has(o));
    const quoted = m.evidence.some((e) => ADVANTAGE.test(e.quote));
    if (!onSystem && !onOrg && !(quoted && m.orgs.some((o) => orgs.has(o)))) continue;
    if (scope.includeMilestones !== false && (onSystem || onOrg) && (m.category === "computational_task" || quoted)) {
      push({ id: m.id, kind: "milestone", text: m.claim, peer: m.peer_review });
    }
    for (const [i, e] of m.evidence.entries()) {
      if (ADVANTAGE.test(e.quote)) push({ id: `${m.id}#${i}`, kind: "quote", text: e.quote, sourceId: e.source, peer: m.peer_review });
    }
  }

  const cases = (idx.atlas.use_cases ?? []).filter((u) => {
    if (scope.problem && scope.problem !== "all" && u.problem_class !== scope.problem) return false;
    return orgs.has(u.platform);
  });
  for (const u of cases) {
    if (u.outcome_quote) push({ id: `${u.id}#outcome`, kind: "outcome", text: u.outcome_quote });
    for (const [i, e] of u.evidence.entries()) {
      if (ADVANTAGE.test(e.quote) || (u.outcome_quote && e.quote.includes(u.outcome_quote))) {
        push({ id: `${u.id}#${i}`, kind: "quote", text: e.quote, sourceId: e.source });
      }
    }
  }
  return items;
}

export const NO_ADVANTAGE = "No source cited here claims an advantage over classical methods for this problem class.";

export function limitsText(limits: AccessRoute["limits"]): string {
  if (!limits) return "—";
  const parts: string[] = [];
  if (limits.max_qubits) parts.push(`${limits.max_qubits.value.toLocaleString()} qubits`);
  if (limits.max_shots) parts.push(`${limits.max_shots.value.toLocaleString()} shots`);
  if (limits.notes) parts.push(limits.notes);
  return parts.join(" · ") || "—";
}

export function programText(models: ProgramModel[] | undefined): string {
  return models?.length ? models.map((m) => PROGRAM_LABEL[m] ?? m).join(", ") : "—";
}

/** Primary example for a machine page: a route-linked example, else the route snippet, else a platform use-case example. */
export function primaryExample(idx: Index, route: AccessRoute) {
  const linked = (idx.atlas.examples ?? []).find((e) => e.routes.includes(route.id));
  if (linked) return { kind: "example" as const, example: linked, sim: linked.sim_check, code: linked.code, sdk: linked.sdk, source_url: linked.source_url, harness_path: linked.harness_path, title: linked.title };
  if (route.snippet) {
    const sn = route.snippet;
    return { kind: "snippet" as const, example: undefined, sim: sn.sim_check, code: sn.code, sdk: sn.sdk, source_url: sn.source_url, harness_path: undefined as string | undefined, title: "Official example" };
  }
  const uc = relatedUseCases(idx, route).find((u) => u.example && idx.example.has(u.example));
  const ex = uc?.example ? idx.example.get(uc.example) : undefined;
  if (ex) return { kind: "example" as const, example: ex, sim: ex.sim_check, code: ex.code, sdk: ex.sdk, source_url: ex.source_url, harness_path: ex.harness_path, title: ex.title };
  return null;
}

export interface SlipPoint {
  id: string;
  org: string;
  target: string;
  promised: string;
  actual: string;
  result: string;
  label: string;
  next?: string;
}

/** Promised date versus actual or, when unresolved, the atlas build date. Not a rate. */
export function slipPoints(idx: Index): SlipPoint[] {
  const today = idx.atlas.built_at.slice(0, 10);
  const out: SlipPoint[] = [];
  for (const o of idx.atlas.outcomes ?? []) {
    const t = idx.target.get(o.target);
    if (!t) continue;
    const promised = t.due?.by ?? t.target_date;
    if (!promised) continue;
    const actual = o.resolved_on ?? (o.result === "no_delivery_found" ? o.search_log?.as_of : undefined) ?? (o.result === "pending" ? today : undefined);
    if (!actual) continue;
    const next = t.superseded_by && idx.target.has(t.superseded_by) ? t.superseded_by : undefined;
    out.push({ id: o.id, org: t.org, target: t.id, promised, actual, result: o.result, label: t.statement, next });
  }
  return out;
}

export function dateNum(d: string): number {
  return timeOf(d, false);
}
