// Language and evidence rules shared by the validator, the build, the prose audit and the app tests.

/** Terms that may appear in prose only inside quotation marks, attributed, verbatim from the evidence. */
export const HYPE = /\b(quantum advantage|advantage|supremacy|logical[- ]qubits?|error[- ]corrected|fault[- ]toleran(?:t|ce)|beyond[- ]classical|quantum utility|utility)\b/gi;

/** Benefit claims, checked on use-case and example prose in addition to HYPE. */
export const BENEFIT = /\b(solves|faster|speed-?ups?|better than classical)\b/gi;

/** Evaluative words, checked on track-record prose in addition to HYPE. Never "failed" unless the source said it. */
export const EVALUATIVE = /\b(failed|broke|overpromised|misleading|hype|vaporware)\b/gi;

/** Verbs that attribute a quoted phrase to its source. */
export const ATTRIBUTION = /\b(states?|stated|says?|said|reports?|reported|describes?|described|calls?|called|claims?|claimed|announce[sd]?|targets?|writes?|wrote|terms?|termed|according to|characteri[sz]es|refers? to|labels?)\b/i;

/** Normalise text for verbatim comparison: quotes, dashes, ligatures, whitespace, case. */
export function norm(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const QUOTED = /“([^”]+)”|"([^"]+)"/g;

/**
 * Check one prose field against the hype-term rule.
 * @param {string} text  the prose (claim, statement, description, caption)
 * @param {string[]} quotes  verbatim evidence quotes the prose may quote from
 * @returns {string[]} problems (empty = OK)
 */
export function hypeProblems(text, quotes, extra) {
  if (!text) return [];
  const pattern = extra ? new RegExp(`(?:${HYPE.source})|(?:${extra.source})`, "gi") : new RegExp(HYPE.source, "gi");
  const problems = [];
  const outside = text.replace(QUOTED, " ");
  for (const m of outside.matchAll(pattern)) problems.push(`hype term "${m[0]}" outside quotation marks`);
  const pool = norm(quotes.join(" \n "));
  const innerRe = new RegExp(pattern.source, "i");
  let quotedHype = false;
  for (const m of text.matchAll(QUOTED)) {
    const inner = m[1] ?? m[2];
    if (!innerRe.test(inner)) continue;
    quotedHype = true;
    if (!pool.includes(norm(inner))) problems.push(`quoted words “${inner}” not found verbatim in the evidence`);
  }
  if (quotedHype && !ATTRIBUTION.test(outside)) problems.push("quoted hype term is not attributed (e.g. \"<Org> states …\")");
  return problems;
}

/** Use-case and example prose: hype terms plus benefit claims. */
export function benefitProblems(text, quotes) {
  return hypeProblems(text, quotes, BENEFIT);
}

/** Track-record prose: hype terms plus evaluative words such as "failed" and "hype". */
export function trackProblems(text, quotes) {
  return hypeProblems(text, quotes, EVALUATIVE);
}

/** Numbers in prose (years and single digits skipped), normalised "1,000" → "1000". */
export function proseNumbers(s) {
  const t = String(s ?? "").replace(/(\d),(?=\d{3})/g, "$1");
  return [...new Set([...t.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0])
    .filter((n) => !/^(19|20)\d\d$/.test(n) && n.length > 1 && !/^0\d/.test(n)))];
}

export const PEER_RANK = { company_claim: 0, preprint: 1, peer_reviewed: 2 };

/** The peer-review status implied by the cited sources' doc types. */
export function impliedPeerReview(docTypes) {
  if (docTypes.includes("peer_reviewed")) return "peer_reviewed";
  if (docTypes.includes("preprint")) return "preprint";
  return "company_claim";
}
