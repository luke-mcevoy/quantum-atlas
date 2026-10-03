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
  {
    id: "first-program",
    title: "How to run your first program",
    dek: "What the platform's own pages say about submitting a job, and which of those pages include a code sample.",
    steps: [
      {
        title: "Braket names the machines",
        caption: "Amazon's Braket page says the service provides access to QPU devices from AQT, IonQ, IQM, QuEra, and Rigetti.",
        mode: "access",
        focus: ["acc:aws-braket-quera-aquila", "sys:quera-aquila"],
        quotes: [{ entity: "acc:aws-braket-quera-aquila", ev: 4 }],
        select: "acc:aws-braket-quera-aquila",
      },
      {
        title: "A free window at IBM",
        caption: "IBM's plan page says you can run circuits on its QPUs for free, up to 10 minutes per 28-day rolling window.",
        mode: "access",
        focus: ["acc:ibm-quantum-ibm-fez", "co:ibm"],
        quotes: [{ entity: "acc:ibm-quantum-ibm-fez", ev: 2 }],
        select: "acc:ibm-quantum-ibm-fez",
      },
      {
        title: "D-Wave asks you to apply",
        caption: "D-Wave's cloud page says customers can access the “Advantage2™ and Advantage™” annealing systems, and the same page says “Apply for Free Trial”.",
        mode: "access",
        focus: ["acc:d-wave-leap-advantage2", "sys:d-wave-advantage2"],
        quotes: [
          { entity: "acc:d-wave-leap-advantage2", ev: 0 },
          { entity: "acc:d-wave-leap-advantage2", ev: 1 },
        ],
        select: "acc:d-wave-leap-advantage2",
      },
    ],
  },
  {
    id: "d-wave-scheduling",
    title: "Your first optimization: a scheduling problem on D-Wave",
    dek: "What D-Wave’s own example says a job-shop problem is, and which solver that example names.",
    steps: [
      {
        title: "Job-shop scheduling",
        caption: "D-Wave’s example describes job shop scheduling as an optimization problem whose objective is to minimize the time it takes to complete all jobs.",
        mode: "today",
        focus: ["uc:d-wave-job-shop", "acc:d-wave-leap-advantage2"],
        quotes: [{ entity: "uc:d-wave-job-shop", ev: 0 }],
        select: "uc:d-wave-job-shop",
      },
      {
        title: "The Leap solver",
        caption: "The same example says the formulation is solved using the Leap CQM hybrid solver.",
        mode: "today",
        focus: ["uc:d-wave-job-shop", "co:d-wave"],
        quotes: [{ entity: "uc:d-wave-job-shop", ev: 1 }],
        select: "acc:d-wave-leap-advantage2",
      },
    ],
  },
  {
    id: "vqe-hydrogen",
    title: "A molecule on a gate-model machine",
    dek: "What two official notebooks say they compute for a hydrogen molecule.",
    steps: [
      {
        title: "Hydrogen on Braket",
        caption: "Amazon Braket’s notebook says it implements a variational eigensolver in the Braket SDK to compute a potential energy surface for the hydrogen molecule.",
        mode: "today",
        focus: ["uc:aws-vqe-hydrogen", "co:aws"],
        quotes: [{ entity: "uc:aws-vqe-hydrogen", ev: 0 }],
        select: "uc:aws-vqe-hydrogen",
      },
      {
        title: "Hydrogen with InQuanto",
        caption: "Quantinuum’s example says it calculates the ground state electronic energy of the hydrogen molecule using a standard VQE methodology.",
        mode: "today",
        focus: ["uc:quantinuum-vqe-hydrogen", "co:quantinuum"],
        quotes: [{ entity: "uc:quantinuum-vqe-hydrogen", ev: 1 }],
        select: "uc:quantinuum-vqe-hydrogen",
      },
    ],
  },
  {
    id: "what-it-costs",
    title: "Which machines can I use today, and what do they cost?",
    dek: "One free window from IBM’s plan page, and one price cell from Amazon’s Braket table.",
    steps: [
      {
        title: "A free window at IBM",
        caption: "IBM’s plan page says you can run circuits on its QPUs for free, up to 10 minutes per 28-day rolling window.",
        mode: "today",
        focus: ["acc:ibm-quantum-ibm-fez", "co:ibm"],
        quotes: [{ entity: "acc:ibm-quantum-ibm-fez", ev: 2 }],
        select: "acc:ibm-quantum-ibm-fez",
      },
      {
        title: "Aquila’s price cell",
        caption: "Amazon’s Braket pricing table lists a row for Aquila at $0.30000.",
        mode: "today",
        focus: ["acc:aws-braket-quera-aquila", "sys:quera-aquila"],
        quotes: [{ entity: "acc:aws-braket-quera-aquila", ev: 7 }],
        select: "acc:aws-braket-quera-aquila",
      },
    ],
  },
  {
    id: "promised-and-arrived",
    title: "Ten years of quantum roadmaps: what was promised, what arrived",
    dek: "Dated statements from the companies’ own roadmaps and later announcements.",
    steps: [
      {
        title: "Eagle",
        caption: "IBM’s roadmap says that next year it will debut a 127-qubit processor it calls “Eagle”. A later announcement says IBM announced that processor at the IBM Quantum Summit 2021.",
        mode: "track",
        focus: ["out:ibm-hist-eagle-127-2021", "co:ibm"],
        quotes: [
          { entity: "out:ibm-hist-eagle-127-2021", ev: 0 },
          { entity: "out:ibm-hist-eagle-127-2021", ev: 1 },
        ],
        select: "out:ibm-hist-eagle-127-2021",
      },
      {
        title: "Condor",
        caption: "IBM’s roadmap names a 1,121-qubit processor, “Condor”, slated for release in 2023. IBM stated on 4 Dec 2023 that it had introduced a 1,121-qubit Condor processor.",
        mode: "track",
        focus: ["out:ibm-hist-2022-condor-1121", "co:ibm"],
        quotes: [
          { entity: "out:ibm-hist-2022-condor-1121", ev: 0 },
          { entity: "out:ibm-hist-2022-condor-1121", ev: 1 },
          { entity: "out:ibm-hist-2022-condor-1121", ev: 2 },
        ],
        select: "out:ibm-hist-2022-condor-1121",
      },
      {
        title: "A later horizon",
        caption: "Pasqal’s release points to 10,000 qubits in 2026. A 25 June 2024 release states the roadmap is “progressing towards 10,000 qubits by the 2026-2027 horizon”.",
        mode: "track",
        focus: ["out:pasqal-10000-2026", "co:pasqal"],
        quotes: [
          { entity: "out:pasqal-10000-2026", ev: 0 },
          { entity: "out:pasqal-10000-2026", ev: 1 },
          { entity: "out:pasqal-10000-2026", ev: 2 },
        ],
        select: "tgt:pasqal-10000-2026",
      },
    ],
  },
  {
    id: "spac-revenue",
    title: "SPAC projections vs reality",
    dek: "D-Wave’s investor projection table beside a later revenue line from its annual filing.",
    steps: [
      {
        title: "A 2025 revenue row",
        caption: "D-Wave’s projection table lists 2025E revenue as 219, in a row of yearly figures. The later filing prints revenue of $24,587 for the year ended December 31, 2025.",
        mode: "track",
        focus: ["prj:d-wave-hist-revenue-fy2025", "co:d-wave"],
        quotes: [
          { entity: "prj:d-wave-hist-revenue-fy2025", ev: 0 },
          { entity: "prj:d-wave-hist-revenue-fy2025", ev: 1 },
        ],
        select: "co:d-wave",
      },
    ],
  },
  {
    id: "retractions",
    title: "Retractions and rebuttals: when headline results were revised",
    dek: "Journal notices, quoted as published.",
    steps: [
      {
        title: "A retracted letter",
        caption: "On 8 March 2021, a Nature note names “Quantized Majorana conductance” and states it “was published on 28 March 2018”. The authors state: “We can therefore no longer claim the observation of a quantized Majorana conductance, and wish to retract this Letter.”",
        mode: "track",
        focus: ["cr:nature-majorana-2018"],
        quotes: [
          { entity: "cr:nature-majorana-2018", ev: 0 },
          { entity: "cr:nature-majorana-2018", ev: 1 },
          { entity: "cr:nature-majorana-2018", ev: 2 },
          { entity: "cr:nature-majorana-2018", ev: 5 },
        ],
        select: "cr:nature-majorana-2018",
      },
      {
        title: "A retracted nanowire paper",
        caption: "A Nature note published online on 19 April 2022 names Sasa Gazibegovic. The same record cites the authors’ article as published online on 24 August 2017.",
        mode: "track",
        focus: ["cr:gazibegovic-nanowire-epitaxy-retraction"],
        quotes: [
          { entity: "cr:gazibegovic-nanowire-epitaxy-retraction", ev: 0 },
          { entity: "cr:gazibegovic-nanowire-epitaxy-retraction", ev: 1 },
          { entity: "cr:gazibegovic-nanowire-epitaxy-retraction", ev: 2 },
        ],
        select: "cr:gazibegovic-nanowire-epitaxy-retraction",
      },
      {
        title: "A published comparison",
        caption: "On 25 June 2024, Nature Physics published “Classical algorithm for simulating experimental Gaussian boson sampling.”",
        mode: "track",
        focus: ["cr:oh-gaussian-boson-sampling"],
        quotes: [
          { entity: "cr:oh-gaussian-boson-sampling", ev: 0 },
          { entity: "cr:oh-gaussian-boson-sampling", ev: 1 },
        ],
        select: "cr:oh-gaussian-boson-sampling",
      },
    ],
  },
];
