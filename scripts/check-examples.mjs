#!/usr/bin/env node
// Verbatim check for the Run-today examples harness.
// official.py must equal Example.code, and applying substitution.diff to official.py must yield harness.py.
// Comment lines before the unified diff are the human description and are not part of the patch.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const research = JSON.parse(readFileSync(join(ROOT, "data/research/usecases.json"), "utf8"));
const examples = research.examples ?? [];
const errors = [];

function fail(id, message) {
  errors.push(`${id}: ${message}`);
}

function diffBody(text) {
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("#") || lines[i].trim() === "")) i++;
  return lines.slice(i).join("\n").trim();
}

function applyDiff(official, body) {
  const dir = mkdtempSync(join(tmpdir(), "ex-diff-"));
  try {
    const original = join(dir, "official.py");
    const patchFile = join(dir, "substitution.diff");
    const out = join(dir, "harness.py");
    writeFileSync(original, official);
    writeFileSync(patchFile, body.endsWith("\n") ? body : `${body}\n`);
    const result = spawnSync("patch", ["-o", out, original, patchFile], { encoding: "utf8" });
    if (result.status !== 0) {
      return { ok: false, error: (result.stderr || result.stdout || "patch failed").trim() };
    }
    return { ok: true, text: readFileSync(out, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (!examples.length) fail("examples", "data/research/usecases.json has no examples");

for (const example of examples) {
  const id = example.id ?? "(missing id)";
  if (!example.harness_path) {
    fail(id, "harness_path missing");
    continue;
  }
  const harnessPath = join(ROOT, example.harness_path);
  const dir = dirname(harnessPath);
  const officialPath = join(dir, "official.py");
  const diffPath = join(dir, "substitution.diff");
  let official;
  let harness;
  let diffText;
  try {
    official = readFileSync(officialPath, "utf8");
    harness = readFileSync(harnessPath, "utf8");
    diffText = readFileSync(diffPath, "utf8");
  } catch (error) {
    fail(id, error.message);
    continue;
  }
  if (official !== example.code) {
    fail(id, "official.py is not byte-for-byte Example.code");
  }
  const body = diffBody(diffText);
  if (!body) {
    if (official !== harness) fail(id, "substitution.diff has no patch, but harness.py differs from official.py");
    continue;
  }
  const applied = applyDiff(official, body);
  if (!applied.ok) fail(id, `could not apply substitution.diff: ${applied.error}`);
  else if (applied.text !== harness) fail(id, "harness.py is not official.py with only substitution.diff applied");
}

if (errors.length) {
  for (const error of errors) console.error(error);
  console.error(`\n${errors.length} example verbatim check(s) failed`);
  process.exit(1);
}
console.log(`example verbatim check passed (${examples.length} example${examples.length === 1 ? "" : "s"})`);
