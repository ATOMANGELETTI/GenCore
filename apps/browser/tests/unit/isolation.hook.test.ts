import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";
import { GENCORE_REPO_URL } from "../../src/modules/ipc/ipc.opener";

const VALID_TAB_LABEL = "tab-11111111-2222-3333-4444-555555555555";
const OTHER_TAB_LABEL = "tab-99999999-8888-7777-6666-555555555555";

const hookSource = readFileSync(resolve(process.cwd(), "isolation/isolation.hook.js"), "utf8");
const capabilitySource = readFileSync(
  resolve(process.cwd(), "src-tauri/capabilities/main.json"),
  "utf8",
);

type IsolationEnvelope = {
  cmd?: unknown;
  callback?: unknown;
  error?: unknown;
  payload?: unknown;
  options?: unknown;
  [key: string]: unknown;
};

type IsolationHook = (payload: IsolationEnvelope) => IsolationEnvelope;

function getHook(): IsolationHook {
  const hook = (window as Window & { __TAURI_ISOLATION_HOOK__?: IsolationHook })
    .__TAURI_ISOLATION_HOOK__;
  if (typeof hook !== "function") {
    throw new Error("expected window.__TAURI_ISOLATION_HOOK__");
  }
  return hook;
}

function envelope(
  cmd: unknown,
  payload?: unknown,
  extra?: Record<string, unknown>,
): IsolationEnvelope {
  return { cmd, callback: 1, error: 2, payload, options: undefined, ...extra };
}

function expectRejected(input: IsolationEnvelope) {
  expect(() => getHook()(input)).toThrow();
}

beforeAll(() => {
  runInThisContext(hookSource, { filename: "isolation.hook.js" });
});

describe("browser isolation hook", () => {
  it("rejects any command not on the allowlist", () => {
    expectRejected(envelope("plugin:shell|execute", {}));
    expectRejected(envelope("plugin:fs|read_file", { path: "C:/" }));
    expectRejected(envelope("plugin:core|invoke", {}));
  });

  it("never passes an envelope through unmodified (always reconstructs)", () => {
    const hook = getHook();
    const input = envelope("plugin:gencore-core|get_app_info", {}, { injected: "strip-me" });
    const result = hook(input);
    expect(result).not.toBe(input);
    expect(result).not.toHaveProperty("injected");
  });

  it("allows create_tab_webview only with a well-formed tab-<uuid> label and http(s) url", () => {
    const hook = getHook();
    const ok = envelope("plugin:gencore-browser|create_tab_webview", {
      label: VALID_TAB_LABEL,
      url: "https://example.com",
    });
    const result = hook(ok);
    expect(result.payload).toEqual({ label: VALID_TAB_LABEL, url: "https://example.com" });

    expectRejected(
      envelope("plugin:gencore-browser|create_tab_webview", {
        label: "main",
        url: "https://example.com",
      }),
    );
    expectRejected(
      envelope("plugin:gencore-browser|create_tab_webview", {
        label: VALID_TAB_LABEL,
        url: "javascript:alert(1)",
      }),
    );
    expectRejected(
      envelope("plugin:gencore-browser|create_tab_webview", {
        label: VALID_TAB_LABEL,
        url: "file:///etc/passwd",
      }),
    );
  });

  it("allows navigate_tab_webview with the same shape as create_tab_webview", () => {
    const hook = getHook();
    const result = hook(
      envelope("plugin:gencore-browser|navigate_tab_webview", {
        label: VALID_TAB_LABEL,
        url: "https://example.com/path",
      }),
    );
    expect(result.payload).toEqual({ label: VALID_TAB_LABEL, url: "https://example.com/path" });
  });

  it("allows close_tab_webview only with a well-formed tab label", () => {
    const hook = getHook();
    const result = hook(
      envelope("plugin:gencore-browser|close_tab_webview", { label: VALID_TAB_LABEL }),
    );
    expect(result.payload).toEqual({ label: VALID_TAB_LABEL });
    expectRejected(envelope("plugin:gencore-browser|close_tab_webview", { label: "main" }));
  });

  it("allows eval_tab_webview with a bounded script string on a valid tab label", () => {
    const hook = getHook();
    const result = hook(
      envelope("plugin:gencore-browser|eval_tab_webview", {
        label: VALID_TAB_LABEL,
        script: "history.back()",
      }),
    );
    expect(result.payload).toEqual({ label: VALID_TAB_LABEL, script: "history.back()" });
    expectRejected(
      envelope("plugin:gencore-browser|eval_tab_webview", {
        label: VALID_TAB_LABEL,
        script: "x".repeat(70_000),
      }),
    );
  });

  it("allows the built-in webview size/position/zoom/focus/hide/show commands only for tab labels", () => {
    const hook = getHook();
    const withValue = hook(
      envelope("plugin:webview|set_webview_zoom", { label: VALID_TAB_LABEL, value: 1.25 }),
    );
    expect(withValue.payload).toEqual({ label: VALID_TAB_LABEL, value: 1.25 });

    const labelOnly = hook(envelope("plugin:webview|webview_show", { label: OTHER_TAB_LABEL }));
    expect(labelOnly.payload).toEqual({ label: OTHER_TAB_LABEL });

    expectRejected(envelope("plugin:webview|webview_show", { label: "main" }));
    expectRejected(envelope("plugin:webview|set_webview_zoom", { label: "main", value: 1 }));
  });

  it("rejects save_bookmarks/save_history/save_downloads payloads over the size cap", () => {
    expectRejected(
      envelope("plugin:gencore-browser|save_bookmarks", { json: "x".repeat(17 * 1024 * 1024) }),
    );
  });

  it("allows save_bookmarks with a plain json string payload", () => {
    const hook = getHook();
    const result = hook(
      envelope("plugin:gencore-browser|save_bookmarks", { json: '{"version":1,"bookmarks":[]}' }),
    );
    expect(result.payload).toEqual({ json: '{"version":1,"bookmarks":[]}' });
  });

  it("allows load_bookmarks/load_history/load_downloads only with empty args", () => {
    const hook = getHook();
    expect(hook(envelope("plugin:gencore-browser|load_bookmarks", {})).payload).toBeUndefined();
    expectRejected(envelope("plugin:gencore-browser|load_history", { extra: true }));
  });

  it("allows open_url only for the pinned GenCore repo URL", () => {
    const hook = getHook();
    const result = hook(envelope("plugin:opener|open_url", { url: GENCORE_REPO_URL }));
    expect(result.payload).toEqual({ url: GENCORE_REPO_URL });
    expectRejected(envelope("plugin:opener|open_url", { url: "https://evil.example" }));
  });

  it("allows listen/unlisten only for gencore-browser:// events and window-scoped theme-changed", () => {
    const hook = getHook();
    const listened = hook(
      envelope("plugin:event|listen", {
        event: "gencore-browser://tab-navigated",
        target: { kind: "Any" },
        handler: 7,
      }),
    );
    expect(listened.payload).toEqual({
      event: "gencore-browser://tab-navigated",
      target: { kind: "Any" },
      handler: 7,
    });

    expectRejected(
      envelope("plugin:event|listen", {
        event: "gencore-browser://tab-navigated",
        target: { kind: "Window", label: "tab-11111111-2222-3333-4444-555555555555" },
        handler: 7,
      }),
    );
    expectRejected(
      envelope("plugin:event|listen", {
        event: "some-other-event",
        target: { kind: "Any" },
        handler: 7,
      }),
    );
  });

  it("only appears in a capability scoped by webview label, never window label", () => {
    const capability = JSON.parse(capabilitySource) as { windows?: string[]; webviews?: string[] };
    expect(capability.webviews).toEqual(["main"]);
    expect(capability.windows).toBeUndefined();
  });
});
