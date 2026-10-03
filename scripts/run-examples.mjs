#!/usr/bin/env node
// Run every Run-today example harness in its SDK environment.
// Writes examples/results.json (or --out). Exits non-zero if any harness fails.
//
//   node scripts/run-examples.mjs [--sdk <name>] [--python <bin>] [--out <file>]
//   node scripts/run-examples.mjs --merge <dir> [--out <file>]
//
// Without --python, each SDK gets examples/.venvs/<sdk> via uv (Python 3.12) and
// examples/requirements/<sdk>.txt. Pip install happens before the socket block.
// The harness process refuses IP sockets and has AWS_*, QISKIT_IBM_*, DWAVE_*, and AZURE_* unset.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SANDBOX = join(ROOT, "examples/_sandbox");
const TIMEOUT_MS = 25 * 60 * 1000;
const SECRET_PREFIX = /^(AWS_|QISKIT_IBM_|DWAVE_|AZURE_)/;

const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

const mergeDir = option("--merge");
const outPath = join(ROOT, option("--out") ?? "examples/results.json");
const onlySdk = option("--sdk");
const pythonOverride = option("--python");

function writeResults(results) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
}

if (mergeDir) {
  const dir = isAbsolute(mergeDir) ? mergeDir : join(ROOT, mergeDir);
  const merged = {};
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    Object.assign(merged, JSON.parse(readFileSync(join(dir, name), "utf8")));
  }
  writeResults(merged);
  const failed = Object.entries(merged).filter(([, row]) => row.status !== "passed");
  console.log(`merged ${Object.keys(merged).length} example result(s) into ${outPath}`);
  if (failed.length) {
    for (const [id, row] of failed) console.error(`${id}: ${row.status}${row.notes ? ` — ${row.notes}` : ""}`);
    process.exit(1);
  }
  process.exit(0);
}

const research = JSON.parse(readFileSync(join(ROOT, "data/research/usecases.json"), "utf8"));
const examples = (research.examples ?? []).filter((example) => !onlySdk || example.sdk === onlySdk);
if (!examples.length) {
  console.error(onlySdk ? `no examples for sdk ${onlySdk}` : "no examples in data/research/usecases.json");
  process.exit(1);
}

function scrub(env) {
  for (const key of Object.keys(env)) if (SECRET_PREFIX.test(key)) delete env[key];
  return env;
}

function ensurePython(sdk) {
  if (pythonOverride) return pythonOverride;
  const req = join(ROOT, "examples/requirements", `${sdk}.txt`);
  if (!existsSync(req)) {
    console.error(`missing ${req}`);
    process.exit(1);
  }
  const venv = join(ROOT, "examples/.venvs", sdk);
  const python = join(venv, "bin", "python");
  if (!existsSync(python)) {
    const created = spawnSync("uv", ["venv", "--python", "3.12", venv], { stdio: "inherit" });
    if (created.status !== 0) process.exit(created.status ?? 1);
  }
  const installed = spawnSync("uv", ["pip", "install", "--python", python, "-r", req], { stdio: "inherit" });
  if (installed.status !== 0) process.exit(installed.status ?? 1);
  return python;
}

const pythonForSdk = new Map();
for (const sdk of new Set(examples.map((example) => example.sdk))) pythonForSdk.set(sdk, ensurePython(sdk));

function versionOf(python, distribution) {
  const probe = spawnSync(python, ["-c", "import importlib.metadata as m, sys; print(m.version(sys.argv[1]))", distribution], {
    encoding: "utf8",
  });
  return probe.status === 0 ? probe.stdout.trim() : "";
}

function expectedLines(dir) {
  const path = join(dir, "expected.txt");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

const SDK_PACKAGES = {
  "amazon-braket-sdk": ["amazon-braket-sdk"],
  pulser: ["pulser-core", "pulser-simulation"],
};

const results = {};
let failed = 0;

for (const example of examples) {
  const python = resolve(pythonForSdk.get(example.sdk));
  const dir = join(ROOT, dirname(example.harness_path));
  const pyVersion = spawnSync(python, ["-c", "import sys; print(sys.version.split()[0])"], { encoding: "utf8" });
  const packages = SDK_PACKAGES[example.sdk] ?? [example.sdk];
  const sdkVersion = packages.map((name) => `${name}==${versionOf(python, name) || "unknown"}`).join(", ");
  const env = scrub({
    ...process.env,
    MPLBACKEND: "Agg",
    PYTHONUNBUFFERED: "1",
    PYTHONNOUSERSITE: "1",
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONPATH: process.env.PYTHONPATH ? `${SANDBOX}:${process.env.PYTHONPATH}` : SANDBOX,
  });
  console.error(`\n=== ${example.id} (${example.sdk}) ===`);
  const started = new Date().toISOString();
  const run = spawnSync(python, ["harness.py"], {
    cwd: dir,
    env,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 20 * 1024 * 1024,
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const missing = run.status === 0 ? expectedLines(dir).filter((line) => !output.includes(line)) : [];
  const timedOut = Boolean(run.error && /timed out/i.test(run.error.message));
  const ok = run.status === 0 && missing.length === 0 && !timedOut;
  if (!ok) failed++;
  const notes = [
    run.error ? run.error.message : "",
    timedOut ? `timed out after ${TIMEOUT_MS / 60000} minutes` : "",
    run.status !== 0 && !timedOut ? `exit ${run.status ?? "null"}` : "",
    missing.length ? `missing expected output: ${missing.join(" | ")}` : "",
    !ok ? output.trim().split("\n").slice(-12).join("\n") : "",
  ].filter(Boolean).join("\n");
  const row = {
    status: ok ? "passed" : "failed",
    simulator: example.sim_check?.simulator,
    substitution: example.sim_check?.substitution,
    sdk_version: sdkVersion,
    python_version: (pyVersion.stdout ?? "").trim(),
    ran_at: started,
    output_excerpt: output.trim().slice(-500),
  };
  if (notes) row.notes = notes;
  results[example.id] = row;
  console.error(ok ? `${example.id} passed` : `${example.id} failed\n${notes}`);
}

writeResults(results);
console.log(`wrote ${outPath}`);
if (failed) {
  console.error(`${failed} of ${examples.length} harness(es) failed`);
  process.exit(1);
}
console.log(`${examples.length} harness(es) passed`);
