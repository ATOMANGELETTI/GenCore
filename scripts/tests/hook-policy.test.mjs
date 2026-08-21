import assert from "node:assert/strict";
import test from "node:test";
import {
  forcePushDenyReason,
  formatterHint,
  isForcePushToProtectedBranch,
  lastUserTextFromTranscript,
  looksLikeSecret,
  REPO_MAP,
  testCommandFor,
  testReminderMessage,
  workspaceMember,
} from "../../.cursor/hooks/policy.mjs";

test("isForcePushToProtectedBranch only denies force-push to main/master", () => {
  assert.equal(isForcePushToProtectedBranch("git push --force origin main"), true);
  assert.equal(isForcePushToProtectedBranch("git push -f origin master"), true);
  assert.equal(isForcePushToProtectedBranch("git push origin main"), false);
  assert.equal(isForcePushToProtectedBranch("git push --force origin feature"), false);
  assert.equal(isForcePushToProtectedBranch("echo hello"), false);
});

test("looksLikeSecret matches known token shapes and ignores ordinary text", () => {
  assert.equal(looksLikeSecret("ghp_abcdefghijklmnopqrstuvwxyz1234567890"), true);
  assert.equal(looksLikeSecret("please implement the titlebar"), false);
});

test("workspaceMember and testCommandFor map apps/packages/crates", () => {
  assert.equal(workspaceMember("packages/ui-kit/src/foo.ts"), "packages/ui-kit");
  assert.equal(testCommandFor("packages/ui-kit"), "pnpm --filter @gencore/ui-kit test");
  assert.equal(testCommandFor("crates/gencore-core"), "cargo test -p gencore-core");
  assert.equal(testCommandFor("crates/gencore-plugin-pty"), "cargo test -p gencore-pty");
  assert.equal(testCommandFor("crates/gencore-plugin-fs"), "cargo test -p gencore-fs");
  assert.equal(testCommandFor("apps/terminal"), "pnpm --filter @gencore/terminal test");
  assert.equal(formatterHint("foo.rs"), "cargo fmt");
  assert.equal(formatterHint("foo.ts"), "biome format --write");
});

test("lastUserTextFromTranscript reads the last user-like jsonl row fail-open", () => {
  const jsonl = [
    JSON.stringify({ role: "assistant", content: "sk-thisisnottheprompt00000000" }),
    JSON.stringify({ role: "user", content: "please add a button" }),
  ].join("\n");
  assert.equal(lastUserTextFromTranscript(jsonl), "please add a button");
  assert.equal(lastUserTextFromTranscript(""), "");
  assert.equal(lastUserTextFromTranscript("not-json\n"), "");
});

test("testReminderMessage and repo map stay non-empty", () => {
  assert.match(REPO_MAP, /GenCore monorepo/);
  assert.match(testReminderMessage(["packages/ui-kit"]), /pnpm --filter @gencore\/ui-kit test/);
  assert.equal(testReminderMessage([]), null);
  assert.match(forcePushDenyReason(".agents/hooks.json"), /\.agents\/hooks\.json/);
});
