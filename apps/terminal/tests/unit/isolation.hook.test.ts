import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";
import { GENCORE_REPO_URL } from "../../src/modules/ipc/ipc.opener";

const EMPTY_ARG_COMMANDS = [
  "plugin:gencore-core|get_app_info",
  "plugin:gencore-core|load_pinned_tabs",
  "plugin:window|close",
  "plugin:window|minimize",
  "plugin:window|toggle_maximize",
  "plugin:window|start_dragging",
  "plugin:window|theme",
  "plugin:gencore-fs|list_drives",
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
const LOAD_PINNED_CMD = "plugin:gencore-core|load_pinned_tabs";
const SAVE_PINNED_CMD = "plugin:gencore-core|save_pinned_tabs";

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
] as const;

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
    ]);

    const permissionText = JSON.stringify(capability.permissions);
    for (const token of FORBIDDEN_TOKENS) {
      expect(permissionText).not.toContain(token);
    }
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

  it("loads the isolation script from head", () => {
    const head = isolationHtml.match(/<head>([\s\S]*?)<\/head>/);
    expect(head?.[1]).toContain('name="viewport"');
    expect(head?.[1]).toContain('<script src="./isolation.hook.js"></script>');
    const body = isolationHtml.match(/<body>([\s\S]*?)<\/body>/);
    expect(body?.[1]).not.toContain("isolation.hook.js");
  });
});
