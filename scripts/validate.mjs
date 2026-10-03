#!/usr/bin/env node
// Structural, referential and language validation of data/research/*.json and data/verification/*.json.
// Usage: node scripts/validate.mjs [topic ...]   (no args = all files)
// Exits non-zero on errors. Warnings do not fail.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hypeProblems, benefitProblems, trackProblems, impliedPeerReview, norm } from "./lib/rules.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH = join(ROOT, "data/research");
const VERIFY = join(ROOT, "data/verification");

const TOPICS = ["superconducting_a", "superconducting_b", "trapped_ion", "neutral_atom", "photonic", "spin_topo_anneal", "access", "relationships", "today", "usecases", "history_gate_sc", "history_ion_atom", "history_other", "history_claims", "followup"];
const HISTORY = new Set(["history_gate_sc", "history_ion_atom", "history_other", "history_claims"]);
const MODALITIES = {
  superconducting: ["transmon", "fluxonium", "bosonic_cat", "superconducting_other"],
  trapped_ion: ["optical_gates", "microwave_or_electronic_gates", "trapped_ion_other"],
  neutral_atom: ["digital_gate", "analog", "neutral_atom_other"],
  photonic: ["discrete_variable", "continuous_variable", "boson_sampling", "photonic_other"],
  spin_silicon: ["silicon_mos", "silicon_germanium", "donor", "spin_photon", "spin_other"],
  topological: ["majorana"],
  quantum_annealing: ["superconducting_flux"],
  nv_other: ["nv_diamond", "other"],
};
const TIER_OF = {
  peer_reviewed: 1, sec_10k: 1, sec_10q: 1, sec_8k: 1, sec_20f: 1, sec_6k: 1, sec_s1: 1, sec_s4: 1, sec_def14a: 1, sec_424b: 1,
  foreign_annual_report: 1, gov_award: 1, gov_contract: 1, gov_press_release: 1, gov_report: 1, legislation: 1,
  company_press_release: 2, company_website: 2, roadmap: 2, technical_blog: 2, official_docs: 2, investor_presentation: 2,
  earnings_call: 2, institution_release: 2, preprint: 2,
  news: 3, other: 3,
};
const ORG_KINDS = ["company", "research_institution", "government"];
const ORG_ROLES = ["hardware", "cloud_platform", "funder", "parent"];
const SITE_KINDS = ["qpu_installation", "lab", "fab", "datacenter", "headquarters", "manufacturing"];
const SITE_STATUS = ["operational", "under_construction", "announced", "closed"];
const SYS_STATUS = ["online", "announced", "retired"];
const MS_CATS = ["qubit_count", "fidelity", "error_correction", "computational_task", "system_launch", "manufacturing", "networking", "other"];
const PEER = ["peer_reviewed", "preprint", "company_claim"];
const TGT_STATUS = ["open", "met", "missed", "revised", "withdrawn"];
const ROUTES = ["vendor_cloud", "aws_braket", "azure_quantum", "ibm_quantum_platform", "google_quantum_ai", "other_cloud", "on_premise"];
const TIERS = ["open_free", "paid", "application", "restricted"];
const SIM = ["passed", "failed", "not_run"];
const REL_KINDS = ["acquisition", "partnership", "government_award", "government_contract", "investment", "hosting", "subsidiary"];
const PROGRAMS = ["gate_circuit", "annealing_qubo", "analog_hamiltonian", "photonic_circuit", "pulse"];
const AVAIL = ["available", "limited", "unavailable", "unknown"];
const PROBLEMS = ["optimization", "chemistry", "physics_simulation", "machine_learning", "sampling", "linear_algebra", "other"];
const UC_KINDS = ["official_tutorial", "customer_case_study", "peer_reviewed_application"];
const METRIC_KINDS = ["physical_qubits", "logical_qubits", "fidelity", "error_rate", "system_availability", "product_launch", "customer_access", "error_correction_demo", "other"];
const DUE_PRECISION = ["year", "half", "quarter", "month", "day"];
const RD_KINDS = ["roadmap_page", "blog", "investor_presentation", "sec_exhibit", "keynote", "press_release", "paper"];
const OUTCOMES = ["met_on_time", "met_early", "met_late", "partially_met", "revised_before_due", "acknowledged_missed", "no_delivery_found", "pending"];
const PRJ_METRICS = ["revenue", "bookings", "gross_margin", "ebitda", "customers", "qubits", "other"];
const CR_KINDS = ["retraction", "correction", "expression_of_concern", "published_rebuttal"];
const VERDICTS = ["verified", "verified_with_correction", "quote_not_found", "does_not_support", "superseded", "insufficient_tier", "unreachable"];
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const KEYS = ["sources", "orgs", "sites", "systems", "milestones", "targets", "access", "relationships", "gaps"];
const ENTITY_KEYS = ["orgs", "sites", "systems", "milestones", "targets", "access", "relationships", "use_cases", "examples", "roadmap_docs", "outcomes", "projections", "claim_revisions"];
const PREFIX = { orgs: /^(co|gov):/, sites: /^site:/, systems: /^sys:/, milestones: /^ms:/, targets: /^tgt:/, access: /^acc:/, relationships: /^rel:/, use_cases: /^uc:/, examples: /^ex:/, roadmap_docs: /^rd:/, outcomes: /^out:/, projections: /^prj:/, claim_revisions: /^cr:/ };

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".json")) : []);
function load(dir, name) {
  try { return JSON.parse(readFileSync(join(dir, name), "utf8")); }
  catch (e) { err(name, `invalid JSON: ${e.message}`); return null; }
}

// ── Pass 1: global ids across ALL research files ──
const all = {};
const globalIds = new Map();
const sources = new Map();
for (const name of list(RESEARCH)) {
  const d = load(RESEARCH, name);
  if (!d) continue;
  all[name] = d;
  for (const s of d.sources ?? []) if (s?.id) sources.set(s.id, s);
  for (const k of ENTITY_KEYS) for (const e of d[k] ?? []) {
    if (!e?.id) continue;
    if (k !== "orgs" && globalIds.has(e.id) && globalIds.get(e.id).file !== name)
      warn(name, `id ${e.id} also defined in ${globalIds.get(e.id).file} (merged at build)`);
    if (!globalIds.has(e.id) || k !== "orgs") globalIds.set(e.id, { file: name, kind: k });
  }
}
const isKind = (id, kind) => globalIds.get(id)?.kind === kind;
const today = new Date().toISOString().slice(0, 10);

function checkEvidence(file, owner, evs, { required = true } = {}) {
  if (!Array.isArray(evs) || (required && !evs.length)) { err(file, `${owner}: evidence[] missing or empty`); return; }
  evs.forEach((ev, i) => {
    if (!sources.has(ev.source)) err(file, `${owner}.evidence[${i}]: unknown source ${ev.source}`);
    if (!ev.quote || ev.quote.length < 8) err(file, `${owner}.evidence[${i}]: quote missing/too short`);
    if (ev.quote?.length > 700) warn(file, `${owner}.evidence[${i}]: quote > 700 chars`);
    if (!ev.locator) err(file, `${owner}.evidence[${i}]: locator missing`);
    if (!ev.supports) err(file, `${owner}.evidence[${i}]: supports missing`);
  });
}
function checkGeo(file, owner, g) {
  if (!g || typeof g.lat !== "number" || typeof g.lon !== "number") { err(file, `${owner}: bad location`); return; }
  if (Math.abs(g.lat) > 90 || Math.abs(g.lon) > 180) err(file, `${owner}: lat/lon out of range`);
  if (!["site", "city", "region", "country"].includes(g.precision)) err(file, `${owner}: bad precision ${g.precision}`);
}
function checkFigure(file, owner, f) {
  if (!f) return;
  if (typeof f.value !== "number" || !(f.value >= 0)) err(file, `${owner}: value must be a non-negative number`);
  if (!DATE.test(f.as_of ?? "")) err(file, `${owner}: bad as_of`);
  checkEvidence(file, owner, f.evidence);
}
const quotesOf = (e) => [
  ...(e.evidence ?? []), ...(e.physical_qubits?.evidence ?? []), ...(e.logical_qubits?.evidence ?? []),
  ...(e.metrics ?? []).flatMap((m) => m.evidence ?? []),
].map((x) => x.quote ?? "");
function checkProse(file, owner, field, text, quotes) {
  for (const p of hypeProblems(text, quotes)) err(file, `${owner}.${field}: ${p}`);
}
function checkProseBenefit(file, owner, field, text, quotes) {
  for (const p of benefitProblems(text, quotes)) err(file, `${owner}.${field}: ${p}`);
}
function checkProseTrack(file, owner, field, text, quotes) {
  for (const p of trackProblems(text, quotes)) err(file, `${owner}.${field}: ${p}`);
}

// ── Pass 2: research files ──
for (const [name, d] of Object.entries(all)) {
  if (only.length && !only.includes(name.replace(".json", ""))) continue;
  if (!TOPICS.includes(d.topic)) err(name, `bad topic ${d.topic}`);
  if (!name.startsWith(d.topic ?? "?")) warn(name, `file name != topic (${d.topic})`);
  for (const k of KEYS) if (!Array.isArray(d[k])) err(name, `${k} must be an array`);
  const local = new Set();
  const dup = (id) => { if (local.has(id)) err(name, `duplicate id ${id}`); local.add(id); };
  const localOrgs = new Set((d.orgs ?? []).map((o) => o.id));
  const orgRef = (owner, id) => {
    if (!localOrgs.has(id)) err(name, `${owner}: org ${id} must be defined in this file's orgs[] (files are self-contained)`);
  };

  for (const s of d.sources ?? []) {
    dup(s.id);
    if (!s.id?.startsWith("src:")) err(name, `source id ${s.id} must start with src:`);
    if (!/^https?:\/\//.test(s.url ?? "")) err(name, `${s.id}: url missing`);
    if (!(s.doc_type in TIER_OF)) err(name, `${s.id}: unknown doc_type ${s.doc_type}`);
    else if (TIER_OF[s.doc_type] !== s.tier) err(name, `${s.id}: tier ${s.tier} inconsistent with ${s.doc_type} (expected ${TIER_OF[s.doc_type]})`);
    if (!DATE.test(s.document_date ?? "")) err(name, `${s.id}: bad document_date`);
    if (!s.publisher) err(name, `${s.id}: publisher missing`);
    if (s.doc_type === "peer_reviewed" && !/^10\.\d{4,}\//.test(s.doi ?? "")) err(name, `${s.id}: peer_reviewed source needs a DOI`);
    if (s.doc_type === "preprint" && !s.arxiv && !/arxiv|biorxiv|ssrn|preprint/i.test(s.url)) err(name, `${s.id}: preprint source needs an arxiv id`);
  }
  for (const o of d.orgs ?? []) {
    dup(o.id);
    if (!PREFIX.orgs.test(o.id ?? "")) err(name, `org id ${o.id} must start with co: or gov:`);
    if (o.id?.startsWith("gov:") && !/^gov:[a-z]{2}-[a-z0-9-]+$/.test(o.id)) err(name, `${o.id}: gov ids are gov:<iso2>-<agency>`);
    if (!ORG_KINDS.includes(o.kind)) err(name, `${o.id}: bad kind ${o.kind}`);
    if (!Array.isArray(o.roles) || o.roles.some((r) => !ORG_ROLES.includes(r))) err(name, `${o.id}: bad roles`);
    if (!/^[A-Z]{2}$/.test(o.country ?? "")) err(name, `${o.id}: bad country`);
    if (!Array.isArray(o.modalities) || o.modalities.some((m) => !(m in MODALITIES))) err(name, `${o.id}: bad modalities`);
    if (o.parent && !globalIds.has(o.parent)) warn(name, `${o.id}: parent ${o.parent} not defined anywhere`);
    checkGeo(name, o.id, o.hq);
    checkEvidence(name, o.id, o.evidence);
  }
  for (const s of d.sites ?? []) {
    dup(s.id);
    if (!PREFIX.sites.test(s.id ?? "")) err(name, `site id ${s.id} must start with site:`);
    orgRef(s.id, s.operator);
    if (!SITE_KINDS.includes(s.kind)) err(name, `${s.id}: bad kind ${s.kind}`);
    if (!SITE_STATUS.includes(s.status)) err(name, `${s.id}: bad status ${s.status}`);
    if (!/^[A-Z]{2}$/.test(s.country ?? "")) err(name, `${s.id}: bad country`);
    checkGeo(name, s.id, s.location);
    checkEvidence(name, s.id, s.evidence);
  }
  for (const y of d.systems ?? []) {
    dup(y.id);
    if (!PREFIX.systems.test(y.id ?? "")) err(name, `system id ${y.id} must start with sys:`);
    orgRef(y.id, y.operator);
    if (!(y.modality in MODALITIES)) err(name, `${y.id}: bad modality ${y.modality}`);
    else if (y.submodality && !MODALITIES[y.modality].includes(y.submodality)) err(name, `${y.id}: submodality ${y.submodality} not allowed for ${y.modality}`);
    if (!SYS_STATUS.includes(y.status)) err(name, `${y.id}: bad status ${y.status}`);
    if (y.site && !isKind(y.site, "sites")) err(name, `${y.id}: site ${y.site} is not a defined site`);
    for (const k of ["announced", "online_since", "retired"]) if (y[k] && !DATE.test(y[k])) err(name, `${y.id}: bad ${k}`);
    checkFigure(name, `${y.id}.physical_qubits`, y.physical_qubits);
    if (y.logical_qubits) {
      checkFigure(name, `${y.id}.logical_qubits`, y.logical_qubits);
      if (!y.logical_qubits.code) err(name, `${y.id}.logical_qubits: code required (only record logical qubits when the source states the code)`);
    }
    (y.metrics ?? []).forEach((m, i) => {
      if (!m.name || typeof m.value !== "number" || m.unit === undefined) err(name, `${y.id}.metrics[${i}]: name/value/unit required`);
      if (!m.definition || m.definition.length < 10) err(name, `${y.id}.metrics[${i}]: definition (as stated by the source) required`);
      if (!DATE.test(m.as_of ?? "")) err(name, `${y.id}.metrics[${i}]: bad as_of`);
      checkEvidence(name, `${y.id}.metrics[${i}]`, m.evidence);
    });
    if (y.program_models && (!Array.isArray(y.program_models) || y.program_models.some((p) => !PROGRAMS.includes(p)))) err(name, `${y.id}: bad program_models`);
    checkEvidence(name, y.id, y.evidence);
  }
  for (const m of d.milestones ?? []) {
    dup(m.id);
    if (!PREFIX.milestones.test(m.id ?? "")) err(name, `milestone id ${m.id} must start with ms:`);
    if (!Array.isArray(m.orgs) || !m.orgs.length) err(name, `${m.id}: orgs[] required`);
    for (const o of m.orgs ?? []) orgRef(m.id, o);
    for (const s of m.systems ?? []) if (!isKind(s, "systems")) err(name, `${m.id}: system ${s} not defined`);
    if (!DATE.test(m.date ?? "")) err(name, `${m.id}: bad date`);
    else if (m.date > (d.generated_at ?? today).slice(0, 10)) err(name, `${m.id}: a milestone can't be dated in the future (${m.date}); use a target`);
    if (!MS_CATS.includes(m.category)) err(name, `${m.id}: bad category ${m.category}`);
    if (!PEER.includes(m.peer_review)) err(name, `${m.id}: bad peer_review`);
    checkEvidence(name, m.id, m.evidence);
    const types = (m.evidence ?? []).map((e) => sources.get(e.source)?.doc_type).filter(Boolean);
    const implied = impliedPeerReview(types);
    if (PEER.includes(m.peer_review) && implied !== m.peer_review)
      err(name, `${m.id}: peer_review "${m.peer_review}" but cited sources imply "${implied}" (peer_reviewed needs a peer_reviewed source; preprint needs a preprint source and no journal article)`);
    if (m.peer_review === "peer_reviewed" && !m.doi) warn(name, `${m.id}: peer_reviewed milestone without doi field`);
    if (!m.claim) err(name, `${m.id}: claim required`);
    if (/\b(will|plans? to|aims? to|expects? to|by 20\d\d)\b/i.test((m.claim ?? "").replace(/“[^”]*”|"[^"]*"/g, ""))) warn(name, `${m.id}: claim reads like a plan — targets belong in targets[]`);
    checkProse(name, m.id, "claim", m.claim, quotesOf(m));
  }
  for (const t of d.targets ?? []) {
    dup(t.id);
    if (!PREFIX.targets.test(t.id ?? "")) err(name, `target id ${t.id} must start with tgt:`);
    orgRef(t.id, t.org);
    if (t.system && !isKind(t.system, "systems")) err(name, `${t.id}: system ${t.system} not defined`);
    if (!DATE.test(t.target_date ?? "")) err(name, `${t.id}: bad target_date`);
    if (!DATE.test(t.stated_on ?? "")) err(name, `${t.id}: bad stated_on`);
    if (!TGT_STATUS.includes(t.status)) err(name, `${t.id}: bad status ${t.status}`);
    if (!/\btargets\b/.test(t.statement ?? "")) err(name, `${t.id}: statement must read "<Org> targets … by <date>"`);
    if (t.superseded_by && !isKind(t.superseded_by, "targets")) err(name, `${t.id}: superseded_by ${t.superseded_by} not a defined target`);
    if (t.superseded_by && t.status !== "revised" && t.status !== "withdrawn") err(name, `${t.id}: superseded target must have status revised or withdrawn`);
    if (t.status === "revised" && !t.superseded_by) err(name, `${t.id}: revised target needs superseded_by`);
    if (t.met_by && !isKind(t.met_by, "milestones")) err(name, `${t.id}: met_by ${t.met_by} not a defined milestone`);
    if (t.status === "met" && !t.met_by) err(name, `${t.id}: met target needs met_by`);
    if (HISTORY.has(d.topic)) {
      if (!t.roadmap_doc) err(name, `${t.id}: history targets need roadmap_doc`);
      if (!METRIC_KINDS.includes(t.metric_kind)) err(name, `${t.id}: metric_kind required`);
      if (!t.due || !DUE_PRECISION.includes(t.due.precision) || !/^\d{4}-\d{2}-\d{2}$/.test(t.due.by ?? "")) err(name, `${t.id}: due { by, precision } required`);
      else if (t.due.precision === "year" && !t.due.by.endsWith("-12-31")) err(name, `${t.id}: a year-precision due date is 31 December`);
    } else if (t.due) {
      if (!DUE_PRECISION.includes(t.due.precision) || !/^\d{4}-\d{2}-\d{2}$/.test(t.due.by ?? "")) err(name, `${t.id}: bad due`);
      else if (t.due.precision === "year" && !t.due.by.endsWith("-12-31")) err(name, `${t.id}: a year-precision due date is 31 December`);
    }
    if (t.metric_kind && !METRIC_KINDS.includes(t.metric_kind)) err(name, `${t.id}: bad metric_kind`);
    if (t.target_value) checkFigure(name, `${t.id}.target_value`, t.target_value);
    checkEvidence(name, t.id, t.evidence);
    checkProse(name, t.id, "statement", t.statement, quotesOf(t));
  }
  for (const a of d.access ?? []) {
    dup(a.id);
    if (!PREFIX.access.test(a.id ?? "")) err(name, `access id ${a.id} must start with acc:`);
    if (a.system && !isKind(a.system, "systems")) err(name, `${a.id}: system ${a.system} not defined (use system_hint)`);
    if (!a.system && !a.system_hint) err(name, `${a.id}: system or system_hint required`);
    orgRef(a.id, a.target_org);
    orgRef(a.id, a.platform);
    if (!a.platform_name) err(name, `${a.id}: platform_name required`);
    if (!ROUTES.includes(a.route)) err(name, `${a.id}: bad route ${a.route}`);
    if (!TIERS.includes(a.tier)) err(name, `${a.id}: bad tier ${a.tier}`);
    if (!Array.isArray(a.sdks)) err(name, `${a.id}: sdks must be an array`);
    if (!a.auth_model) err(name, `${a.id}: auth_model required`);
    if (!/^https?:\/\//.test(a.docs_url ?? "")) err(name, `${a.id}: docs_url required`);
    if (a.snippet) {
      const sn = a.snippet;
      if (!sn.code || sn.code.length < 10) err(name, `${a.id}.snippet: code required`);
      if (!/^https?:\/\//.test(sn.source_url ?? "")) err(name, `${a.id}.snippet: source_url required`);
      if (!sn.sdk) err(name, `${a.id}.snippet: sdk required`);
      if (!SIM.includes(sn.sim_check?.status)) err(name, `${a.id}.snippet: sim_check.status must be passed|failed|not_run`);
      if (sn.sim_check?.status === "passed" && (!sn.sim_check.simulator || !sn.sim_check.substitution)) err(name, `${a.id}.snippet: a passed check must record simulator and substitution`);
    }
    if (a.program_models && (!Array.isArray(a.program_models) || a.program_models.some((p) => !PROGRAMS.includes(p)))) err(name, `${a.id}: bad program_models`);
    if (a.availability) {
      if (!AVAIL.includes(a.availability.status)) err(name, `${a.id}: bad availability.status`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.availability.as_of ?? "")) err(name, `${a.id}: availability.as_of must be YYYY-MM-DD`);
      if (a.availability.status === "available") {
        if (!a.system) err(name, `${a.id}: an available route needs a resolved system id`);
        if (!a.program_models?.length) err(name, `${a.id}: an available route needs program_models`);
      }
    }
    if (a.pricing && (!a.pricing.quote || !sources.has(a.pricing.source))) err(name, `${a.id}: pricing needs a verbatim quote and a known source`);
    if (a.limits?.max_qubits) checkFigure(name, `${a.id}.limits.max_qubits`, a.limits.max_qubits);
    if (a.limits?.max_shots) checkFigure(name, `${a.id}.limits.max_shots`, a.limits.max_shots);
    if (a.to_hardware && (!a.to_hardware.code_or_step || !/^https?:\/\//.test(a.to_hardware.source_url ?? ""))) err(name, `${a.id}: to_hardware needs the verbatim step and a source_url`);
    checkEvidence(name, a.id, a.evidence);
  }
  for (const u of d.use_cases ?? []) {
    dup(u.id);
    if (!PREFIX.use_cases.test(u.id ?? "")) err(name, `use case id ${u.id} must start with uc:`);
    if (!PROBLEMS.includes(u.problem_class)) err(name, `${u.id}: bad problem_class`);
    if (!PROGRAMS.includes(u.program_model)) err(name, `${u.id}: bad program_model`);
    if (!UC_KINDS.includes(u.kind)) err(name, `${u.id}: bad kind`);
    orgRef(u.id, u.platform);
    if (u.customer) orgRef(u.id, u.customer);
    if (u.example && !isKind(u.example, "examples")) err(name, `${u.id}: example ${u.example} is not a defined example`);
    if (!u.title || !u.statement || !u.sdk) err(name, `${u.id}: title, statement and sdk required`);
    checkEvidence(name, u.id, u.evidence);
    const quotes = quotesOf(u);
    if (u.outcome_quote && !norm(quotes.join(" ")).includes(norm(u.outcome_quote))) err(name, `${u.id}: outcome_quote is not in the evidence`);
    checkProseBenefit(name, u.id, "statement", u.statement, quotes);
    checkProseBenefit(name, u.id, "title", u.title, quotes);
  }
  for (const x of d.examples ?? []) {
    dup(x.id);
    if (!PREFIX.examples.test(x.id ?? "")) err(name, `example id ${x.id} must start with ex:`);
    if (!PROGRAMS.includes(x.program_model)) err(name, `${x.id}: bad program_model`);
    if (!x.title || !x.sdk || !x.code || x.code.length < 10) err(name, `${x.id}: title, sdk and verbatim code required`);
    if (!/^https?:\/\//.test(x.source_url ?? "")) err(name, `${x.id}: source_url required`);
    if (!x.harness_path) err(name, `${x.id}: harness_path required`);
    if (!SIM.includes(x.sim_check?.status)) err(name, `${x.id}: sim_check.status must be passed|failed|not_run`);
    if (!Array.isArray(x.routes)) err(name, `${x.id}: routes must be an array`);
    checkEvidence(name, x.id, x.evidence);
    checkProseBenefit(name, x.id, "title", x.title, quotesOf(x));
  }
  for (const rd of d.roadmap_docs ?? []) {
    dup(rd.id);
    if (!PREFIX.roadmap_docs.test(rd.id ?? "")) err(name, `roadmap doc id ${rd.id} must start with rd:`);
    orgRef(rd.id, rd.org);
    if (!rd.title || !/^https?:\/\//.test(rd.url ?? "")) err(name, `${rd.id}: title and url required`);
    if (!DATE.test(rd.published ?? "")) err(name, `${rd.id}: bad published date`);
    if (!RD_KINDS.includes(rd.kind)) err(name, `${rd.id}: bad kind`);
    if (!["all_items", "partial"].includes(rd.completeness)) err(name, `${rd.id}: completeness must be all_items or partial`);
    if (!Array.isArray(rd.items) || !rd.items.length) err(name, `${rd.id}: items[] must list every captured forward-looking item`);
    checkEvidence(name, rd.id, rd.evidence);
  }
  for (const o of d.outcomes ?? []) {
    dup(o.id);
    if (!PREFIX.outcomes.test(o.id ?? "")) err(name, `outcome id ${o.id} must start with out:`);
    if (!isKind(o.target, "targets") && !(d.targets ?? []).some((t) => t.id === o.target)) err(name, `${o.id}: target ${o.target} is not in this file`);
    if (!OUTCOMES.includes(o.result)) err(name, `${o.id}: bad result`);
    if (o.result === "no_delivery_found") {
      const log = o.search_log;
      if (!log || !Array.isArray(log.checked) || !log.checked.length || !Array.isArray(log.queries) || !log.queries.length || !DATE.test(log.as_of ?? ""))
        err(name, `${o.id}: no_delivery_found needs a search_log with checked, queries and as_of`);
    }
    if (["met_on_time", "met_early", "met_late"].includes(o.result) && !o.delivered_by && !(o.evidence ?? []).length) err(name, `${o.id}: a met outcome needs delivery evidence`);
    if (o.result === "partially_met" && !o.delivered_value) err(name, `${o.id}: partially_met needs delivered_value`);
    if (o.delivered_value) checkFigure(name, `${o.id}.delivered_value`, o.delivered_value);
    if (!o.statement) err(name, `${o.id}: statement required`);
    checkEvidence(name, o.id, o.evidence);
    checkProseTrack(name, o.id, "statement", o.statement, quotesOf(o));
  }
  for (const p of d.projections ?? []) {
    dup(p.id);
    if (!PREFIX.projections.test(p.id ?? "")) err(name, `projection id ${p.id} must start with prj:`);
    orgRef(p.id, p.org);
    if (!p.roadmap_doc) err(name, `${p.id}: roadmap_doc required`);
    if (!PRJ_METRICS.includes(p.metric)) err(name, `${p.id}: bad metric`);
    if (!p.period) err(name, `${p.id}: period required`);
    checkFigure(name, `${p.id}.projected`, p.projected);
    if (p.actual) checkFigure(name, `${p.id}.actual`, p.actual);
    checkEvidence(name, p.id, p.evidence);
    if (p.actual && (p.evidence ?? []).length < 2) err(name, `${p.id}: a projection with an actual needs evidence for both sides`);
  }
  for (const c of d.claim_revisions ?? []) {
    dup(c.id);
    if (!PREFIX.claim_revisions.test(c.id ?? "")) err(name, `claim revision id ${c.id} must start with cr:`);
    if (!CR_KINDS.includes(c.kind)) err(name, `${c.id}: bad kind`);
    if (!DATE.test(c.date ?? "")) err(name, `${c.id}: bad date`);
    if (!c.subject || !c.statement) err(name, `${c.id}: subject and statement required`);
    checkEvidence(name, c.id, c.evidence);
    checkProseTrack(name, c.id, "statement", c.statement, quotesOf(c));
  }
  for (const r of d.relationships ?? []) {
    dup(r.id);
    if (!PREFIX.relationships.test(r.id ?? "")) err(name, `relationship id ${r.id} must start with rel:`);
    orgRef(r.id, r.from);
    orgRef(r.id, r.to);
    if (!REL_KINDS.includes(r.kind)) err(name, `${r.id}: bad kind ${r.kind}`);
    if (!DATE.test(r.date ?? "")) err(name, `${r.id}: bad date`);
    if (!r.description) err(name, `${r.id}: description required`);
    if (r.amount && (typeof r.amount.value !== "number" || !/^[A-Z]{3}$/.test(r.amount.currency ?? ""))) err(name, `${r.id}: amount needs value + ISO currency`);
    checkEvidence(name, r.id, r.evidence);
    const tiers = (r.evidence ?? []).map((e) => sources.get(e.source)?.tier);
    if (tiers.length && tiers.every((t) => t === 3)) warn(name, `${r.id}: supported only by Tier 3`);
    checkProse(name, r.id, "description", r.description, quotesOf(r));
  }
  for (const g of d.gaps ?? []) if (!g.topic || !g.why || !g.would_need) err(name, `gap missing topic/why/would_need`);
}

// ── Pass 3: verification files ──
for (const name of list(VERIFY)) {
  if (only.length && !only.includes(name.replace(".json", ""))) continue;
  const v = load(VERIFY, name);
  if (!v) continue;
  const r = all[name];
  if (!r) { err(`verification/${name}`, "no matching research file"); continue; }
  const ents = new Map();
  for (const k of ENTITY_KEYS) for (const e of r[k] ?? []) ents.set(e.id, e);
  const srcIds = new Set((r.sources ?? []).map((s) => s.id));
  for (const sc of v.source_checks ?? []) if (!srcIds.has(sc.source)) warn(`verification/${name}`, `source_check for source ${sc.source} not in this file`);
  for (const ec of v.evidence_checks ?? []) {
    if (!ents.has(ec.entity)) err(`verification/${name}`, `evidence_check for unknown entity ${ec.entity}`);
    if (!VERDICTS.includes(ec.verdict)) err(`verification/${name}`, `${ec.entity}: bad verdict ${ec.verdict}`);
  }
  const judged = new Set();
  for (const ev of v.entity_verdicts ?? []) {
    if (!ents.has(ev.entity)) err(`verification/${name}`, `verdict for unknown entity ${ev.entity}`);
    if (!["publish", "publish_flagged", "reject"].includes(ev.verdict)) err(`verification/${name}`, `${ev.entity}: bad verdict`);
    judged.add(ev.entity);
  }
  const orgIds = new Set((r.orgs ?? []).map((o) => o.id));
  for (const id of ents.keys()) if (!judged.has(id) && !orgIds.has(id)) warn(`verification/${name}`, `no verdict for ${id} (will not be published)`);
}

for (const w of warnings) console.warn("warn ", w);
for (const e of errors) console.error("ERROR", e);
console.log(`\n${Object.keys(all).length} research file(s); ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
