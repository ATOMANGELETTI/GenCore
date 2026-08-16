// stop hook: remind which package/crate tests to run, based on files touched this
// conversation (tracked by the afterFileEdit hook in edited-files.json).
// Uses `followup_message`, the only documented stop-hook output field.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { readStdinJson, writeJson } from "./_util.mjs";

const STATE_DIR = ".cursor/hooks/state";
const STATE_PATH = path.join(STATE_DIR, "edited-files.json");

function testCommandFor(member) {
  const [root, name] = member.split("/");
  if (root === "crates") return `cargo test -p ${name}`;
  if (root === "apps") return `pnpm --filter @gencore/${name} test`;
  if (root === "packages") return `pnpm --filter @gencore/${name} test`;
  return null;
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function writeState(state) {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

async function main() {
  const input = await readStdinJson();
  const conversationId = input.conversation_id ?? "unknown";
  const status = input.status ?? "completed";

  if (status !== "completed") {
    writeJson({});
    return;
  }

  const state = await readState();
  const members = state[conversationId] ?? [];

  if (members.length === 0) {
    writeJson({});
    return;
  }

  const commands = members.map(testCommandFor).filter(Boolean);

  // Clear so the reminder fires once per batch of edits, not on every future stop.
  delete state[conversationId];
  await writeState(state);

  if (commands.length === 0) {
    writeJson({});
    return;
  }

  writeJson({
    followup_message: `Reminder: run tests for the packages/crates touched this turn: ${commands.join(", ")}`
  });
}

main().catch(() => {
  writeJson({});
});
