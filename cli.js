#!/usr/bin/env node
// Command-line tool. Scans a file or folder for likely secrets.
//
//   node cli.js <file or folder>          list findings (values are redacted)
//   node cli.js <file or folder> --json   the same, as JSON
//
// Exit codes: 0 = nothing found, 1 = secrets found, 2 = usage or read error.

import { scanPath } from "./lib/scan.js";

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log("Usage: node cli.js <file or folder> [--json]");
  process.exit(0);
}

const target = args.find((arg) => !arg.startsWith("--"));
if (!target) {
  console.error("Usage: node cli.js <file or folder> [--json]");
  process.exit(2);
}

let findings;
try {
  findings = await scanPath(target);
} catch (err) {
  console.error(`Could not scan ${target}: ${err.message}`);
  process.exit(2);
}

if (args.includes("--json")) {
  console.log(JSON.stringify(findings, null, 2));
} else if (findings.length === 0) {
  console.log("No secrets found.");
} else {
  for (const f of findings) {
    console.log(`${f.file}:${f.line}  ${f.name}  ${f.match}`);
  }
  console.log(
    `\n${findings.length} possible secret(s) found. If any are real, revoke them first, then remove them from the code.`,
  );
}

process.exitCode = findings.length > 0 ? 1 : 0;
