// Patterns for secrets that have a recognizable shape.
// Each rule has an id, the regular expression to look for, and a plain name for the report.

export const RULES = [
  {
    id: "aws-access-key-id",
    name: "AWS access key ID",
    pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "github-token",
    name: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  },
  {
    id: "slack-token",
    name: "Slack token",
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: "stripe-secret-key",
    name: "Stripe live secret key",
    pattern: /\bsk_live_[0-9A-Za-z]{24,}\b/g,
  },
  {
    id: "google-api-key",
    name: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "private-key",
    name: "Private key block",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g,
  },
];

// Looks for a name such as password, api_key or token, then = or :, then a quoted value.
// Group 1 is the name, group 2 the quote character, group 3 the value.
// Only these lines are checked for randomness, because the name alone is not enough.
export const GENERIC_ASSIGNMENT =
  /\b[\w-]*?(password|passwd|pwd|secret|api[_-]?key|token)\b\s*[:=]\s*(["'])([^"'\s]{8,})\2/gi;
