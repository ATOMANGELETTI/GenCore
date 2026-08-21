# Terminal Config tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Terminal side-panel Settings placeholder with a Config tab that lists Appearance (Polar Night / Snow Storm / Match system), applies the Nord theme immediately, and remembers the preference in `localStorage`.

**Architecture:** A Terminal-owned `config` module stores `{ version: 1, theme }` under `gencore.terminal.config`. `ConfigProvider` holds `preference`, `setPreference`, and `resolvedTheme`. `App` wraps the tree with `ConfigProvider` and passes `resolvedTheme` into the existing controlled `ThemeProvider`. The Config panel is a compact `CONFIG` header plus an Appearance radio group built from ui-kit Button + Separator. No new kit primitives, Isolation grants, or Explorer edits.

**Tech Stack:** React 19.2, Vitest, Testing Library, `@gencore/ui-kit` (Button, Separator, ThemeProvider, `ThemeName`), Lucide (`Settings`, `Moon`, `Sun`, `Monitor`, `Check`), WebView `localStorage`.

**Spec:** `.superpowers/docs/specs/2026-08-20-terminal-config-tab-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- `{module}.{role}.{ext}`. Tests only under `apps/terminal/tests/` (existing `tests/unit/*.test.ts(x)` pattern).
- Official Nord hex only via existing semantic tokens. No ad-hoc hex, no Tailwind default palette colors.
- UI talks to Rust only through `src/modules/ipc/`. Config persistence is `localStorage` only — no Tauri store plugin, no new capabilities, no Isolation changes.
- Do not edit `apps/explorer`. Do not add ui-kit primitives (`RadioGroup`, `Switch`).
- Terminal is private; **no changeset**.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, or similar).
- Work in place on the current branch. Do not create a worktree or switch branches unless asked.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.
- Do not bump major versions.

---

## File map

**Create**

- `apps/terminal/src/modules/config/config.types.ts` — `ThemePreference`, `TerminalConfigV1`, `ConfigContextValue`
- `apps/terminal/src/modules/config/config.storage.ts` — parse / load / save
- `apps/terminal/src/modules/config/config.hook.ts` — `ConfigProvider`, `useConfig`, `useTerminalConfig`
- `apps/terminal/src/modules/config/config.component.tsx` — Config panel
- `apps/terminal/tests/unit/config.storage.test.ts`
- `apps/terminal/tests/unit/config.hook.test.tsx`
- `apps/terminal/tests/unit/config.component.test.tsx`

**Modify**

- `apps/terminal/src/modules/side-panel/side-panel.types.ts`
- `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- `apps/terminal/tests/unit/side-panel.test.tsx`
- `apps/terminal/src/modules/app/app.component.tsx`
- `apps/terminal/tests/unit/app.component.test.tsx`
- `apps/terminal/AGENTS.md`
- `AGENTS.md`
- `.superpowers/docs/specs/2026-08-20-terminal-config-tab-design.md` (status `draft` → `approved`)

**Delete (Task 4)**

- `apps/terminal/src/modules/app/app.hook.ts`
- `apps/terminal/tests/unit/app.hook.test.tsx`

Do not modify Isolation hooks, capabilities, Explorer, or `@gencore/ui-kit`.

---

### Task 1: Config schema and localStorage

**Files:**
- Create: `apps/terminal/src/modules/config/config.types.ts`
- Create: `apps/terminal/src/modules/config/config.storage.ts`
- Create: `apps/terminal/tests/unit/config.storage.test.ts`

**Interfaces:**
- Consumes: WebView `localStorage`
- Produces: `ThemePreference`, `TerminalConfigV1`, `DEFAULT_CONFIG`, `CONFIG_STORAGE_KEY`, `parseConfig`, `loadConfig`, `saveConfig`

- [ ] **Step 1: Write the failing storage tests**

Create `apps/terminal/tests/unit/config.storage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  loadConfig,
  parseConfig,
  saveConfig,
} from "../../src/modules/config/config.storage";

describe("parseConfig", () => {
  it("returns Match system for missing, empty, invalid, wrong version, or unknown theme", () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("{")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(JSON.stringify({ version: 2, theme: "system" }))).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(JSON.stringify({ version: 1, theme: "nord" }))).toEqual(DEFAULT_CONFIG);
  });

  it("accepts a valid v1 blob", () => {
    expect(parseConfig(JSON.stringify({ version: 1, theme: "snow-storm" }))).toEqual({
      version: 1,
      theme: "snow-storm",
    });
  });
});

describe("loadConfig / saveConfig", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads DEFAULT_CONFIG when the key is missing and does not write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("does not write when the stored blob is invalid", () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, "{");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("returns DEFAULT_CONFIG when getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("writes a valid blob on saveConfig and loadConfig reads it back", () => {
    expect(saveConfig({ version: 1, theme: "polar-night" })).toBe(true);
    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toBe(
      JSON.stringify({ version: 1, theme: "polar-night" }),
    );
    expect(loadConfig()).toEqual({ version: 1, theme: "polar-night" });
  });

  it("returns false and skips persistence when setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveConfig({ version: 1, theme: "system" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.storage.test.ts`

Expected: FAIL — `config.storage` module is not found.

- [ ] **Step 3: Write types and storage**

Create `apps/terminal/src/modules/config/config.types.ts`:

```ts
import type { ThemeName } from "@gencore/ui-kit";

export type ThemePreference = "system" | "polar-night" | "snow-storm";

export interface TerminalConfigV1 {
  version: 1;
  theme: ThemePreference;
}

export interface ConfigContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolvedTheme: ThemeName;
}
```

Create `apps/terminal/src/modules/config/config.storage.ts`:

```ts
import type { TerminalConfigV1, ThemePreference } from "./config.types";

export const CONFIG_STORAGE_KEY = "gencore.terminal.config";

export const DEFAULT_CONFIG: TerminalConfigV1 = { version: 1, theme: "system" };

const THEME_PREFERENCES: ReadonlySet<string> = new Set([
  "system",
  "polar-night",
  "snow-storm",
]);

export function parseConfig(raw: string | null): TerminalConfigV1 {
  if (raw == null || raw === "") {
    return DEFAULT_CONFIG;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "version" in value &&
      value.version === 1 &&
      "theme" in value &&
      typeof value.theme === "string" &&
      THEME_PREFERENCES.has(value.theme)
    ) {
      return { version: 1, theme: value.theme as ThemePreference };
    }
  } catch {
    // Invalid JSON is treated as Match system.
  }

  return DEFAULT_CONFIG;
}

export function loadConfig(): TerminalConfigV1 {
  try {
    return parseConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: TerminalConfigV1): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/config.types.ts apps/terminal/src/modules/config/config.storage.ts apps/terminal/tests/unit/config.storage.test.ts
git commit -m "feat(terminal): add versioned config localStorage helper"
```

---

### Task 2: Config hook and provider

**Files:**
- Create: `apps/terminal/src/modules/config/config.hook.ts`
- Create: `apps/terminal/tests/unit/config.hook.test.tsx`

**Interfaces:**
- Consumes: `loadConfig`, `saveConfig`, `ThemePreference`, `ConfigContextValue`; `getWindowTheme` / `subscribeWindowTheme` from `../ipc/ipc.window`
- Produces: `useTerminalConfig()`, `ConfigProvider`, `useConfig()`. `resolvedTheme` is `ThemeName`. OS IPC runs only while `preference === "system"`.

- [ ] **Step 1: Write the failing hook tests**

Create `apps/terminal/tests/unit/config.hook.test.tsx`:

```ts
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigProvider, useConfig, useTerminalConfig } from "../../src/modules/config/config.hook";
import { CONFIG_STORAGE_KEY } from "../../src/modules/config/config.storage";

const { getWindowTheme, subscribeWindowTheme } = vi.hoisted(() => ({
  getWindowTheme: vi.fn(),
  subscribeWindowTheme: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.window", () => ({
  getWindowTheme,
  subscribeWindowTheme,
}));

function ConfigProbe() {
  const { preference, resolvedTheme, setPreference } = useTerminalConfig();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setPreference("snow-storm")}>
        snow
      </button>
      <button type="button" onClick={() => setPreference("polar-night")}>
        polar
      </button>
    </div>
  );
}

describe("useTerminalConfig", () => {
  beforeEach(() => {
    localStorage.clear();
    getWindowTheme.mockReset();
    subscribeWindowTheme.mockReset();
    getWindowTheme.mockResolvedValue("dark");
    subscribeWindowTheme.mockResolvedValue(() => undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to system and maps OS light to snow-storm", async () => {
    getWindowTheme.mockResolvedValueOnce("light");
    render(<ConfigProbe />);
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
    await waitFor(() => {
      expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
    });
  });

  it("maps OS dark, null, and IPC failure to polar-night while preference stays system", async () => {
    getWindowTheme.mockResolvedValueOnce("dark");
    const first = render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
    first.unmount();

    getWindowTheme.mockResolvedValueOnce(null);
    subscribeWindowTheme.mockClear();
    const second = render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
    second.unmount();

    getWindowTheme.mockRejectedValueOnce(new Error("theme unavailable"));
    subscribeWindowTheme.mockClear();
    render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("polar-night");
  });

  it("keeps snow-storm when preference is explicit even if OS is dark", async () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ version: 1, theme: "snow-storm" }),
    );
    render(<ConfigProbe />);
    expect(screen.getByTestId("preference")).toHaveTextContent("snow-storm");
    expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
    await waitFor(() => {
      expect(subscribeWindowTheme).not.toHaveBeenCalled();
    });
  });

  it("writes preference on setPreference and unsubscribes when leaving system", async () => {
    const unlisten = vi.fn();
    subscribeWindowTheme.mockResolvedValue(unlisten);
    render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));

    act(() => {
      screen.getByText("snow").click();
    });

    expect(screen.getByTestId("preference")).toHaveTextContent("snow-storm");
    expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
    expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      theme: "snow-storm",
    });
    await waitFor(() => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });

  it("flips resolved theme when system preference hears OS light", async () => {
    let onTheme: ((theme: "light" | "dark") => void) | undefined;
    subscribeWindowTheme.mockImplementation(async (handler: (theme: "light" | "dark") => void) => {
      onTheme = handler;
      return () => undefined;
    });

    render(<ConfigProbe />);
    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    act(() => {
      onTheme?.("light");
    });
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("snow-storm");
  });
});

describe("ConfigProvider", () => {
  it("shares preference through useConfig", () => {
    function Child() {
      const { preference } = useConfig();
      return <span data-testid="ctx">{preference}</span>;
    }

    localStorage.clear();
    render(
      <ConfigProvider>
        <Child />
      </ConfigProvider>,
    );
    expect(screen.getByTestId("ctx")).toHaveTextContent("system");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.hook.test.tsx`

Expected: FAIL — `config.hook` module is not found.

- [ ] **Step 3: Implement the hook and provider**

Create `apps/terminal/src/modules/config/config.hook.ts`:

```ts
import type { ThemeName } from "@gencore/ui-kit";
import * as React from "react";
import { getWindowTheme, subscribeWindowTheme } from "../ipc/ipc.window";
import { loadConfig, saveConfig } from "./config.storage";
import type { ConfigContextValue, ThemePreference } from "./config.types";

const ConfigContext = React.createContext<ConfigContextValue | null>(null);

function mapOsTheme(value: "light" | "dark" | null): ThemeName {
  return value === "light" ? "snow-storm" : "polar-night";
}

export function useTerminalConfig(): ConfigContextValue {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(
    () => loadConfig().theme,
  );
  const [osTheme, setOsTheme] = React.useState<ThemeName>("polar-night");

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    saveConfig({ version: 1, theme: next });
  }, []);

  React.useEffect(() => {
    if (preference !== "system") {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const osThemeValue = await getWindowTheme();
        if (!cancelled) {
          setOsTheme(mapOsTheme(osThemeValue));
        }
      } catch {
        if (!cancelled) {
          setOsTheme("polar-night");
        }
      }

      if (cancelled) {
        return;
      }

      try {
        const stop = await subscribeWindowTheme((value) => {
          setOsTheme(mapOsTheme(value));
        });
        if (cancelled) {
          stop();
          return;
        }
        unlisten = stop;
      } catch {
        // Stay on the last mapped theme when live updates are unavailable.
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [preference]);

  const resolvedTheme: ThemeName = preference === "system" ? osTheme : preference;

  return { preference, setPreference, resolvedTheme };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const value = useTerminalConfig();
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used inside a <ConfigProvider>");
  }
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.hook.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/config.hook.ts apps/terminal/tests/unit/config.hook.test.tsx
git commit -m "feat(terminal): resolve theme preference with OS fallback"
```

---

### Task 3: Config panel

**Files:**
- Create: `apps/terminal/src/modules/config/config.component.tsx`
- Create: `apps/terminal/tests/unit/config.component.test.tsx`

**Interfaces:**
- Consumes: `useConfig()` (`preference`, `setPreference`, `resolvedTheme`). `resolvedTheme` is not used to pick the checked radio.
- Produces: `Config` component — `CONFIG` header, Appearance group, three radios.

- [ ] **Step 1: Write the failing panel tests**

Create `apps/terminal/tests/unit/config.component.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Config } from "../../src/modules/config/config.component";
import type { ConfigContextValue } from "../../src/modules/config/config.types";

const setPreference = vi.fn();

vi.mock("../../src/modules/config/config.hook", () => ({
  useConfig: (): ConfigContextValue => ({
    preference: "system",
    setPreference,
    resolvedTheme: "polar-night",
  }),
}));

describe("Config", () => {
  beforeEach(() => {
    setPreference.mockClear();
  });

  it("renders CONFIG, Appearance, and three theme radios", () => {
    render(<Config />);

    expect(screen.getByText("CONFIG")).toBeVisible();
    expect(screen.getByText("Appearance")).toBeVisible();
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Polar Night/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Snow Storm/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Match system/ })).toBeInTheDocument();
  });

  it("checks Match system when preference is system even if resolved theme is Polar Night", () => {
    render(<Config />);

    expect(screen.getByRole("radio", { name: /Match system/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /Polar Night/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls setPreference('snow-storm') when Snow Storm is clicked", async () => {
    const user = userEvent.setup();
    render(<Config />);

    await user.click(screen.getByRole("radio", { name: /Snow Storm/ }));
    expect(setPreference).toHaveBeenCalledTimes(1);
    expect(setPreference).toHaveBeenCalledWith("snow-storm");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.component.test.tsx`

Expected: FAIL — `config.component` module is not found.

- [ ] **Step 3: Implement the Config panel**

Create `apps/terminal/src/modules/config/config.component.tsx`:

```tsx
import { Button, Separator, cn } from "@gencore/ui-kit";
import { Check, type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { useConfig } from "./config.hook";
import type { ThemePreference } from "./config.types";

const THEME_OPTIONS: readonly {
  id: ThemePreference;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  { id: "polar-night", title: "Polar Night", subtitle: "Dark Nord palette", Icon: Moon },
  { id: "snow-storm", title: "Snow Storm", subtitle: "Light Nord palette", Icon: Sun },
  { id: "system", title: "Match system", subtitle: "Follow Windows light or dark", Icon: Monitor },
];

export function Config() {
  const { preference, setPreference } = useConfig();
  const radioRefs = React.useRef<Partial<Record<ThemePreference, HTMLButtonElement | null>>>(
    {},
  );

  function focusPreference(id: ThemePreference) {
    radioRefs.current[id]?.focus();
  }

  function onRadioKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: ThemePreference,
  ) {
    const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = THEME_OPTIONS.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = THEME_OPTIONS[nextIndex];
    if (next) {
      setPreference(next.id);
      focusPreference(next.id);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-7 select-none items-center border-b border-border px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          CONFIG
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </p>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="overflow-hidden rounded-sm border border-border bg-background"
        >
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = preference === option.id;
            const { Icon } = option;

            return (
              <React.Fragment key={option.id}>
                {index > 0 ? <Separator /> : null}
                <Button
                  ref={(node) => {
                    radioRefs.current[option.id] = node;
                  }}
                  type="button"
                  role="radio"
                  variant="ghost"
                  aria-checked={isSelected}
                  aria-label={`${option.title}, ${option.subtitle}`}
                  tabIndex={isSelected ? 0 : -1}
                  className={cn(
                    "group h-auto w-full justify-start gap-2 rounded-none px-2 py-1.5",
                    isSelected
                      ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => {
                    setPreference(option.id);
                  }}
                  onKeyDown={(event) => {
                    onRadioKeyDown(event, option.id);
                  }}
                >
                  <Icon aria-hidden="true" className="size-3 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                    <span className="text-xs font-medium">{option.title}</span>
                    <span
                      className={cn(
                        "text-[10px]",
                        isSelected
                          ? "text-accent-foreground"
                          : "text-muted-foreground group-hover:text-accent-foreground",
                      )}
                    >
                      {option.subtitle}
                    </span>
                  </span>
                  {isSelected ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
                </Button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/config.component.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config/config.component.tsx apps/terminal/tests/unit/config.component.test.tsx
git commit -m "feat(terminal): add Config appearance panel"
```

---

### Task 4: Side panel, App, and docs

**Files:**
- Modify: `apps/terminal/src/modules/side-panel/side-panel.types.ts`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Modify: `apps/terminal/tests/unit/app.component.test.tsx`
- Delete: `apps/terminal/src/modules/app/app.hook.ts`
- Delete: `apps/terminal/tests/unit/app.hook.test.tsx`
- Modify: `apps/terminal/AGENTS.md`
- Modify: `AGENTS.md`
- Modify: `.superpowers/docs/specs/2026-08-20-terminal-config-tab-design.md`

**Interfaces:**
- Consumes: `Config`, `ConfigProvider`, `useConfig`
- Produces: tab id `config`; App `ThemeProvider theme={resolvedTheme}`; `useOsTheme` removed from Terminal

- [ ] **Step 1: Write the failing side-panel and App tests**

In `apps/terminal/tests/unit/side-panel.test.tsx`:

1. Add this import after the ipc.fs mock import of `SidePanel`:

```ts
import { ConfigProvider } from "../../src/modules/config/config.hook";
```

2. Replace `getTabpanel` / `expectPanelHiddenState` / `renderSidePanel` with:

```ts
function getTabpanel(id: "files" | "assistant" | "config") {
  const panel = document.getElementById(`side-panel-${id}`);
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
}

function expectPanelHiddenState(id: "files" | "assistant" | "config", isHidden: boolean) {
  const panel = getTabpanel(id);
  if (isHidden) {
    expect(panel).toHaveAttribute("hidden");
  } else {
    expect(panel).not.toHaveAttribute("hidden");
  }
  expect(panel).not.toHaveClass("flex");
}

async function renderSidePanel() {
  const view = render(
    <ConfigProvider>
      <SidePanel />
    </ConfigProvider>,
  );
  expect(await screen.findByText("FILES")).toBeVisible();
  expect(await screen.findByRole("treeitem", { name: "C:" })).toBeVisible();
  return view;
}
```

3. In the default-panel test, replace the Tab 3 / settings assertions with:

```ts
    expect(screen.getByText("Tab 2")).not.toBeVisible();
    expect(screen.queryByText("Tab 3")).toBeNull();
    expectPanelHiddenState("files", false);
    expectPanelHiddenState("assistant", true);
    expectPanelHiddenState("config", true);
```

4. In the Assistant click test, replace settings/Tab 3 with:

```ts
    expect(screen.queryByText("Tab 3")).toBeNull();
    expectPanelHiddenState("assistant", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("config", true);
```

5. Replace the entire Settings / Tab 3 test with:

```ts
  it("shows CONFIG when the Config tab is clicked", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    await user.click(screen.getByRole("tab", { name: "Config" }));

    expect(screen.getByText("CONFIG")).toBeVisible();
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
    expect(screen.queryByText("Tab 3")).toBeNull();
    expect(screen.getByText("Tab 2")).not.toBeVisible();
    expectPanelHiddenState("config", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("assistant", true);
  });
```

6. Replace the tablist test so names are Files, Assistant, Config (not Settings):

```ts
  it("exposes a Side panel tablist with Files, Assistant, and Config tabs", async () => {
    await renderSidePanel();

    const tablist = screen.getByRole("tablist", { name: "Side panel" });
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveClass("h-6");
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Config" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Settings" })).toBeNull();

    for (const name of ["Files", "Assistant", "Config"] as const) {
      const icon = screen.getByRole("tab", { name }).querySelector("svg");
      expect(icon).toHaveClass("size-3");
    }

    const filesTab = screen.getByRole("tab", { name: "Files" });
    expect(filesTab).toHaveClass("text-accent-foreground", "before:bg-primary");
    expect(filesTab).not.toHaveClass("text-primary");

    expect(screen.getByRole("tab", { name: "Assistant" })).toHaveClass("text-muted-foreground");
  });
```

In `apps/terminal/tests/unit/app.component.test.tsx`, add this import:

```ts
import { CONFIG_STORAGE_KEY } from "../../src/modules/config/config.storage";
```

In `beforeEach`, add `localStorage.clear();` after `vi.clearAllMocks();`.

Add this test at the end of the `describe("App")` block (keep the existing OS light/subscribe tests — they still describe default `system` preference):

```ts
  it("applies Snow Storm from stored preference even when the OS window theme is dark", async () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ version: 1, theme: "snow-storm" }),
    );
    vi.mocked(getWindowTheme).mockResolvedValue("dark");

    render(<App />);

    await waitFor(() => {
      const wrapper = document.querySelector('[data-slot="theme-provider"]');
      expect(wrapper).toHaveAttribute("data-theme", "snow-storm");
      expect(wrapper).toHaveClass("theme-snow-storm", "light");
    });
    expect(subscribeWindowTheme).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel.test.tsx tests/unit/app.component.test.tsx`

Expected: FAIL — still a Settings tab / Tab 3; App still follows OS when storage says `snow-storm`.

- [ ] **Step 3: Wire SidePanel, App, and docs**

In `apps/terminal/src/modules/side-panel/side-panel.types.ts` replace the type with:

```ts
export type SidePanelTabId = "files" | "assistant" | "config";
```

In `apps/terminal/src/modules/side-panel/side-panel.component.tsx`:

1. Add `import { Config } from "../config/config.component";`
2. Change the tabs array to:

```ts
const TABS: readonly {
  id: SidePanelTabId;
  label: string;
  Icon: LucideIcon;
  placeholder?: string;
}[] = [
  { id: "files", label: "Files", Icon: Folder },
  { id: "assistant", label: "Assistant", Icon: Bot, placeholder: "Tab 2" },
  { id: "config", label: "Config", Icon: Settings },
];
```

3. Replace the tabpanel inner branch (`tab.id === "files" ? ...`) with:

```tsx
            {tab.id === "files" ? (
              <div className="flex h-full min-h-0 flex-col">
                <FileTree />
              </div>
            ) : tab.id === "config" ? (
              <Config />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">{tab.placeholder}</p>
              </div>
            )}
```

In `apps/terminal/src/modules/app/app.component.tsx` replace the `useOsTheme` import and usage with:

```tsx
import { ConfigProvider, useConfig } from "../config/config.hook";
```

Remove `import { useOsTheme } from "./app.hook";`.

Replace `export function App()` so the hook lives in an inner component under the provider:

```tsx
export function App() {
  return (
    <ConfigProvider>
      <AppShellTree />
    </ConfigProvider>
  );
}

function AppShellTree() {
  const { resolvedTheme } = useConfig();
  const [appInfo, setAppInfo] = React.useState<AppInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setAppInfo(info);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const version = appInfo?.version;

  return (
    <ThemeProvider theme={resolvedTheme}>
      <AppShell
        title={APP_TITLE}
        version={version}
        density="compact"
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onToggleMaximize={toggleMaximizeWindow}
        onVersionClick={openRepoInBrowser}
        titlebarContextMenu={
          <TitlebarContextMenu
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onToggleMaximize={toggleMaximizeWindow}
          />
        }
        contentContextMenu={<ContentContextMenu />}
        contentProps={{ centered: true }}
        sidebar={<SidePanel />}
      >
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-semibold text-lg">{APP_TITLE}</h1>
          {version ? (
            <p className="text-muted-foreground text-sm tabular-nums">v{version}</p>
          ) : null}
          {!version && error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!version && !error ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
```

Keep the existing `APP_TITLE` export and the other imports (`AppShell`, `ThemeProvider`, context menus, ipc, `SidePanel`, `app.theme.css`).

Delete `apps/terminal/src/modules/app/app.hook.ts` and `apps/terminal/tests/unit/app.hook.test.tsx`.

In `apps/terminal/AGENTS.md`, replace the “No theme picker” bullet with:

```md
- Config tab (left panel) lists Appearance: Match system, Polar Night, Snow Storm. Preference is `{ version: 1, theme }` in `localStorage` key `gencore.terminal.config`. `system` maps OS dark/null/failure → Polar Night, light → Snow Storm via `getWindowTheme` / `subscribeWindowTheme`. Explicit Polar Night or Snow Storm ignores the OS.
```

In root `AGENTS.md` Learned Workspace Facts, replace the left-panel bullet with:

```md
- The terminal left panel has Files, Assistant, and Config tabs; Assistant is a planned tab that should interact with the terminal, file tree, config, and the app.
```

In `.superpowers/docs/specs/2026-08-20-terminal-config-tab-design.md`, set `Status: approved`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel.test.tsx tests/unit/app.component.test.tsx tests/unit/config.storage.test.ts tests/unit/config.hook.test.tsx tests/unit/config.component.test.tsx`

Expected: PASS.

Then: `pnpm --filter @gencore/terminal typecheck`

Expected: exit 0.

Then: `pnpm --filter @gencore/terminal lint`

Expected: exit 0. If Biome wants import order, apply the lint and re-run — do not skip.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/side-panel/side-panel.types.ts apps/terminal/src/modules/side-panel/side-panel.component.tsx apps/terminal/tests/unit/side-panel.test.tsx apps/terminal/src/modules/app/app.component.tsx apps/terminal/tests/unit/app.component.test.tsx apps/terminal/AGENTS.md AGENTS.md .superpowers/docs/specs/2026-08-20-terminal-config-tab-design.md
git rm apps/terminal/src/modules/app/app.hook.ts apps/terminal/tests/unit/app.hook.test.tsx
git commit -m "feat(terminal): wire Config tab and persist appearance"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| `ThemePreference` + `{ version: 1, theme }` + `gencore.terminal.config` | 1 |
| Invalid blob → system in memory, no write; `localStorage` throw → in-memory | 1 |
| Hook: `preference` / `setPreference` / `resolvedTheme` | 2 |
| OS subscribe only on `system`; explicit ignores OS | 2 |
| `ThemeProvider` controlled from resolved theme | 4 |
| `CONFIG` header + Appearance group + three radios | 3 |
| Checked radio is preference, not resolved theme | 3 |
| Accent fill + check; hover fill without check | 3 |
| Tab rename Settings → Config, keep gear | 4 |
| Assistant stays Tab 2 | 4 |
| App Snow Storm from storage while OS dark | 4 |
| AGENTS.md updates | 4 |
| No Explorer / kit primitives / changeset / Isolation | all |

**Placeholders:** none.

**Type consistency:** `ThemePreference`, `TerminalConfigV1`, `ConfigContextValue`, `CONFIG_STORAGE_KEY`, `useConfig`, `ConfigProvider`, `useTerminalConfig`, `SidePanelTabId` `"config"` are named the same in every task.
