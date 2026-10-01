/**
 * Quantum Computing Atlas — data contract.
 *
 * Every research file in data/research/*.json is a ResearchFile (written by analyst agents).
 * Every verification file in data/verification/*.json is a VerificationFile (written by an
 * independent counsel agent that re-fetched every document).
 * scripts/build.mjs merges both into data/build/atlas.json, which the app consumes.
 *
 * Nothing reaches the globe without evidence, and nothing is published without a counsel verdict.
 */

// ─── Taxonomy ───────────────────────────────────────────────────────────────

export type Modality =
  | "superconducting"
  | "trapped_ion"
  | "neutral_atom"
  | "photonic"
  | "spin_silicon"
  | "topological"
  | "quantum_annealing"
  | "nv_other";

/** Allowed sub-types per modality (validator enforces). Use only what the source states. */
export const SUBMODALITIES: Record<Modality, string[]> = {
  superconducting: ["transmon", "fluxonium", "bosonic_cat", "superconducting_other"],
  trapped_ion: ["optical_gates", "microwave_or_electronic_gates", "trapped_ion_other"],
  neutral_atom: ["digital_gate", "analog", "neutral_atom_other"],
  photonic: ["discrete_variable", "continuous_variable", "boson_sampling", "photonic_other"],
  spin_silicon: ["silicon_mos", "silicon_germanium", "donor", "spin_photon", "spin_other"],
  topological: ["majorana"],
  quantum_annealing: ["superconducting_flux"],
  nv_other: ["nv_diamond", "other"],
};

/** Research files are split by topic so analysts can work in parallel. */
export type Topic =
  | "superconducting_a" // IBM, Google, Rigetti, AWS (Ocelot), Alice & Bob
  | "superconducting_b" // IQM, OQC, Fujitsu/RIKEN, Origin Quantum, USTC (Zuchongzhi)
  | "trapped_ion" // Quantinuum, IonQ (+ Oxford Ionics), AQT...
  | "neutral_atom" // Atom Computing, QuEra, Pasqal, Infleqtion, planqc...
  | "photonic" // PsiQuantum, Xanadu, Quandela, ORCA, USTC (Jiuzhang)...
  | "spin_topo_anneal" // Photonic Inc, Diraq, Quantum Motion, Intel, Microsoft, D-Wave...
  | "access" // how to submit a program: platforms, SDKs, tiers, verbatim snippets
  | "relationships" // acquisitions, partnerships, government awards/contracts, funding
  | "followup"; // later rounds

// ─── Sources and evidence ───────────────────────────────────────────────────

export type DocType =
  // Tier 1 — peer-reviewed, legal / regulatory, government
  | "peer_reviewed" // journal article (Nature, Science, PRL, PRX, ...). `doi` required.
  | "sec_10k" | "sec_10q" | "sec_8k" | "sec_20f" | "sec_6k" | "sec_s1" | "sec_s4" | "sec_def14a" | "sec_424b"
  | "foreign_annual_report" // statutory annual report filed with a non-US regulator
  | "gov_award" // award / selection announcement or agreement (DARPA QBI, DOE, national programme)
  | "gov_contract" // USAspending / SAM.gov / FPDS / procurement notice
  | "gov_press_release" // agency release
  | "gov_report" // GAO, CRS, national-strategy documents
  | "legislation"
  // Tier 2 — official primary, not peer reviewed
  | "company_press_release" | "company_website" | "roadmap" | "technical_blog" | "official_docs"
  | "investor_presentation" | "earnings_call"
  | "institution_release" // university / national-lab release about its own machine or result
  | "preprint" // arXiv etc. Always shown as "preprint". `arxiv` id required.
  // Tier 3 — secondary (last resort, always flagged)
  | "news" | "other";

export type Tier = 1 | 2 | 3;

export interface Source {
  id: string; // "src:<slug>"
  title: string;
  publisher: string; // issuing entity: "IBM", "Nature", "U.S. SEC (filer: IonQ, Inc.)", "arXiv"
  url: string; // the document itself (not coverage of it)
  doc_type: DocType;
  tier: Tier;
  document_date: string; // YYYY-MM-DD (publication / filing date)
  accessed: string; // YYYY-MM-DD
  identifier?: string; // SEC accession no., award no.
  doi?: string; // required for peer_reviewed: "10.1038/s41586-024-08449-y"
  arxiv?: string; // required for preprint: "2408.13687"
  archived_url?: string; // Wayback Machine copy if the live page refused or changed
}

export interface Evidence {
  source: string; // Source.id
  quote: string; // VERBATIM excerpt, <= 500 chars, checked programmatically against a saved raw copy
  locator: string; // section / page / heading / table — enough to find the quote
  supports: string; // which field(s): "existence", "location", "qubits", "metric", "date", "status", "relationship", "code", "tier"...
}

export interface GeoPoint {
  lat: number;
  lon: number;
  /** site: a documented address or named facility; city: documented city; region/country: coarser. */
  precision: "site" | "city" | "region" | "country";
  address?: string; // as documented
}

// ─── Entities ───────────────────────────────────────────────────────────────

export type OrgKind = "company" | "research_institution" | "government";
export type OrgRole = "hardware" | "cloud_platform" | "funder" | "parent";

export interface Org {
  id: string; // "co:<slug>" for companies and institutions, "gov:<iso2>-<agency>" for government bodies
  name: string;
  kind: OrgKind;
  roles: OrgRole[];
  country: string; // ISO 3166-1 alpha-2 of headquarters
  hq: GeoPoint;
  modalities: Modality[]; // hardware modalities pursued, as documented ([] for pure platforms / agencies)
  tickers?: string[]; // "NYSE:IONQ"
  sec_cik?: string;
  parent?: string; // Org.id of a documented parent / majority owner
  website?: string;
  evidence: Evidence[]; // existence + HQ (+ modality)
}

export type SiteKind = "qpu_installation" | "lab" | "fab" | "datacenter" | "headquarters" | "manufacturing";

export interface Site {
  id: string; // "site:<org-slug>-<place-slug>"
  name: string;
  operator: string; // Org.id
  kind: SiteKind;
  location: GeoPoint;
  country: string; // ISO2
  status: "operational" | "under_construction" | "announced" | "closed";
  evidence: Evidence[]; // must support existence AND location at the stated precision
}

/** A number as stated by a source. */
export interface Figure {
  value: number;
  as_of: string; // YYYY-MM-DD or YYYY-MM or YYYY
  note?: string; // e.g. "qubits on the chip; source does not state how many are usable"
  evidence: Evidence[];
}

export interface Metric {
  name: string; // "two-qubit gate fidelity", "quantum volume", "algorithmic qubits", "T1 (median)"
  value: number;
  unit: string; // "%", "us", "", "log2"...
  /** What the source says it measured, in the source's own terms: which gate, median/mean/best, which qubits, date. */
  definition: string;
  as_of: string;
  evidence: Evidence[];
}

export interface System {
  id: string; // "sys:<org-slug>-<name-slug>"
  name: string; // the vendor's name: "Willow", "H2-1", "Forte Enterprise", "Aquila", "Advantage2"
  operator: string; // Org.id
  modality: Modality;
  submodality?: string; // one of SUBMODALITIES[modality], only if a source states it
  status: "online" | "announced" | "retired";
  /** Where it physically is. Only a Site whose evidence places THIS system there. Absent → drawn at operator HQ, labelled. */
  site?: string;
  announced?: string; // date
  online_since?: string; // date
  retired?: string; // date
  physical_qubits?: Figure;
  /** Only where a source states BOTH the logical-qubit count and the code used. */
  logical_qubits?: Figure & { code: string };
  metrics?: Metric[];
  evidence: Evidence[]; // existence + status (+ modality)
}

export type PeerReview = "peer_reviewed" | "preprint" | "company_claim";

export interface Milestone {
  id: string; // "ms:<org-slug>-<slug>"
  orgs: string[]; // Org.ids credited by the source
  systems?: string[]; // System.ids involved
  date: string; // publication / announcement date
  category: "qubit_count" | "fidelity" | "error_correction" | "computational_task" | "system_launch"
    | "manufacturing" | "networking" | "other";
  /**
   * One neutral sentence. Hype terms (advantage, supremacy, logical qubit, error-corrected, fault-tolerant,
   * beyond-classical, utility) may appear ONLY inside quotation marks, attributed ("Google states the
   * result is “below threshold”"), and the quoted words must appear verbatim in this milestone's evidence.
   */
  claim: string;
  peer_review: PeerReview; // peer_reviewed needs a peer_reviewed source with DOI; preprint needs a preprint source
  doi?: string;
  arxiv?: string;
  evidence: Evidence[];
}

export interface Target {
  id: string; // "tgt:<org-slug>-<slug>"
  org: string; // Org.id
  system?: string; // System.id if the target names a system already recorded
  system_name?: string; // name used by the roadmap ("Starling")
  target_date: string; // YYYY or YYYY-MM or YYYY-MM-DD, as stated (end of year if "by 2029")
  /** Always "<Org name> targets ... by <date>". Same hype-term rule as Milestone.claim. */
  statement: string;
  stated_on: string; // date of the roadmap document
  status: "open" | "met" | "missed" | "revised" | "withdrawn";
  superseded_by?: string; // Target.id of the later statement that revised this one
  met_by?: string; // Milestone.id
  evidence: Evidence[]; // the roadmap document itself
}

export type Route = "vendor_cloud" | "aws_braket" | "azure_quantum" | "ibm_quantum_platform" | "google_quantum_ai"
  | "other_cloud" | "on_premise";
export type AccessTier = "open_free" | "paid" | "application" | "restricted";

export interface Snippet {
  code: string; // VERBATIM from source_url (counsel re-checks)
  source_url: string;
  language: "python" | "bash" | "other";
  sdk: string; // "qiskit", "amazon-braket-sdk", "cirq", "pytket", "dwave-ocean-sdk", "pennylane", "perceval-quandela"...
  sim_check: {
    status: "passed" | "failed" | "not_run";
    simulator?: string; // "qiskit_aer.AerSimulator", "braket LocalSimulator", "cirq.Simulator"...
    substitution?: string; // exactly what was changed to run locally (e.g. "device = LocalSimulator() instead of AwsDevice(arn)")
    sdk_version?: string;
    python_version?: string;
    ran_at?: string;
    output_excerpt?: string;
    notes?: string;
  };
}

export interface AccessRoute {
  id: string; // "acc:<platform-slug>-<system-slug>"
  system?: string; // System.id, if recorded in any research file
  system_hint?: string; // otherwise: the system's name as the docs state it
  target_org: string; // Org.id of the hardware operator
  platform: string; // Org.id running the access service (co:aws for Braket, co:ionq for IonQ's own cloud)
  platform_name: string; // "Amazon Braket", "IBM Quantum Platform", "Quantinuum Nexus"
  route: Route;
  sdks: string[];
  auth_model: string; // as documented: "IBM Cloud API key", "AWS account credentials (IAM)"
  tier: AccessTier; // as documented
  tier_note?: string; // e.g. "Open Plan: 10 minutes per month", quoted in evidence
  docs_url: string; // official getting-started / submit-a-job page
  snippet?: Snippet;
  evidence: Evidence[]; // must support availability of this system on this platform AND the tier
}

export type RelKind = "acquisition" | "partnership" | "government_award" | "government_contract" | "investment"
  | "hosting" | "subsidiary";

export interface Relationship {
  id: string; // "rel:<slug>"
  from: string; // Org.id (acquirer, funder, agency, partner A)
  to: string; // Org.id (acquired, recipient, partner B)
  kind: RelKind;
  date: string;
  program?: string; // "DARPA Quantum Benchmarking Initiative (QBI) Stage B"
  amount?: { value: number; currency: string; note?: string };
  description: string; // neutral, numbers only as quoted
  status?: "completed" | "announced" | "pending" | "terminated";
  evidence: Evidence[]; // must name BOTH parties
}

export interface Gap {
  topic: string;
  why: string;
  would_need: string;
}

export interface ResearchFile {
  topic: Topic;
  analyst: string;
  generated_at: string;
  sources: Source[];
  orgs: Org[];
  sites: Site[];
  systems: System[];
  milestones: Milestone[];
  targets: Target[];
  access: AccessRoute[];
  relationships: Relationship[];
  gaps: Gap[];
}

// ─── Verification ───────────────────────────────────────────────────────────

export type EvidenceVerdict =
  | "verified"
  | "verified_with_correction"
  | "quote_not_found"
  | "does_not_support"
  | "superseded"
  | "insufficient_tier"
  | "unreachable";

export interface SourceCheck {
  source: string;
  reachable: boolean;
  doc_type_ok: boolean;
  tier_assigned: Tier;
  date_ok: boolean;
  notes?: string;
}

export interface EvidenceCheck {
  entity: string;
  /** Index into the entity's evidence[]. For nested evidence use `path` too, e.g. "physical_qubits", "metrics.0", "snippet". */
  evidence_index: number;
  path?: string;
  verdict: EvidenceVerdict;
  notes?: string;
}

export interface EntityVerdict {
  entity: string;
  verdict: "publish" | "publish_flagged" | "reject";
  reasons: string;
  corrections?: Record<string, unknown>; // field path → corrected value (applied at build); null deletes the field
}

export interface VerificationFile {
  topic: Topic;
  verifier: string;
  verified_at: string;
  source_checks: SourceCheck[];
  evidence_checks: EvidenceCheck[];
  entity_verdicts: EntityVerdict[];
  /** Counsel's own re-run of each snippet's local-simulator check (optional). */
  snippet_checks?: { entity: string; verbatim: boolean; rerun_status?: "passed" | "failed" | "not_run"; notes?: string }[];
  summary: string;
}
