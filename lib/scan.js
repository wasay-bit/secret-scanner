// The scanning logic: reads files, finds likely secrets, and returns redacted findings.
// Nothing here prints or stores a whole secret.

import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { RULES, GENERIC_ASSIGNMENT } from "./rules.js";

export const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage"]);
export const MAX_FILE_BYTES = 1_000_000;

// Put this text on a line to skip that line, for example a value that is meant to be public.
export const IGNORE_MARKER = "secret-scanner:ignore";

// A quoted value with fewer bits of randomness per character than this is not reported.
export const MIN_ENTROPY_BITS = 3.0;

// Values containing any of these are treated as placeholders, not secrets.
const PLACEHOLDER_WORDS = ["example", "changeme", "placeholder", "your", "xxxx", "${", "{{", "<"];

// Bits of randomness per character (Shannon entropy).
export function shannonEntropy(text) {
  const counts = new Map();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let bits = 0;
  for (const n of counts.values()) {
    const p = n / text.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

// Shows only the start and end of a value, so the report is safe to paste.
export function redact(value) {
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isPlaceholder(value) {
  const lower = value.toLowerCase();
  return PLACEHOLDER_WORDS.some((word) => lower.includes(word));
}

// Returns the findings for one piece of text. The file name is only used for the report.
export function scanText(text, file = "(text)") {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(IGNORE_MARKER)) return;
    const lineNumber = index + 1;

    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        if (isPlaceholder(match[0])) continue;
        findings.push({
          file,
          line: lineNumber,
          rule: rule.id,
          name: rule.name,
          match: redact(match[0]),
        });
      }
    }

    for (const match of line.matchAll(GENERIC_ASSIGNMENT)) {
      const value = match[3];
      if (isPlaceholder(value)) continue;
      if (shannonEntropy(value) < MIN_ENTROPY_BITS) continue;
      findings.push({
        file,
        line: lineNumber,
        rule: "generic-secret",
        name: `Hard-coded ${match[1].toLowerCase()}`,
        match: redact(value),
      });
    }
  });
  return findings;
}

async function scanFile(fullPath, displayName, findings) {
  const info = await stat(fullPath);
  if (info.size > MAX_FILE_BYTES) return;
  const bytes = await readFile(fullPath);
  if (bytes.includes(0)) return; // a zero byte means a binary file, so skip it
  findings.push(...scanText(bytes.toString("utf8"), displayName));
}

async function walk(root, dir, findings) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(root, fullPath, findings);
    } else if (entry.isFile()) {
      await scanFile(fullPath, relative(root, fullPath), findings);
    }
  }
}

// Scans a single file or a whole folder. Results are sorted by file, then line.
export async function scanPath(target) {
  const info = await stat(target);
  const findings = [];
  if (info.isFile()) {
    await scanFile(target, basename(target), findings);
  } else {
    await walk(target, target, findings);
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
