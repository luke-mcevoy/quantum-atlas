# Plan: Track record: how well have quantum companies' past predictions held up?

**For:** the Cursor agents that will build this. Read `HANDOFF.md` §1 (binding rules), `AGENTS.md` and
`docs/RUN-TODAY-PLAN.md` §1 first. This feature is the most legally sensitive part of the atlas: it says, with
evidence, where named companies did or did not deliver what they said. Accuracy, completeness and neutral language
are what make it credible, and what keep it fair.

## 0. The question this answers

> "When this company says it will deliver X by year Y, how much should I trust that, given what happened to its
> previous predictions?"

**What exists today:** 85 targets, of which 67 are open, 7 met, 2 missed and 9 revised. The oldest was stated in 2022.
That is mostly *future* promises with little history to judge them by. The value of this feature comes from **past
roadmaps and investor projections whose outcomes are now known**, roughly 2016–2024.

**Definition of done:** for each major company there is a complete, sourced ledger of every item in each of its past
roadmaps and investor projections, each with a classified outcome. Descriptive track-record statistics are computed from
that ledger. Every *future* target in the atlas carries its company's historical record next to it.

---

## 1. Rules specific to this feature (in addition to HANDOFF §1)

1. **Enumerate whole documents, not famous misses.** The unit of research is a **roadmap document**: a roadmap page,
   blog post, investor presentation or SEC exhibit. Capture **every** forward-looking item in it, the ones later
   met as well as the ones missed. Record `completeness: "all_items" | "partial"` per document. Track records are computed
   only from documents marked `all_items`, so cherry-picking can't skew the numbers.
2. **Classify outcomes by the target's own wording.** A target is "met" only if delivery matches what was stated: the same
   metric, at least the stated value, and the same conditions. For example, "1,000 logical qubits" is not met by 1,000 physical qubits.
   If only part was delivered, the outcome is `partially_met`, with what was and wasn't delivered quoted.
3. **Absence needs a search log.** Outcomes like "not delivered" or "no delivery found" require a `search_log`: which
   sources were checked (company newsroom, filings, roadmap updates, docs), when, and with which queries.
   The UI shows it as "No delivery found in the sources checked as of <date>", **never "failed"**, unless the company itself
   says the target was missed, cancelled or replaced.
4. **Neutral language only.** Statements say what happened, with dates: "IBM's 2020 roadmap targeted a 1,121-qubit
   processor ('Condor') in 2023; IBM announced Condor on <date>." No adjectives ("broken promise", "failed", "hype") outside
   attributed quotes. Extend the hype-term rule in `scripts/lib/rules.mjs` with: failed, broke, overpromised, misleading,
   hype, vaporware.
5. **Statistics are descriptive, with sample sizes.** Show "3 of 7 resolved targets met on time (n = 7)", never a bare
   percentage, a "trust score" or a forecast probability. Hide rates where n < 3, and show the individual items instead.
   Every computed number links to the ledger entries behind it.
6. **Fairness requires both directions.** Record early and over-deliveries (delivered ahead of date, or above the stated value)
   exactly like misses.
7. **Use the original documents.** Prefer the primary source for both the promise and the outcome. Investor projections should
   come from **SEC-filed exhibits**: SPAC merger investor presentations filed as 425/8-K exhibits, S-4/F-4 projection
   tables. Actuals come from 10-K/20-F. These are Tier 1, so they are the strongest possible comparison. Archived roadmap pages
   come from the Wayback Machine, with the capture date recorded.

---

## 2. Data contract changes (`schema/types.ts`, validator, build)

```ts
/** A dated forward-looking document. The unit of completeness. */
export interface RoadmapDocument {
  id: string;                    // "rd:<org>-<yyyy>-<slug>"
  org: string;
  title: string;
  published: string;             // date of the document (archived capture date if the live page is gone)
  kind: "roadmap_page" | "blog" | "investor_presentation" | "sec_exhibit" | "keynote" | "press_release" | "paper";
  url: string;
  archived_url?: string;         // Wayback capture used
  completeness: "all_items" | "partial";
  items: string[];               // Target.id / Projection.id of EVERY forward-looking item captured from it
  evidence: Evidence[];          // supports the document's date and authorship
}

// Target: extend
roadmap_doc: string;             // RoadmapDocument.id (required for new targets)
metric_kind: "physical_qubits" | "logical_qubits" | "fidelity" | "error_rate" | "system_availability"
           | "product_launch" | "customer_access" | "error_correction_demo" | "other";
target_value?: Figure;           // the stated value, quoted
due: { by: string; precision: "year" | "half" | "quarter" | "month" | "day" }; // "by 2023" → { by: "2023-12-31", precision: "year" }

/** The resolution of a Target. One per target, possibly updated over time. */
export interface Outcome {
  id: string;                    // "out:<target-slug>"
  target: string;
  result: "met_on_time" | "met_early" | "met_late" | "partially_met"
        | "revised_before_due"   // company moved the date or goal before the due date (link superseded_by)
        | "acknowledged_missed"  // company says it missed, cancelled or replaced it
        | "no_delivery_found"    // past due; nothing found in the search log; NEVER rendered as "failed"
        | "pending";             // not yet due
  resolved_on?: string;          // date of the delivery evidence or the acknowledgement
  delivered_value?: Figure;      // quoted
  delivered_by?: string;         // Milestone.id or System.id that delivered it
  slip_months?: number;          // computed by the build from due.by and resolved_on (never hand-entered)
  search_log?: { checked: string[]; queries: string[]; as_of: string }; // required for no_delivery_found
  statement: string;             // neutral, dated, numbers only as quoted
  evidence: Evidence[];
}

/** A quantitative investor projection (e.g. from a SPAC deck) and the actual reported figure. */
export interface Projection {
  id: string;                    // "prj:<org>-<metric>-<period>"
  org: string;
  roadmap_doc: string;           // the investor presentation / S-4 exhibit
  metric: "revenue" | "bookings" | "gross_margin" | "ebitda" | "customers" | "qubits" | "other";
  period: string;                // "FY2023"
  projected: Figure;             // quoted from the projection table
  actual?: Figure;               // quoted from the 10-K/20-F for that period (or an explicit restatement)
  evidence: Evidence[];          // must cover BOTH sides
}

/** A published claim later retracted, corrected or formally disputed in the literature. */
export interface ClaimRevision {
  id: string;                    // "cr:<slug>"
  subject: string;               // Milestone.id or a quoted claim
  kind: "retraction" | "correction" | "expression_of_concern" | "published_rebuttal";
  date: string;
  statement: string;             // neutral, e.g. "Nature retracted the 2018 paper on <date>"
  evidence: Evidence[];          // the journal notice / the rebuttal paper itself
}
```

**Build:** computes `slip_months`; per-company aggregates from `all_items` documents only (see §4); and links each future
Target to its company's aggregates. A missing `roadmap_doc` on a new target is a validator error, and existing targets get
backfilled.

**Validator:**
- `no_delivery_found` requires a `search_log`.
- `met_*` requires `delivered_by` or delivery evidence.
- `partially_met` requires the delivered value.
- Every `Projection` with `actual` cites both documents.
- The language rule (§1.4) applies to all new prose fields.

---

## 3. Research (new files; same analyst → counsel pipeline)

Split by company group so analysts can run in parallel. Each analyst captures **every** roadmap document it can find for
its companies from 2016 onward, enumerates **all** items, then researches the outcome of each.

| File | Companies | Known high-value documents to look for (verify each; these are leads, not facts) |
|---|---|---|
| `history_gate_sc.json` | IBM, Google, Rigetti, IQM, OQC | IBM roadmaps from 2020 onward (Eagle/Osprey/Condor/Heron/Flamingo/Kookaburra…, and how they were revised); Google's stated milestones; **Rigetti's 2021 SPAC investor presentation** (qubit and revenue projections, filed with the SEC) and later restructured roadmaps |
| `history_ion_atom.json` | IonQ, Quantinuum/Honeywell, QuEra, Pasqal, Atom Computing, Infleqtion | **IonQ's 2021 SPAC investor presentation** (#AQ milestones and revenue projections, SEC-filed); Honeywell's annual "10× per year" statements; QuEra's 2024 roadmap; Pasqal's revisions (some already recorded) |
| `history_other.json` | D-Wave, PsiQuantum, Xanadu, Microsoft, Intel, Alice & Bob | **D-Wave's 2022 SPAC investor presentation** (projections); PsiQuantum's stated timelines; Microsoft's topological-qubit timeline **and the 2021 Nature retraction of the 2018 Majorana paper** (`ClaimRevision`); Intel's spin-qubit timelines |
| `history_claims.json` | cross-company | `ClaimRevision`s: retractions, corrections and formal published rebuttals of headline claims (e.g. published classical-simulation rebuttals of "advantage/supremacy" claims). Attribute each one; take no side. |

**Per analyst:**
- Record each document with `completeness` set honestly.
- For SEC projection tables, use EDGAR full-text search (efts.sec.gov), data.sec.gov and Wayback copies, per the fetching rules.
- Use the Wayback Machine for old roadmap pages and keynote slides, recording the capture URL and date.
- For outcomes, prefer the company's own announcement or filing. For "no delivery found", fill in the search log.

**Counsel checks** (different model from the analysts):
- **Completeness:** open the document and confirm every forward-looking item was captured. If not, set `completeness: "partial"`.
- **Outcomes:** the match to the target's own wording (§1.2); `met_late` vs `partially_met`; and whether a "revision" was before or after the due date.
- **Projections:** the projected and actual figures are the same metric and period, with the same accounting basis noted (GAAP revenue vs bookings).
- **Language:** no evaluative words outside quotes, and every "no delivery found" has a credible search log.

---

## 4. Track-record metrics (computed in the build; unit-tested)

Per company, from `all_items` documents only, and only over resolved items (not `pending`):

- **Resolved:** n.
- **On time or early:** count of `met_on_time` + `met_early`.
- **Late:** count of `met_late`, with median and range of `slip_months`.
- **Partial:** `partially_met`.
- **Moved before due:** `revised_before_due`, with the median number of revisions per target chain and the median total slip across a chain.
- **Not delivered (acknowledged)** / **no delivery found.**
- **By metric kind:** the same breakdown for qubit counts vs logical qubits vs fidelity vs product availability. Companies often hit
  qubit-count goals while slipping on error-corrected goals; this shows it.
- **Projections:** projected vs actual for each period (ratio and absolute), per company.
- **Industry-wide:** the same counts pooled across companies. Show them as distributions, not a single headline number.

Never combine these into one score. If n < 3 for a company or slice, show the items, not a rate.

---

## 5. Visualizations (new "Track record" mode, plus additions to existing views)

1. **Promise ledger** (per company, the core view): a horizontal timeline per roadmap document.
   - **Layout:** each item is a bar from `stated_on` to `due.by`.
   - **Outcome markers:** ✓ at delivery (green if on time or early, amber if late, with the bar extended to the delivery date); a dashed
     jump to the next due date for each revision in a `superseded_by` chain; ⌀ for "no delivery found" (grey, with a search-log
     tooltip); ✗ only for `acknowledged_missed`; an open end for `pending`.
   - **Grouping:** by `metric_kind`.
2. **Slip plot:** promised date (x) vs actual or current date (y), with a 45° line for "on time". Each point is a target; colour = company;
   revision chains are drawn as connected points. The pattern of drift is visible at a glance.
3. **Projections vs actuals:** for each SEC-filed investor deck, paired bars of projected vs reported values per year.
4. **Company track-record card:** shown in the inspector and next to every **future** target in the Roadmap view. For example:
   "Past roadmap items, n = 9: 4 on time, 2 late (median 11 months), 2 revised before due, 1 no delivery found. Logical-qubit
   targets: 0 of 2 on time." It links to the ledger. If n < 3: "Not enough resolved history to summarise; see the items."
5. **Revision chains on the existing Roadmap view:** future targets show their ancestry, e.g. "this is the 3rd date given for this goal".
6. **Claim revisions:** retractions and corrections shown on the relevant milestone, and in a dedicated list.
7. **Stories** (captions frame, quotes carry the claims; same grounding test):
   - "Ten years of quantum roadmaps: what was promised, what arrived".
   - "SPAC projections vs reality" (IonQ, Rigetti, D-Wave; SEC exhibits vs 10-Ks).
   - "Qubit counts arrive; error correction slips". Only if the data supports it; otherwise drop the story.
   - "Retractions and rebuttals: when headline results were revised".

The mobile layout follows existing patterns. The ledger scrolls horizontally inside its panel; the page itself must not scroll sideways.

---

## 6. Tests and acceptance

- **Unit tests:**
  - slip calculation, including precision handling ("by 2023" with year precision is due 2023-12-31);
  - aggregates exclude `partial` documents and `pending` items;
  - rates are hidden when n < 3;
  - `no_delivery_found` without a search log fails validation;
  - the evaluative-word rule (§1.4);
  - every projection has both sides cited;
  - every number on a track-record card traces to ledger items (a test computes them independently).
- **Playwright:** the Track record tab, ledger interactions, a track-record card next to a future target, and mobile.
- **Existing checks stay green:** validate, check-build-fresh, audit-numbers, tsc, unit, smoke and stories.

**Acceptance checklist:**
- [ ] At least 10 companies with at least one `all_items` roadmap document from 2023 or earlier.
- [ ] The SPAC investor projections for IonQ, Rigetti and D-Wave captured from SEC exhibits, with 10-K actuals, if those documents
  are retrievable under the fetching rules. Log any that aren't as gaps.
- [ ] Every past-due target in the atlas has an Outcome.
- [ ] Track-record cards appear on every future target.
- [ ] Counsel verdicts for all new files; ledger, slip plot, projections and stories reviewed on desktop and phone.
- [ ] SESSION.md and HANDOFF.md updated.

---

## 7. Suggested Cursor agent setup (run at most 3–4 at once)

| Order | Agent | Output |
|---|---|---|
| 1 | **Engineer A:** schema, validator, rules and build aggregates (§2, §4) + unit tests on fixtures | existing data still validates; backfill plan for `roadmap_doc` on existing targets |
| 1 | **Analysts 1–3:** `history_gate_sc`, `history_ion_atom`, `history_other` | research files with whole-document enumeration and outcomes |
| 2 | **Analyst 4:** `history_claims` (retractions and rebuttals) | research file |
| 3 | **Counsel 1–4:** one per file, **a different vendor from the analysts** | `data/verification/history_*.json` |
| 4 | **Engineer B / coordinator:** Track record mode, cards on the Roadmap view, stories, screenshots, HANDOFF/SESSION | UI |

**Prompt pattern:** "You are <role> for the Track-record feature in `~/Develop/Code/quantum-atlas`. Read `HANDOFF.md` §1,
`AGENTS.md`, `schema/types.ts` and `docs/TRACK-RECORD-PLAN.md` (your section: §N). Enumerate whole documents; never
cherry-pick. Neutral language. Save work often, validate, and end with a report of counts, gaps and counsel items. Don't publish."

**Order relative to Run-today:** the two features are independent. They share only the schema and validator files, so have
**one** engineer agent own `schema/types.ts`, `scripts/validate.mjs` and `scripts/lib/rules.mjs` at a time to avoid merge
conflicts.
