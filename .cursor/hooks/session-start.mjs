// sessionStart hook: inject a short repo-map as additional_context.
// Fire-and-forget per Cursor docs — the agent loop does not block on this.
// Must never touch .cursor/hooks/state/continual-learning.json.

import { readStdinJson, writeJson } from "./_util.mjs";

const REPO_MAP = [
  "GenCore monorepo (pnpm + Cargo workspaces):",
  "apps: terminal, explorer (Tauri 2 + Vite + React, private).",
  "packages: @gencore/ui-kit, @gencore/config-typescript, @gencore/config-vite.",
  "crates: gencore-core, gencore-pty (crates/gencore-plugin-pty), gencore-fs (crates/gencore-plugin-fs).",
  "security: object-form CSP, Isolation IPC, withGlobalTauri=false, least-privilege capabilities on [\"main\"] only."
].join(" ");

async function main() {
  await readStdinJson();
  writeJson({ additional_context: REPO_MAP });
}

main().catch(() => {
  writeJson({});
});
