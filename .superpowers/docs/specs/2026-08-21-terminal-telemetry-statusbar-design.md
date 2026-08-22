# Terminal telemetry statusbar and side-panel toggle

Date: 2026-08-21
Status: approved
Packages: `@gencore/ui-kit`, `@gencore/terminal`, `gencore-core`

Supersedes [2026-08-20-terminal-telemetry-statusbar-design.md](./2026-08-20-terminal-telemetry-statusbar-design.md). That draft put the collector in `apps/terminal`, kept `pwsh · cols×rows`, stubbed GPU sampling, and persisted panel open state. This spec replaces those decisions.

## Problem

The Terminal bottom statusbar only shows the active tab `cwd` on the left and `pwsh · cols×rows` on the right. There is no live CPU, integrated GPU, dedicated GPU, or network usage. The left Files / Assistant / Config panel cannot be collapsed from the statusbar.

## Goals

- Add a far-left statusbar button that toggles the existing left panel, including while the terminal is focused, via `Ctrl+B` / `Cmd+B`.
- Sample local CPU, RAM, iGPU, dedicated GPU, and network on Windows and show compact chips on the 24px statusbar.
- Hovering a chip opens a rich, theme-aware Nord card with more detail.
- Keep the folder path. Drop shell name and cols×rows from the statusbar.

## Non-goals

- Explorer telemetry or Explorer panel toggle.
- Process manager, task killer, or any write/control of other processes.
- Remote host telemetry.
- Sparklines, charts, or a third GPU chip for Thunderbolt eGPU.
- Remembering panel open/closed across restarts.
- Showing version, errors, or a context menu on the statusbar.

## Approach

Add `get_system_telemetry` to `gencore-core` (same ACL family as `get_app_info`). Grant and allowlist it only in Terminal. Poll from a Terminal hook every 1,000ms. Render chips in `apps/terminal/src/modules/telemetry/`. Add a `rich` size to the ui-kit `Tooltip` so Polar Night and Snow Storm share one card chrome.

## Units

### 1. `gencore-core` telemetry collector and command

- **Files:**
  - `crates/gencore-core/src/modules/telemetry/telemetry_api.rs`
  - `crates/gencore-core/src/modules/telemetry/telemetry_collector.rs`
  - `crates/gencore-core/src/modules/telemetry/telemetry_error.rs`
  - `crates/gencore-core/src/modules/telemetry/telemetry_types.rs`
  - `crates/gencore-core/src/modules/telemetry/mod.rs`
  - `crates/gencore-core/build.rs` (add `get_system_telemetry` to `COMMANDS`)
  - `crates/gencore-core/src/lib.rs` (register command; manage collector state in plugin setup)
- **Does:** Holds a mutex-guarded sampler. Each invoke refreshes and returns one `SystemTelemetry` snapshot.
- **CPU / RAM / network:** `sysinfo` (latest stable, CPU + memory + network features). CPU: brand, overall percent, per-core percents, frequency MHz. Memory: used, total, percent. Network: bytes/sec rx and tx from totals delta, lifetime totals, name of the adapter with the most traffic since the last sample (or omitted if none).
- **GPU (Windows only):** DXGI adapter enum for name, dedicated VRAM, and kind. PDH `\GPU Engine(*)\Utilization Percentage` aggregated per adapter. Kind is `integrated` or `dedicated` (internal discrete or external/Thunderbolt treated as dedicated). At most one integrated and one dedicated adapter are returned. If several dedicated adapters exist, keep the one with the largest dedicated VRAM.
- **Partial success:** DXGI/PDH failure returns `gpus: []` and still returns CPU, memory, and network. Never invent a fake 0% GPU.
- **Errors:** Typed `TelemetryError` (`CollectionFailed`, `LockPoisoned`). Commands stay `async` and return `Result`. DTOs use `#[serde(deny_unknown_fields)]` and camelCase.

```text
SystemTelemetry { cpu, gpus[], network, memory }
GpuKind = integrated | dedicated
```

### 2. Isolation, capability, and Terminal IPC

- **Files:**
  - `apps/terminal/src/modules/ipc/ipc.telemetry.ts`
  - `apps/terminal/src-tauri/capabilities/main.json`
  - `apps/terminal/isolation/isolation.hook.js`
  - `apps/terminal/src/modules/ipc/ipc.types.ts` (re-export telemetry types)
- **Does:** Exports `getSystemTelemetry()` via `invoke("plugin:gencore-core|get_system_telemetry")` with empty args.
- **Grants:** `gencore-core:allow-get-system-telemetry` on `"windows": ["main"]` only. Explorer capabilities stay unchanged.
- **Isolation:** Allowlist `plugin:gencore-core|get_system_telemetry` and treat it as an empty-arg command. No new events.

### 3. Frontend hook and formatters

- **Files:**
  - `apps/terminal/src/modules/telemetry/telemetry.types.ts`
  - `apps/terminal/src/modules/telemetry/telemetry.format.ts`
  - `apps/terminal/src/modules/telemetry/telemetry.hook.ts`
- **Does:** `useSystemTelemetry()` fetches immediately, then every 1,000ms. Skips ticks while `document.visibilityState === "hidden"` and fetches once on becoming visible again.
- **Formatters:** `formatPercent` (rounded 0–100 with `%`), `formatBytesPerSec` (`B/s`, `KB/s`, `MB/s`), `formatMemoryBytes` (GB to one decimal), `formatFrequency` (GHz to one decimal when ≥ 1000 MHz, else MHz).
- **Failure:** First failure leaves `telemetry` null (chips omitted). Later failures keep the last good snapshot.

### 4. Statusbar chips and rich tooltips

- **Files:**
  - `packages/ui-kit/src/primitives/tooltip/tooltip.variants.ts` (`size: "rich"`)
  - `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx`
  - `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx`
  - `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx`
  - `apps/terminal/src/modules/telemetry/network-widget.component.tsx`
  - `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx`
- **Does:** Renders chips in `statusbarEnd`. One shared `TooltipProvider` at the bar. Kit `Button` / `Tooltip` only; no raw `<button>`. Chrome stays `select-none`.
- **Chip (style A):** `CPU` / `iGPU` / `dGPU` label, four-segment meter, tabular percent. Network is `↓ {rx} ↑ {tx}`. Download uses `text-primary`. Upload uses `text-nord-frost-9` in Polar Night and `text-nord-frost-10` in Snow Storm.
- **Meter color (semantic tokens only):** load `< 70` → `primary` (Frost); `70–84` → `warning` (Aurora 13); `≥ 85` → `destructive` (Aurora 11). Empty segments use `muted`.
- **Visibility:** Omit iGPU if no integrated adapter. Omit dGPU if no dedicated adapter. Omit the whole telemetry group when `telemetry` is null.
- **Rich tooltip (`size="rich"`, side top, 300ms delay):** Flat popover surface (`bg-popover`, hairline `border-border`, no shadow, no blur, no accent stripe). Width ~260px. Polar Night and Snow Storm both use popover tokens.
  - **CPU:** brand; `{n} cores · {freq}`; overall load; per-core mini meters (grid, cap display at 16 cores then `+N`); memory `used / total`.
  - **GPU:** name; `Integrated` or `Dedicated` outline badge; utilization; VRAM `used / total` when `memoryTotalBytes > 0`.
  - **Network:** adapter name or `Network activity`; download; upload; session `↓ total · ↑ total`.
- **ui-kit changeset:** patch for the `rich` tooltip size. Terminal is private; no Terminal changeset.

### 5. Side-panel toggle and statusbar layout

- **Files:**
  - `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx`
  - `apps/terminal/src/modules/side-panel/side-panel.component.tsx` (`open` prop)
  - `apps/terminal/src/modules/app/app.component.tsx`
  - `apps/terminal/src/modules/terminal/terminal.component.tsx` (xterm key filter)
- **Does:** Far-left ghost `icon-xs` button (`PanelLeft` when closed, `PanelLeftClose` when open). Tooltip: `Collapse side panel (Ctrl+B)` or `Expand side panel (Ctrl+B)`.
- **Layout:** `statusbarStart` = toggle + truncated `cwd`. `statusbarEnd` = telemetry chips only. No `pwsh · cols×rows`. Version stays in the titlebar.
- **Collapse:** Keep `SidePanel` mounted. When closed, width is 0, border and overflow hidden, `aria-hidden`. Active tab and resize width stay in component state for the session. Launch open. Do not persist open/closed.
- **Shortcut:** `Ctrl+B` / `Cmd+B` always toggles, including while xterm or Files/Config is focused. Window `keydown` calls `preventDefault`. xterm `attachCustomKeyEventHandler` returns `false` for that combo so the PTY does not receive backward-char. Do not toggle while `event.isComposing` is true.

## Data flow

```text
gencore-core TelemetryCollector
  sysinfo (CPU, RAM, net) + DXGI/PDH (GPU)
        |
        | invoke plugin:gencore-core|get_system_telemetry
        | every 1s, skip when document hidden
        v
useSystemTelemetry()
        |
        +--> statusbar chips (label + meter + %)
        +--> rich Tooltip cards (cores / VRAM / adapter)
```

## Testing

- **Rust (`crates/gencore-core/tests/`):** serialize `SystemTelemetry`; classify integrated vs dedicated; collector returns CPU/network when GPU probe fails (no panic).
- **Terminal (`apps/terminal/tests/unit/`):** IPC wrapper command string; formatters; hook interval and pause on `hidden`; chip labels/percents and meter threshold classes; tooltip copy; toggle click; `Ctrl+B` does not reach a mocked xterm handler.
- **ui-kit (`packages/ui-kit/tests/`):** `rich` tooltip variant classes (wider, padded, still `select-none`, no shadow).
- **Isolation:** existing hook tests gain the new empty-arg command.

## Release

- Changeset: `@gencore/ui-kit` patch (`rich` tooltip size).
- `@gencore/terminal` is private. `gencore-core` has no JS changeset.
- Do not bump major versions.

## Decisions

| Topic | Decision |
| --- | --- |
| Apps | Terminal only |
| Collector home | `gencore-core` command, Terminal grant only |
| Extra GPU | Dedicated (dGPU label); hide chip if missing |
| Existing statusbar text | Keep path; drop shell size |
| Chip style | Label + 4-segment meter + percent |
| Tooltip chrome | Flat popover `rich` size; no accent stripe |
| Load colors | `<70` primary, `70–84` warning, `≥85` destructive |
| Panel shortcut | `Ctrl+B` / `Cmd+B` always, including xterm |
| Panel persistence | Session only; start open; keep mounted when collapsed |
| Poll | 1,000ms; pause when hidden |
| First IPC failure | Hide chips; keep last good snapshot after that |
