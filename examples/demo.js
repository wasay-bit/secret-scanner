// Demo: builds a small fake project with made-up secrets in a temporary folder,
// scans it, then deletes the folder. Nothing real is written anywhere.
//
//   npm run demo

import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanPath } from "../lib/scan.js";
import { FAKE } from "./fake-values.js";

const root = await mkdtemp(join(tmpdir(), "secret-scanner-demo-"));

try {
  await mkdir(join(root, "config"));
  await mkdir(join(root, "keys"));
  await mkdir(join(root, "src"));

  await writeFile(
    join(root, ".env"),
    [
      `AWS_ACCESS_KEY_ID=${FAKE.awsAccessKeyId()}`,
      `DB_PASSWORD="${FAKE.hardCodedPassword()}"`,
      `MAPS_KEY=${FAKE.googleApiKey()}`,
    ].join("\n") + "\n",
  );

  await writeFile(
    join(root, "config", "payments.yml"),
    `stripe_key: ${FAKE.stripeSecretKey()}\nmode: live\n`,
  );

  await writeFile(
    join(root, "deploy.sh"),
    [
      "#!/bin/sh",
      `export SLACK_TOKEN=${FAKE.slackToken()}`,
      `# secret-scanner:ignore  test token, safe to publish: ${FAKE.githubToken()}`,
      "./release.sh",
    ].join("\n") + "\n",
  );

  await writeFile(
    join(root, "README.md"),
    `Example key from the AWS docs: ${FAKE.awsDocsExampleKeyId()}\n`,
  );

  await writeFile(join(root, "keys", "deploy_key"), `${FAKE.privateKeyHeader()}\n`);

  await writeFile(
    join(root, "src", "app.js"),
    "const password = process.env.DB_PASSWORD;\nconsole.log('starting');\n",
  );

  const findings = await scanPath(root);
  console.log(`Scanned a fake project with ${findings.length} finding(s):\n`);
  for (const f of findings) {
    console.log(`${f.file}:${f.line}  ${f.name}  ${f.match}`);
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
