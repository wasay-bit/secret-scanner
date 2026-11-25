# Secret Scanner

A command-line tool that scans files and folders for likely secrets: cloud access keys, service tokens, private key blocks, and hard-coded passwords. It prints each finding with its location, and the secret itself is always redacted.

> **Authorship:** Written by AI (Claude) as a practice project. It is not a replacement for a maintained tool such as gitleaks or GitHub secret scanning.

## Why it exists

Secrets end up in git history all the time: a key pasted into a config file, a token left in a script. Once a secret is pushed, anyone with access to the repository can copy it. This tool finds those mistakes before they ship.

## Quick start

Requires Node.js 18 or newer. No packages to install.

```bash
node cli.js path/to/project           # list findings
node cli.js path/to/project --json    # the same, as JSON
npm run demo                          # scan a made-up project and show the output
npm test                              # run the tests
```

Exit codes: `0` nothing found, `1` secrets found, `2` a usage or read error. That makes it usable in CI, where a finding fails the build.

## What it finds

| Rule | What it looks for |
|---|---|
| AWS access key ID | `AKIA` or `ASIA` followed by 16 characters |
| GitHub token | `ghp_`, `gho_`, `ghu_`, `ghs_` or `ghr_` tokens |
| Slack token | `xoxb-`, `xoxa-`, `xoxp-`, `xoxr-`, `xoxs-` tokens |
| Stripe live secret key | `sk_live_` keys |
| Google API key | `AIza` keys |
| Private key block | `BEGIN ... PRIVATE KEY` headers |
| Hard-coded password or secret | `password`, `secret`, `api_key`, or `token` set to a quoted value that looks random |

## How it avoids false alarms

- **Placeholders are ignored.** Values containing words such as `example`, `changeme`, `your` or `${` are skipped. This covers the AWS documentation example key.
- **Randomness check.** A quoted password value is only reported if it has enough variety (at least 3 bits per character). `"aaaaaaaa"` is not reported. `"Xk9#pL2qRw7z"` is.
- **Explicit skip.** A line containing `secret-scanner:ignore` is skipped. Use it for values that are meant to be public, and say why next to it.
- **Folders skipped.** `.git`, `node_modules`, `dist`, `build` and `coverage` are not scanned. Files over 1 MB and files with binary content are skipped.

## Safety of the output

Each finding shows only the first four and last four characters of the match. The tests check that a full secret never appears in the report, and the demo uses made-up values. The fake values are built from pieces at runtime, so the repository never contains a complete secret-shaped string.

## Files

- `lib/rules.js`: the patterns.
- `lib/scan.js`: reads files, applies the rules and the placeholder and randomness checks, and redacts results.
- `cli.js`: the command-line tool.
- `examples/fake-values.js`: made-up values used by the tests and the demo.
- `examples/demo.js`: builds a fake project in a temporary folder and scans it.
- `test/`: tests for the rules, the scanner, and the command-line exit codes.
- `WRITEUP.md`: what the project shows and what it doesn't.

## Limitations

- It looks for known shapes and for quoted passwords. It can miss a secret in an unusual format, and it can report something that isn't a secret.
- It only reads text files. Secrets inside images, archives, or compiled files are not found.
- It does not check whether a secret still works, and it does not scan git history. A secret that was committed and then deleted still exists in history.
- If a real secret is found, revoke or rotate it first. Removing it from the code does not make it safe.
