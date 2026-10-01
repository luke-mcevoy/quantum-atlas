# Quantum Computing Atlas — AGENTS.md

A public-quality 3D globe of the world's quantum computers: who builds them, which
modality each uses, what each has **demonstrably achieved**, what each **says it will
achieve next**, where the machines physically are, and **how someone can submit a
program** to them. Every displayed claim traces to a verbatim quote in a primary
source, checked by an independent reviewer.

Sister project and template: the AI Supply Chain Atlas (`../ai-supply-chain`). Same
pipeline, same standards, adapted to quantum hardware.

## Pipeline

```text
1. Analysts   → data/research/<topic>.json        (schema/types.ts: ResearchFile)
2. Counsel    → data/verification/<topic>.json    (schema/types.ts: VerificationFile)
3. Build      → node scripts/build.mjs → data/build/atlas.json (+ app/public/atlas.json)
4. App        → app/ (Vite + React + deck.gl GlobeView) renders atlas.json
```

`node scripts/validate.mjs` checks structure, cross-references and the language rules
below. It must pass before anything gets committed. Analysts never verify their own
work: counsel is a separate agent (run on a different model for independence).

## Evidence standard (binding)

| Tier | What | Examples |
| ---- | ---- | -------- |
| 1 | Peer-reviewed, legal / regulatory, government | Nature / Science / PRL / PRX / npj QI papers (cite the DOI), SEC filings (10-K, 10-Q, 8-K, S-1, S-4, 424B), statutory annual reports, government awards, contracts and agency releases (DARPA QBI, DOE, national programmes) |
| 2 | Official primary, not peer reviewed | Company press releases, official roadmaps, official documentation and technical blogs, investor presentations, university / national-lab releases about their own machines, **arXiv preprints (always labelled "preprint")** |
| 3 | Secondary (last resort) | News. Only when no Tier 1/2 exists; always flagged in the UI; never the only support for a milestone or a relationship |

Rules:

1. **Quotes are verbatim.** Every `Evidence.quote` must appear word for word in the cited
   document. Save a raw copy of every document you quote and check each quote
   programmatically before writing it. Counsel re-fetches and re-checks every one.
2. **Cite the document itself, not coverage of it.** A news story about a Nature paper
   is not the paper. Link the DOI landing page / arXiv abstract / SEC filing / official page.
3. **Achieved vs targeted.** A `Milestone` is something a source says has been done. A
   `Target` is something a source says will be done; its `statement` always reads
   "<Org> targets X by <date>". Never record a target as a milestone or vice versa. If a
   later document revises a target, record both and set `superseded_by` on the earlier one
   (status `revised`); if a later document shows it was met, set `met_by`.
4. **Peer-review status is mandatory on every milestone**: `peer_reviewed` (a journal
   article with DOI is cited), `preprint` (an arXiv preprint is cited, no journal version
   found), or `company_claim` (only company/institution material).
5. **Hype terms are quoted and attributed, never asserted.** The words *advantage,
   supremacy, logical qubit(s), error-corrected / error correction milestone language,
   fault-tolerant / fault tolerance, beyond-classical, utility* may appear in a milestone
   `claim`, a target `statement`, a relationship `description` or a story caption ONLY
   inside quotation marks, attributed to the source ("Google states the chip operates
   “below threshold”"), and the quoted words must appear verbatim in that entity's own
   evidence. The validator enforces this. Neutral alternatives: "encoded qubits", "error
   rates decreased as code distance increased", "a sampling task".
6. **Metrics are as-stated, never compared.** Each `Metric` records the vendor's own
   `definition` (which gate, median vs mean vs best, which qubits, date). Never rank or
   compare metrics across vendors as like-for-like; the UI never does.
7. **Logical qubits** only where a source states BOTH the number and the code used.
8. **Locations.** `precision: "site"` needs a document naming the facility or address.
   A system is placed at a `Site` only when that site's or the system's evidence places
   *this* machine there. Otherwise it is drawn at its operator's HQ and labelled so.
   Never draw a specific site the evidence doesn't name.
9. **Unknown is an answer.** If something can't be sourced to Tier 1/2, put it in `gaps[]`.
10. **Neutral language.** Describe what documents say, not motives. No characterisation
    beyond the source. Numbers in prose only if they are in that entity's quotes
    (`scripts/audit-numbers.mjs` enforces this against a reviewed baseline).
11. **Funding** only from primary sources: SEC filings for public companies, official
    releases (company or agency) otherwise.

## Fetching rules (binding)

- Declare who is fetching: User-Agent `Quantum-Computing-Atlas research (personal research project)`.
  Never put an email address in it. Never disguise requests as a browser, never use
  anti-bot bypass services or proxies.
- SEC: use `https://data.sec.gov/submissions/CIK##########.json` to list filings and
  `https://efts.sec.gov/LATEST/search-index?q="exact phrase"&ciks=##########` for full-text
  search. `www.sec.gov/Archives` may refuse the declared UA; if so, use the IR-hosted copy
  of the same filing or log a gap.
- Archived copies: `https://web.archive.org/web/<date>/<url>` (record `archived_url`).
- If a source refuses, mark it unreachable and log a gap. Do not work around the refusal.
- arXiv: `https://arxiv.org/abs/<id>`; for full text `https://arxiv.org/pdf/<id>`.
  Journal pages often refuse automated access; the DOI landing page, the journal's
  open-access HTML, or the published abstract on the arXiv listing ("Journal reference")
  are acceptable ways to establish peer-review status, and quotes must come from text you
  actually fetched.

## File ownership (so analysts can work in parallel)

- Each topic file is **self-contained** for orgs: define every `co:` / `gov:` id you
  reference in your own `orgs[]`. Duplicates across files are expected and merged at build.
- Systems and sites are owned by the modality files. The `access` and `relationships`
  files reference `sys:` ids defined in any research file; if the system isn't recorded
  yet, set `target_org` and `system_hint` (the system's name) instead of inventing a `sys:` id.
- Milestones and targets live in the modality file of the org that made them.
- Access routes live in `access.json`; acquisitions, partnerships, awards, contracts and
  investments live in `relationships.json`.

## Canonical IDs

IDs are global across files. Use these exact ids for these entities; new ones follow
the pattern `co:<kebab>`, `gov:<iso2>-<agency>`, `site:<org>-<place>`, `sys:<org>-<name>`,
`ms:<org>-<slug>`, `tgt:<org>-<slug>`, `acc:<platform>-<system>`, `rel:<slug>`, `src:<slug>`.

```text
co:ibm co:google co:quantinuum co:honeywell co:ionq co:oxford-ionics co:rigetti co:d-wave
co:psiquantum co:atom-computing co:quera co:pasqal co:infleqtion co:xanadu co:quandela
co:orca co:photonic-inc co:alice-bob co:aws co:microsoft co:intel co:diraq co:quantum-motion
co:iqm co:oqc co:aqt co:planqc co:fujitsu co:riken co:origin-quantum co:ustc co:nvidia
gov:us-darpa gov:us-doe gov:us-dod gov:us-nsf gov:us-afrl gov:gb-ukri gov:gb-nqcc gov:de-bmbf gov:de-dlr
gov:fr-gov gov:jp-gov gov:eu-eurohpc gov:au-gov gov:ca-gov gov:kr-gov gov:cn-gov gov:nl-gov gov:dk-gov
```

Countries use ISO 3166-1 alpha-2 (UK = `GB`). Money keeps its original currency plus an ISO 4217 code.

## Session journal

Append dated handoff notes to `SESSION.md` after significant work. Commit trailer:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
