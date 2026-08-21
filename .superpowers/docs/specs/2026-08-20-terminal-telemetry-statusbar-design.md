# Terminal Telemetry Statusbar and Side Panel Toggle

Date: 2026-08-20
Status: approved
Packages: `@gencore/terminal`

## Problem

The bottom statusbar in `@gencore/terminal` currently only displays static path text (`cwd`) on the left and terminal dimensions on the right (`shellName · cols×rows`). Users lack real-time visibility into local system hardware performance (CPU load, integrated GPU, discrete/external GPU usage, and network traffic), and there is no quick toggle button or keyboard shortcut in the statusbar to collapse and expand the left side panel.

## Goals

- **Side Panel Toggle Button**:
  - Add a dedicated toggle icon button on the far left of `statusbarStart` (`PanelLeftClose` / `PanelLeftOpen` icon).
  - Toggling expands/collapses the left side panel, preserving previously resized width and active tab (`Files`, `Assistant`, `Config`).
  - Add global keyboard shortcut `Ctrl+B` (and `Cmd+B`) to toggle side panel visibility.
  - Hover tooltip displays `Toggle Side Panel (Ctrl+B)`.
- **System Hardware Telemetry (CPU, iGPU, dGPU, Network)**:
  - Add a Rust telemetry engine to `apps/terminal/src-tauri` using `sysinfo` and Windows Performance Counters (PDH / DXGI) to sample CPU (overall and per-core), GPU utilization & VRAM (separately classifying integrated vs discrete/external GPUs), RAM usage, and Network download/upload rates.
  - Expose a typed, least-privilege IPC command `get_system_telemetry`.
  - Add a client-side hook `useSystemTelemetry()` with a 1,000ms polling interval that automatically suspends when the window is minimized or hidden (`document.visibilityState === "hidden"`) to conserve CPU and battery.
- **Statusbar Micro-Gauges & Rich Nord Tooltips**:
  - **CPU Widget**: Statusbar shows `CPU [▮▯▯▯] 14%`. Hover tooltip reveals processor model name, overall usage %, per-core mini progress bars grid, and memory consumption.
  - **GPU Widget(s)**: Dynamically renders separate meters for detected GPUs (e.g. `iGPU [▯▯▯▯] 4%`, `dGPU [▮▮▯▯] 38%`). Hover tooltip reveals GPU model name, GPU type badge (Integrated vs Discrete/External), 3D/Compute engine load %, and dedicated VRAM usage (`used / total`).
  - **Network Widget**: Statusbar shows `↓ 1.4 MB/s ↑ 240 KB/s`. Hover tooltip reveals active adapter name, current download/upload throughput, and session total downloaded/uploaded data.
  - All UI elements follow the Nord theme palette (`Polar Night` background, `Frost` accents for normal loads, `Aurora` for high-load warning thresholds >80%, crisp monospace tabular numerals).

## Non-goals

- Explorer app telemetry (Explorer is out of scope; terminal-only).
- Process manager / task killer (telemetry is read-only monitoring).
- Remote host telemetry (local machine metrics only).
- Non-standard telemetry graphs/charts outside of compact micro-gauges and sparklines.

## Approach

Implement a scoped Rust telemetry collector under `apps/terminal/src-tauri/src/modules/telemetry/` using `sysinfo` and Windows DXGI/PDH. Register the Tauri command `get_system_telemetry` with capability `terminal:allow-get-system-telemetry` on `"windows": ["main"]` and allowlist in `isolation.hook.js`. In the frontend, build modular widgets in `src/modules/telemetry/` and mount them alongside a persistent side panel toggle in `AppShell`'s `statusbarStart` and `statusbarEnd`.

## Units

### 1. Rust Telemetry Collector & API

- **Files**:
  - `apps/terminal/src-tauri/src/modules/telemetry/telemetry_types.rs`
  - `apps/terminal/src-tauri/src/modules/telemetry/telemetry_collector.rs`
  - `apps/terminal/src-tauri/src/modules/telemetry/telemetry_api.rs`
  - `apps/terminal/src-tauri/src/modules/telemetry/telemetry_error.rs`
- **Does**:
  - Maintains `TelemetryState` holding `sysinfo::System`, `sysinfo::Networks`, and Windows DXGI adapter query state.
  - Classifies GPUs into `integrated` vs `discrete` vs `external` via `DXGI_ADAPTER_DESC1` / vendor flags and dedicated video memory size.
  - Queries real-time GPU engine utilization using Windows Performance Data Helper (`\GPU Engine(*)\Utilization Percentage`).
  - Calculates per-second network transfer rates (rx/tx bytes diff).
  - Returns `SystemTelemetry` DTO:
    ```rust
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct SystemTelemetry {
        pub cpu: CpuTelemetry,
        pub gpus: Vec<GpuTelemetry>,
        pub network: NetworkTelemetry,
        pub memory: MemoryTelemetry,
    }
    ```
- **Error Handling**: Graceful fallback returning partial telemetry if GPU performance counters are restricted or inaccessible on a specific machine.

### 2. IPC & Security Allowlist

- **Files**:
  - `apps/terminal/src/modules/ipc/ipc.telemetry.ts`
  - `apps/terminal/src/modules/ipc/ipc.types.ts`
  - `apps/terminal/src-tauri/capabilities/main.json`
  - `apps/terminal/isolation/isolation.hook.js`
- **Does**:
  - Grants command permission `terminal:allow-get-system-telemetry` scoped to `main` window only.
  - Allows `plugin:terminal|get_system_telemetry` through the Isolation pattern hook.
  - Exports typed `getSystemTelemetry(): Promise<SystemTelemetry>` wrapper.

### 3. Frontend Telemetry Hook & Formatters

- **Files**:
  - `apps/terminal/src/modules/telemetry/telemetry.types.ts`
  - `apps/terminal/src/modules/telemetry/telemetry.format.ts`
  - `apps/terminal/src/modules/telemetry/telemetry.hook.ts`
- **Does**:
  - `useSystemTelemetry()` polls every 1,000ms.
  - Automatically suspends timer when `document.visibilityState === "hidden"` or window is minimized, resuming with an immediate refresh on visibility restore.
  - Pure formatting helpers for `formatBytesPerSec`, `formatPercent`, `formatFrequency`, and `formatMemory`.

### 4. Statusbar Telemetry UI Widgets & Nord Tooltips

- **Files**:
  - `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx` (Micro-bar component `[▮▯▯▯]`)
  - `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx`
  - `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx`
  - `apps/terminal/src/modules/telemetry/network-widget.component.tsx`
  - `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx`
- **Does**:
  - Renders compact micro-bars + percentage values in `statusbarEnd`.
  - Tooltips render structured Nord cards with tabular monospace metrics, frosted borders, and core/VRAM breakdowns.
  - Visual load thresholds: Frost (`#88C0D0`) for normal load, Aurora Yellow (`#EBCB8B`) for moderate (>70%), Aurora Red (`#BF616A`) for high (>85%).

### 5. Side Panel Toggle & Layout Integration

- **Files**:
  - `apps/terminal/src/modules/side-panel/side-panel.hook.ts`
  - `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx`
  - `apps/terminal/src/modules/app/app.component.tsx`
- **Does**:
  - Places `<SidePanelToggle />` at the far left of `statusbarStart`.
  - Manages `isSidePanelOpen` state with persistence in `localStorage`.
  - Listens for global `Ctrl+B` / `Cmd+B` shortcut to toggle panel visibility.
  - Renders `<SidePanel />` conditionally in `AppShell.sidebar`, retaining the user's resized width and selected tab when reopened.

## Data Flow

```text
               ┌────────────────────────────────────────────────────────┐
               │              Rust Telemetry Collector                  │
               │   (sysinfo + Windows PDH GPU Engine + DXGI Adapters)   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           │ invoke("get_system_telemetry")
                                           │ (1,000ms tick / visibility-aware)
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           useSystemTelemetry() React Hook              │
               │   (Auto-pauses when hidden / minimized to save power)  │
               └─────────────┬────────────────────────────┬─────────────┘
                             │                            │
                             ▼                            ▼
              ┌───────────────────────────┐ ┌───────────────────────────┐
              │   Statusbar Micro-Gauges  │ │    Nord Rich Tooltips     │
              │  CPU · iGPU · dGPU · Net  │ │ Full details & core grids │
              └───────────────────────────┘ └───────────────────────────┘
```

## Testing Plan

- **Rust Tests (`apps/terminal/src-tauri/tests/`)**:
  - Unit tests verifying serialization and deserialization of `SystemTelemetry`.
  - Unit tests verifying GPU classification logic (integrated vs discrete/external).
  - Resiliency tests ensuring missing PDH counters don't panic or fail the telemetry snapshot.
- **Frontend Tests (`apps/terminal/tests/modules/telemetry/` & `side-panel/`)**:
  - `telemetry.format.test.ts` — Tests byte, percentage, and memory formatters.
  - `telemetry.hook.test.tsx` — Tests 1s polling interval, immediate fetch, pause on `visibilitychange` (`hidden`), and timer teardown.
  - `cpu-widget.test.tsx`, `gpu-widget.test.tsx`, `network-widget.test.tsx` — Tests micro-bar threshold coloring and tooltip contents.
  - `side-panel-toggle.test.tsx` — Tests toggle button click, `Ctrl+B` keyboard shortcut, and width/tab state retention.

## Release & Versioning

`apps/terminal` is private. No Changeset required. No ui-kit version bump.

## Decisions Summary

| Topic | Decision |
| --- | --- |
| Target Scope | `apps/terminal` only |
| Telemetry Provider | `sysinfo` (CPU, RAM, Net) + Windows PDH & DXGI (iGPU, dGPU) |
| Polling Interval | 1,000ms with pause on background/minimized |
| Visual Statusbar Style | Micro-graphs / Mini Bar Gauges + percentages |
| Hover Tooltips | Multi-column Nord cards with per-core bars, VRAM, and adapter info |
| Sidebar Toggle | Far left button in `statusbarStart` with `PanelLeft` icon & `Ctrl+B` shortcut |
| Panel State | Persisted in `localStorage`, retaining width and tab selection |
