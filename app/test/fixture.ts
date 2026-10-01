import type { Atlas, Org, System, Milestone, Target, Modality } from "../src/atlas";

const ev = [{ source: "src:x", quote: "quote text", locator: "l", supports: "existence" }];
const reviewed = { evidence: ev, review: "verified" as const, best_tier: 1 as const, topic: "t" };

export function org(id: string, modalities: Modality[] = ["superconducting"], lon = 0, lat = 0): Org {
  return { id, name: id, kind: "company", roles: ["hardware"], country: "US", hq: { lat, lon, precision: "city" }, modalities, evidence: ev };
}
export function sys(id: string, operator: string, lon = 0, lat = 0): System {
  return { ...reviewed, id, name: id, operator, modality: "superconducting", status: "online",
    location: { lat, lon, precision: "city" }, country: "US", location_basis: "hq" };
}
export function ms(id: string, o: string, date: string): Milestone {
  return { ...reviewed, id, orgs: [o], date, category: "other", claim: "c", peer_review: "company_claim" };
}
export function tgt(id: string, o: string, stated_on: string, target_date: string, extra: Partial<Target> = {}): Target {
  return { ...reviewed, id, org: o, statement: `${o} targets x by ${target_date}`, stated_on, target_date, status: "open", ...extra };
}
export function atlas(parts: Partial<Pick<Atlas, "orgs" | "systems" | "milestones" | "targets">>): Atlas {
  return { built_at: "", draft: false, stats: { counts: {}, topics: {} }, gaps: [], sites: [], access: [], relationships: [],
    sources: [{ id: "src:x", title: "t", publisher: "p", url: "https://x", doc_type: "roadmap", tier: 2, document_date: "2026-01-01", accessed: "2026-01-01" }],
    orgs: parts.orgs ?? [], systems: parts.systems ?? [], milestones: parts.milestones ?? [], targets: parts.targets ?? [] };
}
