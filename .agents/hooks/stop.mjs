import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}

export function handleStop() {
  return { decision: "stop" };
}

async function main() {
  await readStdinJson();
  writeJson(handleStop());
}

if (isMain()) {
  main().catch(() => {
    writeJson({ decision: "stop" });
  });
}
