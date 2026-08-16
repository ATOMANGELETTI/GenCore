// afterFileEdit hook: hint the right formatter and record touched workspace members
// so the `stop` hook can remind which package/crate tests to run.
//
// The Cursor hooks reference does not document an output field for afterFileEdit
// (unlike postToolUse's `additional_context`), so this hook does not invent one — the
// formatter hint is written to stderr (visible in the Hooks output channel) and it
// never mutates the edited file itself.
//
// State file: .cursor/hooks/state/edited-files.json (NOT continual-learning.json).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { readStdinJson, writeJson } from "./_util.mjs";

const STATE_DIR = ".cursor/hooks/state";
const STATE_PATH = path.join(STATE_DIR, "edited-files.json");

function formatterHint(filePath) {
  if (/\.(rs)$/i.test(filePath)) return "cargo fmt";
  if (/\.(mts|cts|ts|tsx|mjs|cjs|js|jsx|json|css)$/i.test(filePath)) return "biome format --write";
  return null;
}

function workspaceMember(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/(?:^|\/)(apps|packages|crates)\/([^/]+)\//);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
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
  const filePath = input.file_path ?? "";
  const conversationId = input.conversation_id ?? "unknown";

  const hint = formatterHint(filePath);
  if (hint) {
    process.stderr.write(`[after-file-edit] ${filePath}: run \`${hint}\`\n`);
  }

  const member = workspaceMember(filePath);
  if (member) {
    const state = await readState();
    const members = new Set(state[conversationId] ?? []);
    members.add(member);
    state[conversationId] = Array.from(members);
    await writeState(state);
  }

  writeJson({});
}

main().catch(() => {
  writeJson({});
});
