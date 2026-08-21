import assert from "node:assert/strict";
import test from "node:test";
import { handlePostToolUse } from "../../.agents/hooks/post-tool-use.mjs";
import { handlePreInvocation } from "../../.agents/hooks/pre-invocation.mjs";
import { handlePreToolUse } from "../../.agents/hooks/pre-tool-use.mjs";
import { handleStop } from "../../.agents/hooks/stop.mjs";
import { REPO_MAP, SECRET_WARNING } from "../../.cursor/hooks/policy.mjs";

test("handlePreToolUse denies force-push to main and allows other commands", () => {
  const deny = handlePreToolUse({
    toolCall: { name: "run_command", args: { CommandLine: "git push --force origin main" } },
  });
  assert.equal(deny.decision, "deny");
  assert.match(deny.reason, /main\/master/);

  const allow = handlePreToolUse({
    toolCall: { name: "run_command", args: { CommandLine: "pnpm test" } },
  });
  assert.equal(allow.decision, "allow");
});

test("handleStop never continues the loop", () => {
  assert.deepEqual(handleStop(), { decision: "stop" });
});

test("handlePreInvocation injects repo map once, secret warning, and one test reminder", async () => {
  /** @type {Record<string, unknown>} */
  let state = {
    conv: { members: ["packages/ui-kit"], testReminderSent: false },
  };
  const deps = {
    readTranscript: async () =>
      `${JSON.stringify({ role: "user", content: "ghp_abcdefghijklmnopqrstuvwxyz1234567890" })}\n`,
    readState: async () => state,
    writeState: async (next) => {
      state = next;
    },
  };

  const first = await handlePreInvocation(
    { invocationNum: 0, conversationId: "conv", transcriptPath: "t.jsonl" },
    deps,
  );
  assert.equal(first.injectSteps[0].ephemeralMessage, REPO_MAP);
  assert.equal(first.injectSteps[1].ephemeralMessage, SECRET_WARNING);
  assert.match(first.injectSteps[2].ephemeralMessage, /@gencore\/ui-kit/);
  assert.equal(state.conv.testReminderSent, true);

  const second = await handlePreInvocation(
    { invocationNum: 1, conversationId: "conv", transcriptPath: "t.jsonl" },
    {
      ...deps,
      readTranscript: async () => "",
    },
  );
  assert.deepEqual(second, {});
});

test("handlePostToolUse records workspace members from TargetFile", async () => {
  /** @type {Record<string, unknown>} */
  let state = {};
  const out = await handlePostToolUse(
    {
      conversationId: "c1",
      toolCall: {
        name: "write_to_file",
        args: { TargetFile: "packages/ui-kit/src/foo.ts" },
      },
    },
    {
      readState: async () => state,
      writeState: async (next) => {
        state = next;
      },
    },
  );
  assert.deepEqual(out, {});
  assert.deepEqual(state.c1.members, ["packages/ui-kit"]);
  assert.equal(state.c1.testReminderSent, false);
});
