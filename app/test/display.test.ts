import { describe, expect, test } from "vitest";
import { availabilityLabel, outcomeWord, rateSummary, testedHereBadge, type SimCheck } from "../src/display";
import type { TrackCounts } from "../src/atlas";

const counts = (over: Partial<TrackCounts>): TrackCounts => ({
  n: 0, show_rates: false, on_time_or_early: 0, late: 0, partial: 0, revised_before_due: 0,
  acknowledged_missed: 0, no_delivery_found: 0, items: [], ...over,
});

describe("tested-here badge", () => {
  test("a badge cannot say passed unless sim_check.status is passed", () => {
    const cases: SimCheck[] = [
      { status: "failed", ran_at: "2026-10-03", sdk_version: "qiskit==1.0" },
      { status: "not_run", ran_at: "2026-10-03", sdk_version: "qiskit==1.0" },
      { status: "unknown" },
      {},
    ];
    for (const sim of cases) {
      const badge = testedHereBadge(sim);
      expect(badge.tested, sim.status).toBe(false);
      expect(badge.text, sim.status).toBe("Not tested");
      expect(badge.text.toLowerCase(), sim.status).not.toContain("passed");
      expect(badge.text, sim.status).not.toContain("Tested here");
    }
    expect(testedHereBadge(undefined).tested).toBe(false);
    const passed = testedHereBadge({
      status: "passed",
      ran_at: "2026-10-03T03:11:09.106Z",
      sdk_version: "amazon-braket-sdk==1.127.3.post0",
    });
    expect(passed.tested).toBe(true);
    expect(passed.text).toContain("Tested here");
    expect(passed.text).toContain("2026-10-03");
    expect(passed.text).toContain("amazon-braket-sdk==1.127.3.post0");
  });
});

describe("track-record rates in the UI", () => {
  test("rates are hidden when n < 3, even if a flag says otherwise", () => {
    const view = rateSummary(counts({ n: 2, show_rates: true, on_time_or_early: 2, items: ["out:a", "out:b"] }));
    expect(view.showRates).toBe(false);
    expect(view.sentence).toBe("Not enough resolved history to summarise.");
    expect(view.sentence.toLowerCase()).not.toContain("trust");
    expect(view.sentence).not.toContain("%");
  });

  test("rates stay hidden when the build set show_rates to false", () => {
    const view = rateSummary(counts({
      n: 9, show_rates: false, on_time_or_early: 4, late: 2, no_delivery_found: 3,
      items: ["out:a", "out:b", "out:c"],
    }));
    expect(view.showRates).toBe(false);
    expect(view.sentence).toBe("Not enough resolved history to summarise.");
  });

  test("a large enough published count is a sentence of counts, not a score", () => {
    const view = rateSummary(counts({
      n: 7, show_rates: true, on_time_or_early: 4, late: 2, revised_before_due: 1,
      items: ["out:a"],
    }));
    expect(view.showRates).toBe(true);
    expect(view.sentence).toContain("n = 7");
    expect(view.sentence).toContain("4 on time or early");
    expect(view.sentence.toLowerCase()).not.toContain("trust");
    expect(view.sentence).not.toContain("%");
    expect(view.sentence.toLowerCase()).not.toContain("failed");
  });
});

describe("words the UI may use", () => {
  test("a stale row says last confirmed and never available", () => {
    const label = availabilityLabel({ stale: true, status: "available", as_of: "2026-04-23", tier: "paid" });
    expect(label).toBe("last confirmed 2026-04-23");
    expect(label.toLowerCase()).not.toMatch(/\bavailable\b/);
  });

  test("no delivery found stays those words", () => {
    expect(outcomeWord("no_delivery_found")).toBe("No delivery found");
    expect(outcomeWord("no_delivery_found").toLowerCase()).not.toContain("failed");
    expect(outcomeWord("acknowledged_missed")).toBe("Acknowledged missed");
  });
});
