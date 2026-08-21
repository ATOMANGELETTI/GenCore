import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";
import { workspaceMember } from "../../.cursor/hooks/policy.mjs";

const STATE_PATH = path.join(".agents", "hooks", "state", "edited-files.json");

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}

async function defaultReadState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function defaultWriteState(state) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ readState?: Function, writeState?: Function }} [deps]
 */
export async function handlePostToolUse(input, deps = {}) {
  const readState = deps.readState ?? defaultReadState;
  const writeState = deps.writeState ?? defaultWriteState;
  const filePath = input?.toolCall?.args?.TargetFile ?? "";
  const conversationId = input?.conversationId ?? "unknown";
  const member = workspaceMember(filePath);
  if (!member) return {};
  const state = await readState();
  const current = state[conversationId] ?? { members: [], testReminderSent: false };
  const members = new Set(current.members ?? []);
  members.add(member);
  state[conversationId] = {
    ...current,
    members: Array.from(members),
    testReminderSent: false,
  };
  await writeState(state);
  return {};
}

async function main() {
  const input = await readStdinJson();
  writeJson(await handlePostToolUse(input));
}

if (isMain()) {
  main().catch(() => {
    writeJson({});
  });
}
