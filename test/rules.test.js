import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, GENERIC_ASSIGNMENT } from "../lib/rules.js";
import { FAKE } from "../examples/fake-values.js";

const rule = (id) => RULES.find((r) => r.id === id);
const hits = (id, text) => [...text.matchAll(rule(id).pattern)].length;

test("each rule finds its fake sample", () => {
  const samples = {
    "aws-access-key-id": FAKE.awsAccessKeyId(),
    "github-token": FAKE.githubToken(),
    "slack-token": FAKE.slackToken(),
    "stripe-secret-key": FAKE.stripeSecretKey(),
    "google-api-key": FAKE.googleApiKey(),
    "private-key": FAKE.privateKeyHeader(),
  };
  for (const [id, sample] of Object.entries(samples)) {
    assert.equal(hits(id, `value: ${sample} end`), 1, `${id} should match its sample`);
  }
});

test("AWS rule ignores short or lowercase look-alikes", () => {
  assert.equal(hits("aws-access-key-id", "AKIA12345"), 0);
  assert.equal(hits("aws-access-key-id", "akiaq7w3e9r2t5y8u1io"), 0);
});

test("GitHub rule needs the full token length", () => {
  assert.equal(hits("github-token", "ghp_short"), 0);
});

test("private key rule ignores certificates", () => {
  assert.equal(hits("private-key", "-----BEGIN CERTIFICATE-----"), 0);
});

test("generic rule captures the name, quote and value", () => {
  const line = ["db_", "password", ' = "', FAKE.hardCodedPassword(), '"'].join("");
  const [match] = [...line.matchAll(GENERIC_ASSIGNMENT)];
  assert.ok(match, "generic rule should match");
  assert.equal(match[1].toLowerCase(), "password");
  assert.equal(match[3], FAKE.hardCodedPassword());
});

test("generic rule needs a quoted value of at least 8 characters", () => {
  const short = ["pass", "word", ' = "abc"'].join("");
  assert.equal([...short.matchAll(GENERIC_ASSIGNMENT)].length, 0);
});
