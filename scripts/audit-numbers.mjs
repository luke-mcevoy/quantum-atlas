#!/usr/bin/env node
// Claim audit: every number in an entity's prose (milestone claim, target statement, relationship description,
// metric definitions, figure notes, access tier notes) must appear in that entity's own evidence quotes
// (after normalising "1,000" → "1000"). In the sister project, invented figures slipped into descriptions twice
// and were caught this way. Run on the verified build.
//   --ci               exit 1 on any number not in data/audit-baseline.json
//   --write-baseline   record the current hits as reviewed (only after confirming each against its source)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { proseNumbers } from "./lib/rules.mjs";

const a = JSON.parse(readFileSync(new URL("../data/build/atlas.json", import.meta.url)));
// Thousands separators drop out ("1,000" → "1000"). A remaining comma is a decimal comma ("98,47" → "98.47").
const norm = (s) => s.replace(/(\d),(?=\d{3})/g, "$1").replace(/(\d),(?=\d{1,2}(?!\d))/g, "$1.");
const BASELINE = new URL("../data/audit-baseline.json", import.meta.url);
const baseline = existsSync(BASELINE) ? new Set(JSON.parse(readFileSync(BASELINE, "utf8"))) : new Set();
const found = [];
const fresh = [];
let hits = 0;

const evOf = (e) => [...(e.evidence ?? []), ...(e.physical_qubits?.evidence ?? []), ...(e.logical_qubits?.evidence ?? []),
  ...(e.metrics ?? []).flatMap((m) => m.evidence ?? [])];
for (const kind of ["systems", "milestones", "targets", "access", "relationships", "sites"]) {
  for (const e of a[kind]) {
    const prose = [e.claim, e.statement, e.description, e.tier_note, e.physical_qubits?.note, e.logical_qubits?.note,
      e.logical_qubits?.code, e.amount?.note, ...(e.metrics ?? []).map((m) => m.definition)].filter(Boolean).join(" ");
    const quotes = norm(evOf(e).map((x) => x.quote).join(" ") + " " + (e.review_note ?? ""));
    const missing = proseNumbers(prose).filter((n) => !quotes.includes(n));
    if (missing.length) {
      hits++;
      for (const n of missing) { const k = `${e.id}|${n}`; found.push(k); if (!baseline.has(k)) fresh.push(k); }
      if (!process.argv.includes("--ci")) console.log(`${e.id}\t[${e.review}]\tunquoted: ${missing.join(", ")}`);
    }
  }
}
console.log(`\n${hits} entities with numbers in prose not found in their own quotes (review each).`);
if (process.argv.includes("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify(found.sort(), null, 1) + "\n");
  console.log(`baseline written: ${found.length} reviewed entity|number pairs`);
} else if (fresh.length) {
  console.log(`\n${fresh.length} NEW unquoted number(s) not in data/audit-baseline.json — confirm each against its source, then re-run with --write-baseline:`);
  for (const k of fresh) console.log("  " + k);
  if (process.argv.includes("--ci")) process.exit(1);
} else console.log("no new unquoted numbers since the reviewed baseline");
