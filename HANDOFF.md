# Handoff: AI Supply Chain Atlas + Quantum Computing Atlas

For any AI agent (Cursor, Codex, Claude) continuing this work. Written 2026-10-01 by the previous
coordinator (Claude Opus 5.5 in Claude Code). Read all of this before touching anything.

There are two repos:

| Repo | Path | State |
|
> **Next feature (2026-10-02):** "Run it today", a buyer's guide covering which machines a company can submit work to now,
> which problem types fit, tested examples, pricing and an honesty panel. The full plan is in **`docs/RUN-TODAY-PLAN.md`**.
> Start there.

---|---|---|
| **AI Supply Chain Atlas** | `~/Develop/Code/ai-supply-chain` | **Live and stable.** Fully verified, on GitHub, deployed. Maintenance only. |
| **Quantum Computing Atlas** | `~/Develop/Code/quantum-atlas` | **In progress.** About a third of the research is done, nothing is verified, no GitHub repo, not deployed. **This is the work to continue.** |

The quantum repo is a fork of the supply-chain repo's architecture. When unsure how something should work,
read how the supply-chain repo does it.

---

## 1. Rules that override everything else

These rules are the product. The user's standard is "legally and financially sound, not quotes from news
articles".

1. **Separate agents for research and verification.** One agent (the *analyst*) writes `data/research/<topic>.json`.
   A *different* agent (the *counsel*) re-fetches every cited document and writes `data/verification/<topic>.json`.
   Never let the same agent or chat verify its own research. Use a different model for counsel where possible.
2. **Quotes are verbatim.** Every evidence quote must appear word for word in a document the agent actually
   fetched. Save raw copies in a scratch folder and check every quote programmatically before writing.
   Never reconstruct a quote from memory.
3. **Only verified data is published.** `node scripts/build.mjs` publishes only entities counsel approved
   (`publish` or `publish_flagged`). `--draft` is for local viewing only. **Never commit or deploy a draft build;**
   CI rejects it.
4. **No numbers without a source.** Every number in a description, note, statement or story caption must
   appear in that entity's own quotes. `scripts/audit-numbers.mjs` enforces this against a reviewed baseline
   (`data/audit-baseline.json`). Only run `--write-baseline` after confirming each new number against its source.
   Invented figures slipped into prose four times in the supply-chain project and were caught by this check.
5. **Never draw a site the evidence doesn't name.** If a document names a company but not a site, draw the
   claim at headquarters and label it. In the supply-chain project, guessing by stage once drew every NVIDIA GPU
   route from an Israeli office.
6. **Fetching etiquette (binding):**
   - Use a declared User-Agent, e.g. `Quantum-Computing-Atlas research (personal research project)`.
   - **Never use an email address** in it; the user hasn't approved one.
   - **Never disguise requests as a browser** and never use anti-bot or bypass services.
   - www.sec.gov returns 403 to undeclared tools. Use `data.sec.gov` (submissions) and `efts.sec.gov` (EDGAR full-text
     search, which mis-tokenises curly apostrophes, so search a nearby phrase) or Wayback Machine copies.
   - If a source refuses, mark it `unreachable` and log a gap.
7. **Neutral language.** Restate what documents say. For quantum: "advantage", "supremacy", "logical qubit",
   "error-corrected" and "fault-tolerant" may appear **only inside a quote attributed to its source**. Roadmap items
   are always "<company> targets X by <date>" and are never shown as achieved. The validator enforces this.
8. **Never publish without the user.** No new GitHub repos, pushes to new remotes, deploys, scheduled routines or
   paid API calls without explicit user approval. Pushing to the existing ai-supply-chain repo is allowed (the user
   approved it), but CI must pass.
9. **Budget hygiene.** Run at most about 4 research or review agents at once. Each agent saves its output file early and
   re-saves every ~5 entities. If one is interrupted, resume it from its file; don't restart from scratch.
10. **Session journal.** Read `SESSION.md` first and append a dated entry when you finish.

---

## 2. Quantum Computing Atlas: what's left (the main task)

### Read first, in order
`AGENTS.md` → `schema/types.ts` → `docs/ANALYST.md` → `docs/ACCESS.md` → `docs/COUNSEL.md` → `docs/handoff/*.md`
(the queue and per-topic notes for reviewers) → `SESSION.md`.

### Research status (snapshot 2026-10-01; files are in `data/research/`)

| Topic file | Analyst | Counsel | Contents |
|---|---|---|---|
| `neutral_atom.json` | **done** | **running** (Claude Sonnet, launched ~10:35) | 74 sources, 17 systems, 27 milestones (16 peer-reviewed), 25 targets |
| `superconducting_a.json` | **done** | not started; give it the notes in `docs/handoff/counsel-superconducting_a.md` | IBM, Google, Rigetti, AWS, Alice & Bob: 14 systems, 18 milestones, 16 targets |
| `superconducting_b.json` | **done** | not started; notes in `docs/handoff/counsel-superconducting_b.md` | IQM, OQC, Fujitsu/RIKEN, USTC, Origin: 17 systems, 21 milestones, 14 targets |
| `trapped_ion.json` | **done** | not started; notes in `docs/handoff/counsel-trapped_ion.md` | Quantinuum, IonQ, Oxford Ionics, AQT: 14 systems, 17 milestones, 13 targets |
| `photonic.json` | **running** (Claude, launched ~10:35) | not started | may be partial |
| `spin_topo_anneal.json` | **running** (Claude, launched ~11:00) | — | spin/silicon (Intel, Diraq, Quantum Motion), topological (Microsoft), annealing (D-Wave), NV/other |
| `access.json` | **running** (Claude, launched ~11:00) | — | per `docs/ACCESS.md`: cloud routes, SDKs, tiers, verbatim official snippets, each run against the SDK's **local simulator** in a scratch venv. Never call real or paid hardware; never create accounts. |
| `relationships.json` | **not started** | — | acquisitions, partnerships, government contracts and awards (DARPA QBI, DOE, national programs), funding only from primary sources |

**Before you start:** Claude agents may still be writing `photonic.json`, `spin_topo_anneal.json`, `access.json` and `data/verification/neutral_atom.json`. Safe to start in parallel: the `relationships` analyst, and counsel for `superconducting_a`, `superconducting_b` and `trapped_ion`.
Check modification times (`ls -l data/research`). If a file changed in the last ~15 minutes, leave it alone. When they
stop, an analyst can resume a partial file: read it, keep what's there, and fill in the topic's remaining orgs.

### Remaining steps
1. **Finish the analysts:** photonic (if incomplete), spin_topo_anneal, access, relationships. Each one
   follows `docs/ANALYST.md` (or `docs/ACCESS.md`), validates with `node scripts/validate.mjs <topic>` and finishes
   with a report listing counts, gaps and "items counsel should scrutinise".
2. **Run counsel for each topic** (a separate agent or chat, ideally a different model), following `docs/COUNSEL.md`. Pass it the analyst's
   scrutiny list (examples are in `docs/handoff/`). Counsel writes `data/verification/<topic>.json` and gives **every**
   entity a verdict.
3. **Build and check:**
   ```bash
   node scripts/validate.mjs          # 0 errors required
   node scripts/build.mjs             # verified build (never --draft for commits)
   node scripts/audit-numbers.mjs     # confirm new numbers, then --write-baseline
   node scripts/check-build-fresh.mjs
   cd app && npm ci && npx tsc --noEmit && npm test && npx vite build && npx playwright test
   ```
4. **Write the stories** in `app/src/stories.ts`. `STORIES` is empty, so the stories test fails until it isn't. Suggested:
   "The race to logical qubits", "Every modality, one machine each", "How to run your first program on real hardware".
   The rule: **captions only frame; claims are verbatim quotes** referenced by `{entity, ev}`. The test fails if a caption
   number isn't in that step's quotes or dates. See `~/Develop/Code/ai-supply-chain/app/src/stories.ts` for the pattern.
5. **Screenshot-check** desktop (1600×950) and phone (390×844) with Playwright. Look at every view: Modality, Roadmap,
   Access, inspector, data table, stories.
6. **Known open issues:**
   - Aquila's qubit count showed an unverified "as of 2026-10-01" date in a draft. Check it after counsel.
   - The phone screenshot of the Roadmap view hasn't been reviewed.
   - The research files listed in `git status` may be uncommitted; commit verified work as you go.
   - Port 5179 may have a stale dev server running (`lsof -iTCP:5179`).
7. **Ask the user before publishing.** It needs their approval for a GitHub repo (suggested `luke-mcevoy/quantum-atlas`)
   and the Fly app `quantum-computing-atlas` (already in `fly.toml`).

### Quantum-specific judgement calls already agreed
- **Peer-review status follows the source:** `peer_reviewed` needs a journal DOI, `preprint` means arXiv,
  `company_claim` is everything else. APS journal pages return 403; Crossref metadata or arXiv journal-ref records
  are acceptable evidence of peer review.
- **Paper over blog.** When a company figure conflicts with its paper (e.g. Atom Computing's blog fidelity vs its
  PRX Quantum paper), use the paper's figure and record the blog figure as company framing.
- **Advantage claims stay open.** A target like IBM's "quantum advantage" stays `open` while the supporting results
  are preprints and the company's own wording needs community verification.
- **`logical_qubits` only with the code named.** If the code isn't stated, keep the count in a quoted company claim only.
- **Targets that slip become revision chains** (`superseded_by`), e.g. Pasqal's 10,000-qubit target: 2026 → 2026–27 → 2028.
- **Metrics are never compared across vendors** as if they were like-for-like; each keeps its own definition.

---

## 3. AI Supply Chain Atlas: maintenance only

- **Live:** https://ai-supply-chain-atlas.fly.dev/
- **GitHub:** https://github.com/luke-mcevoy/ai-supply-chain (CI on every push: validate, fresh build, prose audit, tsc,
  56 unit tests, 7 Playwright tests)
- **Deploys** are manual with `fly deploy --remote-only`, because CI's deploy job skips until a `FLY_API_TOKEN` secret exists.
- **Monthly refresh:** the cloud routine `trig_01ELXJ4Dxy52UsA3tv2GtWE3` (claude.ai/code/routines) runs on the 1st at 14:00 UTC,
  following `docs/REFRESH.md`, and **opens a pull request for human review**. Its first run was 2026-10-01; review that PR.
- **Open follow-ups** (also in its SESSION.md):
  - **Biggest research gap:** a capturable document tying TSMC fabs to EUV. TSMC's sites block automated access; this is why
    ASML doesn't show as a documented single point of failure.
  - Proper citations for the CoreWeave $3.7B notes (8-K, accession 0001769628-26-000432) and Microsoft's capex cash-flow line.
  - Re-verify the Applied Materials and Ultra Clean FY2025 10-Ks (SEC was unreachable, so the Ultra Clean routes are withheld).
  - 144 route ends are still drawn at a company's HQ; the linkage method is in `docs/LINKAGE.md`.
  - Bump the GitHub Actions versions off Node 20, and add the `FLY_API_TOKEN` repo secret for automatic deploys (user action).

---

## 4. Running this in Cursor (or any tool without built-in subagents)

Use **separate chats or agents** for the analyst and the counsel of each topic. That separation is the integrity mechanism. A
working pattern:

- **Analyst chat prompt:** "You are the analyst for topic `<topic>` in `~/Develop/Code/quantum-atlas`. Read `HANDOFF.md`
  §1, `AGENTS.md`, `schema/types.ts` and `docs/ANALYST.md` (or `docs/ACCESS.md`). If `data/research/<topic>.json` exists,
  resume it. Save every ~5 entities. Validate with `node scripts/validate.mjs <topic>`. End with a report of counts,
  gaps and items counsel should scrutinise."
- **Counsel chat prompt (new chat, different model if possible):** "You are counsel for `<topic>`. Read `HANDOFF.md` §1,
  `docs/COUNSEL.md` and `schema/types.ts`. Never edit `data/research/`. Re-fetch every source and check every quote
  verbatim. Write `data/verification/<topic>.json` with a verdict for every entity. Analyst's scrutiny list: <paste>."
- **Coordinator chat:** runs the build, checks and UI work in §2 steps 3–6, and keeps `SESSION.md` up to date.
