# Monthly refresh

Keeps the atlas current without lowering the evidence bar. One run takes the same path as the original build:
analysts research, counsel verifies, CI checks, and a human merges.

## Steps (for the agent running the refresh)

1. **List what's new.** Run `node scripts/refresh-check.mjs`. It writes `data/refresh/candidates-<date>.json` with
   SEC filings from every public org in the atlas and quant-ph arXiv preprints mentioning tracked orgs or systems
   since `data/refresh/state.json`. Also re-read each vendor's roadmap page: roadmaps change without a filing.
2. **Triage.** Keep only items that change something the atlas shows:
   - a new or retired system, or a changed qubit count or headline metric;
   - a new milestone, or a preprint that has since appeared in a journal (upgrade peer-review status by citing the DOI);
   - a roadmap target that was met, missed or revised (add the new target and set `superseded_by` / `met_by`);
   - a new access route, or a changed access tier;
   - a new acquisition, partnership, government award or contract.
   Skip unrelated filings; record skipped items in one line each in the PR description.
3. **Research** (analyst subagent, `docs/ANALYST.md` rules) into the right `data/research/<topic>.json`. Never delete
   evidence; mark revised targets `revised` with `superseded_by`.
4. **Verify** (a *separate* counsel subagent per touched topic, `docs/COUNSEL.md`). Check only new or changed entities
   and merge verdicts into the existing `data/verification/<topic>.json`. Never drop earlier verdicts.
5. **Check.** `node scripts/validate.mjs`, `node scripts/build.mjs`, `node scripts/audit-numbers.mjs` (confirm any new
   number against its source, then `--write-baseline`), `cd app && npm test`.
6. **Advance and propose.** `node scripts/refresh-check.mjs --advance`, commit on a branch `refresh/<yyyy-mm>`, open a
   pull request with counsel's counts. **Never push to `main`;** a human reviews and merges, and CI must pass first.

## Fetching

User-Agent `Quantum-Computing-Atlas refresh (personal research project)`. No email, no browser disguise, no bypass
services. SEC via `data.sec.gov` / `efts.sec.gov`. If a source refuses, mark it unreachable.
