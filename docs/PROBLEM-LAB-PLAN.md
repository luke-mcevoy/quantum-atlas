# Plan: Problem Lab: "Here's my problem. Can quantum help, on which machine, and is it worth it?"

**For:** the Cursor agents that will build this **after** `docs/RUN-TODAY-PLAN.md` is complete. It depends on that plan's
`program_models`, availability data, pricing quotes and the examples harness (per-SDK environments with networking
blocked). It also uses `docs/TRACK-RECORD-PLAN.md` for vendor track records, if built. Read `HANDOFF.md` §1 first; those
rules still bind.

## 0. The product

A company describes a problem in plain language, with optional data. The Lab:

1. turns it into a precise **problem specification**;
2. solves it with a strong **classical baseline** first;
3. has AI **formulate** it for each quantum programming model (gate circuits, annealing, analog atom arrays, photonic);
4. **matches** those formulations against the machines available today, using atlas data;
5. **runs trials on the vendors' own simulators and noise models**, never on real hardware;
6. measures how quality changes with problem size against the classical baseline;
7. writes a **report** with a clear, evidence-backed verdict.

The honest answer will often be "classical is better today". The product must say that clearly; that is its value.

---

## 1. Binding rules (in addition to HANDOFF §1)

1. **AI proposes, code verifies.** Every AI-generated formulation, circuit or program passes deterministic checks before any
   trial runs (§4.3). A formulation that fails verification is never run or reported as a result.
2. **Classical baseline first, always.** No quantum result appears without the classical result on the same instance, with
   solver, settings, runtime and hardware recorded.
3. **No real hardware, no credentials, no network in trials.** Trials run in sandboxed containers with networking blocked
   and no vendor credentials. Real-hardware runs are out of scope until the user explicitly approves a later phase (§9 P3),
   and even then only with the user's own credentials and a cost cap.
4. **Machine facts come from the atlas only.** Feasibility uses published atlas data (qubits, program models, availability,
   pricing quotes), and every fact links to the atlas entity and its evidence. The AI never asserts machine capabilities from memory.
5. **Simulators are labelled as simulators.** Each trial records exactly what ran: "IBM `FakeTorino` noise model
   (qiskit-ibm-runtime x.y)", "Braket LocalSimulator, noiseless", "D-Wave `SimulatedAnnealingSampler`, a classical
   heuristic and not a model of the QPU", "Pulser emulator with the vendor noise model". Never imply simulator output equals hardware output.
6. **Size honesty.** Exact state-vector simulation stops around 30–35 qubits. Beyond the simulable range, the Lab reports a
   **resource estimate** (qubits, depth, error-rate needs) from an established estimator, not a projected result.
7. **Fixed verdict vocabulary** (§5). It is computed from the numbers by deterministic rules, never written freely by an
   AI. The AI may write an explanation, but a test checks that every number in it appears in the trial data.
8. **User data stays private.** With the local model, problem text and data never leave the user's machine. The Lab
   **keeps nothing beyond the session** (user decision: no retention). If a hosted model is ever added, it needs the user's
   explicit approval, and every report must record which provider saw the problem text.

---

## 2. Architecture

The current app is a static site (Vite + nginx on Fly). The Lab needs a **backend** because trials run Python SDKs.

```
app/                      existing atlas UI, plus a new "Problem Lab" mode (§7)
lab/
  api/                    FastAPI service: sessions, jobs, results (thin)
  worker/                 job runner; launches sandboxed trial containers
  images/                 one Docker image per SDK family; reuse examples/requirements/*.txt from Run-today
  templates/              curated, tested formulations (§4.2)
  baselines/              classical solvers (§4.1)
  agents/                 LLM orchestration: intake, formulation, explanation (prompts + tool schemas)
  verify/                 deterministic checks (§4.3)
  estimates/              resource-estimation adapters (§4.6)
  bench/                  evaluation problems with known answers (§8)
  schema/                 JSON Schemas for ProblemSpec, Formulation, Trial, Baseline, Feasibility, Report
```

- **LLM: a local small model** (user decision, 2026-10-02). Run it on the user's Mac through **Ollama** or **llama.cpp**
  (MLX is fine too) behind one small interface, `lab/agents/llm.py`: `complete(messages, json_schema) -> object`.
  - Choose the model by measurement in P1: start with 2–3 instruct models in the **~7–14B** range that run comfortably in
    local memory and support **JSON-schema-constrained output**, and keep whichever scores best on `lab/bench` (§8).
    Record the model name, quantisation and runtime version in every report.
  - **Always constrain output with the JSON schema** (Ollama `format` with a schema, or llama.cpp grammars); never parse free
    text for data.
  - Keep the interface model-agnostic, so a larger local model, or a hosted API if the user later approves one, can be swapped in.
- **Designed for a small model.** Small models are unreliable at writing quantum programs from scratch, so the AI's job in
  P1 is narrowed to **classify the problem, choose a template, and fill its parameters**: slot-filling against the template's
  JSON schema. Free-form code generation is **disabled** in P1 and can be revisited later with a stronger model and stricter
  verification. The deterministic verifier (§4.3) catches any wrong parameters.
- **Jobs:** a simple queue (Redis or SQLite-backed) with per-job CPU, memory and time limits. Containers run with
  `--network none` and a read-only filesystem except a scratch dir.
- **Hosting: local only for now** (user decision). The Lab runs on the user's machine with `docker compose`: API, worker,
  sandbox images and the model runtime. The public atlas site stays static. Its Problem Lab tab either links to
  "run the Lab locally" instructions or talks to `http://localhost` when the Lab is running. No public Lab deployment
  until the user decides otherwise.
- **Sandbox runtime:** Docker Desktop, or Podman/Colima on macOS. The no-network rule is enforced with `--network none`.

---

## 3. Data contract (`lab/schema/*.json`, mirrored as TS types for the UI)

```ts
ProblemSpec {
  id; title; description;                       // the user's words, kept verbatim
  problem_class: "optimization" | "chemistry" | "physics_simulation" | "machine_learning" | "sampling" | "linear_algebra" | "other";
  subtype?: string;                             // "max_cut" | "knapsack" | "portfolio" | "job_shop" | "vehicle_routing" | "ground_state" | ...
  objective: string;                            // precise, AI-proposed, CONFIRMED BY THE USER
  variables: { name; domain: "binary" | "integer" | "continuous"; count_expr }[];
  constraints: { description; kind: "equality" | "inequality" | "one_hot" | ... }[];
  size: { n: number; scaling_param: string };   // e.g. n = number of assets
  data?: { kind: "inline" | "upload" | "generator"; ref };
  success_metric: "optimality_gap" | "approximation_ratio" | "energy_error" | "fidelity" | "custom";
  confirmed_by_user: boolean;                   // nothing runs until true
}

Formulation {
  id; spec; program_model: "annealing_qubo" | "gate_circuit" | "analog_hamiltonian" | "photonic_circuit";
  method: "qubo" | "bqm" | "cqm" | "qaoa" | "vqe" | "qpe_estimate" | "mis_rydberg" | "ahs_dynamics" | "boson_sampling" | ...;
  template?: string;                            // template id it was derived from (preferred)
  code: string;                                 // generated program (Python)
  params: Record<string, unknown>;
  verification: { checks: { name; passed; details }[]; passed: boolean };  // §4.3
  qubits_needed: number; depth?: number; two_qubit_gates?: number;          // computed, not claimed
}

Baseline { id; spec; instance; solver: "ortools_cp_sat" | "highs" | "scip" | "exact_bruteforce" | "simulated_annealing"
          | "pyscf_fci" | "pyscf_ccsd" | ...; settings; objective_value; optimality: "proven" | "best_found";
          runtime_s; hardware: string }

Trial { id; formulation; instance; backend: { kind: "vendor_simulator" | "vendor_noise_model" | "classical_heuristic_stand_in";
        name: string; sdk_version: string; atlas_system?: string };      // the machine whose noise model this is
        shots; seed; result_value; success_metric_value; runtime_s; status: "ok" | "failed" | "timeout"; log_excerpt }

Feasibility { machine: string /* atlas sys: id */; route?: string /* atlas acc: id */;
  program_model_ok: boolean; qubits_ok: boolean; connectivity_note?: string; embedding?: { ok; chain_length_max? };
  available_today: "self_serve" | "free_tier" | "application" | "no" | "stale";
  cost_note?: string /* the atlas pricing QUOTE, not an estimate */; reasons: string[]; evidence_links: string[] }

Report { spec; baselines: Baseline[]; formulations: Formulation[]; trials: Trial[]; feasibility: Feasibility[];
  scaling: { sizes: number[]; classical: number[]; quantum_by_backend: Record<string, number[]> };
  estimates?: ResourceEstimate[]; verdict: Verdict; explanation: string; caveats: string[] }
```

---

## 4. Pipeline (each stage is a deterministic gate; AI only where marked 🤖)

### 4.1 Intake 🤖 → user confirmation
- The local model, using schema-constrained output, maps the description to a `ProblemSpec`. To help a small model it works
  in steps: (1) pick a `problem_class` and `subtype` from a fixed list, (2) fill that subtype's parameter schema,
  (3) ask up to 5 clarifying questions chosen from that subtype's question bank. If it can't map the problem to any subtype,
  it says so and offers the closest templates. It never invents a new formulation.
- The UI shows the spec in plain language **and** as a formal objective with constraints. The user edits or confirms it,
  and **nothing runs until it's confirmed**.
- A small-instance generator: real data is downsized to n = 4…12, or synthetic instances with the same structure are
  generated, so exact answers exist for verification.

### 4.2 Template library (curated, human-reviewed, unit-tested)
With the small local model, the AI **only selects and parameterises** templates (free-form generation is off in P1), so
template coverage defines what the Lab can handle. Start with:

| Class | Templates |
|---|---|
| optimization | MaxCut (QUBO, QAOA), knapsack (QUBO with penalty tuning, CQM), portfolio (mean–variance QUBO), job-shop/scheduling (CQM), small TSP/VRP (QUBO), maximum independent set on unit-disk graphs (Rydberg/analog, QuEra-style) |
| chemistry | H₂ / LiH / H₂O ground state: VQE (UCCSD / hardware-efficient), plus a QPE resource estimate |
| physics_simulation | transverse-field Ising dynamics (gate Trotter, analog AHS) |
| sampling | random-circuit / boson-sampling demos, labelled "benchmark tasks, not business workloads" |
| machine_learning | quantum kernel classifier on small data, labelled experimental, with a classical kernel baseline |

Where possible, each template cites an **official vendor tutorial** from the Run-today use-case data (`uc:`/`ex:` ids).

### 4.3 Verification (deterministic, required before any trial)
- **QUBO/BQM/CQM:** brute-force on small instances (n ≤ 20) and confirm the ground state maps to a feasible optimal solution of the
  original problem, with the same objective value as the classical exact solver. Penalty weights must keep infeasible
  states higher in energy. Report the energy gap.
- **Circuits:** must parse and transpile for each target backend's basis gates and coupling map (from the vendor fake backend).
  The problem Hamiltonian's exact expectation on the optimal bitstring must equal the classical objective. For VQE, exact
  diagonalisation of the qubit Hamiltonian must match PySCF FCI within 1e-6 Ha on the small molecule.
- **Analog AHS / Pulser:** validate against the device's published constraints (from the SDK's device spec objects: minimum atom
  spacing, field limits). Emulated results on small graphs must match exact MIS.
- Failures go back to the 🤖 parameter-filling step with the failing check's details, up to 3 attempts, then a "could not
  formulate" result.

### 4.4 Feasibility (deterministic, atlas-driven)
For each formulation × atlas machine: is the program model accepted, are there enough qubits, does a minor-embedding exist
(minorminer, for D-Wave topologies, using the SDK's topology), what is the native connectivity overhead (transpiled two-qubit
gate count and depth on the fake backend), and is it available today (Run-today data). The cost note is the atlas's quoted
pricing text only.

### 4.5 Simulated trials
- **Backends:**
  - IBM fake backends with noise (`qiskit-ibm-runtime` fake providers + `qiskit-aer`);
  - Braket LocalSimulator, plus noise models where the SDK provides device noise;
  - IonQ/Quantinuum vendor-provided noise models or emulators, **only if they run offline**; otherwise mark not runnable;
  - D-Wave: `dwave-samplers` simulated annealing, labelled as a classical stand-in, not the QPU;
  - Pasqal Pulser emulators with noise;
  - Quandela Perceval simulators.
- **Sizes:** a sweep from n_small to the largest simulable n within budget. Fixed seeds, repeated runs, mean and spread recorded.
- **Budgets:** per-trial time and memory caps, and a whole-job cap the user can see.

### 4.6 Scaling & resource estimates
- Plot the success metric against n for classical and each quantum backend, over the same instances.
- Beyond the simulable range, run a **resource estimator** (Azure Quantum Resource Estimator offline, or Qualtran) for
  fault-tolerant needs: logical qubits, T-count, runtime at stated physical error rates. Then **compare with the atlas**: which machine,
  if any, has the documented physical or logical qubits and error rates today, and which roadmap targets (with the vendor's
  track record from the Track-record plan) claim to reach it, and when.

### 4.7 Report 🤖 (explanation only)
The verdict is computed by rules (§5). The LLM writes a short explanation constrained to the trial data, and a test checks
every number in it against the report. The report includes reproducible code: every formulation and baseline is downloadable,
with exact SDK versions, plus the atlas's "send to real hardware" step quoted from vendor docs. Never auto-run on hardware.

---

## 5. Verdict rules (deterministic; unit-tested)

Exactly one verdict per report, computed from the data:

- **"Not runnable on any available machine today."** No feasibility row has all of program model ✓, qubits ✓ and available_today ∈ {self_serve, free_tier, application}.
  Add the resource estimate and any roadmap targets claiming that capability, with track records.
- **"Classical is better at every size tested."** The classical metric beats or ties every quantum backend at all tested n.
- **"Comparable on small instances only."** The quantum backend is within ε of classical for small n, but degrades as n grows (slope test).
- **"Worth a hardware pilot."** Strict: the quantum metric is within ε of classical at the largest simulable n, **and** the trend is
  not worse than classical, **and** a self-serve machine fits. The explanation must still state that simulators differ from hardware.
- **"Inconclusive."** Formulation failed or budgets were exhausted.

ε and the trend tests are parameters stored in the report. The verdict never says "advantage" or "faster"; the existing
hype-term rule applies to Lab prose too.

---

## 6. Safety and sandboxing
- Generated code runs only in containers with **no network** (`--network none`), no secrets mounted, CPU/memory/time limits, a
  read-only image and a scratch volume. Never execute generated code in the API process.
- Static pre-checks reject generated code that imports networking or system modules (`socket`, `subprocess`, `os.system`,
  `requests`, `boto3`, …) except an allow-list per SDK.
- Log every generated artifact with its prompt, model id and verification results for audit.

---

## 7. UI: a "Problem Lab" mode in the existing app

1. **Describe:** a chat-style intake with example prompts (portfolio, scheduling, routing, molecule energy).
2. **Confirm the spec:** a readable spec beside the formal objective and constraints; the user edits, then confirms.
3. **Run:** a live job view showing stages and progress (baseline → formulations → verification → trials → estimates), with budget meters.
4. **Report:**
   - the verdict banner, with the computed rule shown;
   - a scaling chart (classical vs each backend);
   - a feasibility table where each machine row links to the atlas machine page, with its availability, pricing quote and vendor track record;
   - the formulations with a verification checklist;
   - downloadable code;
   - the "send to real hardware" steps (quoted docs);
   - caveats.
5. **History:** a list of past reports in this browser session only, unless the user enables storage.

The look matches the atlas (dark, dense, sourced). On phones, the report becomes stacked cards and the charts scroll inside their panel.

---

## 8. Evaluation (CI)
- `lab/bench/`: 20+ problems with known optimal answers across classes and sizes, e.g. MaxCut graphs with known cuts,
  knapsack instances, H₂/LiH energies, MIS on unit-disk graphs.
- **Golden tests:** for each benchmark, the pipeline in **template-only mode (no LLM)** must produce verified formulations,
  correct baselines and the expected verdict.
- **LLM evals** (local, no API cost, run on the user's machine; CI runs the template-only path): subtype-classification
  accuracy, parameter-filling accuracy (spec matches the gold spec), verified-formulation rate, and explanation
  number-grounding (0 ungrounded numbers allowed). The same evals pick the local model in P1.
- **Unit tests:** every verification check, the verdict rules, feasibility logic, and sandbox network blocking (a job that opens a socket
  must fail).

---

## 9. Phases (each ends with a usable demo and green CI)

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0: offline core, no LLM** | templates, baselines, verification, simulated trials, scaling, verdict rules, a CLI `lab run spec.json` | all bench golden tests pass; reports reproducible |
| **P1: local-model intake and template selection** | 🤖 classify → choose template → fill parameters (schema-constrained), clarifying questions, retry loop on verification failures, explanation writer; model chosen by evals | ≥90% subtype classification and ≥80% verified formulations on bench; 0 ungrounded numbers; everything runs offline on the user's Mac |
| **P2: local web Lab** | FastAPI + worker + sandbox images via `docker compose`, Problem Lab UI (talks to localhost), atlas-linked feasibility | end-to-end demo on 3 problem types run entirely locally; Playwright tests against the local stack |
| **P3: real hardware** | **not now** (user decision 2026-10-02) | do not build |

---

## 10. Decisions (recorded 2026-10-02 by the user)

1. **LLM:** a **local model first**, specifically a **small** one (see §2). No hosted API and no API keys.
2. **Hosting:** **local only** (`docker compose` on the user's machine). No public Lab deployment for now.
3. **Data retention:** **none.** Nothing is kept beyond the session.
4. **Solvers:** **free only:** OR-Tools (CP-SAT), HiGHS, SCIP, PySCF. No Gurobi. Gurobi is a commercial solver that is often
   faster on large optimisation problems but needs a paid licence; it can be revisited later as an optional baseline.
5. **Real hardware:** **not yet.** Don't build P3.

Ask the user before changing any of these.

## 11. Suggested Cursor agent roster (after Run-today ships; at most 3–4 at once)

| Order | Agent | Output |
|---|---|---|
| 1 | **Engineer: core** (P0 schema, baselines, verification) | `lab/schema`, `lab/baselines`, `lab/verify`, unit tests |
| 1 | **Engineer: templates** (§4.2), each with tests and the official tutorial it adapts | `lab/templates` |
| 2 | **Engineer: trials & estimates** (§4.5–4.6), reusing Run-today's per-SDK environments | `lab/worker`, `lab/images`, `lab/estimates` |
| 2 | **Engineer: bench & CI** (§8) | `lab/bench`, CI jobs |
| 3 | **Engineer: AI orchestration** (P1): local-model runtime (Ollama/llama.cpp), schema-constrained intake and template selection, explanation, evals and model selection | `lab/agents` |
| 4 | **Engineer: API + UI** (P2, local `docker compose`) | `lab/api`, Problem Lab mode |
| any | **Reviewer** (a different model from the authors): reviews verification and verdict code and the sandbox. It must try to make a wrong formulation pass verification, and a misleading explanation pass the grounding test. | review notes + fixes |

**Prompt pattern:** "You are <role> for the Problem Lab in `~/Develop/Code/quantum-atlas`. Read `HANDOFF.md` §1, `AGENTS.md`,
`docs/RUN-TODAY-PLAN.md` and `docs/PROBLEM-LAB-PLAN.md` (your section: §N; decisions in §10). Local small model only; free
solvers only. AI proposes, code verifies. Classical baseline first.
No real hardware, no credentials, no network in trials. Save often; end with a report. Don't deploy."
