import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";
import { forcePushDenyReason, isForcePushToProtectedBranch } from "../../.cursor/hooks/policy.mjs";

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} input
 */
export function handlePreToolUse(input) {
  const command = input?.toolCall?.args?.CommandLine ?? "";
  if (isForcePushToProtectedBranch(command)) {
    return {
      decision: "deny",
      reason: forcePushDenyReason(".agents/hooks.json"),
    };
  }
  return { decision: "allow" };
}

async function main() {
  const input = await readStdinJson();
  writeJson(handlePreToolUse(input));
}

if (isMain()) {
  main().catch(() => {
    writeJson({ decision: "allow" });
  });
}
