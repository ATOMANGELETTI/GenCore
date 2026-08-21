# Terminal Config tab (appearance)

Date: 2026-08-20
Status: draft
Packages: `@gencore/terminal`

## Problem

The Terminal side-panel Settings tab is a placeholder (`Tab 3`). Theme follows the OS with no in-app control and no persistence. Users need a compact, macOS-style Config view that lists real settings and applies Polar Night / Snow Storm immediately.

## Goals

- Rename the bottom tab from Settings to **Config** (`id: "config"`, tooltip and `aria-label` Config). Keep the Lucide gear icon.
- Replace the placeholder panel with a Config view: `CONFIG` header (same chrome as `FILES`) and one **Appearance** grouped list.
- Three theme rows: Polar Night, Snow Storm, Match system. Selecting a row applies the theme immediately and remembers the preference in WebView `localStorage`.
- Selected row: `bg-accent text-accent-foreground` plus a check. Unselected hover: the same accent fill and Frost text, no check.
- Default preference is Match system (today’s OS-follow behavior). Explorer is unchanged.

## Non-goals

Explorer theme picker. Frost vs Aurora accent picker. AppShell density. Persisting side-panel width. Tauri store plugin or new capabilities. Settings search. Assistant tab content. New ui-kit primitives (`RadioGroup`, `Switch`, preferences group). Rewriting invalid storage until the user changes a value. Showing the resolved OS theme as the stored value.

## Approach

A Terminal-owned `config` module holds a versioned JSON blob, resolves `system | polar-night | snow-storm` to a `ThemeName`, and renders the panel from existing Button, Separator, and Lucide icons. `App` passes the resolved name into `ThemeProvider` as it does today. No Isolation or capability changes.

## Units

### Config schema and storage

- **Does:** Defines `ThemePreference = "system" | "polar-night" | "snow-storm"` and `TerminalConfigV1 = { version: 1, theme: ThemePreference }`. Reads and writes `localStorage` key `gencore.terminal.config`.
- **Use:** Config hook only.
- **Depends on:** WebView `localStorage`. No IPC.

Missing key, empty value, JSON parse failure, `version !== 1`, or unknown `theme` → treat as `{ version: 1, theme: "system" }` in memory. Do not write back until the user selects a row. If `getItem` / `setItem` throws, keep the in-memory preference and skip persistence.

### Config hook

- **Does:** Loads the blob on mount. Exposes `preference`, `setPreference(next)`, and `resolvedTheme: ThemeName`. `setPreference` updates state, writes storage (best-effort), and is the only writer.
- **Use:** `App` for `ThemeProvider`; Config panel for the selected row.
- **Depends on:** storage helper; existing window theme IPC (`getWindowTheme`, `subscribeWindowTheme`) only while `preference === "system"`.

Resolution: `polar-night` / `snow-storm` map 1:1 and ignore OS changes. `system` maps OS `light` → `snow-storm`, otherwise `polar-night` (including `null`). If theme IPC fails while on `system`, resolved theme is `polar-night` (same as today’s `useOsTheme`). Unsubscribe the OS listener when preference is not `system`.

`App` stops using `useOsTheme` directly; that mapping lives in this hook. `ThemeProvider` stays controlled: `theme={resolvedTheme}`.

### Config panel

- **Does:** Renders the Config tab body.
- **Use:** Side panel when the Config tab is selected.
- **Depends on:** `@gencore/ui-kit` Button, Separator, `cn`; Lucide `Moon`, `Sun`, `Monitor`, `Check`; config hook.

Chrome:

- Header row `h-7`, `border-b border-border`, `px-2`, label `CONFIG` with the same classes as `FILES` (`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`). No trailing actions.
- Scrollable body (`min-h-0 flex-1 overflow-y-auto`) with compact padding (`p-2`).
- Section label `Appearance` (`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`).
- Inset group: `rounded-sm` (6px), `border border-border`, `bg-background`, overflow clipped. Hairline `Separator` between rows.

Rows: a `role="radiogroup"` labelled “Theme” with three `role="radio"` ghost Buttons, full width, `rounded-none`, compact two-line content:

| Preference | Icon | Title | Subtitle |
| --- | --- | --- | --- |
| `polar-night` | `Moon` | Polar Night | Dark Nord palette |
| `snow-storm` | `Sun` | Snow Storm | Light Nord palette |
| `system` | `Monitor` | Match system | Follow Windows light or dark |

Icons and the selected `Check` inherit `currentColor`, 12px (`size-3`). Selected: `bg-accent text-accent-foreground` and a trailing check. Hover (including selected): `hover:bg-accent hover:text-accent-foreground`. Unselected title `text-foreground`, subtitle `text-muted-foreground`; selected subtitle stays `text-accent-foreground`. Focus uses the existing Button ring. Arrow keys / Home / End move within the radiogroup; Space / Enter select (native radio / Button click).

The checked radio is the **preference**, not the resolved `ThemeName`. Match system stays checked while the OS flips dark/light. Polar Night / Snow Storm rows are checked only when that preference is stored.

Tokens only: `background`, `card` (panel already `bg-card`), `border`, `foreground`, `muted-foreground`, `accent`, `accent-foreground`, `ring`. No new hex.

### Side panel wiring

- **Does:** `SidePanelTabId` becomes `"files" | "assistant" | "config"`. Config tab renders `<Config />` instead of `Tab 3`. Assistant stays `Tab 2`.
- **Use:** Existing side-panel tablist.
- **Depends on:** Config panel. Tab strip height, selected-tab `before:bg-primary`, and `text-accent-foreground` on the selected tab are unchanged.

Update root `AGENTS.md` so the left panel is Files, Assistant, and Config (Assistant remains planned). Terminal `AGENTS.md` currently says there is no theme picker — replace that with Config appearance (`system` / Polar Night / Snow Storm) persisted in `localStorage`.

## Data flow

```text
localStorage gencore.terminal.config
        │
        ▼
  load TerminalConfigV1
        │
        ▼
  preference: system | polar-night | snow-storm
        │
        ├── system → window theme IPC → ThemeName
        └── explicit → ThemeName
        │
        ▼
  ThemeProvider theme={resolvedTheme}
        │
        ▼
  document + wrapper classes
  theme-polar-night dark | theme-snow-storm light
```

User click → `setPreference` → in-memory state + `setItem` → `resolvedTheme` updates → CSS variables swap. Stored value is the preference, never the resolved OS theme.

## Error handling

| Failure | Behavior |
| --- | --- |
| Missing / invalid blob | In-memory Match system; no write |
| `localStorage` throws | In-memory only; UI still works |
| OS theme IPC fails on `system` | Resolved Polar Night |
| OS live updates unavailable | Stay on last resolved mapping |

No user-visible error banner for storage or theme IPC.

## Testing

- Storage: default blob; reject unknown theme / wrong version / bad JSON without writing; `setItem` called on a valid user change.
- Hook: `system` follows a mocked OS light/dark; explicit `snow-storm` stays Snow Storm when the mocked OS is dark; switching away from `system` unsubscribes.
- Config panel: three radios; with preference `system`, Match system is checked even if resolved theme is Polar Night; clicking Snow Storm calls `setPreference("snow-storm")` and moves the check to that row.
- Side panel: tab named Config, not Settings; Config panel shows `CONFIG`; `Tab 3` is gone.
- App: `ThemeProvider` wrapper has `theme-snow-storm light` when preference is `snow-storm`.

## Release

Terminal is private. No changeset. No ui-kit version bump.

## Decisions

| Item | Choice |
| --- | --- |
| First settings | Appearance only |
| Persistence | `localStorage` key `gencore.terminal.config` |
| Schema | `{ version: 1, theme }` |
| Default | `theme: "system"` |
| Tab | Rename Settings → Config; keep gear icon |
| Chrome | `CONFIG` header like `FILES`; Appearance inset group |
| Selected row | Accent fill + Frost text + check |
| Hover | Accent fill + Frost text, no check |
| Icons | Moon / Sun / Monitor, `currentColor` |
| Kit primitives | None new; Button + Separator |
| Explorer | Out of scope |
