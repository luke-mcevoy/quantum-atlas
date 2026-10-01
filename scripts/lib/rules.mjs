// Language and evidence rules shared by the validator, the build, the prose audit and the app tests.

/** Terms that may appear in prose only inside quotation marks, attributed, verbatim from the evidence. */
export const HYPE = /\b(quantum advantage|advantage|supremacy|logical[- ]qubits?|error[- ]corrected|fault[- ]toleran(?:t|ce)|beyond[- ]classical|quantum utility|utility)\b/gi;

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
export function hypeProblems(text, quotes) {
  if (!text) return [];
  const problems = [];
  const outside = text.replace(QUOTED, " ");
  for (const m of outside.matchAll(HYPE)) problems.push(`hype term "${m[0]}" outside quotation marks`);
  const pool = norm(quotes.join(" \n "));
  let quotedHype = false;
  for (const m of text.matchAll(QUOTED)) {
    const inner = m[1] ?? m[2];
    if (!new RegExp(HYPE.source, "i").test(inner)) continue;
    quotedHype = true;
    if (!pool.includes(norm(inner))) problems.push(`quoted words “${inner}” not found verbatim in the evidence`);
  }
  if (quotedHype && !ATTRIBUTION.test(outside)) problems.push("quoted hype term is not attributed (e.g. \"<Org> states …\")");
  return problems;
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
