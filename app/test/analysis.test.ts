import { describe, expect, test } from "vitest";
import { buildIndex, roadmapState, targetChain, timeOf } from "../src/atlas";
import { atlas, org, sys, ms, tgt } from "./fixture";

describe("timeOf", () => {
  test("a bare year as a target date means the end of that year", () => expect(new Date(timeOf("2029")).toISOString().slice(0, 10)).toBe("2029-12-31"));
  test("a year-month means the end of the month", () => expect(new Date(timeOf("2026-02")).toISOString().slice(0, 10)).toBe("2026-02-28"));
  test("start-of-period when asked", () => expect(new Date(timeOf("2029", false)).toISOString().slice(0, 10)).toBe("2029-01-01"));
});

describe("roadmapState: achieved and targeted never mix", () => {
  const idx = buildIndex(atlas({
    orgs: [org("co:a")],
    milestones: [ms("ms:a-1", "co:a", "2023-06-01"), ms("ms:a-2", "co:a", "2025-03-01")],
    targets: [
      tgt("tgt:a-old", "co:a", "2022-01-01", "2024", { status: "revised", superseded_by: "tgt:a-new" }),
      tgt("tgt:a-new", "co:a", "2024-05-01", "2026"),
      tgt("tgt:a-met", "co:a", "2022-01-01", "2025", { status: "met", met_by: "ms:a-2" }),
    ],
  }));
  test("only milestones dated on or before t are achieved", () => {
    const st = roadmapState(idx, Date.parse("2024-01-01"));
    expect(st.achieved.map((m) => m.id)).toEqual(["ms:a-1"]);
  });
  test("no target ever appears in the achieved list, even once met", () => {
    for (const d of ["2020-01-01", "2024-01-01", "2026-06-01", "2035-01-01"]) {
      const st = roadmapState(idx, Date.parse(d));
      expect(st.achieved.every((x) => x.id.startsWith("ms:")), d).toBe(true);
      expect(st.pending.every((x) => x.id.startsWith("tgt:")), d).toBe(true);
    }
  });
  test("a target is pending only after it was stated", () => {
    expect(roadmapState(idx, Date.parse("2021-06-01")).pending).toEqual([]);
  });
  test("a revised target stops being pending once the revision is stated", () => {
    expect(roadmapState(idx, Date.parse("2023-01-01")).pending.map((t) => t.id)).toContain("tgt:a-old");
    const after = roadmapState(idx, Date.parse("2024-06-01")).pending.map((t) => t.id);
    expect(after).not.toContain("tgt:a-old");
    expect(after).toContain("tgt:a-new");
  });
  test("revision chains read oldest → newest from any member", () => {
    expect(targetChain(idx, idx.target.get("tgt:a-new")!).map((t) => t.id)).toEqual(["tgt:a-old", "tgt:a-new"]);
    expect(targetChain(idx, idx.target.get("tgt:a-old")!).map((t) => t.id)).toEqual(["tgt:a-old", "tgt:a-new"]);
  });
});

describe("display positions", () => {
  test("co-located systems are fanned out so each stays clickable", () => {
    const idx = buildIndex(atlas({ orgs: [org("co:a")], systems: [sys("sys:1", "co:a", 10, 50), sys("sys:2", "co:a", 10, 50), sys("sys:3", "co:a", 20, 40)] }));
    expect(idx.pos.get("sys:1")).not.toEqual(idx.pos.get("sys:2"));
    expect(idx.pos.get("sys:3")).toEqual([20, 40]);
  });
});
