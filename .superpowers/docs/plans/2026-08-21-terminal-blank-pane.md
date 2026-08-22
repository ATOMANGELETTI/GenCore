# Terminal Blank Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and fix the blank Terminal PowerShell pane on the real WebView2 window (interactive default prompt first, Oh My Posh second), with Playwright over CDP as the done bar.

**Architecture:** Add visible subscribe/open failures and CDP test seams, attach Playwright to a dev-only WebView2 debug port, classify one failure layer on the live window, fix only that layer, then fetch `oh-my-posh.exe` after the slice 1 gate is green. xterm remains the only DSR responder.

**Tech Stack:** React 19.2, Vitest, Playwright (`@playwright/test` latest stable), Tauri 2, WebView2 CDP port `9223`, `portable-pty`, `@xterm/xterm` 6.0.0 (existing freezePrototype patch — do not edit).

**Spec:** `.superpowers/docs/specs/2026-08-21-terminal-blank-pane-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Plugin package name **must equal** plugin id: `gencore-pty`.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory.
- UI talks to Rust only through `apps/terminal/src/modules/ipc/`.
- No new IPC commands, Isolation grants, or Explorer PTY.
- Do not edit `patches/@xterm__xterm@6.0.0.patch` or `freezePrototype`.
- Do not answer `ESC [6n` in Rust or in the JS data handler (xterm only).
- Do not bump major versions. No JS changeset (`@gencore/terminal` is private; `gencore-pty` has none).
- Conventional commits. No Cursor/AI attribution trailers.
- Work in place on the current branch. Do not create a worktree unless asked.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.
- Stage **only** the files listed in the task. Never `git add -A`.
- Commit steps run only when the user asked to commit. If they have not, skip Commit and leave the tree dirty.
- Do not fall back to `http://localhost:5173` for the visual gate (no Tauri IPC there).
- **Models:** Tasks 1–2 use `cursor-grok-4.6-xhigh-fast`. Tasks 3–6 (probe, named-layer fix, Playwright gate, Oh My Posh) use `claude-sonnet-5-thinking-high`. Reviews use Sonnet 5. **Do not start any task on Opus 5.** Opus 5 only if all spec conditions are true: Sonnet already produced written evidence, the CDP gate is still red after the named-layer fix, and the next step is a different approach — one shot, then stop and ask the user. Never retry the same prompt on Opus.

---

## File map

**Always (slice 1 seams)**

- Modify: `apps/terminal/src/modules/terminal/terminal.types.ts` — `error` on `TerminalTab`
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts` — stop silent subscribe `catch`; set `error` on Exited
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx` — host `data-*`, DEV xterm handle, host `ResizeObserver`
- Modify: `apps/terminal/package.json` — `tauri:dev` wrapper + `test:visual`
- Create: `scripts/tauri-dev-terminal.mjs` — sets `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223`
- Test: `apps/terminal/tests/unit/terminal.provider.test.tsx`
- Test: `apps/terminal/tests/unit/tauri.dev-port.test.ts`

**Probe**

- Create: `.superpowers/sdd/blank-pane/probe.md` — named layer + evidence

**Named-layer fix (only the files that layer needs)**

- Surface: `terminal.component.tsx` / `terminal.xterm.ts`
- Session / handshake / transport (hook): `terminal.hook.ts`
- Transport (Isolation, only if CDP proves a drop): `apps/terminal/isolation/isolation.hook.js` + `apps/terminal/tests/unit/isolation.hook.test.ts`
- Session / shell (Rust, only if probe names it): `crates/gencore-plugin-pty/src/modules/session/*` + `crates/gencore-plugin-pty/tests/session_commands.rs`

**Visual gate**

- Create: `apps/terminal/playwright.config.ts`
- Create: `apps/terminal/tests/visual/terminal.pane.spec.ts`
- Modify: `apps/terminal/package.json` — `test:visual` (if not already added in Task 2)

**Slice 2**

- Run: `scripts/fetch-oh-my-posh.ps1`
- Modify visual spec only if slice 2 assertions are not already in the file

**Do not touch**

- `patches/@xterm__xterm@6.0.0.patch`
- `apps/terminal/src-tauri/resources/oh-my-posh/gencore-prompt.ps1`
- Telemetry / Files-tab / Explorer
- `package:win64` / `tauri:build` (must not set the debug port)
- Do not add `test:visual` to root `turbo.json` `test` (needs a live WebView)

---

### Task 1: Visible subscribe failure and host seams

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.types.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Test: `apps/terminal/tests/unit/terminal.provider.test.tsx`

**Interfaces:**
- Consumes: existing `subscribePtyData`, `subscribePtyExit`, `createEmptyTab`, `errorText`, `TerminalTab`
- Produces:
  - `TerminalTab.error: string | null`
  - Subscribe throw → one Exited tab, `openPty` never called, no `restorePinned`
  - Spawn / open catch sets `error` from `errorText`
  - Host node: `data-slot="terminal-host"`, `data-status`, `data-cols`, `data-rows`, `data-has-output`, `data-session-id` (UUID or omitted)
  - `import.meta.env.DEV` only: `(hostNode as GencoreXtermHost).__gencoreXterm = host.terminal`

- [ ] **Step 1: Write the failing provider tests**

Add flags next to `holdDataListen` in `apps/terminal/tests/unit/terminal.provider.test.tsx`:

```tsx
let rejectDataListen: Error | null = null;
let rejectExitListen: Error | null = null;
```

In the `subscribePtyData` mock, after setting `dataHandler`:

```tsx
    if (rejectDataListen) {
      return Promise.reject(rejectDataListen);
    }
```

In the `subscribePtyExit` mock, after setting `exitHandler`:

```tsx
    if (rejectExitListen) {
      return Promise.reject(rejectExitListen);
    }
```

In `beforeEach` set `rejectDataListen = null` and `rejectExitListen = null`.

Add these tests (exact):

```tsx
  it("does not spawn when subscribePtyData rejects", async () => {
    rejectDataListen = new Error("IPC command is not allowlisted by the isolation hook");
    renderProvider();

    await waitFor(() => {
      expect(session?.tabs).toHaveLength(1);
    });
    expect(openPty).not.toHaveBeenCalled();
    expect(session?.tabs[0]?.status).toBe("exited");
    expect(session?.tabs[0]?.sessionId).toBeNull();
    expect(session?.tabs[0]?.error).toContain("not allowlisted");
  });

  it("does not spawn when subscribePtyExit rejects after data listen", async () => {
    rejectExitListen = new Error("exit listen failed");
    renderProvider();

    await waitFor(() => {
      expect(session?.tabs).toHaveLength(1);
    });
    expect(openPty).not.toHaveBeenCalled();
    expect(session?.tabs[0]?.status).toBe("exited");
    expect(session?.tabs[0]?.error).toContain("exit listen failed");
  });
```

- [ ] **Step 2: Run the two new tests and confirm they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/terminal.provider.test.tsx`

Expected: FAIL — `error` is undefined and/or `openPty` was called because the `catch` still calls `restorePinned()`.

- [ ] **Step 3: Add `error` on `TerminalTab`**

In `apps/terminal/src/modules/terminal/terminal.types.ts`, add `error` after `status`:

```ts
export interface TerminalTab {
  id: string;
  name: string | null;
  pinned: boolean;
  cwd: string | null;
  sessionId: string | null;
  status: TerminalTabStatus;
  error: string | null;
  restore?: {
    scrollback: string;
    cols: number;
    rows: number;
  };
}
```

- [ ] **Step 4: Fail hydration instead of spawning**

In `terminal.hook.ts`, set `error: null` on `recordToTab` and `createEmptyTab`.

Add:

```ts
function failListenTab(error: unknown): TerminalTab {
  return {
    ...createEmptyTab(),
    status: "exited",
    error: errorText(error) || "PTY events failed to subscribe",
  };
}
```

Replace the subscribe `catch` (the block that calls `restorePinned`) with:

```ts
      } catch (error) {
        if (!cancelled) {
          const failed = failListenTab(error);
          tabsRef.current = [failed];
          activeIdRef.current = failed.id;
          setTabs([failed]);
          setActiveId(failed.id);
          hydratedRef.current = true;
        }
      }
```

In `spawnSession`’s outer `catch`, keep the generation guard and set the reason:

```ts
      } catch (error) {
        if (spawnGenRef.current.get(tabId) !== generation) {
          return;
        }
        pendingInputRef.current.delete(tabId);
        updateTab(tabId, {
          sessionId: null,
          status: "exited",
          error: errorText(error) || "PTY failed to start",
        });
      }
```

In `markExited` / `updateTab(..., { status: "exited" })` paths that already exist, set `error: null` when the reason is only SessionNotFound, or `error: errorText(error)` when you have an error object. Minimum required: subscribe-fail and spawn-fail set a non-empty `error`.

When a tab becomes `live` after a successful `open`, clear it: `updateTab(tabId, { sessionId, status: "live", error: null })`.

- [ ] **Step 5: Host `data-*` and DEV xterm handle**

In `terminal.component.tsx`, add this type near the imports:

```ts
type GencoreXtermHost = HTMLDivElement & { __gencoreXterm?: import("@xterm/xterm").Terminal };
```

In `TerminalHostPane`, add `const [hasOutput, setHasOutput] = React.useState(false);` and in `registerWriter`:

```ts
    const unreg = sessionRef.current.registerWriter(tab.id, (data) => {
      if (data.length > 0) {
        setHasOutput(true);
      }
      host.terminal.write(data);
    });
```

After `terminal.open` / `createXterm`, if `import.meta.env.DEV`:

```ts
    const hostNode = node as GencoreXtermHost;
    if (import.meta.env.DEV) {
      hostNode.__gencoreXterm = host.terminal;
    }
```

On dispose, `delete hostNode.__gencoreXterm`.

Change the outer pane `div` in `TerminalHostPane` to:

```tsx
    <div
      data-slot="terminal-host"
      data-status={tab.status}
      data-cols={String(session.cols)}
      data-rows={String(session.rows)}
      data-has-output={hasOutput ? "true" : "false"}
      {...(tab.sessionId ? { "data-session-id": tab.sessionId } : {})}
      className={cn(
        "absolute inset-0 flex flex-col",
        active ? undefined : "pointer-events-none invisible",
      )}
      aria-hidden={!active}
    >
```

Show `tab.error` on the Exited banner next to “Exited”:

```tsx
          <span>{tab.error ? `Exited: ${tab.error}` : "Exited"}</span>
```

Also add a host-node `ResizeObserver` in the same `useEffect` that creates xterm, observing `node`, calling `host.fit.fit()` when `node.clientWidth >= 8 && node.clientHeight >= 8`. This is the seam for surface diagnosis; do not swap renderers here.

- [ ] **Step 6: Re-run provider tests**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/terminal.provider.test.tsx`

Expected: all tests PASS, including the two new ones.

- [ ] **Step 7: Typecheck and lint the touched files**

Run: `pnpm --filter @gencore/terminal typecheck`

Expected: exit 0.

Run: `pnpm --filter @gencore/terminal exec biome check src/modules/terminal tests/unit/terminal.provider.test.tsx`

Expected: clean.

- [ ] **Step 8: Commit (only if the user asked)**

```bash
git add apps/terminal/src/modules/terminal/terminal.types.ts apps/terminal/src/modules/terminal/terminal.hook.ts apps/terminal/src/modules/terminal/terminal.component.tsx apps/terminal/tests/unit/terminal.provider.test.tsx
git commit -m "fix(terminal): surface PTY subscribe failures instead of spawning blind"
```

Skip this step unless the user asked to commit.

---

### Task 2: Dev-only WebView2 debug port

**Files:**
- Create: `scripts/tauri-dev-terminal.mjs`
- Modify: `apps/terminal/package.json`
- Test: `apps/terminal/tests/unit/tauri.dev-port.test.ts`

**Interfaces:**
- Consumes: existing `"tauri:dev": "tauri dev"`
- Produces: `tauri:dev` runs `node ../../scripts/tauri-dev-terminal.mjs`, which sets `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223` then `tauri dev`. `tauri:build` and `scripts/package-win64.ps1` stay unchanged.

- [ ] **Step 1: Write the failing port test**

Create `apps/terminal/tests/unit/tauri.dev-port.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};
const wrapper = readFileSync(resolve(process.cwd(), "../../scripts/tauri-dev-terminal.mjs"), "utf8");
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
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/tauri.dev-port.test.ts`

Expected: FAIL — `package.json` still has `"tauri:dev": "tauri dev"` and/or the wrapper file is missing.

- [ ] **Step 3: Add the wrapper and point `tauri:dev` at it**

Create `scripts/tauri-dev-terminal.mjs`:

```js
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/terminal");

process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9223";

const child = spawn("pnpm", ["exec", "tauri", "dev"], {
  cwd: appDir,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
```

In `apps/terminal/package.json` set:

```json
    "tauri:dev": "node ../../scripts/tauri-dev-terminal.mjs",
    "tauri:build": "tauri build --no-bundle",
    "test:visual": "playwright test"
```

Leave `test:visual` unused until Task 5 (Playwright is added there). If `biome` / typecheck complain about a missing playwright binary, omit `test:visual` until Task 5.

- [ ] **Step 4: Re-run the port test**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/tauri.dev-port.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add scripts/tauri-dev-terminal.mjs apps/terminal/package.json apps/terminal/tests/unit/tauri.dev-port.test.ts
git commit -m "chore(terminal): expose WebView2 CDP on tauri:dev port 9223"
```

Skip unless the user asked to commit.

---

### Task 3: Probe the live WebView (Sonnet 5)

**Files:**
- Create: `.superpowers/sdd/blank-pane/probe.md`

**Interfaces:**
- Consumes: Task 1 host `data-*` + `__gencoreXterm`; Task 2 port `9223`
- Produces: a probe file that names **exactly one** layer: `surface` | `session` | `transport` | `handshake` | `shell`

**Model:** `claude-sonnet-5-thinking-high` only. Do not use Opus.

- [ ] **Step 1: Restart Terminal through the wrapper**

Stop any existing `pnpm --filter @gencore/terminal tauri:dev`.

Run: `pnpm --filter @gencore/terminal tauri:dev`

Wait until the log shows `Running ... gencore-terminal.exe` and the window is visible.

- [ ] **Step 2: Confirm CDP is open**

Run: `curl.exe -s http://127.0.0.1:9223/json/version`

Expected: JSON with `Browser` / `webSocketDebuggerUrl`. If this fails, fix Task 2 before probing. Do **not** open `http://localhost:5173` in a normal browser and treat that as the app.

- [ ] **Step 3: Collect layer evidence**

Use Playwright or the Playwright MCP against `http://127.0.0.1:9223` (connect over CDP). On the WebView page whose URL includes `localhost:5173` (the UI, not the Isolation iframe), evaluate:

```js
(() => {
  const host = document.querySelector('[data-slot="terminal-host"]');
  const canvas = host?.querySelector("canvas");
  const term = host && host.__gencoreXterm;
  const lines = [];
  if (term) {
    for (let i = 0; i < term.buffer.active.length; i++) {
      lines.push(term.buffer.active.getLine(i)?.translateToString(true) ?? "");
    }
  }
  return {
    hasHost: Boolean(host),
    status: host?.getAttribute("data-status"),
    sessionId: host?.getAttribute("data-session-id"),
    cols: host?.getAttribute("data-cols"),
    rows: host?.getAttribute("data-rows"),
    hasOutput: host?.getAttribute("data-has-output"),
    canvasWidth: canvas?.width ?? 0,
    canvasHeight: canvas?.height ?? 0,
    clientWidth: host?.clientWidth ?? 0,
    clientHeight: host?.clientHeight ?? 0,
    buffer: lines.join("\n").slice(0, 2000),
    hasXtermHandle: Boolean(term),
  };
})()
```

Also collect WebView console errors (Isolation allowlist, invoke failures).

Classify with the spec table; stop at the first failure:

1. `surface` — no `.xterm`, or canvas width/height `0`, or `clientHeight < 8`
2. `session` — host exists with size, `data-status` is `exited` or `data-session-id` is missing
3. `transport` — `live` + session id, `data-has-output` is `false`, buffer empty, console shows listen/allowlist errors, or no `gencore-pty://data`
4. `handshake` — buffer / first bytes are only `ESC [6n` (`\x1b[6n`)
5. `shell` — printable bytes arrived, still no prompt

- [ ] **Step 4: Write the probe file**

Create `.superpowers/sdd/blank-pane/probe.md` with this exact shape (fill the fields from Step 3 — no empty layer):

```md
# Blank pane probe

Date: 2026-08-21
Model: claude-sonnet-5-thinking-high

## Layer

<surface|session|transport|handshake|shell>

## Evidence

- canvas: <width>x<height>
- host client: <width>x<height>
- data-status: <...>
- data-session-id: <present|missing>
- data-has-output: <true|false>
- console: <none|paste the Isolation/invoke error>
- buffer preview:
```
<first 20 lines or "(empty)">
```

## What this rules out

- <one line>
```

- [ ] **Step 5: Do not change product code in this task**

If the layer is unclear, add more CDP facts to the same file and re-classify. Do not elevate to Opus. Do not start Task 4 until the `## Layer` heading is a single word from the list.

- [ ] **Step 6: Commit (only if the user asked)**

```bash
git add .superpowers/sdd/blank-pane/probe.md
git commit -m "docs: record blank-pane WebView probe layer"
```

Skip unless the user asked to commit.

---

### Task 4: Named-layer fix (Sonnet 5)

**Files:** only the branch that matches `.superpowers/sdd/blank-pane/probe.md` `## Layer`. Do not apply other branches.

**Interfaces:**
- Consumes: the named layer from Task 3
- Produces: that layer no longer fails the probe snippet from Task 3 Step 3

**Model:** `claude-sonnet-5-thinking-high`. Opus only if this task’s CDP re-probe is still red **and** the spec’s three Opus conditions are all true.

Apply **exactly one** branch.

#### Branch `surface`

- [ ] **Step 1: Write a failing fit helper test**

Create `apps/terminal/tests/unit/terminal.fit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shouldFitHost } from "../../src/modules/terminal/terminal.fit";

describe("shouldFitHost", () => {
  it("rejects a host that is not measurable", () => {
    expect(shouldFitHost(0, 400)).toBe(false);
    expect(shouldFitHost(800, 0)).toBe(false);
    expect(shouldFitHost(7, 7)).toBe(false);
  });

  it("accepts a host with a real box", () => {
    expect(shouldFitHost(800, 400)).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/terminal.fit.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper and use it**

Create `apps/terminal/src/modules/terminal/terminal.fit.ts`:

```ts
export const MIN_FIT_PX = 8;

export function shouldFitHost(width: number, height: number): boolean {
  return width >= MIN_FIT_PX && height >= MIN_FIT_PX;
}
```

In `TerminalHostPane`’s xterm effect, replace the single `requestAnimationFrame` fit with:

```ts
    const fitHost = () => {
      if (!shouldFitHost(node.clientWidth, node.clientHeight)) {
        return;
      }
      try {
        host.fit.fit();
      } catch {
        // Container may not be measurable yet.
      }
    };
    const observer = new ResizeObserver(fitHost);
    observer.observe(node);
    fitHost();
```

Disconnect `observer` in the effect cleanup. Do not load `@xterm/addon-webgl` unless the re-probe still shows a non-zero canvas that never paints (then stop and ask — that is a renderer change).

- [ ] **Step 4: Run the fit unit test**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/terminal.fit.test.ts`

Expected: PASS.

#### Branch `session`

- [ ] **Step 1: Capture the open error already required in Task 1**

If `data-status` is `exited` and `error` names Isolation (`not allowlisted`) or `invalid theme`, fix the **open args** in `buildOpenArgs` so `theme` is only `"polar-night"` | `"snow-storm"` (map any other `ThemeName` to `"polar-night"`). Add this test to `terminal.provider.test.tsx` if you change `buildOpenArgs` — export it for the test:

```ts
export function buildOpenArgs(
  cols: number,
  rows: number,
  theme: ThemeName,
  cwd?: string | null,
): OpenPtyArgs {
  const resolved = theme === "snow-storm" ? "snow-storm" : "polar-night";
  if (cwd) {
    return { cols, rows, cwd, theme: resolved };
  }
  return { cols, rows, theme: resolved };
}
```

Today `buildOpenArgs` is not exported; export it if this branch runs.

- [ ] **Step 2: If the error is `SpawnFailed`**

Read `session_map.rs` spawn. Do not add DSR answers. Confirm `resolve_shell` / cwd. Add a Rust test only if you change Rust.

#### Branch `transport`

- [ ] **Step 1: Confirm Isolation is the drop**

If the probe console is `IPC command is not allowlisted by the isolation hook` on `plugin:event|listen`, Tauri 2 may send a fourth `options` key. Extend `isListenArgs` in `apps/terminal/isolation/isolation.hook.js` to allow an optional `options` object and omit it in `reconstructListen`.

Add to `apps/terminal/tests/unit/isolation.hook.test.ts` using the existing `getHook` + `envelope` helpers:

```ts
  it("allows gencore-pty://data listen with an options key", () => {
    const hook = getHook();
    const result = hook(
      envelope(EVENT_LISTEN_CMD, {
        event: PTY_DATA_EVENT,
        target: { kind: "Any" },
        handler: 3,
        options: {},
      }),
    );
    expect(result.payload).toEqual({
      event: PTY_DATA_EVENT,
      target: { kind: "Any" },
      handler: 3,
    });
  });
```

- [ ] **Step 2: Run Isolation tests**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/isolation.hook.test.ts`

Expected: PASS, including the new case.

Task 1 already removed the silent `catch`. Do not re-introduce `restorePinned` in that `catch`.

#### Branch `handshake`

- [ ] **Step 1: Re-flush orphans when the writer attaches**

In `registerWriter` (`terminal.hook.ts`), after installing the writer and flushing `queuesRef`, if the tab already has a `sessionId`, call `flushOrphans(tab.sessionId, tabId)` again (no-op when empty).

Add to `terminal.provider.test.tsx`:

```tsx
  it("flushes orphans parked while the writer was missing after session id exists", async () => {
    renderProvider();
    const tab = await liveTab();
    const dsr = btoa("\u001b[6n");
    dataHandler?.({ session_id: tab.sessionId, data: dsr });
    const writer = vi.fn();
    session?.registerWriter(tab.id, writer);
    expect(writer).toHaveBeenCalled();
    const written = writer.mock.calls[0]?.[0] as Uint8Array;
    expect(new TextDecoder().decode(written)).toContain("\u001b[6n");
  });
```

Do **not** answer `ESC [6n` in the JS data handler.

- [ ] **Step 2: Run provider tests**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/terminal.provider.test.tsx`

Expected: PASS.

#### Branch `shell`

- [ ] **Step 1: Record the resolved program in the probe, then fix argv only if needed**

If OMP is not on disk, spawn must stay `program + ["-NoLogo"]`. If the probe buffer shows a PowerShell error from `-File`, `resolve_oh_my_posh` is wrongly returning `Some`. Fix `is_real_executable` / resource path — do not rewrite `gencore-prompt.ps1`.

Add a Rust test in `crates/gencore-plugin-pty/tests/session_commands.rs` only if `session_shell.rs` changes.

Run: `cargo test -p gencore-pty`

Expected: PASS.

#### After the chosen branch

- [ ] **Step 3: Re-run the Task 3 CDP snippet**

Expected: canvas > 0, `data-status=live`, `data-session-id` present, buffer not empty (or at least a cursor cell / `data-has-output=true`). If still red, update `probe.md` with new evidence. Do **not** apply a second branch. Do **not** start Opus unless the spec’s three conditions are all true.

- [ ] **Step 4: Commit (only if the user asked)**

Stage only the files this branch touched. Message: `fix(terminal): repair blank pane <layer> layer`

---

### Task 5: Playwright WebView2 visual gate (Sonnet 5)

**Files:**
- Create: `apps/terminal/playwright.config.ts`
- Create: `apps/terminal/tests/visual/terminal.pane.spec.ts`
- Modify: `apps/terminal/package.json` — add `@playwright/test` (latest stable via `pnpm add`) and `"test:visual": "playwright test"`

**Interfaces:**
- Consumes: CDP `http://127.0.0.1:9223`, `__gencoreXterm`, `data-slot="terminal-host"`
- Produces: `pnpm --filter @gencore/terminal test:visual` fails if port 9223 is down; never navigates to `http://localhost:5173` as a substitute

**Model:** `claude-sonnet-5-thinking-high`

- [ ] **Step 1: Add Playwright**

From the repo root:

```bash
pnpm --filter @gencore/terminal add -D @playwright/test
```

Use the resolved stable version. Do not add beta tags. Do not add `test:visual` to `turbo.json`.

- [ ] **Step 2: Write the config and spec (this is the failing gate until the pane works)**

`apps/terminal/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    trace: "off",
  },
});
```

`apps/terminal/tests/visual/terminal.pane.spec.ts`:

```ts
import { expect, test, chromium } from "@playwright/test";

const CDP = "http://127.0.0.1:9223";
const MARKER = "gencore-pty-alive";

async function connectWebView() {
  try {
    const browser = await chromium.connectOverCDP(CDP);
    return browser;
  } catch {
    throw new Error(
      `WebView2 CDP is not reachable at ${CDP}. Start pnpm --filter @gencore/terminal tauri:dev. Do not use http://localhost:5173.`,
    );
  }
}

test("PowerShell pane shows a prompt and echoes a marker", async () => {
  const browser = await connectWebView();
  try {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page =
      pages.find((item) => item.url().includes("localhost:5173")) ??
      pages.find((item) => item.url().startsWith("http://localhost")) ??
      pages[0];
    if (!page) {
      throw new Error("No WebView page from CDP");
    }
    if (page.url().startsWith("http://localhost:5173") && !page.url().includes("isolation")) {
      // UI page — good
    }

    const host = page.locator('[data-slot="terminal-host"]');
    await expect(host).toBeVisible({ timeout: 30_000 });
    await expect(host).toHaveAttribute("data-status", "live");
    await expect(host).toHaveAttribute("data-session-id", /.+/);

    const box = await host.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(40);
    expect(box?.height ?? 0).toBeGreaterThan(40);

    const canvas = host.locator("canvas").first();
    await expect(canvas).toBeVisible();

    await host.click();
    await page.keyboard.type(`echo ${MARKER}`);
    await page.keyboard.press("Enter");

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const node = document.querySelector("[data-slot=terminal-host]");
            const term = node && (node as { __gencoreXterm?: { buffer: { active: { length: number; getLine: (i: number) => { translateToString: (t?: boolean) => string } | undefined } } } }).__gencoreXterm;
            if (!term) {
              return "";
            }
            const lines: string[] = [];
            for (let i = 0; i < term.buffer.active.length; i++) {
              lines.push(term.buffer.active.getLine(i)?.translateToString(true) ?? "");
            }
            return lines.join("\n");
          }),
        { timeout: 20_000 },
      )
      .toContain(MARKER);
  } finally {
    await browser.close();
  }
});
```

- [ ] **Step 3: Run with `tauri:dev` already up**

Run: `pnpm --filter @gencore/terminal test:visual`

Expected: PASS on a fixed pane. If CDP is down, FAIL with the message that forbids `localhost:5173`. If the pane is still blank, FAIL on `data-status` / marker — go back to Task 4, do not weaken the assertion to a screenshot-only check.

- [ ] **Step 4: Record the resolved shell**

Append to `.superpowers/sdd/blank-pane/probe.md`:

```md
## Slice 1 gate

- test:visual: pass
- resolved shell: <pwsh|powershell.exe>  (from the buffer banner or `$PSVersionTable` if you typed it)
```

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add apps/terminal/playwright.config.ts apps/terminal/tests/visual/terminal.pane.spec.ts apps/terminal/package.json pnpm-lock.yaml
git commit -m "test(terminal): prove the PTY pane over WebView2 CDP"
```

Skip unless the user asked to commit.

---

### Task 6: Slice 2 Oh My Posh (only after Task 5 is green)

**Files:**
- Run: `scripts/fetch-oh-my-posh.ps1`
- Modify: `apps/terminal/tests/visual/terminal.pane.spec.ts` — add the 2-line prompt assertion
- Confirm: `apps/terminal/src-tauri/tauri.conf.json` already has `"resources": ["resources/oh-my-posh/**/*"]` (do not change unless the probe shows Rust `resolve_oh_my_posh` is `None` after a real exe exists)

**Interfaces:**
- Consumes: Task 5 gate green; existing `shell_launch` `-NoExit` path
- Produces: non-zero `apps/terminal/src-tauri/resources/oh-my-posh/oh-my-posh.exe` (gitignored); visual test still finds `gencore-pty-alive` and also sees a second prompt line / Powerline separator after restart

**Model:** `claude-sonnet-5-thinking-high`

- [ ] **Step 1: Fetch the exe**

Run: `pwsh -NoProfile -File scripts/fetch-oh-my-posh.ps1`

Expected: `Wrote .../oh-my-posh.exe`. Confirm the file length is greater than 0:

```powershell
(Get-Item apps/terminal/src-tauri/resources/oh-my-posh/oh-my-posh.exe).Length -gt 0
```

Expected: `True`. Do not `git add` the exe.

- [ ] **Step 2: Restart `tauri:dev` and extend the visual spec**

Add a second test in `terminal.pane.spec.ts` (same `connectWebView` helper, duplicated in-file — do not import from Task 5 via a vague “as above”):

```ts
test("Oh My Posh 2-line prompt stays interactive", async () => {
  const browser = await connectWebView();
  try {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page =
      pages.find((item) => item.url().includes("localhost:5173")) ??
      pages.find((item) => item.url().startsWith("http://localhost")) ??
      pages[0];
    if (!page) {
      throw new Error("No WebView page from CDP");
    }
    const host = page.locator('[data-slot="terminal-host"]');
    await expect(host).toBeVisible({ timeout: 30_000 });

    const buffer = await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const node = document.querySelector("[data-slot=terminal-host]");
            const term = node && (node as { __gencoreXterm?: { buffer: { active: { length: number; getLine: (i: number) => { translateToString: (t?: boolean) => string } | undefined } } } }).__gencoreXterm;
            if (!term) {
              return "";
            }
            const lines: string[] = [];
            for (let i = 0; i < term.buffer.active.length; i++) {
              lines.push(term.buffer.active.getLine(i)?.translateToString(true) ?? "");
            }
            return lines.join("\n");
          }),
        { timeout: 20_000 },
      )
      .toMatch(/./);

    const text = await page.evaluate(() => {
      const node = document.querySelector("[data-slot=terminal-host]");
      const term = node && (node as { __gencoreXterm?: { buffer: { active: { length: number; getLine: (i: number) => { translateToString: (t?: boolean) => string } | undefined } } } }).__gencoreXterm;
      if (!term) {
        return "";
      }
      const lines: string[] = [];
      for (let i = 0; i < term.buffer.active.length; i++) {
        lines.push(term.buffer.active.getLine(i)?.translateToString(true) ?? "");
      }
      return lines.join("\n");
    });
    expect(text.includes("PS ") && text.split("\n").filter((line) => line.trim().length > 0).length === 1).toBe(false);

    await host.click();
    await page.keyboard.type(`echo ${MARKER}`);
    await page.keyboard.press("Enter");
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const node = document.querySelector("[data-slot=terminal-host]");
            const term = node && (node as { __gencoreXterm?: { buffer: { active: { length: number; getLine: (i: number) => { translateToString: (t?: boolean) => string } | undefined } } } }).__gencoreXterm;
            if (!term) {
              return "";
            }
            const lines: string[] = [];
            for (let i = 0; i < term.buffer.active.length; i++) {
              lines.push(term.buffer.active.getLine(i)?.translateToString(true) ?? "");
            }
            return lines.join("\n");
          }),
        { timeout: 20_000 },
      )
      .toContain(MARKER);
    void buffer;
  } finally {
    await browser.close();
  }
});
```

The assertion `expect(text.includes("PS ") && single non-empty line).toBe(false)` means: reject a single classic `PS C:\...>` line as the only prompt. After OMP, there must be more prompt structure than one `PS ` line.

- [ ] **Step 3: Run `test:visual`**

Run: `pnpm --filter @gencore/terminal test:visual`

Expected: both tests PASS.

- [ ] **Step 4: Fallback check (exe missing)**

Rename the exe to `oh-my-posh.exe.bak`, restart `tauri:dev`, run only the first visual test (`PowerShell pane shows a prompt and echoes a marker`). Expected: PASS (default prompt). Restore the exe afterward.

- [ ] **Step 5: Commit (only if the user asked)**

Do not stage `oh-my-posh.exe`. Stage the visual spec only.

```bash
git add apps/terminal/tests/visual/terminal.pane.spec.ts
git commit -m "test(terminal): require Oh My Posh prompt after fetch"
```

Skip unless the user asked to commit.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| Diagnose before product guess | Task 3 |
| One named layer | Task 3 output + Task 4 single branch |
| Silent subscribe `catch` removed | Task 1 (mandatory) |
| Dev `data-*` + CDP xterm handle | Task 1 |
| Port 9223, not in ZIP | Task 2 |
| Slice 1 visual gate, buffer marker primary | Task 5 |
| Never use Vite 5173 as the gate | Task 2, 3, 5 |
| Slice 2 only after slice 1 green | Task 6 |
| Keep session-alive; no DSR in Rust/JS handler | Task 4 branches |
| xterm patch / freezePrototype unchanged | Global + do-not-touch |
| Sonnet 5; Opus last resort | Global Constraints + Tasks 3–6 |
| No new IPC / Isolation unless transport proved | Task 4 transport branch only |
