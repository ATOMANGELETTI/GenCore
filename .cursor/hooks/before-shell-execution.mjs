// beforeShellExecution hook: deny force-pushes to main/master, fail-open otherwise.
// Do not set failClosed on this hook — a crash or timeout must not brick every shell.

import { readStdinJson, writeJson } from "./_util.mjs";

function isForcePushToProtectedBranch(command) {
  if (typeof command !== "string" || !command) return false;
  const isGitPush = /\bgit\s+push\b/i.test(command);
  if (!isGitPush) return false;
  const hasForceFlag = /(--force(-with-lease)?\b|(?<![\w-])-f\b)/i.test(command);
  if (!hasForceFlag) return false;
  return /\b(main|master)\b/i.test(command);
}

async function main() {
  const input = await readStdinJson();
  const command = input.command ?? "";

  if (isForcePushToProtectedBranch(command)) {
    writeJson({
      permission: "deny",
      user_message: "Force-push to main/master is blocked by a project hook.",
      agent_message:
        "Blocked: force-pushing to main/master is denied by .cursor/hooks.json. " +
        "Use a feature branch and open a PR instead, or ask the user to run this manually."
    });
    return;
  }

  writeJson({ permission: "allow" });
}

main().catch(() => {
  writeJson({ permission: "allow" });
});
