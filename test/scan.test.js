import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanText, scanPath, redact, shannonEntropy, IGNORE_MARKER } from "../lib/scan.js";
import { FAKE } from "../examples/fake-values.js";

// Builds a "key = value" line at runtime, so no test file holds a secret-shaped line.
const assignment = (name, value) => [name, ' = "', value, '"'].join("");

test("scanText reports each kind of fake secret", () => {
  const text = [
    `aws: ${FAKE.awsAccessKeyId()}`,
    `gh: ${FAKE.githubToken()}`,
    `key: ${FAKE.privateKeyHeader()}`,
    assignment("db_password", FAKE.hardCodedPassword()),
  ].join("\n");
  const rules = scanText(text, "config.env").map((f) => f.rule).sort();
  assert.deepEqual(rules, ["aws-access-key-id", "generic-secret", "github-token", "private-key"]);
});

test("findings report file and line numbers", () => {
  const findings = scanText(`first line\nsecond: ${FAKE.githubToken()}`, "a.txt");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "a.txt");
  assert.equal(findings[0].line, 2);
});

test("a finding never contains the whole secret", () => {
  const secret = FAKE.githubToken();
  const findings = scanText(`token: ${secret}`, "x");
  assert.equal(findings.length, 1);
  assert.ok(!JSON.stringify(findings).includes(secret), "full secret leaked into the report");
  assert.equal(findings[0].match, redact(secret));
});

test("redact keeps only the start and end", () => {
  assert.equal(redact("abcdefghijkl"), "abcd...ijkl");
  assert.equal(redact("short"), "*****");
});

test("the AWS documentation example key is not reported", () => {
  assert.equal(scanText(`id = ${FAKE.awsDocsExampleKeyId()}`).length, 0);
});

test("a line with the ignore marker is skipped", () => {
  const line = `${IGNORE_MARKER} ${FAKE.githubToken()}`;
  assert.equal(scanText(line).length, 0);
});

test("a low-randomness password value is not reported", () => {
  assert.equal(scanText(assignment("password", "aaaaaaaaaaaa")).length, 0);
});

test("a password read from the environment is not reported", () => {
  assert.equal(scanText("const password = process.env.DB_PASSWORD;").length, 0);
});

test("shannon entropy grows with variety", () => {
  assert.equal(shannonEntropy("aaaa"), 0);
  assert.ok(shannonEntropy("abcd") > shannonEntropy("aabb"));
});

test("scanPath walks folders, skips node_modules, and skips binary files", async () => {
  const root = await mkdtemp(join(tmpdir(), "scan-test-"));
  try {
    await mkdir(join(root, "src"));
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "src", "app.js"), `const k = "${FAKE.githubToken()}";\n`);
    await writeFile(join(root, "node_modules", "dep.js"), `const k = "${FAKE.githubToken()}";\n`);
    await writeFile(join(root, "image.bin"), Buffer.from([0, 1, 2, 3, 0]));

    const findings = await scanPath(root);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, join("src", "app.js"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scanPath accepts a single file", async () => {
  const root = await mkdtemp(join(tmpdir(), "scan-test-"));
  try {
    const file = join(root, "notes.txt");
    await writeFile(file, `token: ${FAKE.slackToken()}\n`);
    const findings = await scanPath(file);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, "notes.txt");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
