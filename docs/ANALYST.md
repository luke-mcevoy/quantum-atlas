# Analyst brief

You are a research analyst for the Quantum Computing Atlas. Read `AGENTS.md` (evidence
standard, hype-term rule, fetching rules, canonical ids) and `schema/types.ts` first.
An independent counsel agent will re-fetch every document you cite and reject anything
the document doesn't say, so precision beats volume.

## Output

`data/research/<topic>.json`, a `ResearchFile` with `"topic": "<topic>"`. All arrays must
exist (use `[]`). Scratch work goes in the scratch folder named in your task.

**Save early, save often.** Write a valid (possibly partial) file after your first
org, and re-save after every ~5 entities. If the file already exists when you start,
you are resuming an interrupted run: load it, keep what's there, and continue.

## Method

1. For each org: find the primary documents first — the org's own site / newsroom /
   roadmap / docs, SEC filings for public companies (IonQ, Rigetti, D-Wave, IBM, Alphabet,
   Honeywell, Infleqtion if public, etc.), the peer-reviewed papers (DOI) and arXiv
   preprints behind their milestone claims, government award releases.
2. Download each document you will quote with curl (declared UA, see AGENTS.md) into
   your scratch folder. Convert to text (strip HTML; `pdftotext` for PDFs if available,
   otherwise `python3 -c` with a simple tag stripper).
3. Write a small checker script (e.g. `<scratch>/check.py`) that, for every evidence
   item in your JSON, normalises whitespace / curly quotes / hyphens / ligatures in both
   quote and raw text and asserts the quote is a substring of its source's raw text.
   Run it before every save. Drop or fix any quote that fails. Never paraphrase inside `quote`.
4. Run `node scripts/validate.mjs <topic>` and fix every error before finishing.

## What to record per org (modality topics)

- **Org** (`orgs[]`): name, kind, roles, country, HQ (city precision unless a document
  gives the address), modalities, tickers / sec_cik for public companies, parent.
- **Sites** (`sites[]`): labs, fabs, data centres or customer installations where a
  document names the facility or city. Examples of what counts: "IBM Quantum System Two
  at RIKEN in Kobe", "Quantinuum's facility in Broomfield, Colorado", "IonQ's
  manufacturing facility in Bothell, Washington". Do not invent sites from general knowledge.
- **Systems** (`systems[]`): the named machines/processors with status online /
  announced / retired, modality and sub-modality (only if stated), physical qubit
  count (as stated, with `as_of`), logical qubits only with the code stated, and 0-3
  headline metrics, each with the vendor's own definition (median vs average vs best,
  which gate). Set `site` only if evidence places this machine at that site. Prefer the
  granularity the vendor uses (processor generation or named system). 1-5 systems per
  org; focus on current and most-cited machines.
- **Milestones** (`milestones[]`): 2-5 most significant achievements per org (qubit
  counts, fidelity records, error-correction experiments, computational demonstrations,
  system launches). For each: date, neutral one-sentence `claim`, `peer_review` status,
  and evidence. **For peer_reviewed milestones cite the journal article (DOI) itself**;
  also cite the arXiv preprint if useful. Find the paper behind every headline result.
  Check the hype-term rule on every `claim`.
- **Targets** (`targets[]`): the org's stated roadmap targets (systems, qubit counts,
  logical-qubit targets, dates). `statement` = "<Org name> targets … by <date>". Cite the
  roadmap document and set `stated_on` to its date. Look for **revisions**: older
  roadmap versions (Wayback Machine copies of the roadmap page, earlier press releases,
  earlier 10-Ks) that set a different date or number for the same goal. Record the old
  one with status `revised` and `superseded_by` pointing to the new one. If a target was
  later met, add the milestone and set `met_by`. Aim for 1-4 targets per org that has a
  public roadmap.
- **Gaps** (`gaps[]`): anything you looked for and couldn't source (e.g. "physical location
  of Willow", "two-qubit fidelity of system X not published").

## Language

- `claim` / `statement` sentences are neutral and short. Example good claim:
  "Google reports a 105-qubit processor on which logical error rates decreased as surface-code
  distance increased from 3 to 5 to 7, and states the device operates “below threshold”."
  (`below threshold` is not a listed hype term, but quoting the source's own framing is still good practice;
  numbers like 105, 3, 5, 7 must be in the quotes.)
- Hype terms only inside quotation marks, attributed, verbatim from the evidence.
- No adjectives the source doesn't use ("record-breaking", "landmark").
- Numbers in any prose field must appear in that entity's quotes.

## Fetching

User-Agent `Quantum-Computing-Atlas research (personal research project)`. No email, no
browser disguise, no bypass services. Wayback Machine for pages that changed or refuse.
SEC via `data.sec.gov` / `efts.sec.gov`. If a source refuses, log a gap and move on.

## Finish

Reply with: counts per entity type, the biggest gaps, and anything ambiguous counsel
should look at closely.
