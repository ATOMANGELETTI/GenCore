// beforeSubmitPrompt hook: warn (never block) if the prompt looks like it contains a
// live secret. Fail-open: always lets submission continue.

import { readStdinJson, writeJson } from "./_util.mjs";
import { looksLikeSecret, SECRET_WARNING } from "./policy.mjs";

async function main() {
  const input = await readStdinJson();
  const prompt = input.prompt ?? "";

  if (looksLikeSecret(prompt)) {
    writeJson({
      continue: true,
      user_message: SECRET_WARNING
    });
    return;
  }

  writeJson({ continue: true });
}

main().catch(() => {
  writeJson({ continue: true });
});
