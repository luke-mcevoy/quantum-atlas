# Access analyst brief: how to submit a program

Read `docs/ANALYST.md`, `AGENTS.md` and `schema/types.ts` (`AccessRoute`, `Snippet`) first.
Output: `data/research/access.json` (`"topic": "access"`). Only `sources`, `orgs`,
`access` and `gaps` are filled; other arrays stay `[]`.

## One AccessRoute per (platform, system) pair that official docs say is available

Platforms to cover (at least): Amazon Braket, Azure Quantum, IBM Quantum Platform,
Google Quantum AI (and its access programme, if any), and each vendor's own cloud
(Quantinuum Nexus, IonQ Quantum Cloud, D-Wave Leap, Rigetti QCS, IQM Resonance, OQC
Cloud, Pasqal Cloud, Quandela Cloud, Xanadu Cloud, AQT ARNICA, Alice & Bob, Origin
Quantum Cloud, Fujitsu, QuEra (via Braket), Infleqtion, ...). For each route record:

- `system` (a `sys:` id already defined in `data/research/*.json` — grep for it), or if not
  recorded, `system_hint` with the device name exactly as the docs state it, plus `target_org`.
- `platform` (Org id of the service operator, e.g. `co:aws`, `co:microsoft`, `co:ibm`, or the
  vendor itself) and `platform_name`.
- `route` (enum), `sdks` (as the docs name them), `auth_model` (as documented: "IBM Cloud
  API key", "AWS credentials", "Azure subscription + workspace"), `tier` (`open_free` /
  `paid` / `application` / `restricted`) and `tier_note`, only as the platform's own docs
  or pricing page state them, and `docs_url` (the official getting-started / submit-a-job page).
- `evidence`: quotes establishing (a) that this device is offered on this platform and
  (b) the access tier. Device lists on Braket/Azure/IBM pages and pricing pages are ideal.
  Be careful about dates: device availability changes; prefer pages fetched today and
  record `document_date` as the page's stated update date or today's date.

## Snippets (one per platform/SDK, attached to one representative route; reuse is fine)

- Copy a **minimal official code snippet verbatim** from the official docs (getting
  started / quickstart / "submit your first job"). Record `source_url`. Do not edit
  the code in `snippet.code`.
- **Local-simulator check.** Create a scratch venv in your scratch folder:
  `uv venv --python 3.12 <scratch>/venv` (Python 3.14 lacks wheels for many SDKs), then
  `uv pip install --python <scratch>/venv/bin/python <sdk>`. Write a test file that
  contains the verbatim snippet with only the device/backend substituted by the SDK's
  **local simulator** (e.g. `LocalSimulator()` for Braket, `AerSimulator()` / `StatevectorSampler`
  / a fake backend for Qiskit, `cirq.Simulator()`, pytket `AerBackend`, Ocean's
  `dimod.ExactSolver` / `neal.SimulatedAnnealingSampler`, PennyLane `default.qubit`,
  Perceval local `SLOS` backend, `qsharp`/`azure-quantum` local resource estimation only if
  no QPU call). Record exactly what you substituted in `sim_check.substitution`, plus
  `sdk_version`, `python_version`, `ran_at`, `simulator`, a short `output_excerpt`, and
  `status` `passed` / `failed` (with the error in `notes`) / `not_run` (with why).
- **Never** call a paid or real QPU, never create accounts, never use credentials. If a
  snippet requires a token even to construct objects, substitute only that part, and
  say so; if it can't run without an account, record `not_run`.
- Save your test scripts in the scratch folder so counsel can re-run them.

## Fetching

Same rules as AGENTS.md. Docs sites are usually fine with the declared UA. GitHub raw
files of the official docs repos (e.g. `raw.githubusercontent.com/amazon-braket/...`)
are acceptable `source_url`s when the docs page itself renders the same snippet, but
prefer the rendered docs page URL and check the snippet against the page text.

Save early and every ~5 routes. Run `node scripts/validate.mjs access` before finishing.
