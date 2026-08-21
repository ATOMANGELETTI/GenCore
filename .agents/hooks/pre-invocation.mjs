import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStdinJson, writeJson } from "../../.cursor/hooks/_util.mjs";
import {
  lastUserTextFromTranscript,
  looksLikeSecret,
  REPO_MAP,
  SECRET_WARNING,
  testReminderMessage,
} from "../../.cursor/hooks/policy.mjs";

const STATE_PATH = path.join(".agents", "hooks", "state", "edited-files.json");

function isMain() {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
}

async function defaultReadTranscript(transcriptPath) {
  if (typeof transcriptPath !== "string" || !transcriptPath) return "";
  try {
    return await readFile(transcriptPath, "utf8");
  } catch {
    return "";
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
 * @param {{ readTranscript?: Function, readState?: Function, writeState?: Function }} [deps]
 */
export async function handlePreInvocation(input, deps = {}) {
  const readTranscript = deps.readTranscript ?? defaultReadTranscript;
  const readState = deps.readState ?? defaultReadState;
  const writeState = deps.writeState ?? defaultWriteState;
  /** @type {{ ephemeralMessage: string }[]} */
  const injectSteps = [];

  if (input?.invocationNum === 0) {
    injectSteps.push({ ephemeralMessage: REPO_MAP });
  }

  const transcript = await readTranscript(input?.transcriptPath);
  const lastUser = lastUserTextFromTranscript(transcript);
  if (looksLikeSecret(lastUser)) {
    injectSteps.push({ ephemeralMessage: SECRET_WARNING });
  }

  const conversationId = input?.conversationId ?? "unknown";
  const state = await readState();
  const current = state[conversationId];
  if (current?.members?.length && current.testReminderSent !== true) {
    const reminder = testReminderMessage(current.members);
    if (reminder) {
      injectSteps.push({ ephemeralMessage: reminder });
      state[conversationId] = { ...current, testReminderSent: true };
      await writeState(state);
    }
  }

  return injectSteps.length > 0 ? { injectSteps } : {};
}

async function main() {
  const input = await readStdinJson();
  writeJson(await handlePreInvocation(input));
}

if (isMain()) {
  main().catch(() => {
    writeJson({});
  });
}
