import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readCapability(name: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `src-tauri/capabilities/${name}.json`), "utf8"),
  ) as Record<string, unknown>;
}

describe("main capability — multiwebview isolation", () => {
  const main = readCapability("main");

  it('scopes by webview label (`webviews: ["main"]`), not window label', () => {
    // Tauri: listing a *window* label grants the capability to every webview
    // of that window, including tab content webviews — the opposite of what
    // we want. Scoping by webview label restricts the grant to the chrome
    // webview itself; tab webviews (labeled `tab-<uuid>`) get nothing.
    expect(main.webviews).toEqual(["main"]);
    expect(main.windows).toBeUndefined();
  });

  it("never grants a broad default permission set", () => {
    const permissions = JSON.stringify(main.permissions);
    expect(permissions).not.toContain("core:default");
    expect(permissions).not.toContain("gencore-browser:default");
    expect(permissions).not.toContain("core:webview:default");
  });

  it("does not grant webview creation to the chrome webview's own JS (goes through gencore-browser instead)", () => {
    const permissions = JSON.stringify(main.permissions);
    expect(permissions).not.toContain("core:webview:allow-create-webview");
  });

  it("grants exactly the gencore-browser commands the UI wrappers call", () => {
    expect(main.permissions).toEqual(
      expect.arrayContaining([
        "gencore-browser:allow-create-tab-webview",
        "gencore-browser:allow-close-tab-webview",
        "gencore-browser:allow-navigate-tab-webview",
        "gencore-browser:allow-eval-tab-webview",
        "gencore-browser:allow-load-bookmarks",
        "gencore-browser:allow-save-bookmarks",
        "gencore-browser:allow-load-history",
        "gencore-browser:allow-save-history",
        "gencore-browser:allow-load-downloads",
        "gencore-browser:allow-save-downloads",
      ]),
    );
  });
});

describe("tray-menu capability", () => {
  const trayMenu = readCapability("tray-menu");

  it("stays scoped to the tray-menu window (no multiwebview concern there)", () => {
    expect(trayMenu.windows).toEqual(["tray-menu"]);
  });
});
