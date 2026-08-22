import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};
const wrapper = readFileSync(
  resolve(process.cwd(), "../../scripts/tauri-dev-terminal.mjs"),
  "utf8",
);
const win64 = readFileSync(resolve(process.cwd(), "../../scripts/package-win64.ps1"), "utf8");
const tauriConf = readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8");

describe("WebView2 debug port is dev-only", () => {
  it("points tauri:dev at the wrapper that opens port 9223", () => {
    expect(pkg.scripts["tauri:dev"]).toBe("node ../../scripts/tauri-dev-terminal.mjs");
    expect(pkg.scripts["tauri:build"]).toBe("tauri build --no-bundle");
    expect(wrapper).toContain("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS");
    expect(wrapper).toContain("--remote-debugging-port=9223");
  });

  it("does not set the debug port in package:win64 or tauri.conf", () => {
    expect(win64).not.toContain("9223");
    expect(win64).not.toContain("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS");
    expect(tauriConf).not.toContain("9223");
    expect(tauriConf).not.toContain("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS");
  });

  it("deletes CURSOR_AGENT from the spawned tauri:dev env", () => {
    expect(wrapper).toContain("delete env.CURSOR_AGENT");
  });
});
