# Session journal

## 2026-10-01 — Claude (Opus 5.5): kickoff
- Repo scaffolded from the AI Supply Chain Atlas (../ai-supply-chain, read-only template): schema/types.ts
  (orgs, sites, systems, milestones, targets, access routes, relationships), AGENTS.md (evidence tiers,
  hype-term rule, fetching rules, canonical ids), docs/COUNSEL.md, docs/ANALYST.md, docs/ACCESS.md,
  scripts/validate.mjs + scripts/lib/rules.mjs (hype-term and peer-review checks).
- Research topics: superconducting_a, superconducting_b, trapped_ion, neutral_atom, photonic,
  spin_topo_anneal, access, relationships. Analysts write data/research/<topic>.json; counsel (Sonnet)
  writes data/verification/<topic>.json. Max 4 agents at once.

## 2026-10-01 (late morning) — Claude (Opus 5.5): wave 2
- Analysts done: neutral_atom, superconducting_a, superconducting_b, trapped_ion (all validate, 0 errors).
- Running: photonic, spin_topo_anneal, access analysts; neutral_atom counsel (Sonnet). Max 4 agents.
- Queue: relationships analyst; counsel for superconducting_a/b, trapped_ion (notes in docs/handoff/), photonic,
  spin_topo_anneal, access, relationships. Then verified build, stories, audit baseline, tests, screenshots.

## 2026-10-01 23:50 ET — Cursor coordinator: wave 3
- Checked mtimes. Done and idle: neutral_atom, superconducting_a, superconducting_b, trapped_ion.
  photonic.json last written 23:38 (partial: 2 orgs, 8 sites, 5 systems, 7 milestones, 9 targets, 23 sources).
  spin_topo_anneal.json, access.json, and data/verification/ are absent. A Claude Code session still has
  monitors on this repo, so those four files stay untouched.
- Started the four jobs HANDOFF.md marks safe, at the 4-agent cap: relationships analyst; counsel for
  superconducting_a, superconducting_b, and trapped_ion. Counsel is a separate agent from the Claude
  analysts and must not edit data/research/. Scratch: scratch/analyst-relationships/ and
  scratch/counsel-<topic>/.
- Port 5179 still has the Vite dev server (pid 72627). Not touched. No commit, push, or deploy.

## 2026-10-02 00:02 ET — Cursor coordinator: trapped_ion counsel done
- data/verification/trapped_ion.json: 50 publish, 10 publish_flagged, 0 reject. 58 sources, 165 evidence
  checks, 60 entities. node scripts/validate.mjs trapped_ion: 0 errors. Research file was not edited
  (parent co:honeywell warning remains until build applies the correction).
- superconducting_a and superconducting_b verification files are on disk with matching entity counts.
  Not relaunched.
- Slot used for counsel neutral_atom. photonic.json still idle since 23:38 (partial). relationships.json
  not written yet.

## 2026-10-02 00:03 ET — Cursor coordinator: superconducting counsel done
- superconducting_a: 46 publish, 14 publish_flagged, 2 reject (tgt:rigetti-1000q-3yr-2026, tgt:alice-bob-lithium).
  superconducting_b: 49 publish, 24 publish_flagged, 0 reject. validate: 0 errors on both. Research files untouched.
- Two slots filled: resume photonic analyst (keep PsiQuantum and Xanadu; add Quandela, ORCA, USTC Jiuzhang);
  start spin_topo_anneal analyst. relationships scratch is active, so that analyst was not relaunched.
  access waits for the next free slot.

## 2026-10-02 00:11 ET — Cursor coordinator: neutral_atom counsel done
- data/verification/neutral_atom.json: 91 publish, 15 publish_flagged, 1 reject (site:ims-japan). 74 sources,
  215 evidence checks, 107 entities. validate: 0 errors. Research file not edited. Aquila as_of corrected
  in the verification file to 2026-06-15.
- relationships.json now exists (00:10; 25 sources, 31 relationships) and is still being written.
- Slot used for the access analyst. Cap is full.

## 2026-10-02 00:13 ET — Cursor coordinator: relationships analyst done
- data/research/relationships.json: 25 sources, 29 orgs, 31 relationships, 11 gaps. validate: 0 errors.
  Scrutiny list is docs/handoff/counsel-relationships.md. Research file not edited after the analyst finished.
- Slot used for relationships counsel. Photonic, spin_topo_anneal, and access analysts still occupy the other slots.

## 2026-10-02 00:18 ET — Cursor coordinator: relationships counsel done
- data/verification/relationships.json: 32 publish, 25 publish_flagged, 3 reject
  (rel:honeywell-cambridge-quantum-combination, rel:uk-testbed-quera, rel:uk-testbed-rigetti).
  25 sources, 160 evidence checks, 60 entities. validate: 0 errors. Research file not edited.
- Build can still inherit Honeywell as Quantinuum's parent from trapped_ion.json. Left for the verified build.
- No new agent. Photonic JSON was rewritten at 00:17, and the spin and access scratches are still active.
  The free slot stays empty until one of those files goes idle.

## 2026-10-02 00:20 ET — Cursor coordinator: photonic analyst done
- data/research/photonic.json: 45 sources, 5 orgs, 13 sites, 15 systems, 19 milestones, 16 targets, 22 gaps.
  validate: 0 errors. PsiQuantum and Xanadu kept; Quandela, ORCA, and USTC Jiuzhang added.
  Scrutiny list: docs/handoff/counsel-photonic.md. The resume did not re-fetch the 2026-10-01 PsiQuantum and Xanadu sources.
- Slot used for photonic counsel. Spin and access analysts are still fetching, so the fourth slot stays empty.

## 2026-10-02 00:21 ET — Cursor coordinator: spin_topo_anneal analyst done
- data/research/spin_topo_anneal.json: 24 sources, 7 orgs, 7 sites, 9 systems, 16 milestones, 3 targets, 13 gaps.
  validate: 0 errors. Scrutiny list: docs/handoff/counsel-spin_topo_anneal.md.
- Slot used for spin_topo_anneal counsel. Access analyst is still fetching. Photonic counsel is still running.
  One slot remains empty.

## 2026-10-02 00:25 ET — Cursor coordinator: user asked to finish the app
- Verified build of the topics that already have counsel (no --draft). Published: 52 orgs, 62 systems,
  83 milestones, 66 targets, 28 relationships, 0 access routes. Photonic and spin_topo_anneal skipped
  until their verification files exist. Access has no research file yet.
- First story is in app/src/stories.ts ("The race to logical qubits"), grounded in that build.
  Still to write after the remaining files land: "Every modality, one machine each" and
  "How to run your first program on real hardware". Then full validate, rebuild, number audit,
  tsc, unit tests, vite build, Playwright, and desktop/phone screenshots.
- Do not create a GitHub repo or deploy. Ask the user before publishing.

## 2026-10-02 00:27 ET — Cursor coordinator: photonic counsel done
- data/verification/photonic.json: 61 publish, 7 publish_flagged, 0 reject. 45 sources, 165 evidence checks,
  68 entities. validate: 0 errors. Research file not edited.
- Rebuilt the verified atlas so photonic systems are included. Story test still passes.
- Spin counsel and the access analyst are still running. Modality story and access story wait on them.

## 2026-10-02 00:30 ET — Cursor coordinator: spin_topo_anneal counsel done
- data/verification/spin_topo_anneal.json: 30 publish, 12 publish_flagged, 0 reject. 24 sources, 115 evidence
  checks, 42 entities. validate: 0 errors. Intel's 2024 target corrected from missed to open.
  The Science annealing result was reclassified to preprint. Research file not edited.
- Rebuilt the verified atlas (86 systems, all eight modalities). Added the story
  "Every modality, one machine each". Access research is still being written, so the
  third story and the full app check wait on it.

## 2026-10-02 00:50 ET — Cursor coordinator: publishing
- Access research is on disk and validates, but it has no verification file, so the verified
  build still publishes zero access routes. The Access view says so.
- Published prose no longer states numbers that are absent from that item's quotes (Euro-Q-Exa
  150-qubit note, two "10-K" wordings, an Aramco inauguration day, and two qubit counts on
  targets whose quotes do not contain them). A European decimal comma in an AQT quote now
  matches the same number written with a period. A preprint record that counsel could not
  fetch as a journal article is published as a preprint.
- Unit tests and the browser smoke suite passed on the verified build. The user asked to
  publish the app and add it to luke-mcevoy.github.io.
