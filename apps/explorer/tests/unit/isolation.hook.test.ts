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
] as const;

const WINDOW_COMMANDS = [
  "plugin:window|close",
  "plugin:window|minimize",
  "plugin:window|toggle_maximize",
  "plugin:window|start_dragging",
] as const;

const OPEN_URL_CMD = "plugin:opener|open_url";

const FORBIDDEN_TOKENS = ["gencore-pty", "gencore-fs", "core:default", "opener:default"] as const;

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
      "gencore-core:allow-get-app-info",
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

  it("loads the isolation script from head", () => {
    const head = isolationHtml.match(/<head>([\s\S]*?)<\/head>/);
    expect(head?.[1]).toContain('name="viewport"');
    expect(head?.[1]).toContain('<script src="./isolation.hook.js"></script>');
    const body = isolationHtml.match(/<body>([\s\S]*?)<\/body>/);
    expect(body?.[1]).not.toContain("isolation.hook.js");
  });
});
