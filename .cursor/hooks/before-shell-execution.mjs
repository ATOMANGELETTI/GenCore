import { readStdinJson, writeJson } from "./_util.mjs";
import { forcePushDenyReason, isForcePushToProtectedBranch } from "./policy.mjs";

async function main() {
  const input = await readStdinJson();
  const command = input.command ?? "";

  if (isForcePushToProtectedBranch(command)) {
    writeJson({
      permission: "deny",
      user_message: "Force-push to main/master is blocked by a project hook.",
      agent_message: forcePushDenyReason(".cursor/hooks.json")
    });
    return;
  }

  writeJson({ permission: "allow" });
}

main().catch(() => {
  writeJson({ permission: "allow" });
});
