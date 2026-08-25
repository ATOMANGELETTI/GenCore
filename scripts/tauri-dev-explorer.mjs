import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/explorer");
const repoRoot = path.resolve(appDir, "..", "..");

const env = { ...process.env };
env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9224";
env.GENCORE_DATA_DIR = path.resolve(repoRoot, ".data/explorer");
delete env.CURSOR_AGENT;

const child = spawn("pnpm", ["exec", "tauri", "dev"], {
  cwd: appDir,
  stdio: "inherit",
  shell: true,
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
