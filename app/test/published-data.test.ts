// Integrity checks on the atlas that is actually deployed (app/public/atlas.json).
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildIndex, allEvidence, type Atlas } from "../src/atlas";
import { hypeProblems, impliedPeerReview } from "../../scripts/lib/rules.mjs";

const atlas = JSON.parse(readFileSync(new URL("../public/atlas.json", import.meta.url), "utf8")) as Atlas;
const idx = buildIndex(atlas);
const reviewedEntities = [...atlas.sites, ...atlas.systems, ...atlas.milestones, ...atlas.targets, ...atlas.access, ...atlas.relationships];

describe("published atlas", () => {
  test("is a verified build, never a draft", () => expect(atlas.draft).toBe(false));
  test("every published entity is reviewed and every quote comes from a published source", () => {
    for (const e of reviewedEntities) {
      expect(["verified", "flagged"], e.id).toContain(e.review);
      expect(e.evidence.length, e.id).toBeGreaterThan(0);
      for (const ev of allEvidence(e as never)) {
        expect(idx.source.has(ev.source), `${e.id} cites ${ev.source}`).toBe(true);
        expect(ev.quote.length, e.id).toBeGreaterThanOrEqual(8);
      }
    }
  });
  test("every source has a URL; peer-reviewed sources have a DOI; preprints an id", () => {
    for (const s of atlas.sources) {
      expect(/^https?:\/\//.test(s.url), s.id).toBe(true);
      if (s.doc_type === "peer_reviewed") expect(s.doi, s.id).toMatch(/^10\./);
    }
  });
  test("no hype term outside an attributed, verbatim quote (claims, targets, deals)", () => {
    const quotes = (e: { evidence: { quote: string }[] }) => allEvidence(e as never).map((x) => x.quote);
    for (const m of atlas.milestones) expect(hypeProblems(m.claim, quotes(m)), m.id).toEqual([]);
    for (const t of atlas.targets) expect(hypeProblems(t.statement, quotes(t)), t.id).toEqual([]);
    for (const r of atlas.relationships) expect(hypeProblems(r.description, quotes(r)), r.id).toEqual([]);
  });
  test("every target is phrased as a target, never as an achievement", () => {
    for (const t of atlas.targets) expect(t.statement, t.id).toMatch(/\btargets\b/);
    const ids = new Set(atlas.milestones.map((m) => m.id));
    for (const t of atlas.targets) expect(ids.has(t.id), t.id).toBe(false);
  });
  test("milestones are dated no later than the build and carry a peer-review status their evidence supports", () => {
    for (const m of atlas.milestones) {
      expect(m.date <= atlas.built_at.slice(0, 10), m.id).toBe(true);
      const implied = impliedPeerReview(m.evidence.map((e) => idx.source.get(e.source)?.doc_type));
      expect(m.peer_review, m.id).toBe(implied);
    }
  });
  test("every access route has official docs; every snippet has a source URL and a recorded check", () => {
    for (const a of atlas.access) {
      expect(a.docs_url, a.id).toMatch(/^https?:\/\//);
      if (a.snippet) {
        expect(a.snippet.source_url, a.id).toMatch(/^https?:\/\//);
        expect(["passed", "failed", "not_run"], a.id).toContain(a.snippet.sim_check.status);
        if (a.snippet.sim_check.status === "passed") expect(a.snippet.sim_check.substitution, a.id).toBeTruthy();
      }
    }
  });
  test("logical qubits only with a stated code; metrics only with a stated definition", () => {
    for (const y of atlas.systems) {
      if (y.logical_qubits) expect(y.logical_qubits.code, y.id).toBeTruthy();
      for (const m of y.metrics ?? []) expect(m.definition.length, y.id).toBeGreaterThan(9);
    }
  });
  test("a system is drawn at a site only if that site is published", () => {
    for (const y of atlas.systems) {
      if (y.location_basis === "site") expect(idx.site.has(y.site!), y.id).toBe(true);
      else expect(y.location, y.id).toEqual(idx.org.get(y.operator)!.hq);
    }
  });
  test("revision links point at published targets", () => {
    for (const t of atlas.targets) if (t.superseded_by) expect(idx.target.has(t.superseded_by), t.id).toBe(true);
  });
  test("coordinates are on the globe", () => {
    for (const y of atlas.systems) {
      expect(Math.abs(y.location.lat), y.id).toBeLessThanOrEqual(90);
      expect(Math.abs(y.location.lon), y.id).toBeLessThanOrEqual(180);
    }
  });
});
