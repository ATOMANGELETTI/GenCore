import { readStdinJson, writeJson } from "./_util.mjs";
import { REPO_MAP } from "./policy.mjs";

async function main() {
  await readStdinJson();
  writeJson({ additional_context: REPO_MAP });
}

main().catch(() => {
  writeJson({});
});
