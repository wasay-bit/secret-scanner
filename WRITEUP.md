# Write-up: Secret Scanner

> **Authorship:** Written by AI (Claude) as a practice project.

## The problem

Developers sometimes commit credentials to code: an access key in a config file, a token in a deploy script, a password in a test. Once it is pushed, the secret should be treated as exposed. The fix is to revoke it, not just delete it. A scanner catches these before they spread.

## What I built

A small Node.js command-line tool with no dependencies. It walks a folder, reads text files, and checks each line against:

1. **Known shapes.** Patterns for AWS keys, GitHub, Slack and Stripe tokens, Google API keys and private key headers. These match on format alone.
2. **Named assignments.** Lines such as `password = "..."` are only reported when the value looks random. This is the rule most likely to produce false alarms, so it has the most safeguards.

Every finding is redacted before it is printed, and the exit code makes it usable in CI.

## Decisions worth explaining

- **Redaction by default.** The report is meant to be pasted into tickets and chats, so it should never contain a whole secret. The tests check this.
- **Placeholders are skipped.** Documentation examples such as AWS's `EXAMPLE` key would otherwise flood the report.
- **Randomness check for passwords.** Without it, every `password = "..."` in a test file would be flagged. A simple entropy measure separates `"aaaaaaaa"` from `"Xk9#pL2qRw7z"`.
- **Explicit ignore marker.** Sometimes a value really is public. A visible marker, which reviewers can see, is better than a hidden exclusion list.
- **The scanner scans itself.** The CI workflow runs the scanner on its own repository. Test values are built at runtime, so the repository stays clean and the check stays meaningful.
- **Fake secrets built from pieces.** Writing a complete secret-shaped string into the repository would trigger GitHub's own push protection and could confuse other scanners.

## What I learned

- Pattern matching is quick to write and easy to get wrong in both directions. Most of the work went into the cases that should not be reported.
- A tool that handles secrets must be careful with its own output, not only with what it finds.
- Tests that check for a leak (for example, "the full secret never appears in the output") catch regressions that a normal test would miss.

## Limits

- Known shapes only. New token formats need new rules.
- The randomness check is a heuristic. A strong password that happens to have low variety can be missed, and a weak word-based value can be reported.
- It doesn't check whether a secret is still valid, and it doesn't read git history.

## Next steps I would take

- Scan git history, not just the current files.
- Add more rules from real provider documentation, and test each one against its documented example.
- Add a `--fail-on` option so a team can choose which rules block a build.
