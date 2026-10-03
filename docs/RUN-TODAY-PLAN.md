# Plan: "Run it today": a buyer's guide to quantum computing

**For:** the Cursor agents that will build this. Read `HANDOFF.md` §1 (binding rules) and `AGENTS.md` first.
Everything there still applies: separate analyst and counsel agents (on different models), verbatim quotes,
verified-only builds, the prose-number audit, and no publishing without the user.

## 0. The question this answers

> "I'm a company. Which quantum computers can I run something on **today**, what kinds of problems can I
> submit, how exactly do I do it, what does it cost, and will it beat what I already have?"

The atlas today is a catalogue of machines and claims. It can't answer this:
- Only 12 of 57 online systems link to an access route.
- Routes have a tier but no availability date, no problem type, no pricing detail and no limits.
- Only 4 code snippets exist (3 ran locally), and there is no use-case data at all.

**Definition of done:** a user picks a problem type, sees every machine that accepts it and is available
today, and gets an official example that **demonstrably runs** (in CI, on a local simulator), the documented
change to send it to real hardware, the official pricing model, documented limits, and an honest, sourced
answer to "will this beat classical?"

---

## 1. Rules specific to this feature (in addition to HANDOFF §1)

1. **"Today" needs a date.** An availability claim needs a quote from the platform's own device list,
   status page or docs, with `as_of` set to the page's stated date, or to the fetch date if it has none.
   The build marks availability **stale** when `as_of` is more than 45 days before the build date, and the UI shows
   stale items as "last confirmed <date>", never as "available".
2. **No promises about business value.** Use-case text has the form "<Vendor> documents an example of <problem>
   on <program model>". "Solves", "faster", "better than classical", "advantage" and "speedup" may appear only inside
   a quote attributed to its source, using the same mechanism as the existing hype-word rule. Extend
   `scripts/lib/rules.mjs` to cover use-case and example prose.
3. **Examples must run, or they aren't shown as runnable.** "Runnable" means the verbatim official code executes in
   CI against the SDK's local simulator or offline sampler. Code that wasn't run is shown as "official example,
   not tested here".
4. **Never touch real hardware or accounts.** No sign-ups, no API keys, no QPU or paid-simulator calls. CI must run
   the examples with networking blocked (see §3).
5. **Prices are only ever quoted.** Pricing text must come from the official pricing page as a quote. Don't compute
   cost estimates. A worked example that the vendor's own page gives may be quoted.

---

## 2. Data contract changes (`schema/types.ts`, validator, build)

Add these as optional fields so existing files stay valid. Then make them **required for routes published as
available** (validator error).

```ts
/** What a machine accepts as a program. Drives the "what can I submit?" filter. */
export type ProgramModel =
  | "gate_circuit"        // Qiskit / Cirq / Braket / pytket / OpenQASM circuits
  | "annealing_qubo"      // QUBO / Ising / BQM / CQM problems (D-Wave)
  | "analog_hamiltonian"  // programmed atom arrays: Braket AHS on QuEra Aquila, Pasqal Pulser
  | "photonic_circuit"    // Perceval (Quandela), Strawberry Fields (Xanadu), etc.
  | "pulse";              // pulse-level access where documented

// System: add
program_models?: ProgramModel[]; // evidence path "program_models"

// AccessRoute: add
system: string;                  // REQUIRED once this lands: resolve every system_hint to a sys: id,
                                  // or record a gap "device <name> on <platform> not in atlas" and leave
                                  // the route unpublished.
program_models: ProgramModel[];
availability: {
  status: "available" | "limited" | "unavailable" | "unknown"; // as the platform states it
  as_of: string;                 // YYYY-MM-DD (see rule 1)
  windows?: string;              // quoted, e.g. availability windows or "reservation only"
};
pricing?: { quote: string; unit?: string; source: string };    // verbatim pricing model text
limits?: { max_qubits?: Figure; max_shots?: Figure; notes?: string }; // only as documented
to_hardware?: { code_or_step: string; source_url: string };    // verbatim doc line/step that switches from
                                                                // simulator to the real device (e.g. the device ARN line)

/** A documented use of a program model for a class of business/science problem. */
export type ProblemClass =
  | "optimization"        // scheduling, routing, portfolio, MaxCut, knapsack, assignment
  | "chemistry"           // molecular energies, materials
  | "physics_simulation"  // spin models, dynamics
  | "machine_learning"
  | "sampling"
  | "linear_algebra"
  | "other";

export interface UseCase {
  id: string;                    // "uc:<platform>-<slug>"
  problem_class: ProblemClass;
  title: string;                 // neutral: "Scheduling as a constrained quadratic model"
  program_model: ProgramModel;
  platform: string;              // Org id
  sdk: string;
  kind: "official_tutorial" | "customer_case_study" | "peer_reviewed_application";
  customer?: string;             // Org id, only if the source names the customer
  statement: string;             // "<Vendor> documents …". No benefit claims outside quotes.
  outcome_quote?: string;        // if the source states a result, quote it verbatim (validator checks it's in evidence)
  example?: string;              // Example.id when a runnable example exists
  evidence: Evidence[];
}

/** A runnable official example. Extends the existing Snippet idea with a CI harness. */
export interface Example {
  id: string;                    // "ex:<sdk>-<slug>"
  title: string;
  program_model: ProgramModel;
  sdk: string;
  source_url: string;            // official tutorial or docs page
  code: string;                  // VERBATIM
  harness_path: string;          // "examples/<id>/" (see §3)
  substitution?: string;         // exactly what the harness changes, also present as a diff file
  sim_check: Snippet["sim_check"]; // reuse; status MUST come from CI, not hand-entered
  routes: string[];              // AccessRoute ids this example can be sent to (with to_hardware)
  evidence: Evidence[];          // supports the verbatim code + the program model
}
```

**Build changes** (`scripts/build.mjs`):
- Compute `availability.stale` from `as_of` and the build date.
- Join examples to routes and use cases.
- Withhold any use case whose `outcome_quote` doesn't appear in its evidence.
- Fill `sim_check.status` from `examples/results.json` (written by CI, §3). Never trust a hand-entered status.

**Validator** (`scripts/validate.mjs`):
- New enums.
- Required fields for routes with `availability.status === "available"`.
- Every `uc:` with `example` points to an existing `ex:`.
- Hype or benefit terms appear only inside quotes in UseCase and Example prose.

---

## 3. The examples harness (engineering, not research)

```
examples/
  <ex-id>/
    official.py        # the verbatim code from source_url (byte-for-byte; a test compares it to Example.code)
    harness.py         # imports or execs official.py with the documented substitution applied (e.g. LocalSimulator)
    substitution.diff  # human-readable diff of what changed and why
    expected.txt       # optional: a property to assert (e.g. "counts keys ⊆ {00,11}"), not exact numbers
  requirements/<sdk>.txt   # pinned SDK versions per environment
  results.json             # written by CI: { ex-id: { status, sdk_version, python_version, ran_at, output_excerpt } }
scripts/run-examples.mjs   # runs every harness in its SDK venv, writes results.json, exits non-zero on failure
```

- **One venv per SDK family**, because SDKs conflict:
  - `amazon-braket-sdk` (gate circuits + AHS LocalSimulator);
  - `qiskit` + `qiskit-aer` + `qiskit-ibm-runtime` (fake backends);
  - `cirq`;
  - `pytket`;
  - `dwave-ocean-sdk` (`dimod.ExactSolver`, `neal`/`dwave-samplers` simulated annealing);
  - `pulser` (Pasqal emulators);
  - `perceval-quandela`;
  - `pennylane`;
  - `azure-quantum` local or Q# resource estimation where offline;
  - `qcs`/`pyquil` (QVM only if it runs offline; otherwise mark not runnable).
- **No network, no credentials.** Run with networking blocked. Use `pytest-socket` (`--disable-socket --allow-unix-socket`)
  or an equivalent sandbox, and unset every `AWS_*`, `QISKIT_IBM_*`, `DWAVE_*` and `AZURE_*` variable. If a harness needs the
  network, it fails. That's the point.
- **Verbatim check test:** `official.py` must equal `Example.code` exactly, and `harness.py` may differ only as described
  in `substitution.diff`. Add this to `app/test` or a node test under `scripts/`.
- **CI:** a new job matrix in `.github/workflows/ci.yml`, one job per SDK environment, uploading `results.json`
  fragments. The `data` job merges them, and the build reads the result. Cache pip per SDK.

**Coverage target** (minimum): at least one runnable example per (program model × major platform):
- **gate_circuit:** Braket, IBM (Qiskit), Azure Quantum, IonQ, Quantinuum (pytket/Nexus offline), IQM (if its SDK has a local simulator), Rigetti (if offline-capable).
- **annealing_qubo:** D-Wave Ocean, with at least an optimization example (knapsack, scheduling or graph partition) from D-Wave's official examples.
- **analog_hamiltonian:** Braket AHS on QuEra Aquila (LocalSimulator AHS) and Pasqal Pulser.
- **photonic_circuit:** Perceval (Quandela), plus Xanadu if a current official cloud route exists.
- **Problem classes,** with at least one each where official tutorials exist: optimization (QAOA on gate model, plus annealing),
  chemistry (VQE / small-molecule ground state, from Qiskit, PennyLane or Azure docs), sampling, physics simulation (analog).

---

## 4. Research topics (new files; same analyst → counsel pipeline)

### 4a. `data/research/today.json`: platform catalogues (analyst A)

For every platform, fetch the **live device list, status page, pricing page and "run your first job" page** and record:
- `availability`;
- `program_models`;
- `pricing` (quoted);
- `limits` (quoted);
- `to_hardware` (the verbatim line or step).

It also **resolves every route to a `sys:` id** (fix the 24 routes that only have `system_hint`).

Platforms, at least:
- Amazon Braket, Azure Quantum, IBM Quantum Platform, D-Wave Leap.
- IonQ Quantum Cloud, Quantinuum Nexus, Rigetti QCS, IQM Resonance, OQC Cloud, Pasqal Cloud.
- Quandela Cloud, Xanadu Cloud (check it still offers hardware), AQT ARNICA.
- Google Quantum AI (record the actual access policy; likely restricted).

Aggregators (e.g. qBraid, Strangeworks) only if their official docs list hardware access, and recorded as their own platform.

Edit `access.json` routes **in place** (add the new fields) rather than duplicating them. The `today.json` file holds new routes and sources.

### 4b. `data/research/usecases.json`: what problems people actually submit (analyst B)

Sources, in priority order:
1. **Official tutorials and example galleries:** D-Wave examples, Qiskit tutorials, Braket example notebooks, PennyLane
   demos, Pasqal/Pulser tutorials, Perceval docs, Azure Quantum samples, IonQ/Quantinuum guides.
2. **Customer case studies on the vendor's or customer's own site, or in SEC filings,** naming the customer and the problem.
   `kind: customer_case_study`. Quote any stated outcome verbatim, and never paraphrase it into a benefit.
3. **Peer-reviewed application papers** where available.

For each record: `problem_class`, `program_model`, `platform`, `sdk`, a neutral `statement`, and `example` if a runnable
example will be built (coordinate with the engineer, §3). Target 30+ use cases across all problem classes, with at least
10 customer case studies.

### 4c. Counsel (separate agents, a different model from the analysts)

Use the existing `docs/COUNSEL.md` plus these checks:
- **Availability:** the device-list quote names the device, `as_of` is right, and a device listed as "offline" or under
  "reservation only" is not marked available.
- **Pricing:** text is verbatim from the official pricing page and the date is current.
- **Use cases:** the statement is neutral. Any `outcome_quote` is verbatim, attributed and not overstated. A case study is from
  the vendor's or customer's own channel, not a news write-up.
- **Examples:** re-run 3 at random in a clean venv with networking blocked, and confirm the verbatim match.

---

## 5. The UI: a "Run today" mode (4th tab; consider making it the landing view)

1. **Problem picker** (top): Optimization · Chemistry · Physics simulation · Machine learning · Sampling · "Just show me".
2. **Availability board** (main panel, a table with the globe beside it):
   - **Rows:** one per machine and platform.
   - **Columns:** Available today? (Self-serve / Free tier / By application / Not available / Stale), program model, platform,
     SDK, limits, pricing model, last confirmed.
   - **Behaviour:** filtered by the picker; clicking a row flies the globe to the machine and opens its page.
3. **Machine "how to run" page** (inspector):
   - **Access:** how to get it (auth and tier, quoted).
   - **The example:** code with a "Tested here ✓ <date>, SDK x.y on local simulator" badge, or "Not tested".
   - **Running it:** a "run locally" command (pip install + python); "send to the real device", the quoted
     `to_hardware` step plus pricing quote; and documented limits.
   - **Related use cases.**
4. **"Will this beat my laptop?" panel**, on every machine and problem page. It lists only sourced statements:
   - the relevant milestones and their peer-review status;
   - any attributed advantage claims (quoted, with their status);
   - customer `outcome_quote`s.

   If none exist, it says so plainly, e.g. "No source cited here claims an advantage over classical methods for this problem class."
5. **Data table:** new tabs for Routes (with availability), Use cases and Examples, with CSV export.
6. **Stories,** grounded as before (captions frame, quotes carry claims):
   - "Your first optimization: a scheduling problem on D-Wave".
   - "A molecule on a gate-model machine (VQE via Qiskit / PennyLane)".
   - "Programming an atom array: QuEra Aquila via Braket AHS".
   - "Which machines can I use today, and what do they cost?"

The mobile layout follows the existing patterns (bottom sheet, chips). The board collapses to cards.

---

## 6. Tests and acceptance

- **Unit tests:**
  - stale logic;
  - every published `available` route has `system`, `program_models`, `availability.as_of` and `docs_url`;
  - every `uc:` → `ex:` link resolves;
  - no benefit or hype terms outside quotes in UseCase and Example prose;
  - `outcome_quote` is in evidence;
  - the example verbatim check.
- **The CI examples job is green,** and `results.json` drives every "Tested here" badge (a test fails if a badge says
  passed without a CI result).
- **Playwright:**
  - the Run today tab loads;
  - the picker filters the board;
  - a machine page shows the code and badge;
  - the "beat my laptop" panel renders;
  - mobile layout.
- **Existing checks stay green:** validate, check-build-fresh, audit-numbers (with the reviewed baseline), tsc and the stories test.

**Acceptance checklist** (paste into SESSION.md when done):
- [ ] All online systems with an official route have a resolved route with availability as of the last 45 days.
- [ ] Runnable examples for every program model listed in §3, all passing in CI with networking blocked.
- [ ] 30+ use cases (10+ customer case studies), all verified by counsel.
- [ ] Run today tab, machine pages, honesty panel, data-table tabs and four stories.
- [ ] Desktop and phone screenshots reviewed.
- [ ] HANDOFF.md status table updated.

---

## 7. Suggested Cursor agent setup (run at most 3–4 at once)

| Order | Agent | Model suggestion | Output |
|---|---|---|---|
| 1 | **Engineer A**: schema, validator, build and rules changes (§2) + test scaffolding | strong coding model | PR-sized commit; existing data still validates |
| 1 | **Analyst A**: platform catalogues (§4a) | research model | `today.json` + in-place `access.json` additions |
| 1 | **Analyst B**: use cases (§4b) | research model (different chat) | `usecases.json` |
| 2 | **Engineer B**: examples harness + CI matrix (§3), building examples for the chosen tutorials | strong coding model | `examples/`, `scripts/run-examples.mjs`, CI job |
| 3 | **Counsel A / B**: one per research file (§4c) | **different vendor from the analysts** | `data/verification/{today,usecases,access}.json` |
| 4 | **Engineer C / coordinator**: UI (§5), stories, screenshots, HANDOFF/SESSION | strong coding model | Run today tab |

**Prompt pattern for each agent:** "You are <role> for the Run-today feature in `~/Develop/Code/quantum-atlas`. Read `HANDOFF.md`
§1, `AGENTS.md`, `schema/types.ts` and `docs/RUN-TODAY-PLAN.md` (your section: §N). Save work often; validate before
finishing; end with a report of counts, gaps and items for counsel to scrutinise. Don't publish or deploy."

**Deploying:** the user has published this app before (GitHub + Fly + portfolio link). Redeploy only when the user says so,
and only from a verified, all-green build.
