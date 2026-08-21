import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";
import { GENCORE_REPO_URL } from "../../src/modules/ipc/ipc.opener";

const EMPTY_ARG_COMMANDS = [
  "plugin:gencore-core|get_app_info",
  "plugin:window|close",
  "plugin:window|minimize",
  "plugin:window|toggle_maximize",
  "plugin:window|start_dragging",
  "plugin:window|theme",
] as const;

const WINDOW_COMMANDS = [
  "plugin:window|close",
  "plugin:window|minimize",
  "plugin:window|toggle_maximize",
  "plugin:window|start_dragging",
  "plugin:window|theme",
] as const;

const OPEN_URL_CMD = "plugin:opener|open_url";
const TRAY_ACTION_CMD = "plugin:gencore-core|tray_action";
const TRAY_ACTIONS = ["show", "hide", "quit"] as const;
const EVENT_LISTEN_CMD = "plugin:event|listen";
const EVENT_UNLISTEN_CMD = "plugin:event|unlisten";
const EVENT_EMIT_CMD = "plugin:event|emit";
const THEME_CHANGED_EVENT = "tauri://theme-changed";

const FORBIDDEN_TOKENS = [
  "gencore-pty",
  "gencore-fs",
  "core:default",
  "opener:default",
  "core:event:default",
  "core:window:default",
  "core:window:allow-set-theme",
] as const;

const hookSource = readFileSync(resolve(process.cwd(), "isolation/isolation.hook.js"), "utf8");
const capabilitySource = readFileSync(
  resolve(process.cwd(), "src-tauri/capabilities/main.json"),
  "utf8",
);
const isolationHtml = readFileSync(resolve(process.cwd(), "isolation/index.html"), "utf8");

type IsolationEnvelope = {
  cmd?: unknown;
  callback?: unknown;
  error?: unknown;
  payload?: unknown;
  options?: unknown;
  [key: string]: unknown;
};

type IsolationHook = (payload: IsolationEnvelope) => IsolationEnvelope;

type OpenerPermission = {
  identifier: string;
  allow: Array<{ url: string }>;
};

type CapabilityFile = {
  windows: string[];
  permissions: Array<string | OpenerPermission>;
};

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
  return {
    cmd,
    callback: 1,
    error: 2,
    payload,
    options: undefined,
    ...extra,
  };
}

beforeAll(() => {
  runInThisContext(hookSource, { filename: "isolation.hook.js" });
});

describe("explorer isolation hook", () => {
  it.each(EMPTY_ARG_COMMANDS)("returns a new object for %s with empty args", (cmd) => {
    const hook = getHook();
    const input = envelope(cmd, {}, { injected: "strip-me" });
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(cmd);
    expect(result.callback).toBe(1);
    expect(result.error).toBe(2);
    expect(result.payload).toEqual({});
    expect(result).not.toHaveProperty("injected");
  });

  it.each([undefined, null] as const)("allows get_app_info when payload args are %s", (payload) => {
    const hook = getHook();
    const input = envelope("plugin:gencore-core|get_app_info", payload);
    const result = hook(input);
    expect(result).not.toBe(input);
    expect(result.cmd).toBe("plugin:gencore-core|get_app_info");
  });

  it("allows open_url for the GenCore repo URL and returns a new object", () => {
    const hook = getHook();
    const inner = { url: GENCORE_REPO_URL };
    const input = envelope(OPEN_URL_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(OPEN_URL_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ url: GENCORE_REPO_URL });
  });

  it("allows open_url when with is undefined and returns a url-only payload", () => {
    const hook = getHook();
    const inner = { url: GENCORE_REPO_URL, with: undefined };
    const input = envelope(OPEN_URL_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ url: GENCORE_REPO_URL });
    expect(result.payload).not.toHaveProperty("with");
  });

  it("throws for open_url with any other URL", () => {
    const hook = getHook();
    expect(() => hook(envelope(OPEN_URL_CMD, { url: "https://evil.example/" }))).toThrow();
    expect(() => hook(envelope(OPEN_URL_CMD, { url: `${GENCORE_REPO_URL}/issues` }))).toThrow();
    expect(() => hook(envelope(OPEN_URL_CMD, { url: GENCORE_REPO_URL, extra: true }))).toThrow();
    expect(() =>
      hook(envelope(OPEN_URL_CMD, { url: GENCORE_REPO_URL, with: "firefox" })),
    ).toThrow();
  });

  it("throws when cmd is not a string", () => {
    const hook = getHook();
    expect(() => hook(envelope(1))).toThrow();
    expect(() => hook(null as unknown as IsolationEnvelope)).toThrow();
    expect(() => hook("plugin:window|close" as unknown as IsolationEnvelope)).toThrow();
  });

  it("throws for unknown commands", () => {
    const hook = getHook();
    expect(() => hook(envelope("plugin:gencore-pty|spawn"))).toThrow();
    expect(() => hook(envelope("plugin:gencore-fs|read"))).toThrow();
    expect(() => hook(envelope("plugin:opener|open_path"))).toThrow();
  });

  it("throws for get_app_info with extra args", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope("plugin:gencore-core|get_app_info", { unexpected: true })),
    ).toThrow();
  });

  it.each(WINDOW_COMMANDS)("throws for %s with extra args", (cmd) => {
    const hook = getHook();
    expect(() => hook(envelope(cmd, { unexpected: true }))).toThrow();
    expect(() => hook(envelope(cmd, { label: "other" }))).toThrow();
  });

  it.each(WINDOW_COMMANDS)("allows %s with the main window label", (cmd) => {
    const hook = getHook();
    const input = envelope(cmd, { label: "main" });
    const result = hook(input);
    expect(result).not.toBe(input);
    expect(result.cmd).toBe(cmd);
    expect(result.payload).toEqual({ label: "main" });
  });

  it("allows plugin:window|theme with the tray-menu window label", () => {
    const hook = getHook();
    const input = envelope("plugin:window|theme", { label: "tray-menu" });
    const result = hook(input);
    expect(result).not.toBe(input);
    expect(result.cmd).toBe("plugin:window|theme");
    expect(result.payload).toEqual({ label: "tray-menu" });
  });

  it("throws for plugin:window|theme with a non-allowed window label", () => {
    const hook = getHook();
    expect(() => hook(envelope("plugin:window|theme", { label: "other" }))).toThrow();
  });

  it.each([
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
  ] as const)("throws for %s with the tray-menu window label", (cmd) => {
    const hook = getHook();
    expect(() => hook(envelope(cmd, { label: "tray-menu" }))).toThrow();
  });

  it("does not mention forbidden capability tokens in the hook source", () => {
    for (const token of FORBIDDEN_TOKENS) {
      expect(hookSource).not.toContain(token);
    }
  });

  it("keeps capabilities aligned with the UI command set and GENCORE_REPO_URL", () => {
    const capability = JSON.parse(capabilitySource) as CapabilityFile;
    expect(capability.windows).toEqual(["main"]);
    expect(capability.permissions).toEqual([
      "core:window:allow-close",
      "core:window:allow-minimize",
      "core:window:allow-toggle-maximize",
      "core:window:allow-start-dragging",
      "core:window:allow-theme",
      "gencore-core:allow-get-app-info",
      "core:event:allow-listen",
      "core:event:allow-unlisten",
      {
        identifier: "opener:allow-open-url",
        allow: [{ url: GENCORE_REPO_URL }],
      },
    ]);

    const permissionText = JSON.stringify(capability.permissions);
    expect(permissionText).not.toContain("gencore-core:allow-tray-action");
    for (const token of FORBIDDEN_TOKENS) {
      expect(permissionText).not.toContain(token);
    }
  });

  it("scopes the tray-menu capability to tray-menu with exactly four permissions", () => {
    const trayMenuCapabilitySource = readFileSync(
      resolve(process.cwd(), "src-tauri/capabilities/tray-menu.json"),
      "utf8",
    );
    const capability = JSON.parse(trayMenuCapabilitySource) as CapabilityFile;
    expect(capability.windows).toEqual(["tray-menu"]);
    expect(capability.permissions).toEqual([
      "gencore-core:allow-tray-action",
      "core:window:allow-theme",
      "core:event:allow-listen",
      "core:event:allow-unlisten",
    ]);
    const permissionText = JSON.stringify(capability.permissions);
    expect(permissionText).not.toContain("gencore-fs");
    expect(permissionText).not.toContain("gencore-pty");
    expect(permissionText).not.toContain("core:default");
    expect(permissionText).not.toContain("core:tray");
  });

  it("loads the isolation script from head", () => {
    const head = isolationHtml.match(/<head>([\s\S]*?)<\/head>/);
    expect(head?.[1]).toContain('name="viewport"');
    expect(head?.[1]).toContain('<script src="./isolation.hook.js"></script>');
    const body = isolationHtml.match(/<body>([\s\S]*?)<\/body>/);
    expect(body?.[1]).not.toContain("isolation.hook.js");
  });

  it("allowlists event listen and unlisten without emit", () => {
    expect(hookSource).toContain(`"${EVENT_LISTEN_CMD}",`);
    expect(hookSource).toContain(`"${EVENT_UNLISTEN_CMD}",`);
    expect(hookSource).not.toContain("plugin:event|emit");
  });

  it("reconstructs listen for tauri://theme-changed with Window main target", () => {
    const hook = getHook();
    const inner = {
      event: THEME_CHANGED_EVENT,
      target: { kind: "Window", label: "main" },
      handler: 11,
    };
    const input = envelope(EVENT_LISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(EVENT_LISTEN_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({
      event: THEME_CHANGED_EVENT,
      target: { kind: "Window", label: "main" },
      handler: 11,
    });
    expect((result.payload as { target: unknown }).target).not.toBe(inner.target);
  });

  it("allows theme-changed listen when label precedes kind", () => {
    const hook = getHook();
    const inner = {
      event: THEME_CHANGED_EVENT,
      target: { label: "main", kind: "Window" },
      handler: 11,
    };
    const result = hook(envelope(EVENT_LISTEN_CMD, inner));
    expect(result.payload).toEqual({
      event: THEME_CHANGED_EVENT,
      target: { kind: "Window", label: "main" },
      handler: 11,
    });
  });

  it("reconstructs listen for tauri://theme-changed with Window tray-menu target", () => {
    const hook = getHook();
    const inner = {
      event: THEME_CHANGED_EVENT,
      target: { kind: "Window", label: "tray-menu" },
      handler: 11,
    };
    const input = envelope(EVENT_LISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({
      event: THEME_CHANGED_EVENT,
      target: { kind: "Window", label: "tray-menu" },
      handler: 11,
    });
    expect((result.payload as { target: unknown }).target).not.toBe(inner.target);
  });

  it("throws for theme-changed listen with a non-allowed window label", () => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: THEME_CHANGED_EVENT,
          target: { kind: "Window", label: "other" },
          handler: 7,
        }),
      ),
    ).toThrow();
  });

  it("throws for listen with a wrong event, extra keys, or emit", () => {
    const hook = getHook();
    const validTarget = { kind: "Window", label: "main" };
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: "tauri://click",
          target: validTarget,
          handler: 7,
        }),
      ),
    ).toThrow();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: "gencore-fs://entry-changed",
          target: { kind: "Any" },
          handler: 7,
        }),
      ),
    ).toThrow();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: THEME_CHANGED_EVENT,
          target: validTarget,
          handler: 7,
          extra: true,
        }),
      ),
    ).toThrow();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: THEME_CHANGED_EVENT,
          target: { kind: "Any" },
          handler: 7,
        }),
      ),
    ).toThrow();
    expect(() => hook(envelope(EVENT_EMIT_CMD, { event: THEME_CHANGED_EVENT }))).toThrow();
  });

  it("reconstructs unlisten for tauri://theme-changed", () => {
    const hook = getHook();
    const inner = { event: THEME_CHANGED_EVENT, eventId: 5 };
    const input = envelope(EVENT_UNLISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ event: THEME_CHANGED_EVENT, eventId: 5 });
  });

  it("throws for unlisten with a wrong event", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope(EVENT_UNLISTEN_CMD, { event: "tauri://click", eventId: 3 })),
    ).toThrow();
  });

  it.each(TRAY_ACTIONS)(
    "allows tray_action %s and reconstructs an action-only payload",
    (action) => {
      const hook = getHook();
      const inner = { action };
      const input = envelope(TRAY_ACTION_CMD, inner);
      const result = hook(input);

      expect(result).not.toBe(input);
      expect(result.cmd).toBe(TRAY_ACTION_CMD);
      expect(result.payload).not.toBe(inner);
      expect(result.payload).toEqual({ action });
      expect(Object.keys(result.payload as object)).toEqual(["action"]);
    },
  );

  it("throws for tray_action with extra keys or an unknown action", () => {
    const hook = getHook();
    expect(() => hook(envelope(TRAY_ACTION_CMD, { action: "show", extra: true }))).toThrow();
    expect(() => hook(envelope(TRAY_ACTION_CMD, { action: "foo" }))).toThrow();
    expect(() => hook(envelope(TRAY_ACTION_CMD, {}))).toThrow();
    expect(() => hook(envelope(TRAY_ACTION_CMD, { label: "main" }))).toThrow();
  });
});
