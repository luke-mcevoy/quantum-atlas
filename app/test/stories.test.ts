// Stories must stay grounded in the published, verified atlas.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildIndex, entityOf, type Atlas } from "../src/atlas";
import { STORIES, quoteOf } from "../src/stories";
import { hypeProblems } from "../../scripts/lib/rules.mjs";

const idx = buildIndex(JSON.parse(readFileSync(new URL("../public/atlas.json", import.meta.url), "utf8")) as Atlas);

test("there are stories", () => expect(STORIES.length).toBeGreaterThan(0));

describe.each(STORIES.map((s) => [s.id, s] as const))("story %s", (_, story) => {
  test.each(story.steps.map((st, i) => [i + 1, st] as const))("step %i is grounded", (_, st) => {
    for (const id of st.focus) expect(entityOf(idx, id), `focus ${id}`).toBeTruthy();
    if (st.select) expect(entityOf(idx, st.select), `select ${st.select}`).toBeTruthy();
    expect(st.quotes.length).toBeGreaterThan(0);
    const quoteText: string[] = [];
    for (const q of st.quotes) {
      const ev = quoteOf(idx, q);
      expect(ev, `quote ${q.entity}#${q.path ?? ""}${q.ev}`).toBeTruthy();
      expect(idx.source.has(ev!.source)).toBe(true);
      quoteText.push(ev!.quote);
    }
    // Any number in the caption must appear in this step's quotes or the focused items' own names/dates.
    const own = st.focus.map((id) => { const e = entityOf(idx, id) as unknown as Record<string, unknown>; return [e?.name, e?.date, e?.target_date, e?.stated_on].join(" "); });
    const allowed = [...quoteText, ...own].join(" ").replace(/(\d),(?=\d{3})/g, "$1");
    for (const n of st.caption.match(/\d+(?:[.,]\d+)*/g) ?? []) expect(allowed, `caption number ${n} in "${st.title}"`).toContain(n.replace(/,/g, ""));
    // Hype terms only quoted, attributed and verbatim from this step's quotes.
    expect(hypeProblems(st.caption, quoteText), st.title).toEqual([]);
  });
});
