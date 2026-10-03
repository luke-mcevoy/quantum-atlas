import { describe, expect, test } from "vitest";
import { aggregate, dueEnd, isStale, itemsFromCompleteDocs, slipMonths } from "../../scripts/lib/track.mjs";

describe("due dates", () => {
  test("a year-precision target is due on 31 December", () => expect(dueEnd("2023")).toBe("2023-12-31"));
  test("a month is due on its last day", () => expect(dueEnd("2024-02")).toBe("2024-02-29"));
});

describe("slip", () => {
  test("delivery in the due year, before 31 December, is not a late slip", () =>
    expect(slipMonths("2023-12-31", "2023-12-04")).toBeLessThanOrEqual(0));
  test("mid-February is one month late", () => expect(slipMonths("2023-12-31", "2024-02-15")).toBe(1));
});

describe("availability goes stale after 45 days", () => {
  test("44 days is still current", () => expect(isStale("2026-08-01", "2026-09-14")).toBe(false));
  test("46 days is stale", () => expect(isStale("2026-08-01", "2026-09-16")).toBe(true));
});

describe("track-record counts", () => {
  test("rates are hidden when fewer than 3 items are resolved", () => {
    const a = aggregate([{ id: "out:a", result: "met_on_time" }, { id: "out:b", result: "pending" }]);
    expect(a.n).toBe(1);
    expect(a.show_rates).toBe(false);
    expect(a.items).toEqual(["out:a", "out:b"]);
  });
  test("partial documents do not enter the ledger", () => {
    const docs = [
      { completeness: "partial", items: ["tgt:skipped"] },
      { completeness: "all_items", items: ["tgt:a", "tgt:b", "tgt:c"] },
    ];
    const targets = new Map([
      ["tgt:a", { org: "co:ibm", metric_kind: "physical_qubits" }],
      ["tgt:b", { org: "co:ibm", metric_kind: "physical_qubits" }],
      ["tgt:c", { org: "co:ibm", metric_kind: "logical_qubits" }],
      ["tgt:skipped", { org: "co:ibm" }],
    ]);
    const outcomes = [
      { id: "out:a", target: "tgt:a", result: "met_on_time" },
      { id: "out:b", target: "tgt:b", result: "met_late", slip_months: 11 },
      { id: "out:c", target: "tgt:c", result: "no_delivery_found" },
      { id: "out:skipped", target: "tgt:skipped", result: "acknowledged_missed" },
    ];
    const items = itemsFromCompleteDocs(docs, outcomes, targets);
    const a = aggregate(items);
    expect(a.n).toBe(3);
    expect(a.show_rates).toBe(true);
    expect(a.on_time_or_early).toBe(1);
    expect(a.late).toBe(1);
    expect(a.no_delivery_found).toBe(1);
    expect(a.acknowledged_missed).toBe(0);
  });
});
