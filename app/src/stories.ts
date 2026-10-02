// Guided stories. Grounding rule (same as the sister atlas): captions only frame and connect. They state no number
// and no fact that the quoted, counsel-verified evidence of that step doesn't state, and hype terms appear only
// inside quotation marks, attributed, verbatim from the step's quotes. The quotes carry the claims.
// test/stories.test.ts fails the build if a referenced entity or quote is missing from the published atlas,
// if a caption number isn't in the step's quotes, or if a caption breaks the hype-term rule.

import type { Evidence, Index } from "./atlas";
import { entityOf } from "./atlas";
import type { Mode } from "./store";

export interface QuoteRef {
  entity: string;
  /** Index into the entity's evidence[], or into a nested list given by `path` ("physical_qubits", "metrics.0"). */
  ev: number;
  path?: string;
}

export interface StoryStep {
  title: string;
  caption: string;
  mode: Mode;
  /** Orgs, systems, milestones, targets, access routes or relationships to highlight; the camera frames them. */
  focus: string[];
  quotes: QuoteRef[];
  select?: string;
  /** Roadmap view: date to scrub to. */
  date?: string;
}

export interface Story { id: string; title: string; dek: string; steps: StoryStep[] }

export function quoteOf(idx: Index, q: QuoteRef): Evidence | undefined {
  const e = entityOf(idx, q.entity) as unknown as Record<string, unknown> | undefined;
  if (!e) return undefined;
  if (!q.path) return (e.evidence as Evidence[] | undefined)?.[q.ev];
  const [k, i] = q.path.split(".");
  const holder = (i !== undefined ? (e[k] as Record<string, unknown>[] | undefined)?.[+i] : e[k]) as { evidence?: Evidence[] } | undefined;
  return holder?.evidence?.[q.ev];
}

export const STORIES: Story[] = [
  {
    id: "encoded-qubits",
    title: "The race to logical qubits",
    dek: "What peer-reviewed papers report about encoded qubits, and one company roadmap that is still a target.",
    steps: [
      {
        title: "Distance 5 on Sycamore",
        caption: "Google's paper compares a distance-5 surface-code encoding with an ensemble of distance-3 encodings. It calls the distance-5 device a “logical qubit”.",
        mode: "roadmap",
        date: "2023-02-22",
        focus: ["ms:google-surface-code-d5-2023", "sys:google-sycamore"],
        quotes: [{ entity: "ms:google-surface-code-d5-2023", ev: 0 }],
        select: "ms:google-surface-code-d5-2023",
      },
      {
        title: "Willow",
        caption: "The Willow paper reports a 101-qubit distance-7 code, and a suppression factor of 2.14 when the code distance increases by 2.",
        mode: "roadmap",
        date: "2024-12-09",
        focus: ["ms:google-willow-below-threshold-2024", "sys:google-willow"],
        quotes: [{ entity: "ms:google-willow-below-threshold-2024", ev: 0 }],
        select: "sys:google-willow",
      },
      {
        title: "Four on H2",
        caption: "Quantinuum and Microsoft report entangled encoded qubits on H2. They state they created four “logical qubits”.",
        mode: "roadmap",
        date: "2024-04-03",
        focus: ["ms:quantinuum-microsoft-encoded-qubits-2024", "sys:quantinuum-h2"],
        quotes: [{ entity: "ms:quantinuum-microsoft-encoded-qubits-2024", ev: 1 }],
        select: "ms:quantinuum-microsoft-encoded-qubits-2024",
      },
      {
        title: "Forty-eight in a sampling circuit",
        caption: "A Harvard-led paper, with QuEra, reports sampling circuits with up to 48 of what it calls “logical qubits”.",
        mode: "roadmap",
        date: "2023-12-06",
        focus: ["ms:harvard-quera-48-encoded-qubits", "co:quera"],
        quotes: [{ entity: "ms:harvard-quera-48-encoded-qubits", ev: 2 }],
        select: "ms:harvard-quera-48-encoded-qubits",
      },
      {
        title: "Starling is still a target",
        caption: "IBM's roadmap places Starling in Poughkeepsie and says the machine will run “200 logical qubits”. The date on the roadmap is 2029.",
        mode: "roadmap",
        date: "2029-01-01",
        focus: ["tgt:ibm-starling-2029", "co:ibm"],
        quotes: [{ entity: "tgt:ibm-starling-2029", ev: 1 }, { entity: "tgt:ibm-starling-2029", ev: 0 }],
        select: "tgt:ibm-starling-2029",
      },
    ],
  },
  {
    id: "one-each",
    title: "Every modality, one machine each",
    dek: "One published machine for each modality. The quote names the machine; the caption only points at it.",
    steps: [
      {
        title: "Superconducting",
        caption: "Google's paper calls Willow one of its superconducting processors. The chip specification lists 105 qubits.",
        mode: "modality",
        focus: ["sys:google-willow"],
        quotes: [
          { entity: "sys:google-willow", ev: 0 },
          { entity: "sys:google-willow", ev: 0, path: "physical_qubits" },
        ],
        select: "sys:google-willow",
      },
      {
        title: "Trapped ion",
        caption: "Quantinuum's paper calls Helios a 98-qubit trapped-ion processor.",
        mode: "modality",
        focus: ["sys:quantinuum-helios"],
        quotes: [{ entity: "sys:quantinuum-helios", ev: 1, path: "physical_qubits" }],
        select: "sys:quantinuum-helios",
      },
      {
        title: "Neutral atom",
        caption: "QuEra describes Aquila as a 256-qubit neutral-atom array.",
        mode: "modality",
        focus: ["sys:quera-aquila"],
        quotes: [{ entity: "sys:quera-aquila", ev: 0, path: "physical_qubits" }],
        select: "sys:quera-aquila",
      },
      {
        title: "Photonic",
        caption: "Xanadu describes Borealis as a photonic quantum computer with 216 squeezed-state qubits.",
        mode: "modality",
        focus: ["sys:xanadu-borealis"],
        quotes: [{ entity: "sys:xanadu-borealis", ev: 0 }],
        select: "sys:xanadu-borealis",
      },
      {
        title: "Silicon spin",
        caption: "Intel's release calls Tunnel Falls a 12-qubit silicon chip.",
        mode: "modality",
        focus: ["sys:intel-tunnel-falls"],
        quotes: [{ entity: "sys:intel-tunnel-falls", ev: 0 }],
        select: "sys:intel-tunnel-falls",
      },
      {
        title: "Topological",
        caption: "Microsoft's announcement calls Majorana 1 a processor “powered by topological qubits”.",
        mode: "modality",
        focus: ["sys:microsoft-majorana-1"],
        quotes: [{ entity: "sys:microsoft-majorana-1", ev: 0 }],
        select: "sys:microsoft-majorana-1",
      },
      {
        title: "Annealing",
        caption: "D-Wave's filing says it released the annealing system it calls “Advantage”, a 5,000-qubit system.",
        mode: "modality",
        focus: ["sys:d-wave-advantage"],
        quotes: [{ entity: "sys:d-wave-advantage", ev: 0 }],
        select: "sys:d-wave-advantage",
      },
      {
        title: "Diamond",
        caption: "Quantum Brilliance describes the QB-QDK2.0 as using nitrogen-vacancy centres in diamond.",
        mode: "modality",
        focus: ["sys:qb-qdk2"],
        quotes: [{ entity: "sys:qb-qdk2", ev: 1 }],
        select: "sys:qb-qdk2",
      },
    ],
  },
];
