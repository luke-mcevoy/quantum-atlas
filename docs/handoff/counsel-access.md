# Counsel scrutiny: access

Analyst: cursor-grok-access. File: `data/research/access.json`. Generated 2026-10-02.
Raw pages and simulator scripts: `scratch/analyst-access/`. Quote check: `scratch/analyst-access/check_quotes.py` (whitespace, curly quotes, hyphens, ligatures; tags not stripped).

`node scripts/validate.mjs access` reported 0 errors in this file. The three site-id warnings are in other research files.

## Snippets

| Route | SDK | Status |
| --- | --- | --- |
| acc:aws-braket-ionq-forte-1 | amazon-braket-sdk 1.127.3.post0 | passed on `LocalSimulator` |
| acc:ibm-quantum-ibm-fez | qiskit 2.5.2, qiskit-ibm-runtime 0.50.0, qiskit-aer 0.17.2 | passed on `FakeBelemV2` |
| acc:d-wave-leap-advantage2 | dimod 0.12.22 | passed on `ExactSolver` |
| acc:ionq-cloud-forte-1 | qiskit-ionq 1.1.1 | **not_run** |

**not_run — IonQ.** The Qiskit guide's Bell-state sample calls `simulator_backend.run`. `IonQProvider()` constructs, then `run` raises `IonQCredentialsError: Credentials token may not be None`. The page says the job runs on IonQ's platform. No account was created and no token was supplied. Script: `scratch/analyst-access/test_ionq.py`.

**IBM version pin.** The hello-world page says `qiskit-ibm-runtime~=0.47.0`. The local run used 0.50.0, which still provides `FakeBelemV2` and `Estimator(backend)`. The Markdown blockquote prefixes each line with `> `; only those prefixes were removed. `qc` and `observables` come from earlier cells on the same page. `QiskitRuntimeService` was not called. `qiskit-aer` was installed because `Estimator.run` on `FakeBelemV2` requires it.

**No snippet attached** for Azure Quantum, IQM Resonance, Pasqal Cloud, OQC Cloud, or Quantinuum Nexus:

- Azure quickstart URLs that were tried returned Not Found. The overview names Q#, Qiskit, Cirq, and OpenQASM but the fetched pages had no contiguous local sample.
- Pasqal's getting-started sample needs a platform password, and the fetched HTML stores the quotes as entities, so there is no contiguous runnable Python block.
- Quantinuum's signup flow is interest registration. A job sample would need a Nexus account.
- The IQM Resonance and OQC Cloud pages that were fetched do not include a job sample.

## Tiers that were ambiguous

- **OQC Cloud / Toshiko** is recorded as `application`. The page says "on-demand access" and the call to action is "GET IN TOUCH". It does not publish a price or a self-serve plan.
- **IBM eu-de backends** (`ibm_aachen`, `ibm_berlin`) are recorded as `paid`. The computers page lists them public and online in `eu-de`. The plans page says Open Plan instances can only be created in `us-east`, and that paid plans pay for QPU consumption. The plans page does not name these two backends.
- **IQM Resonance.** Starter is "for free" with "up to 30 credits per month". The same page also shows "(up to 1h)" and a pay-as-you-go heading, and says IQM Star 24 "is now available in beta". Crystal 54, Crystal 20, and Star 24 are all recorded as `open_free` on the Starter wording. Whether the beta QPU is inside that credit pool is not stated.
- **D-Wave Leap.** Recorded as `application` because the cloud page offers "Apply for Free Trial". The fetched pages do not publish a paid price list. Palo Alto is "Corporate Headquarters". Boca Raton on the same structured-data block is described as coming soon, so it was not used as the current HQ.
- **Azure Quantinuum H2-1 and H2-2.** The target list names the two machines. The pricing page states Standard, Premium, and Pay as You Go for System Model H2, and does not repeat the machine names.
- **Azure IonQ Aria 1** is still on Microsoft's pricing page (last updated 2025-12-23) and target list (updated 2026-04-23). IonQ's own backends page, fetched the same day, marks Aria 1 Retired. The route is kept because Azure's page still lists it, and it points at `sys:ionq-aria`.
- **Braket Rigetti Ankaa-3** is on the devices page. The pricing family table fetched the same day does not name Ankaa-3. The route uses the page's general on-demand per-task and per-shot sentence.
- **Quantinuum Nexus** is `application` from the signup page (register interest; not everyone is granted access). The hardware page also says subscription users can access Quantinuum hardware. No public price was found.
- **Amazon Web Services HQ.** The fetched About AWS page does not name a city. The Seattle point is the "Seattle headquarters" line on Amazon's about page.

## Devices with no `sys:` id (`system_hint`)

These names are the platform's own strings. They were not matched to a generation-level system already in `data/research/`.

- Amazon Braket: `IBEX-Q1` (not MARMOT or LYNX)
- Azure Quantum: `FRESNEL`, `FRESNEL_CAN1`, `Quantinuum H2-1`, `Quantinuum H2-2`
- IBM Quantum Platform: `ibm_boston`, `ibm_kingston`, `ibm_pittsburgh`, `ibm_fez`, `ibm_marrakesh`, `ibm_miami`, `ibm_phoenix`, `ibm_aachen`, `ibm_berlin` (not `sys:ibm-heron` or `sys:ibm-nighthawk`; the computers page says the Nighthawk backends are online)
- IQM Resonance: `IQM Crystal 54`, `IQM Crystal 20`, `IQM Star 24`
- Pasqal Cloud: `FRESNEL`, `FRESNEL_CAN1`, `FRESNEL_SA1` (not `sys:pasqal-ruby`)

## Name matches to check

- Braket `IonQ Forte-1` and Azure `IonQ Forte 1` use `sys:ionq-forte`. Braket `IonQ Forte-Enterprise-1` and Azure `IonQ Forte Enterprise 1` use `sys:ionq-forte-enterprise-quantumbasel`. The Basel location is on IonQ's backends page (`qpu.forte-enterprise-1`, Basel), not on the Braket devices page.
- D-Wave `Advantage2` and `Advantage` use `sys:d-wave-advantage2` and `sys:d-wave-advantage` from `spin_topo_anneal.json`.

## Platforms with no route

Recorded in `gaps[]`: Google Quantum AI (approved list, no processor named), Alice & Bob (Forbidden; docs host did not resolve), Fujitsu (Too Many Requests; not retried), Xanadu Cloud (JavaScript shell; cloud host did not resolve), Quandela Cloud (no named QPU and no tier), Rigetti QCS (no QPU named on the fetched QCS page), AQT ARNICA (remote access stated, no tier; the Braket IBEX route is separate), Origin Quantum Cloud (Wukong and free machine time to claim are on the homepage, but no headquarters address was fetched, so the operator was not defined), Pasqal on Google Cloud, OVHCloud, and Scaleway (tiers not stated; Azure is a separate route), Infleqtion Superstaq / Sqale (QPU target and API key are documented; the pages do not say whether the key is free, paid, or approved).
