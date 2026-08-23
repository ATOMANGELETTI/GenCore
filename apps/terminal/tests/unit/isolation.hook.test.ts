import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";
import { GENCORE_REPO_URL } from "../../src/modules/ipc/ipc.opener";

const EMPTY_ARG_COMMANDS = [
  "plugin:gencore-core|get_app_info",
  "plugin:gencore-core|get_system_telemetry",
  "plugin:gencore-core|load_pinned_tabs",
  "plugin:window|close",
  "plugin:window|minimize",
  "plugin:window|toggle_maximize",
  "plugin:window|start_dragging",
  "plugin:window|theme",
  "plugin:gencore-fs|list_drives",
  "plugin:gencore-assistant|list_conversations",
  "plugin:gencore-assistant|create_conversation",
  "plugin:gencore-assistant|get_agent_settings",
  "plugin:gencore-assistant|clear_api_key",
] as const;

const WINDOW_COMMANDS = [
  "plugin:window|close",
  "plugin:window|minimize",
  "plugin:window|toggle_maximize",
  "plugin:window|start_dragging",
  "plugin:window|theme",
] as const;

const OPEN_URL_CMD = "plugin:opener|open_url";

const FS_LIST_DRIVES_CMD = "plugin:gencore-fs|list_drives";
const FS_WATCH_CMD = "plugin:gencore-fs|watch";
const FS_PATH_COMMANDS = [
  "plugin:gencore-fs|list",
  "plugin:gencore-fs|create_file",
  "plugin:gencore-fs|create_dir",
  "plugin:gencore-fs|unwatch",
] as const;
const FS_ALLOWED_COMMANDS = [FS_LIST_DRIVES_CMD, ...FS_PATH_COMMANDS, FS_WATCH_CMD] as const;

const PTY_OPEN_CMD = "plugin:gencore-pty|open";
const PTY_WRITE_CMD = "plugin:gencore-pty|write";
const PTY_RESIZE_CMD = "plugin:gencore-pty|resize";
const PTY_CLOSE_CMD = "plugin:gencore-pty|close";
const PTY_ALLOWED_COMMANDS = [PTY_OPEN_CMD, PTY_WRITE_CMD, PTY_RESIZE_CMD, PTY_CLOSE_CMD] as const;
// Mirrors `PoshThemeId` (config.types.ts) and Rust's `validate_posh_theme` (session_map.rs).
const POSH_THEME_IDS = [
  "gencore",
  "bubbles",
  "iterm2",
  "wholespace",
  "wopian",
  "clean-detailed",
  "kali",
] as const;
const LOAD_PINNED_CMD = "plugin:gencore-core|load_pinned_tabs";
const SAVE_PINNED_CMD = "plugin:gencore-core|save_pinned_tabs";
const TRAY_ACTION_CMD = "plugin:gencore-core|tray_action";
const TRAY_ACTIONS = ["show", "hide", "quit"] as const;

const EVENT_LISTEN_CMD = "plugin:event|listen";
const EVENT_UNLISTEN_CMD = "plugin:event|unlisten";
const EVENT_EMIT_CMD = "plugin:event|emit";
const ENTRY_CHANGED_EVENT = "gencore-fs://entry-changed";
const THEME_CHANGED_EVENT = "tauri://theme-changed";
const PTY_DATA_EVENT = "gencore-pty://data";
const PTY_EXIT_EVENT = "gencore-pty://exit";
const PTY_LISTEN_EVENTS = [PTY_DATA_EVENT, PTY_EXIT_EVENT] as const;

const FORBIDDEN_TOKENS = [
  "gencore-pty:default",
  "core:default",
  "opener:default",
  "core:event:default",
  "core:window:default",
  "core:window:allow-set-theme",
  "gencore-assistant:default",
] as const;

const DELETE_CONVERSATION_CMD = "plugin:gencore-assistant|delete_conversation";
const LIST_MESSAGES_CMD = "plugin:gencore-assistant|list_messages";
const SEND_MESSAGE_CMD = "plugin:gencore-assistant|send_message";
const CANCEL_TURN_CMD = "plugin:gencore-assistant|cancel_turn";
const CONFIRM_ACTION_CMD = "plugin:gencore-assistant|confirm_action";
const REJECT_ACTION_CMD = "plugin:gencore-assistant|reject_action";
const SET_AGENT_SETTINGS_CMD = "plugin:gencore-assistant|set_agent_settings";
const SET_API_KEY_CMD = "plugin:gencore-assistant|set_api_key";
const CONVERSATION_ID_COMMANDS = [
  DELETE_CONVERSATION_CMD,
  LIST_MESSAGES_CMD,
  CANCEL_TURN_CMD,
] as const;
const ACTION_ID_COMMANDS = [CONFIRM_ACTION_CMD, REJECT_ACTION_CMD] as const;
const ASSISTANT_ALLOWED_COMMANDS = [
  "plugin:gencore-assistant|list_conversations",
  "plugin:gencore-assistant|create_conversation",
  DELETE_CONVERSATION_CMD,
  LIST_MESSAGES_CMD,
  SEND_MESSAGE_CMD,
  CANCEL_TURN_CMD,
  CONFIRM_ACTION_CMD,
  REJECT_ACTION_CMD,
  "plugin:gencore-assistant|get_agent_settings",
  SET_AGENT_SETTINGS_CMD,
  SET_API_KEY_CMD,
  "plugin:gencore-assistant|clear_api_key",
] as const;
const ASSISTANT_TOKEN_EVENT = "gencore-assistant://token";
const ASSISTANT_TURN_EVENT = "gencore-assistant://turn";
const ASSISTANT_ERROR_EVENT = "gencore-assistant://error";
const ASSISTANT_UI_ACTION_EVENT = "gencore-assistant://ui-action";
const ASSISTANT_LISTEN_EVENTS = [
  ASSISTANT_TOKEN_EVENT,
  ASSISTANT_TURN_EVENT,
  ASSISTANT_ERROR_EVENT,
  ASSISTANT_UI_ACTION_EVENT,
] as const;

function validSnapshot() {
  return {
    active_tab_id: "tab-1",
    active_session_id: "session-1",
    cwd: "C:\\work",
    output_excerpt: "PS>",
    tabs: [{ id: "tab-1", name: "pwsh", cwd: "C:\\work", pinned: false }],
    files_selection: { path: "C:\\work\\file.txt", kind: "file" },
  };
}

const hookSource = readFileSync(resolve(process.cwd(), "isolation/isolation.hook.js"), "utf8");
const capabilitySource = readFileSync(
  resolve(process.cwd(), "src-tauri/capabilities/main.json"),
  "utf8",
);
const cargoTomlSource = readFileSync(resolve(process.cwd(), "src-tauri/Cargo.toml"), "utf8");
const libRsSource = readFileSync(resolve(process.cwd(), "src-tauri/src/lib.rs"), "utf8");
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

describe("terminal isolation hook", () => {
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
    expect(() => hook(envelope("plugin:gencore-fs|stat"))).toThrow();
    expect(() => hook(envelope("plugin:opener|open_path"))).toThrow();
  });

  it("throws for get_app_info with extra args", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope("plugin:gencore-core|get_app_info", { unexpected: true })),
    ).toThrow();
  });

  it("throws for get_system_telemetry with extra args", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope("plugin:gencore-core|get_system_telemetry", { unexpected: true })),
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
      "gencore-core:allow-get-system-telemetry",
      "gencore-core:allow-load-pinned-tabs",
      "gencore-core:allow-save-pinned-tabs",
      "gencore-fs:allow-list",
      "gencore-fs:allow-list-drives",
      "gencore-fs:allow-create-file",
      "gencore-fs:allow-create-dir",
      "gencore-fs:allow-watch",
      "gencore-fs:allow-unwatch",
      "gencore-pty:allow-open",
      "gencore-pty:allow-write",
      "gencore-pty:allow-resize",
      "gencore-pty:allow-close",
      "core:event:allow-listen",
      "core:event:allow-unlisten",
      {
        identifier: "opener:allow-open-url",
        allow: [{ url: GENCORE_REPO_URL }],
      },
      "gencore-assistant:allow-list-conversations",
      "gencore-assistant:allow-create-conversation",
      "gencore-assistant:allow-delete-conversation",
      "gencore-assistant:allow-list-messages",
      "gencore-assistant:allow-send-message",
      "gencore-assistant:allow-cancel-turn",
      "gencore-assistant:allow-confirm-action",
      "gencore-assistant:allow-reject-action",
      "gencore-assistant:allow-get-agent-settings",
      "gencore-assistant:allow-set-agent-settings",
      "gencore-assistant:allow-set-api-key",
      "gencore-assistant:allow-clear-api-key",
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

  it("registers gencore-fs so capability grants resolve at build time", () => {
    expect(cargoTomlSource).toContain(
      'gencore-fs = { path = "../../../crates/gencore-plugin-fs" }',
    );
    expect(libRsSource).toContain("gencore_fs::init()");
  });

  it("allowlists the six gencore-fs commands used by the file tree and not stat", () => {
    for (const cmd of FS_ALLOWED_COMMANDS) {
      expect(hookSource).toContain(`"${cmd}",`);
    }
    expect(hookSource).not.toContain("plugin:gencore-fs|stat");
  });

  it.each([undefined, null] as const)("allows list_drives when payload args are %s", (payload) => {
    const hook = getHook();
    const input = envelope(FS_LIST_DRIVES_CMD, payload);
    const result = hook(input);
    expect(result).not.toBe(input);
    expect(result.cmd).toBe(FS_LIST_DRIVES_CMD);
    expect(result.payload).toBeUndefined();
  });

  it("throws for list_drives with extra args or a window label", () => {
    const hook = getHook();
    expect(() => hook(envelope(FS_LIST_DRIVES_CMD, { unexpected: true }))).toThrow();
    expect(() => hook(envelope(FS_LIST_DRIVES_CMD, { label: "main" }))).toThrow();
    expect(() => hook(envelope(FS_LIST_DRIVES_CMD, { path: "C:\\" }))).toThrow();
  });

  it.each(FS_PATH_COMMANDS)("reconstructs a path-only payload for %s", (cmd) => {
    const hook = getHook();
    const inner = { path: "C:\\work" };
    const input = envelope(cmd, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(cmd);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ path: "C:\\work" });
    expect(Object.keys(result.payload as object)).toEqual(["path"]);
  });

  it.each(FS_PATH_COMMANDS)(
    "throws for %s with extra keys, a missing path, or a non-string path",
    (cmd) => {
      const hook = getHook();
      expect(() => hook(envelope(cmd, { path: "C:\\work", extra: true }))).toThrow();
      expect(() => hook(envelope(cmd, { path: "C:\\work", label: "main" }))).toThrow();
      expect(() => hook(envelope(cmd, { path: "C:\\work", recursive: false }))).toThrow();
      expect(() => hook(envelope(cmd, {}))).toThrow();
      expect(() => hook(envelope(cmd, { label: "main" }))).toThrow();
      expect(() => hook(envelope(cmd, { path: 12 }))).toThrow();
      expect(() => hook(envelope(cmd))).toThrow();
    },
  );

  it("throws when a filesystem path is empty, contains NUL, or exceeds 32767 characters", () => {
    const hook = getHook();
    const cmd = "plugin:gencore-fs|list";
    expect(() => hook(envelope(cmd, { path: "" }))).toThrow();
    expect(() => hook(envelope(cmd, { path: "C:\\a\0b" }))).toThrow();
    expect(() => hook(envelope(cmd, { path: "a".repeat(32768) }))).toThrow();
  });

  it("allows a filesystem path of length 32767", () => {
    const hook = getHook();
    const path = "a".repeat(32767);
    const result = hook(envelope("plugin:gencore-fs|list", { path }));
    expect(result.payload).toEqual({ path });
  });

  it("reconstructs watch as path plus recursive false", () => {
    const hook = getHook();
    const inner = { path: "C:\\work", recursive: false };
    const input = envelope(FS_WATCH_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ path: "C:\\work", recursive: false });
  });

  it("allows watch when recursive precedes path", () => {
    const hook = getHook();
    const inner = { recursive: false, path: "D:\\src" };
    const result = hook(envelope(FS_WATCH_CMD, inner));
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ path: "D:\\src", recursive: false });
  });

  it("throws for watch with recursive true, missing recursive, extra keys, or a bad path", () => {
    const hook = getHook();
    expect(() => hook(envelope(FS_WATCH_CMD, { path: "C:\\work", recursive: true }))).toThrow();
    expect(() => hook(envelope(FS_WATCH_CMD, { path: "C:\\work" }))).toThrow();
    expect(() => hook(envelope(FS_WATCH_CMD, { recursive: false }))).toThrow();
    expect(() =>
      hook(envelope(FS_WATCH_CMD, { path: "C:\\work", recursive: false, extra: true })),
    ).toThrow();
    expect(() => hook(envelope(FS_WATCH_CMD, { path: "C:\\a\0b", recursive: false }))).toThrow();
    expect(() => hook(envelope(FS_WATCH_CMD, { path: "", recursive: false }))).toThrow();
    expect(() => hook(envelope(FS_WATCH_CMD, { path: "C:\\work", recursive: 0 }))).toThrow();
  });

  it("allowlists event listen and unlisten without emit", () => {
    expect(hookSource).toContain(`"${EVENT_LISTEN_CMD}",`);
    expect(hookSource).toContain(`"${EVENT_UNLISTEN_CMD}",`);
    expect(hookSource).not.toContain("plugin:event|emit");
  });

  it("reconstructs listen for gencore-fs://entry-changed with Any target", () => {
    const hook = getHook();
    const inner = {
      event: ENTRY_CHANGED_EVENT,
      target: { kind: "Any" },
      handler: 7,
    };
    const input = envelope(EVENT_LISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(EVENT_LISTEN_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({
      event: ENTRY_CHANGED_EVENT,
      target: { kind: "Any" },
      handler: 7,
    });
    expect((result.payload as { target: unknown }).target).not.toBe(inner.target);
  });

  it("throws for listen with a wrong event, extra keys, or emit", () => {
    const hook = getHook();
    const validTarget = { kind: "Any" };
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
          event: ENTRY_CHANGED_EVENT,
          target: validTarget,
          handler: 7,
          extra: true,
        }),
      ),
    ).toThrow();
    expect(() => hook(envelope(EVENT_EMIT_CMD, { event: ENTRY_CHANGED_EVENT }))).toThrow();
  });

  it("reconstructs unlisten for gencore-fs://entry-changed", () => {
    const hook = getHook();
    const inner = { event: ENTRY_CHANGED_EVENT, eventId: 3 };
    const input = envelope(EVENT_UNLISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ event: ENTRY_CHANGED_EVENT, eventId: 3 });
  });

  it("throws for unlisten with a wrong event", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope(EVENT_UNLISTEN_CMD, { event: "tauri://click", eventId: 3 })),
    ).toThrow();
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

  it("throws for theme-changed listen with Any target or a non-main window", () => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: THEME_CHANGED_EVENT,
          target: { kind: "Any" },
          handler: 7,
        }),
      ),
    ).toThrow();
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

  it("throws for entry-changed listen with a Window target", () => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: ENTRY_CHANGED_EVENT,
          target: { kind: "Window", label: "main" },
          handler: 7,
        }),
      ),
    ).toThrow();
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

  it("does not grant gencore-fs stat in capabilities", () => {
    expect(capabilitySource).not.toContain("gencore-fs:allow-stat");
    expect(capabilitySource).not.toContain("gencore-fs:allow-read");
  });

  it("allowlists the four gencore-pty commands used by the terminal and not spawn", () => {
    for (const cmd of PTY_ALLOWED_COMMANDS) {
      expect(hookSource).toContain(`"${cmd}",`);
    }
    expect(hookSource).not.toContain("plugin:gencore-pty|spawn");
  });

  it("allowlists pinned-tab load and save commands", () => {
    expect(hookSource).toContain(`"${LOAD_PINNED_CMD}",`);
    expect(hookSource).toContain(`"${SAVE_PINNED_CMD}",`);
  });

  it.each([undefined, null] as const)(
    "allows load_pinned_tabs when payload args are %s",
    (payload) => {
      const hook = getHook();
      const input = envelope(LOAD_PINNED_CMD, payload);
      const result = hook(input);
      expect(result).not.toBe(input);
      expect(result.cmd).toBe(LOAD_PINNED_CMD);
    },
  );

  it("throws for load_pinned_tabs with extra args or a window label", () => {
    const hook = getHook();
    expect(() => hook(envelope(LOAD_PINNED_CMD, { unexpected: true }))).toThrow();
    expect(() => hook(envelope(LOAD_PINNED_CMD, { label: "main" }))).toThrow();
    expect(() => hook(envelope(LOAD_PINNED_CMD, { json: "{}" }))).toThrow();
  });

  it("reconstructs save_pinned_tabs as a json-only payload", () => {
    const hook = getHook();
    const inner = { json: '{"version":1}' };
    const input = envelope(SAVE_PINNED_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(SAVE_PINNED_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ json: '{"version":1}' });
    expect(Object.keys(result.payload as object)).toEqual(["json"]);
  });

  it("throws when save json exceeds 8 MiB", () => {
    const hook = getHook();
    expect(() => hook(envelope(SAVE_PINNED_CMD, { json: "a".repeat(8388609) }))).toThrow();
  });

  it("throws for save_pinned_tabs with extra keys or a non-string json", () => {
    const hook = getHook();
    expect(() => hook(envelope(SAVE_PINNED_CMD, { json: "{}", extra: true }))).toThrow();
    expect(() => hook(envelope(SAVE_PINNED_CMD, { json: 12 }))).toThrow();
    expect(() => hook(envelope(SAVE_PINNED_CMD, {}))).toThrow();
  });

  it("reconstructs open as cols and rows only", () => {
    const hook = getHook();
    const inner = { cols: 80, rows: 24 };
    const input = envelope(PTY_OPEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(PTY_OPEN_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ cols: 80, rows: 24 });
    expect(Object.keys(result.payload as object)).toEqual(["cols", "rows"]);
  });

  it("reconstructs open with cwd as cols, rows, and cwd", () => {
    const hook = getHook();
    const inner = { cols: 80, rows: 24, cwd: "C:\\work" };
    const result = hook(envelope(PTY_OPEN_CMD, inner));
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ cols: 80, rows: 24, cwd: "C:\\work" });
  });

  it("keeps open theme snow-storm", () => {
    const hook = getHook();
    const inner = { cols: 80, rows: 24, theme: "snow-storm" };
    const result = hook(envelope(PTY_OPEN_CMD, inner));
    expect(result.payload).toEqual({ cols: 80, rows: 24, theme: "snow-storm" });
  });

  it("throws for open with theme nord", () => {
    const hook = getHook();
    expect(() => hook(envelope(PTY_OPEN_CMD, { cols: 80, rows: 24, theme: "nord" }))).toThrow();
  });

  it("throws for open with a shell key", () => {
    const hook = getHook();
    expect(() => hook(envelope(PTY_OPEN_CMD, { cols: 80, rows: 24, shell: "cmd.exe" }))).toThrow();
  });

  it.each(POSH_THEME_IDS)("reconstructs open with posh_theme %s", (poshTheme) => {
    const hook = getHook();
    const inner = { cols: 80, rows: 24, posh_theme: poshTheme };
    const result = hook(envelope(PTY_OPEN_CMD, inner));
    expect(result.payload).toEqual({ cols: 80, rows: 24, posh_theme: poshTheme });
  });

  it("reconstructs open with theme and posh_theme together", () => {
    const hook = getHook();
    const inner = {
      cols: 80,
      rows: 24,
      cwd: "C:\\work",
      theme: "snow-storm",
      posh_theme: "bubbles",
    };
    const result = hook(envelope(PTY_OPEN_CMD, inner));
    expect(result.payload).toEqual({
      cols: 80,
      rows: 24,
      cwd: "C:\\work",
      theme: "snow-storm",
      posh_theme: "bubbles",
    });
  });

  it("throws for open with an unknown posh_theme value", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope(PTY_OPEN_CMD, { cols: 80, rows: 24, posh_theme: "evil" })),
    ).toThrow();
  });

  it("reconstructs write as session_id and data", () => {
    const hook = getHook();
    const inner = { session_id: "session-1", data: "hi" };
    const result = hook(envelope(PTY_WRITE_CMD, inner));
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ session_id: "session-1", data: "hi" });
  });

  it("throws when write data exceeds 64 KiB", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope(PTY_WRITE_CMD, { session_id: "session-1", data: "a".repeat(65537) })),
    ).toThrow();
  });

  it("reconstructs resize as session_id, cols, and rows", () => {
    const hook = getHook();
    const inner = { session_id: "session-1", cols: 100, rows: 40 };
    const result = hook(envelope(PTY_RESIZE_CMD, inner));
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ session_id: "session-1", cols: 100, rows: 40 });
  });

  it("reconstructs close as session_id only", () => {
    const hook = getHook();
    const inner = { session_id: "session-1" };
    const result = hook(envelope(PTY_CLOSE_CMD, inner));
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ session_id: "session-1" });
    expect(Object.keys(result.payload as object)).toEqual(["session_id"]);
  });

  it.each(PTY_LISTEN_EVENTS)("reconstructs listen for %s with Any target", (event) => {
    const hook = getHook();
    const inner = {
      event,
      target: { kind: "Any" },
      handler: 7,
    };
    const input = envelope(EVENT_LISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(EVENT_LISTEN_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({
      event,
      target: { kind: "Any" },
      handler: 7,
    });
    expect((result.payload as { target: unknown }).target).not.toBe(inner.target);
  });

  it.each(PTY_LISTEN_EVENTS)("throws for %s listen with a Window target", (event) => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event,
          target: { kind: "Window", label: "main" },
          handler: 7,
        }),
      ),
    ).toThrow();
  });

  it.each(PTY_LISTEN_EVENTS)("reconstructs unlisten for %s", (event) => {
    const hook = getHook();
    const inner = { event, eventId: 3 };
    const input = envelope(EVENT_UNLISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ event, eventId: 3 });
  });

  it("throws for listen to gencore-pty://pwn", () => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: "gencore-pty://pwn",
          target: { kind: "Any" },
          handler: 7,
        }),
      ),
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

  it("allowlists the twelve gencore-assistant commands and not stat", () => {
    for (const cmd of ASSISTANT_ALLOWED_COMMANDS) {
      expect(hookSource).toContain(`"${cmd}",`);
    }
    expect(hookSource).not.toContain("plugin:gencore-assistant|stat");
  });

  it("throws for an unknown gencore-assistant command", () => {
    const hook = getHook();
    expect(() => hook(envelope("plugin:gencore-assistant|stat"))).toThrow();
    expect(() => hook(envelope("plugin:gencore-assistant|delete_all"))).toThrow();
  });

  it.each(CONVERSATION_ID_COMMANDS)("reconstructs %s as conversation_id only", (cmd) => {
    const hook = getHook();
    const inner = { conversation_id: "conv-1" };
    const input = envelope(cmd, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(cmd);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ conversation_id: "conv-1" });
    expect(Object.keys(result.payload as object)).toEqual(["conversation_id"]);
  });

  it.each(CONVERSATION_ID_COMMANDS)(
    "throws for %s with extra keys, a missing id, or a bad length",
    (cmd) => {
      const hook = getHook();
      expect(() => hook(envelope(cmd, { conversation_id: "conv-1", extra: true }))).toThrow();
      expect(() => hook(envelope(cmd, {}))).toThrow();
      expect(() => hook(envelope(cmd, { conversation_id: "" }))).toThrow();
      expect(() => hook(envelope(cmd, { conversation_id: "a".repeat(65) }))).toThrow();
      expect(() => hook(envelope(cmd, { conversation_id: 12 }))).toThrow();
    },
  );

  it.each(CONVERSATION_ID_COMMANDS)("allows %s with a conversation_id of length 64", (cmd) => {
    const hook = getHook();
    const conversationId = "a".repeat(64);
    const result = hook(envelope(cmd, { conversation_id: conversationId }));
    expect(result.payload).toEqual({ conversation_id: conversationId });
  });

  it.each(ACTION_ID_COMMANDS)("reconstructs %s as id only", (cmd) => {
    const hook = getHook();
    const inner = { id: "tool-1" };
    const input = envelope(cmd, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(cmd);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ id: "tool-1" });
    expect(Object.keys(result.payload as object)).toEqual(["id"]);
  });

  it.each(ACTION_ID_COMMANDS)(
    "throws for %s with extra keys, a missing id, or a bad length",
    (cmd) => {
      const hook = getHook();
      expect(() => hook(envelope(cmd, { id: "tool-1", extra: true }))).toThrow();
      expect(() => hook(envelope(cmd, {}))).toThrow();
      expect(() => hook(envelope(cmd, { id: "" }))).toThrow();
      expect(() => hook(envelope(cmd, { id: "a".repeat(65) }))).toThrow();
    },
  );

  it("reconstructs send_message with the full snapshot", () => {
    const hook = getHook();
    const inner = { conversation_id: "conv-1", text: "list files", snapshot: validSnapshot() };
    const input = envelope(SEND_MESSAGE_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(SEND_MESSAGE_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual(inner);
  });

  it("reconstructs send_message without optional snapshot fields", () => {
    const hook = getHook();
    const inner = {
      conversation_id: "conv-1",
      text: "list files",
      snapshot: {
        active_tab_id: "tab-1",
        output_excerpt: "",
        tabs: [{ id: "tab-1", pinned: true }],
      },
    };
    const result = hook(envelope(SEND_MESSAGE_CMD, inner));
    expect(result.payload).toEqual(inner);
  });

  it("rejects an injected top-level field on send_message instead of stripping it", () => {
    const hook = getHook();
    const inner = {
      conversation_id: "conv-1",
      text: "list files",
      snapshot: validSnapshot(),
      injected: "strip-me",
    };
    expect(() => hook(envelope(SEND_MESSAGE_CMD, inner))).toThrow();
  });

  it("strips an injected snapshot field from send_message", () => {
    const hook = getHook();
    const snapshot = { ...validSnapshot(), injected: "strip-me" } as Record<string, unknown>;
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text: "hi", snapshot })),
    ).toThrow();
  });

  it("throws for send_message with a missing conversation_id, text, or snapshot", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { text: "hi", snapshot: validSnapshot() })),
    ).toThrow();
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", snapshot: validSnapshot() })),
    ).toThrow();
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text: "hi" })),
    ).toThrow();
  });

  it("throws for send_message when text exceeds 65536 characters", () => {
    const hook = getHook();
    const inner = {
      conversation_id: "conv-1",
      text: "a".repeat(65537),
      snapshot: validSnapshot(),
    };
    expect(() => hook(envelope(SEND_MESSAGE_CMD, inner))).toThrow();
  });

  it("allows send_message when text is exactly 65536 characters", () => {
    const hook = getHook();
    const text = "a".repeat(65536);
    const result = hook(
      envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text, snapshot: validSnapshot() }),
    );
    expect((result.payload as { text: string }).text).toHaveLength(65536);
  });

  it("throws for send_message when output_excerpt exceeds 65536 characters", () => {
    const hook = getHook();
    const snapshot = { ...validSnapshot(), output_excerpt: "a".repeat(65537) };
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text: "hi", snapshot })),
    ).toThrow();
  });

  it("allows send_message when output_excerpt is exactly 65536 characters", () => {
    const hook = getHook();
    const snapshot = { ...validSnapshot(), output_excerpt: "a".repeat(65536) };
    const result = hook(
      envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text: "hi", snapshot }),
    );
    expect(
      (result.payload as { snapshot: { output_excerpt: string } }).snapshot.output_excerpt,
    ).toHaveLength(65536);
  });

  it("throws for send_message with a malformed tab entry", () => {
    const hook = getHook();
    const snapshot = { ...validSnapshot(), tabs: [{ id: "tab-1" }] };
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text: "hi", snapshot })),
    ).toThrow();
  });

  it("throws for send_message with a malformed files_selection", () => {
    const hook = getHook();
    const snapshot = { ...validSnapshot(), files_selection: { path: "C:\\a" } };
    expect(() =>
      hook(envelope(SEND_MESSAGE_CMD, { conversation_id: "conv-1", text: "hi", snapshot })),
    ).toThrow();
  });

  it("reconstructs set_agent_settings with model and context_lines", () => {
    const hook = getHook();
    const inner = { model: "gemini-3.5-flash", context_lines: 100 };
    const input = envelope(SET_AGENT_SETTINGS_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual(inner);
  });

  it("allows set_agent_settings with an empty patch", () => {
    const hook = getHook();
    const result = hook(envelope(SET_AGENT_SETTINGS_CMD, {}));
    expect(result.payload).toEqual({});
  });

  it("throws for set_agent_settings with an unknown model or out-of-range context_lines", () => {
    const hook = getHook();
    expect(() => hook(envelope(SET_AGENT_SETTINGS_CMD, { model: "gpt-4o" }))).toThrow();
    expect(() => hook(envelope(SET_AGENT_SETTINGS_CMD, { context_lines: 19 }))).toThrow();
    expect(() => hook(envelope(SET_AGENT_SETTINGS_CMD, { context_lines: 201 }))).toThrow();
    expect(() => hook(envelope(SET_AGENT_SETTINGS_CMD, { context_lines: 80.5 }))).toThrow();
    expect(() =>
      hook(envelope(SET_AGENT_SETTINGS_CMD, { model: "gemini-3.7-flash", extra: true })),
    ).toThrow();
  });

  it("reconstructs set_api_key as key only", () => {
    const hook = getHook();
    const inner = { key: "secret-key" };
    const input = envelope(SET_API_KEY_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ key: "secret-key" });
  });

  it("throws for set_api_key with an empty or oversized key", () => {
    const hook = getHook();
    expect(() => hook(envelope(SET_API_KEY_CMD, { key: "" }))).toThrow();
    expect(() => hook(envelope(SET_API_KEY_CMD, { key: "a".repeat(4097) }))).toThrow();
    expect(() => hook(envelope(SET_API_KEY_CMD, { key: "a".repeat(4096), extra: true }))).toThrow();
  });

  it("allows set_api_key with a key of length 4096", () => {
    const hook = getHook();
    const key = "a".repeat(4096);
    const result = hook(envelope(SET_API_KEY_CMD, { key }));
    expect(result.payload).toEqual({ key });
  });

  it.each(ASSISTANT_LISTEN_EVENTS)("reconstructs listen for %s with Any target", (event) => {
    const hook = getHook();
    const inner = { event, target: { kind: "Any" }, handler: 9 };
    const input = envelope(EVENT_LISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.cmd).toBe(EVENT_LISTEN_CMD);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ event, target: { kind: "Any" }, handler: 9 });
    expect((result.payload as { target: unknown }).target).not.toBe(inner.target);
  });

  it.each(ASSISTANT_LISTEN_EVENTS)("throws for %s listen with a Window target", (event) => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event,
          target: { kind: "Window", label: "main" },
          handler: 9,
        }),
      ),
    ).toThrow();
  });

  it.each(ASSISTANT_LISTEN_EVENTS)("reconstructs unlisten for %s", (event) => {
    const hook = getHook();
    const inner = { event, eventId: 4 };
    const input = envelope(EVENT_UNLISTEN_CMD, inner);
    const result = hook(input);

    expect(result).not.toBe(input);
    expect(result.payload).not.toBe(inner);
    expect(result.payload).toEqual({ event, eventId: 4 });
  });

  it("throws for listen to an unknown gencore-assistant event and does not fall through to entry-changed", () => {
    const hook = getHook();
    expect(() =>
      hook(
        envelope(EVENT_LISTEN_CMD, {
          event: "gencore-assistant://pwn",
          target: { kind: "Any" },
          handler: 7,
        }),
      ),
    ).toThrow();
  });

  it("keeps capabilitySource containing every gencore-assistant:allow-* grant and not gencore-assistant:default", () => {
    const capability = JSON.parse(capabilitySource) as CapabilityFile;
    const permissionText = JSON.stringify(capability.permissions);
    const assistantPermissions = [
      "gencore-assistant:allow-list-conversations",
      "gencore-assistant:allow-create-conversation",
      "gencore-assistant:allow-delete-conversation",
      "gencore-assistant:allow-list-messages",
      "gencore-assistant:allow-send-message",
      "gencore-assistant:allow-cancel-turn",
      "gencore-assistant:allow-confirm-action",
      "gencore-assistant:allow-reject-action",
      "gencore-assistant:allow-get-agent-settings",
      "gencore-assistant:allow-set-agent-settings",
      "gencore-assistant:allow-set-api-key",
      "gencore-assistant:allow-clear-api-key",
    ];
    for (const permission of assistantPermissions) {
      expect(permissionText).toContain(permission);
    }
    expect(permissionText).not.toContain("gencore-assistant:default");
  });

  it("registers gencore-assistant so capability grants resolve at build time", () => {
    expect(cargoTomlSource).toContain(
      'gencore-assistant = { path = "../../../crates/gencore-plugin-assistant" }',
    );
    expect(libRsSource).toContain("gencore_assistant::init()");
  });

  it("loads the isolation script from head", () => {
    const head = isolationHtml.match(/<head>([\s\S]*?)<\/head>/);
    expect(head?.[1]).toContain('name="viewport"');
    expect(head?.[1]).toContain('<script src="./isolation.hook.js"></script>');
    const body = isolationHtml.match(/<body>([\s\S]*?)<\/body>/);
    expect(body?.[1]).not.toContain("isolation.hook.js");
  });
});
