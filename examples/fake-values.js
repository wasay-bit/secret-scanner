// Made-up values in the shape of real secrets, for tests and the demo.
// They are built from pieces at runtime, so this repository never contains a
// complete secret-shaped string. None of them work as real credentials.

export const FAKE = {
  awsAccessKeyId: () => "AKIA" + "Q7W3E9R2T5Y8U1IO",
  // The example key from AWS's own documentation. Real scanners allow it.
  awsDocsExampleKeyId: () => "AKIA" + "IOSFODNN7EXAMPLE",
  githubToken: () => "ghp_" + "k3J9".repeat(9),
  slackToken: () => "xoxb-" + "1234567890-0987654321-aBcDeFgHiJkLmN",
  stripeSecretKey: () => "sk_live_" + "51H8xYz2Qw7Rt4Lp9Nm3Kd6F",
  googleApiKey: () => "AIza" + "Ab1Cd2Ef3".repeat(4).slice(0, 35),
  privateKeyHeader: () => "-----BEGIN " + "RSA " + "PRIVATE KEY-----",
  hardCodedPassword: () => "Xk9#pL2qRw7z",
};
