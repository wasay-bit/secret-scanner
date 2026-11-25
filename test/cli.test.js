import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FAKE } from "../examples/fake-values.js";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
const run = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

async function folderWith(content) {
  const dir = await mkdtemp(join(tmpdir(), "scan-cli-"));
  await writeFile(join(dir, "file.txt"), content);
  return dir;
}

test("exit code 1 and redacted output when a secret is found", async () => {
  const secret = FAKE.githubToken();
  const dir = await folderWith(`token: ${secret}\n`);
  try {
    const result = run([dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /GitHub token/);
    assert.ok(!result.stdout.includes(secret), "full secret printed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("exit code 0 when nothing is found", async () => {
  const dir = await folderWith("nothing to see here\n");
  try {
    const result = run([dir]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /No secrets found/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--json prints a parseable list", async () => {
  const dir = await folderWith(`token: ${FAKE.slackToken()}\n`);
  try {
    const result = run([dir, "--json"]);
    assert.equal(result.status, 1);
    const findings = JSON.parse(result.stdout);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, "slack-token");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("exit code 2 for a missing path and for no path", () => {
  assert.equal(run(["/this/path/does/not/exist"]).status, 2);
  assert.equal(run([]).status, 2);
});
