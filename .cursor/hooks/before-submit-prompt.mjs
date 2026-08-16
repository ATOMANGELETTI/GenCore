// beforeSubmitPrompt hook: warn (never block) if the prompt looks like it contains a
// live secret. Fail-open: always lets submission continue.

import { readStdinJson, writeJson } from "./_util.mjs";

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9]{16,}\b/, // generic API secret key style (e.g. OpenAI-style)
  /\bghp_[A-Za-z0-9]{20,}\b/, // GitHub personal access token
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ // Slack token
];

function looksLikeSecret(text) {
  if (typeof text !== "string") return false;
  return SECRET_PATTERNS.some((re) => re.test(text));
}

async function main() {
  const input = await readStdinJson();
  const prompt = input.prompt ?? "";

  if (looksLikeSecret(prompt)) {
    writeJson({
      continue: true,
      user_message:
        "Heads up: this prompt looks like it may contain a live secret/API key. " +
        "Consider redacting it before sending."
    });
    return;
  }

  writeJson({ continue: true });
}

main().catch(() => {
  writeJson({ continue: true });
});
