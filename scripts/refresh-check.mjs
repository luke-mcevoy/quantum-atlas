#!/usr/bin/env node
// Monthly refresh, step 1 (deterministic): list what's new since the last refresh.
//   - SEC filings (8-K, 10-K, 10-Q, 20-F, 6-K, S-1, S-4, 424B) from every public org in the atlas (sec_cik)
//   - arXiv listings (quant-ph) whose author/abstract text mentions a tracked org or system name
// Writes data/refresh/candidates-<today>.json. With --advance, moves the "last checked" date to today.
// Requests declare who is fetching; no browser disguise.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const UA = "Quantum-Computing-Atlas refresh (personal research project)";
const today = new Date().toISOString().slice(0, 10);
const STATE = "data/refresh/state.json";
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { sec_last: "2026-10-01", arxiv_last: "2026-10-01" };
const since = process.argv.find((a) => a.startsWith("--since="))?.slice(8);
if (since) { state.sec_last = since; state.arxiv_last = since; }
const atlas = JSON.parse(readFileSync("data/build/atlas.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url, json = true) => {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: json ? "application/json" : "*/*" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return json ? r.json() : r.text();
};

// ── SEC ──
const FORMS = /^(8-K|10-K|10-Q|20-F|6-K|S-1|S-4|424B)/;
const RELEVANT_8K = new Set(["1.01", "1.02", "2.01", "2.03", "7.01", "8.01"]);
const sec = [];
const failed = [];
for (const o of atlas.orgs.filter((x) => x.sec_cik)) {
  const cik = String(o.sec_cik).padStart(10, "0");
  try {
    const j = await get(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const r = j.filings.recent;
    for (let i = 0; i < r.form.length; i++) {
      if (r.filingDate[i] < state.sec_last || !FORMS.test(r.form[i])) continue;
      if (r.form[i].startsWith("8-K") && !String(r.items?.[i] ?? "").split(",").some((x) => RELEVANT_8K.has(x.trim()))) continue;
      const acc = r.accessionNumber[i];
      sec.push({ org: o.id, name: j.name, form: r.form[i], filed: r.filingDate[i], items: r.items?.[i] || undefined, accession: acc,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc.replaceAll("-", "")}/${r.primaryDocument[i]}` });
    }
  } catch (e) { failed.push(`${o.id}: ${e.message}`); }
  await sleep(150);
}

// ── arXiv (quant-ph, newest first) ──
const names = [...atlas.orgs.filter((o) => o.roles.includes("hardware")).map((o) => o.name.split(/[ ,(]/)[0]), ...atlas.systems.map((y) => y.name)]
  .filter((n) => n.length > 3);
const NAME = new RegExp(`\\b(${[...new Set(names)].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`);
const arxiv = [];
try {
  const xml = await get("https://export.arxiv.org/api/query?search_query=cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=400", false);
  for (const entry of xml.split("<entry>").slice(1)) {
    const pick = (tag) => (entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").replace(/\s+/g, " ").trim();
    const published = pick("published").slice(0, 10);
    if (published < state.arxiv_last) continue;
    const text = `${pick("title")} ${pick("summary")}`;
    const m = NAME.exec(text);
    if (m) arxiv.push({ id: pick("id"), title: pick("title"), published, matched: m[1] });
  }
} catch (e) { failed.push(`arxiv: ${e.message}`); }

const out = { since: state, checked: today, sec_filings: sec.sort((a, b) => b.filed.localeCompare(a.filed)), arxiv, failed };
const file = `data/refresh/candidates-${today}.json`;
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(`${sec.length} SEC filing(s), ${arxiv.length} arXiv preprint(s) mentioning tracked orgs/systems → ${file}`);
if (failed.length) console.log(`could not check: ${failed.join("; ")}`);
if (process.argv.includes("--advance")) {
  writeFileSync(STATE, JSON.stringify({ sec_last: today, arxiv_last: today }, null, 1) + "\n");
  console.log("state advanced to", today);
}
