#!/usr/bin/env node
// Merge data/research/*.json + data/verification/*.json → data/build/atlas.json (+ app/public/atlas.json).
//
// Publication policy (same as the sister AI Supply Chain Atlas):
//   - an entity is published only if its topic's verification file gives it "publish" or "publish_flagged";
//   - counsel's corrections are applied (a null value deletes the field);
//   - evidence items whose check failed are dropped, including nested evidence (qubit counts, metrics);
//     a nested figure left with no evidence is deleted, an entity left with no evidence is withheld;
//   - prose that breaks the hype-term rule after corrections is withheld (never published);
//   - a milestone's peer-review status is re-derived from its SURVIVING evidence (never upgraded);
//   - `--draft` publishes unverified topics too, each entity marked review:"unverified" (local dev only).
//
// Locations: a system is drawn at its site only when counsel published that site and the system's own
// record points to it; otherwise at its operator's headquarters, and `location_basis` says so.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hypeProblems, impliedPeerReview } from "./lib/rules.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRAFT = process.argv.includes("--draft");
const PASS = new Set(["verified", "verified_with_correction"]);
const readDir = (d) => (existsSync(d) ? readdirSync(d).filter((n) => n.endsWith(".json")).sort() : []);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const research = Object.fromEntries(readDir(join(ROOT, "data/research")).map((n) => [n.replace(".json", ""), readJson(join(ROOT, "data/research", n))]));
const verification = Object.fromEntries(readDir(join(ROOT, "data/verification")).map((n) => [n.replace(".json", ""), readJson(join(ROOT, "data/verification", n))]));

function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) { if (o[k] == null) o[k] = /^\d+$/.test(k) ? [] : {}; o = o[k]; }
  const last = keys.at(-1);
  if (value === null) { if (Array.isArray(o) && /^\d+$/.test(last)) o[+last] = undefined; else delete o[last]; }
  else o[last] = value;
}

const KINDS = ["sites", "systems", "milestones", "targets", "access", "relationships"];
const sources = new Map();
const orgs = new Map();
const pub = Object.fromEntries(KINDS.map((k) => [k, new Map()]));
const gaps = [];
const stats = { topics: {}, withheld: 0, droppedEvidence: 0, hypeWithheld: [], peerReviewDowngraded: [], nestedDropped: 0 };

for (const [topic, file] of Object.entries(research)) {
  const v = verification[topic];
  if (!v && !DRAFT) { stats.topics[topic] = "skipped (not yet verified)"; continue; }
  const verdicts = new Map((v?.entity_verdicts ?? []).map((e) => [e.entity, e]));
  const failed = new Set((v?.evidence_checks ?? []).filter((c) => !PASS.has(c.verdict))
    .map((c) => `${c.entity}|${c.path ?? ""}|${c.evidence_index}`));
  const srcTier = new Map((v?.source_checks ?? []).map((s) => [s.source, s.tier_assigned]));
  for (const s of file.sources ?? []) if (!sources.has(s.id)) sources.set(s.id, { ...s, tier: srcTier.get(s.id) ?? s.tier, topic });

  const keep = (id, path, list) => {
    const out = (list ?? []).filter((_, i) => !failed.has(`${id}|${path}|${i}`));
    stats.droppedEvidence += (list?.length ?? 0) - out.length;
    return out;
  };

  let published = 0;
  const admit = (e) => {
    const verdict = verdicts.get(e.id);
    let review;
    if (v) {
      if (!verdict || verdict.verdict === "reject") { stats.withheld++; return null; }
      review = verdict.verdict === "publish" ? "verified" : "flagged";
    } else review = "unverified";
    const out = structuredClone(e);
    for (const [path, val] of Object.entries(verdict?.corrections ?? {})) setPath(out, path, val);
    out.evidence = keep(e.id, "", out.evidence);
    for (const k of ["physical_qubits", "logical_qubits"]) if (out[k]) {
      out[k].evidence = keep(e.id, k, out[k].evidence);
      if (!out[k].evidence.length) { delete out[k]; stats.nestedDropped++; }
    }
    if (out.metrics) {
      out.metrics = out.metrics.map((m, i) => (m ? { ...m, evidence: keep(e.id, `metrics.${i}`, m.evidence) } : m))
        .filter((m) => { const ok = m && m.evidence.length; if (!ok) stats.nestedDropped++; return ok; });
    }
    if (out.snippet && failed.has(`${e.id}|snippet|0`)) { delete out.snippet; stats.nestedDropped++; }
    if (v && out.evidence.length === 0) { stats.withheld++; return null; }
    out.review = review;
    if (verdict?.reasons) out.review_note = verdict.reasons;
    const allEv = [...out.evidence, ...(out.physical_qubits?.evidence ?? []), ...(out.logical_qubits?.evidence ?? []), ...(out.metrics ?? []).flatMap((m) => m.evidence)];
    out.best_tier = Math.min(...allEv.map((ev) => sources.get(ev.source)?.tier ?? 3));
    out.topic = topic;
    // Language rule, re-checked after corrections.
    const prose = out.claim ?? out.statement ?? (out.id.startsWith("rel:") ? out.description : undefined);
    if (prose !== undefined) {
      const probs = hypeProblems(prose, allEv.map((x) => x.quote));
      if (probs.length) { stats.hypeWithheld.push(`${out.id}: ${probs[0]}`); stats.withheld++; return null; }
    }
    // Peer-review status follows the surviving evidence.
    if (out.id.startsWith("ms:")) {
      const implied = impliedPeerReview(out.evidence.map((x) => sources.get(x.source)?.doc_type));
      const rank = { company_claim: 0, preprint: 1, peer_reviewed: 2 };
      if (rank[implied] < rank[out.peer_review]) { stats.peerReviewDowngraded.push(`${out.id}: ${out.peer_review}→${implied}`); out.peer_review = implied; }
    }
    published++;
    return out;
  };

  for (const o of file.orgs ?? []) {
    const verdict = verdicts.get(o.id);
    if (v && verdict?.verdict === "reject") continue;
    const c = structuredClone(o);
    for (const [path, val] of Object.entries(verdict?.corrections ?? {})) setPath(c, path, val);
    const ev = keep(o.id, "", c.evidence);
    const prev = orgs.get(o.id);
    if (prev) {
      prev.evidence.push(...ev);
      prev.modalities = [...new Set([...prev.modalities, ...(c.modalities ?? [])])];
      prev.roles = [...new Set([...prev.roles, ...(c.roles ?? [])])];
      for (const k of ["tickers", "sec_cik", "parent", "website"]) prev[k] ??= c[k];
    } else orgs.set(o.id, { ...c, evidence: ev, modalities: [...(c.modalities ?? [])], roles: [...(c.roles ?? [])] });
  }
  // The same id researched in two topics: keep the first copy's fields plus the union of surviving evidence.
  const put = (map, o) => {
    const prev = map.get(o.id);
    if (!prev) { map.set(o.id, o); return; }
    prev.evidence.push(...o.evidence);
    prev.best_tier = Math.min(prev.best_tier, o.best_tier);
    if (o.review === "verified") prev.review = "verified";
  };
  for (const k of KINDS) for (const e of file[k] ?? []) { const o = admit(e); if (o) put(pub[k], o); }
  for (const g of file.gaps ?? []) gaps.push({ ...g, topic });
  stats.topics[topic] = `${published} published (${v ? "verified" : "DRAFT"})`;
}

// Orgs with no surviving evidence are withheld; everything pointing at them goes too.
for (const [id, o] of orgs) if (!o.evidence.length) orgs.delete(id);

// ── Referential cleanup ──
const { sites, systems, milestones, targets, access, relationships } = pub;
const dropIf = (map, bad) => { for (const [id, e] of map) if (bad(e)) { map.delete(id); stats.withheld++; } };
dropIf(sites, (s) => !orgs.has(s.operator));
dropIf(systems, (y) => !orgs.has(y.operator));
for (const y of systems.values()) {
  const site = y.site && sites.get(y.site);
  if (y.site && !site) delete y.site;
  y.location = site ? site.location : orgs.get(y.operator).hq;
  y.country = site ? site.country : orgs.get(y.operator).country;
  y.location_basis = site ? "site" : "hq";
}
for (const m of milestones.values()) {
  m.orgs = m.orgs.filter((o) => orgs.has(o));
  m.systems = (m.systems ?? []).filter((s) => systems.has(s));
}
dropIf(milestones, (m) => !m.orgs.length);
dropIf(targets, (t) => !orgs.has(t.org));
for (const t of targets.values()) {
  if (t.system && !systems.has(t.system)) delete t.system;
  if (t.superseded_by && !targets.has(t.superseded_by)) delete t.superseded_by;
  if (t.met_by && !milestones.has(t.met_by)) delete t.met_by;
}
const byName = new Map();
for (const y of systems.values()) byName.set(`${y.operator}|${y.name.toLowerCase()}`, y.id);
let hintsResolved = 0;
dropIf(access, (a) => !orgs.has(a.platform) || !orgs.has(a.target_org));
for (const a of access.values()) {
  if (a.system && !systems.has(a.system)) { a.system_hint ??= a.system; delete a.system; }
  if (!a.system && a.system_hint) {
    const hit = systems.has(a.system_hint) ? a.system_hint : byName.get(`${a.target_org}|${a.system_hint.toLowerCase()}`);
    if (hit) { a.system = hit; hintsResolved++; }
  }
}
dropIf(relationships, (r) => !orgs.has(r.from) || !orgs.has(r.to));

// Publish only the sources that back something published.
const cited = new Set();
const evOf = (e) => [...(e.evidence ?? []), ...(e.physical_qubits?.evidence ?? []), ...(e.logical_qubits?.evidence ?? []), ...(e.metrics ?? []).flatMap((m) => m.evidence)];
for (const coll of [orgs, ...Object.values(pub)]) for (const e of coll.values()) for (const ev of evOf(e)) cited.add(ev.source);
for (const id of [...sources.keys()]) if (!cited.has(id)) sources.delete(id);

const sortById = (m) => [...m.values()].sort((a, b) => a.id.localeCompare(b.id));
const atlas = {
  built_at: new Date().toISOString(),
  draft: DRAFT,
  stats: {
    ...stats, accessHintsResolved: hintsResolved,
    counts: {
      sources: sources.size, orgs: orgs.size, sites: sites.size, systems: systems.size, milestones: milestones.size,
      targets: targets.size, access: access.size, relationships: relationships.size, gaps: gaps.length,
    },
  },
  sources: sortById(sources),
  orgs: sortById(orgs),
  sites: sortById(sites),
  systems: sortById(systems),
  milestones: sortById(milestones),
  targets: sortById(targets),
  access: sortById(access),
  relationships: sortById(relationships),
  gaps,
};

mkdirSync(join(ROOT, "data/build"), { recursive: true });
writeFileSync(join(ROOT, "data/build/atlas.json"), JSON.stringify(atlas, null, 1));
if (existsSync(join(ROOT, "app"))) {
  mkdirSync(join(ROOT, "app/public"), { recursive: true });
  writeFileSync(join(ROOT, "app/public/atlas.json"), JSON.stringify(atlas));
}
console.log(JSON.stringify(atlas.stats, null, 2));
