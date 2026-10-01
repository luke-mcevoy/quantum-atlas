// The language rules shared by the validator, the build and these tests (scripts/lib/rules.mjs).
import { describe, expect, test } from "vitest";
import { hypeProblems, impliedPeerReview, proseNumbers } from "../../scripts/lib/rules.mjs";

const Q = ["Willow is the first processor where error-corrected qubits get exponentially better", "demonstrating a beyond-classical computation"];

describe("hype terms", () => {
  test("neutral prose passes", () => expect(hypeProblems("Google reports a 105-qubit processor.", Q)).toEqual([]));
  test("an unquoted hype term fails", () => expect(hypeProblems("Google demonstrated quantum advantage.", Q).length).toBeGreaterThan(0));
  test("a logical-qubit claim must be quoted", () => expect(hypeProblems("IonQ ran 12 logical qubits.", Q)[0]).toMatch(/outside quotation marks/));
  test("quoted, attributed and verbatim passes", () =>
    expect(hypeProblems("Google states the processor's “error-corrected qubits get exponentially better”.", Q)).toEqual([]));
  test("quoted but not in the evidence fails", () =>
    expect(hypeProblems("Google states it achieved “quantum supremacy”.", Q)[0]).toMatch(/not found verbatim/));
  test("quoted but unattributed fails", () =>
    expect(hypeProblems("A “beyond-classical computation” on Willow.", Q)[0]).toMatch(/not attributed/));
  test("straight quotes count too", () => expect(hypeProblems('Google describes "a beyond-classical computation".', Q)).toEqual([]));
  test("'utility' and 'fault-tolerant' are covered", () => {
    expect(hypeProblems("IBM entered the era of utility.", []).length).toBe(1);
    expect(hypeProblems("A fault-tolerant machine.", []).length).toBe(1);
  });
});

describe("peer-review status follows the cited documents", () => {
  test.each([
    [["peer_reviewed", "company_press_release"], "peer_reviewed"],
    [["preprint", "technical_blog"], "preprint"],
    [["company_press_release"], "company_claim"],
    [["preprint", "peer_reviewed"], "peer_reviewed"],
  ] as const)("%j → %s", (types, out) => expect(impliedPeerReview([...types])).toBe(out));
});

describe("prose numbers", () => {
  test("years and single digits are skipped; thousands separators normalised", () =>
    expect(proseNumbers("In 2024 the 1,121-qubit chip ran 5 jobs at 99.9%")).toEqual(["1121", "99.9"]));
});
