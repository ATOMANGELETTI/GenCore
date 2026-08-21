export const REPO_MAP = [
  "GenCore monorepo (pnpm + Cargo workspaces):",
  "apps: terminal, explorer (Tauri 2 + Vite + React, private).",
  "packages: @gencore/ui-kit, @gencore/config-typescript, @gencore/config-vite.",
  "crates: gencore-core, gencore-pty (crates/gencore-plugin-pty), gencore-fs (crates/gencore-plugin-fs).",
  'security: object-form CSP, Isolation IPC, withGlobalTauri=false, least-privilege capabilities on ["main"] only.'
].join(" ");

export const SECRET_WARNING =
  "Heads up: this prompt looks like it may contain a live secret/API key. Consider redacting it before sending.";

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9]{16,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/
];

/**
 * @param {string} command
 * @returns {boolean}
 */
export function isForcePushToProtectedBranch(command) {
  if (typeof command !== "string" || !command) return false;
  const isGitPush = /\bgit\s+push\b/i.test(command);
  if (!isGitPush) return false;
  const hasForceFlag = /(--force(-with-lease)?\b|(?<![\w-])-f\b)/i.test(command);
  if (!hasForceFlag) return false;
  return /\b(main|master)\b/i.test(command);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeSecret(text) {
  if (typeof text !== "string") return false;
  return SECRET_PATTERNS.some((re) => re.test(text));
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function formatterHint(filePath) {
  if (/\.(rs)$/i.test(filePath)) return "cargo fmt";
  if (/\.(mts|cts|ts|tsx|mjs|cjs|js|jsx|json|css)$/i.test(filePath)) {
    return "biome format --write";
  }
  return null;
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function workspaceMember(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/(?:^|\/)(apps|packages|crates)\/([^/]+)\//);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

const CRATE_PACKAGE_BY_FOLDER = {
  "gencore-plugin-pty": "gencore-pty",
  "gencore-plugin-fs": "gencore-fs"
};

/**
 * @param {string} member
 * @returns {string | null}
 */
export function testCommandFor(member) {
  const [root, name] = member.split("/");
  if (root === "crates") {
    const crateName = CRATE_PACKAGE_BY_FOLDER[name] ?? name;
    return `cargo test -p ${crateName}`;
  }
  if (root === "apps") return `pnpm --filter @gencore/${name} test`;
  if (root === "packages") return `pnpm --filter @gencore/${name} test`;
  return null;
}

/**
 * @param {string[]} members
 * @returns {string | null}
 */
export function testReminderMessage(members) {
  const commands = members.map(testCommandFor).filter(Boolean);
  if (commands.length === 0) return null;
  return `Reminder: run tests for the packages/crates touched this turn: ${commands.join(", ")}`;
}

/**
 * @param {string} configLabel
 * @returns {string}
 */
export function forcePushDenyReason(configLabel) {
  return `Blocked: force-pushing to main/master is denied by ${configLabel}. Use a feature branch and open a PR instead, or ask the user to run this manually.`;
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function extractUserText(row) {
  if (!row || typeof row !== "object") return "";
  const role = row.role ?? row.author ?? row.type ?? row.kind;
  const looksUser =
    role === "user" || role === "USER" || role === "human" || row.userMessage != null;
  const candidates = [
    row.userMessage,
    row.user_message,
    typeof row.content === "string" ? row.content : null,
    row.text,
    row.message,
    row.prompt
  ];
  if (Array.isArray(row.content)) {
    candidates.push(
      row.content
        .map((part) => (typeof part === "string" ? part : part?.text ?? part?.content ?? ""))
        .join("\n")
    );
  }
  const text = candidates.find((c) => typeof c === "string" && c.trim());
  if (!text) return "";
  if (looksUser || row.userMessage != null) return text;
  return "";
}

/**
 * @param {string} jsonl
 * @returns {string}
 */
export function lastUserTextFromTranscript(jsonl) {
  if (typeof jsonl !== "string" || !jsonl.trim()) return "";
  const lines = jsonl.split(/\r?\n/).filter((line) => line.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const text = extractUserText(JSON.parse(lines[i]));
      if (text) return text;
    } catch {
      // skip malformed rows
    }
  }
  return "";
}
