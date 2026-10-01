import type { Modality } from "./atlas";

type RGB = [number, number, number];

// Eight modalities, chosen to stay distinguishable on the dark globe (hue and lightness both vary);
// labels and the legend always accompany colour.
export const MODALITY_COLOR: Record<Modality, RGB> = {
  superconducting: [76, 144, 240],
  trapped_ion: [240, 176, 64],
  neutral_atom: [64, 200, 150],
  photonic: [236, 98, 196],
  spin_silicon: [176, 132, 250],
  topological: [240, 108, 86],
  quantum_annealing: [150, 210, 70],
  nv_other: [170, 180, 192],
};

export const MODALITY_LABEL: Record<Modality, string> = {
  superconducting: "Superconducting",
  trapped_ion: "Trapped ion",
  neutral_atom: "Neutral atom",
  photonic: "Photonic",
  spin_silicon: "Spin / silicon",
  topological: "Topological",
  quantum_annealing: "Quantum annealing",
  nv_other: "NV / other",
};

export const MODALITY_CODE: Record<Modality, string> = {
  superconducting: "SC", trapped_ion: "ION", neutral_atom: "ATOM", photonic: "PHOT", spin_silicon: "SPIN",
  topological: "TOPO", quantum_annealing: "QA", nv_other: "OTHR",
};

export const SUB_LABEL: Record<string, string> = {
  transmon: "transmon", fluxonium: "fluxonium", bosonic_cat: "bosonic (cat)", superconducting_other: "other",
  optical_gates: "optical gates", microwave_or_electronic_gates: "microwave / electronic gates", trapped_ion_other: "other",
  digital_gate: "digital (gate-based)", analog: "analog", neutral_atom_other: "other",
  discrete_variable: "discrete-variable", continuous_variable: "continuous-variable", boson_sampling: "boson sampling", photonic_other: "other",
  silicon_mos: "silicon MOS", silicon_germanium: "Si/SiGe", donor: "donor", spin_photon: "spin–photon", spin_other: "other",
  majorana: "Majorana-based", superconducting_flux: "superconducting flux qubits", nv_diamond: "NV diamond", other: "other",
};

export const C = {
  ocean: [13, 18, 25] as RGB,
  land: [24, 31, 40] as RGB,
  border: [46, 57, 70] as RGB,
  graticule: [30, 40, 52] as RGB,
  text: [230, 237, 243] as RGB,
  muted: [138, 150, 163] as RGB,
  accent: [76, 144, 240] as RGB,
  gold: [240, 196, 80] as RGB,
  danger: [236, 84, 88] as RGB,
  warn: [236, 154, 60] as RGB,
  ok: [50, 164, 103] as RGB,
  target: [196, 206, 220] as RGB,
};

export const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export const DOC_LABEL: Record<string, string> = {
  peer_reviewed: "Peer-reviewed paper", sec_10k: "SEC 10-K", sec_10q: "SEC 10-Q", sec_8k: "SEC 8-K", sec_20f: "SEC 20-F",
  sec_6k: "SEC 6-K", sec_s1: "SEC S-1", sec_s4: "SEC S-4", sec_def14a: "SEC DEF 14A", sec_424b: "SEC 424B prospectus",
  foreign_annual_report: "Statutory annual report", gov_award: "Government award", gov_contract: "Government contract",
  gov_press_release: "Government release", gov_report: "Government report", legislation: "Legislation",
  company_press_release: "Company release", company_website: "Company website", roadmap: "Official roadmap",
  technical_blog: "Official technical blog", official_docs: "Official documentation", investor_presentation: "Investor presentation",
  earnings_call: "Earnings call", institution_release: "Institution release", preprint: "Preprint (not peer reviewed)",
  news: "News", other: "Other",
};

export const PEER_LABEL = { peer_reviewed: "PEER-REVIEWED", preprint: "PREPRINT", company_claim: "COMPANY CLAIM" } as const;
export const PEER_TITLE = {
  peer_reviewed: "Reported in a peer-reviewed journal article (DOI cited)",
  preprint: "Reported in a preprint; no peer-reviewed version is cited",
  company_claim: "Stated only in company or institution material; no paper cited",
} as const;

export const ROUTE_LABEL: Record<string, string> = {
  vendor_cloud: "Vendor cloud", aws_braket: "Amazon Braket", azure_quantum: "Azure Quantum",
  ibm_quantum_platform: "IBM Quantum Platform", google_quantum_ai: "Google Quantum AI", other_cloud: "Other cloud",
  on_premise: "On-premise / partner",
};
export const ROUTE_COLOR: Record<string, RGB> = {
  vendor_cloud: [240, 196, 80], aws_braket: [246, 140, 60], azure_quantum: [80, 170, 250], ibm_quantum_platform: [160, 140, 255],
  google_quantum_ai: [70, 206, 140], other_cloud: [200, 200, 210], on_premise: [190, 150, 120],
};
export const TIER_ACCESS_LABEL = { open_free: "Free tier", paid: "Paid", application: "By application", restricted: "Restricted" } as const;

export const REL_LABEL: Record<string, string> = {
  acquisition: "Acquisition", partnership: "Partnership", government_award: "Government award",
  government_contract: "Government contract", investment: "Investment", hosting: "Hosting", subsidiary: "Subsidiary",
};
export const REL_COLOR: Record<string, RGB> = {
  acquisition: [240, 196, 80], partnership: [70, 206, 180], government_award: [96, 160, 255], government_contract: [96, 160, 255],
  investment: [236, 140, 72], hosting: [190, 200, 212], subsidiary: [200, 170, 110],
};

export const SIM_LABEL = { passed: "RAN ON LOCAL SIMULATOR", failed: "LOCAL RUN FAILED", not_run: "NOT RUN LOCALLY" } as const;
