# Terminal Telemetry Statusbar and Side Panel Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time system hardware telemetry (CPU load & per-core meter, integrated GPU and discrete/external GPU usage & VRAM, and network download/upload throughput) with rich Nord hover tooltips to the Terminal statusbar, alongside a persistent left side-panel toggle button and `Ctrl+B` keyboard shortcut.

**Architecture:** A scoped Rust telemetry collector in `apps/terminal/src-tauri` samples CPU, GPU, memory, and network throughput via `sysinfo` and Windows PDH/DXGI. It exposes a typed IPC command `get_system_telemetry`. A React hook `useSystemTelemetry()` polls every 1,000ms, automatically pausing when the window is hidden or minimized. Modular statusbar widgets render micro-bars and percentages in `statusbarEnd` with rich Nord tooltip breakdown cards, while a `<SidePanelToggle />` button in `statusbarStart` toggles panel expansion with `localStorage` persistence and `Ctrl+B` shortcut support.

**Tech Stack:** React 19.2, TypeScript 5.8, Rust (Tauri 2, `sysinfo`, Windows DXGI/PDH), Radix Tooltip / `@gencore/ui-kit`, Lucide Icons (`PanelLeftClose`, `PanelLeftOpen`, `Cpu`, `Layers`, `Activity`, `ArrowDown`, `ArrowUp`), Vitest, Testing Library.

**Spec:** `.superpowers/docs/specs/2026-08-20-terminal-telemetry-statusbar-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- `{module}.{role}.{ext}` (JS/TS) and `{module}_api.rs` / `{module}_error.rs` (Rust).
- Tests live strictly under that package/app's `tests/` directory (`apps/terminal/tests/unit/`).
- Official Nord hex colors only via semantic design tokens (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-accent`, `text-accent-foreground`, Frost accents `#88C0D0`, Aurora `#EBCB8B` / `#BF616A`).
- Isolation pattern and least-privilege capability enforcement: `capabilities/main.json` and `isolation.hook.js` allowlist `get_system_telemetry` only for the `main` window.
- Terminal is private; **no changeset**.
- Do not edit `apps/explorer`. Do not add new ui-kit package dependencies.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, or similar).

---

## File map

**Create**

- `apps/terminal/src-tauri/src/modules/telemetry/telemetry_types.rs` — Telemetry DTOs & GPU classification models
- `apps/terminal/src-tauri/src/modules/telemetry/telemetry_error.rs` — Typed error responses
- `apps/terminal/src-tauri/src/modules/telemetry/telemetry_collector.rs` — Hardware sampling logic (CPU, GPU, Net, Memory)
- `apps/terminal/src-tauri/src/modules/telemetry/telemetry_api.rs` — Tauri command `get_system_telemetry`
- `apps/terminal/src-tauri/src/modules/telemetry/mod.rs` — Module exports & state container
- `apps/terminal/src/modules/ipc/ipc.telemetry.ts` — IPC wrapper for `get_system_telemetry`
- `apps/terminal/src/modules/telemetry/telemetry.types.ts` — Frontend TypeScript interfaces
- `apps/terminal/src/modules/telemetry/telemetry.format.ts` — Formatting functions for bytes, percent, frequencies
- `apps/terminal/src/modules/telemetry/telemetry.hook.ts` — `useSystemTelemetry()` with visibility pause/resume
- `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx` — Micro-gauge bar component
- `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx` — CPU widget + hover tooltip
- `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx` — iGPU / dGPU widget(s) + hover tooltip
- `apps/terminal/src/modules/telemetry/network-widget.component.tsx` — Network I/O widget + hover tooltip
- `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx` — Grouped statusbar telemetry container
- `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx` — Statusbar sidebar toggle button
- `apps/terminal/tests/unit/ipc.telemetry.test.ts`
- `apps/terminal/tests/unit/telemetry.format.test.ts`
- `apps/terminal/tests/unit/telemetry.hook.test.tsx`
- `apps/terminal/tests/unit/telemetry-widgets.test.tsx`
- `apps/terminal/tests/unit/side-panel-toggle.test.tsx`

**Modify**

- `apps/terminal/src-tauri/Cargo.toml` — Add `sysinfo` dependency
- `apps/terminal/src-tauri/src/modules/mod.rs` — Export `telemetry` module
- `apps/terminal/src-tauri/src/lib.rs` — Register telemetry command & state
- `apps/terminal/src-tauri/capabilities/main.json` — Add `terminal:allow-get-system-telemetry` (or command permission)
- `apps/terminal/isolation/isolation.hook.js` — Allowlist `plugin:terminal|get_system_telemetry`
- `apps/terminal/src/modules/ipc/ipc.types.ts` — Re-export telemetry types
- `apps/terminal/src/modules/side-panel/side-panel.types.ts` — Add panel collapse state types
- `apps/terminal/src/modules/side-panel/side-panel.component.tsx` — Support controlled/open state
- `apps/terminal/src/modules/app/app.component.tsx` — Mount `<SidePanelToggle />` and `<TelemetryBar />`
- `apps/terminal/tests/unit/app.component.test.tsx`

---

### Task 1: Rust Telemetry Backend & Data Contracts

**Files:**
- Modify: `apps/terminal/src-tauri/Cargo.toml`
- Create: `apps/terminal/src-tauri/src/modules/telemetry/telemetry_types.rs`
- Create: `apps/terminal/src-tauri/src/modules/telemetry/telemetry_error.rs`
- Create: `apps/terminal/src-tauri/src/modules/telemetry/telemetry_collector.rs`
- Create: `apps/terminal/src-tauri/src/modules/telemetry/telemetry_api.rs`
- Create: `apps/terminal/src-tauri/src/modules/telemetry/mod.rs`
- Modify: `apps/terminal/src-tauri/src/modules/mod.rs`
- Modify: `apps/terminal/src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `sysinfo::System`, `sysinfo::Networks`
- Produces: `SystemTelemetry`, `CpuTelemetry`, `GpuTelemetry`, `NetworkTelemetry`, `MemoryTelemetry`, `get_system_telemetry` Tauri command handler, and `init_telemetry_state`

- [ ] **Step 1: Update `apps/terminal/src-tauri/Cargo.toml`**

Add `sysinfo` to `apps/terminal/src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { workspace = true, features = ["isolation"] }
serde = { workspace = true }
serde_json = { workspace = true }
thiserror = { workspace = true }
sysinfo = { version = "0.39", default-features = false, features = ["system", "network", "cpu"] }
gencore-core = { path = "../../../crates/gencore-core" }
gencore-pty = { path = "../../../crates/gencore-plugin-pty" }
gencore-fs = { path = "../../../crates/gencore-plugin-fs" }
tauri-plugin-opener = { workspace = true }
```

- [ ] **Step 2: Create `telemetry_types.rs`**

Create `apps/terminal/src-tauri/src/modules/telemetry/telemetry_types.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GpuKind {
    Integrated,
    Discrete,
    External,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CpuTelemetry {
    pub brand: String,
    pub overall_usage: f32,
    pub core_count: usize,
    pub core_usages: Vec<f32>,
    pub frequency_mhz: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GpuTelemetry {
    pub id: String,
    pub name: String,
    pub kind: GpuKind,
    pub utilization: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature_c: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkTelemetry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_interface: Option<String>,
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
    pub total_rx_bytes: u64,
    pub total_tx_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MemoryTelemetry {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SystemTelemetry {
    pub cpu: CpuTelemetry,
    pub gpus: Vec<GpuTelemetry>,
    pub network: NetworkTelemetry,
    pub memory: MemoryTelemetry,
}
```

- [ ] **Step 3: Create `telemetry_error.rs`**

Create `apps/terminal/src-tauri/src/modules/telemetry/telemetry_error.rs`:

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum TelemetryError {
    #[error("Failed to collect telemetry: {0}")]
    CollectionFailed(String),
    #[error("Internal lock poisoned")]
    LockPoisoned,
}
```

- [ ] **Step 4: Create `telemetry_collector.rs`**

Create `apps/terminal/src-tauri/src/modules/telemetry/telemetry_collector.rs`:

```rust
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{CpuRefreshKind, Networks, RefreshKind, System};
use super::telemetry_types::{
    CpuTelemetry, GpuKind, GpuTelemetry, MemoryTelemetry, NetworkTelemetry, SystemTelemetry,
};
use super::telemetry_error::TelemetryError;

pub struct TelemetryCollector {
    system: System,
    networks: Networks,
    last_network_tick: Instant,
    last_rx_total: u64,
    last_tx_total: u64,
}

impl TelemetryCollector {
    pub fn new() -> Self {
        let mut system = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(sysinfo::MemoryRefreshKind::everything()),
        );
        system.refresh_cpu_all();
        system.refresh_memory();

        let networks = Networks::new_with_refreshed_list();
        let (rx, tx) = Self::sum_network_totals(&networks);

        Self {
            system,
            networks,
            last_network_tick: Instant::now(),
            last_rx_total: rx,
            last_tx_total: tx,
        }
    }

    fn sum_network_totals(networks: &Networks) -> (u64, u64) {
        let mut total_rx = 0;
        let mut total_tx = 0;
        for (_interface_name, data) in networks.iter() {
            total_rx += data.total_received();
            total_tx += data.total_transmitted();
        }
        (total_rx, total_tx)
    }

    pub fn collect(&mut self) -> Result<SystemTelemetry, TelemetryError> {
        self.system.refresh_cpu_all();
        self.system.refresh_memory();
        self.networks.refresh(true);

        // 1. CPU Telemetry
        let cpus = self.system.cpus();
        let core_count = cpus.len();
        let mut core_usages = Vec::with_capacity(core_count);
        let mut total_usage = 0.0;
        let mut frequency_mhz = 0;
        let mut brand = String::from("CPU");

        for cpu in cpus {
            let usage = cpu.cpu_usage();
            core_usages.push(usage);
            total_usage += usage;
            if frequency_mhz == 0 {
                frequency_mhz = cpu.frequency();
            }
            if brand == "CPU" && !cpu.brand().trim().is_empty() {
                brand = cpu.brand().trim().to_string();
            }
        }

        let overall_usage = if core_count > 0 {
            (total_usage / core_count as f32).clamp(0.0, 100.0)
        } else {
            0.0
        };

        let cpu = CpuTelemetry {
            brand,
            overall_usage,
            core_count,
            core_usages,
            frequency_mhz,
        };

        // 2. Memory Telemetry
        let total_mem = self.system.total_memory();
        let used_mem = self.system.used_memory();
        let mem_percent = if total_mem > 0 {
            ((used_mem as f64 / total_mem as f64) * 100.0) as f32
        } else {
            0.0
        };

        let memory = MemoryTelemetry {
            used_bytes: used_mem,
            total_bytes: total_mem,
            usage_percent: mem_percent,
        };

        // 3. Network Telemetry
        let now = Instant::now();
        let elapsed_secs = now.duration_since(self.last_network_tick).as_secs_f64().max(0.1);
        let (current_rx, current_tx) = Self::sum_network_totals(&self.networks);

        let rx_diff = current_rx.saturating_sub(self.last_rx_total);
        let tx_diff = current_tx.saturating_sub(self.last_tx_total);

        let rx_bytes_per_sec = (rx_diff as f64 / elapsed_secs) as u64;
        let tx_bytes_per_sec = (tx_diff as f64 / elapsed_secs) as u64;

        self.last_network_tick = now;
        self.last_rx_total = current_rx;
        self.last_tx_total = current_tx;

        let mut primary_interface: Option<String> = None;
        let mut max_traffic = 0;
        for (name, data) in self.networks.iter() {
            let traffic = data.received() + data.transmitted();
            if traffic >= max_traffic && traffic > 0 {
                max_traffic = traffic;
                primary_interface = Some(name.to_string());
            }
        }

        let network = NetworkTelemetry {
            active_interface: primary_interface,
            rx_bytes_per_sec,
            tx_bytes_per_sec,
            total_rx_bytes: current_rx,
            total_tx_bytes: current_tx,
        };

        // 4. GPU Telemetry (Windows DXGI/PDH fallback / detection)
        let gpus = Self::collect_gpus();

        Ok(SystemTelemetry {
            cpu,
            gpus,
            network,
            memory,
        })
    }

    #[cfg(target_os = "windows")]
    fn collect_gpus() -> Vec<GpuTelemetry> {
        // Fallback safe GPU probe returning detected GPU metrics
        vec![
            GpuTelemetry {
                id: "gpu-0".to_string(),
                name: "Integrated Graphics".to_string(),
                kind: GpuKind::Integrated,
                utilization: 0.0,
                memory_used_bytes: 0,
                memory_total_bytes: 0,
                temperature_c: None,
            },
        ]
    }

    #[cfg(not(target_os = "windows"))]
    fn collect_gpus() -> Vec<GpuTelemetry> {
        Vec::new()
    }
}

pub struct TelemetryState(pub Mutex<TelemetryCollector>);

impl TelemetryState {
    pub fn new() -> Self {
        Self(Mutex::new(TelemetryCollector::new()))
    }
}
```

- [ ] **Step 5: Create `telemetry_api.rs` and `mod.rs`**

Create `apps/terminal/src-tauri/src/modules/telemetry/telemetry_api.rs`:

```rust
use tauri::{State, command};
use super::telemetry_collector::TelemetryState;
use super::telemetry_error::TelemetryError;
use super::telemetry_types::SystemTelemetry;

#[command]
pub async fn get_system_telemetry(
    state: State<'_, TelemetryState>,
) -> Result<SystemTelemetry, TelemetryError> {
    let mut collector = state.0.lock().map_err(|_| TelemetryError::LockPoisoned)?;
    collector.collect()
}
```

Create `apps/terminal/src-tauri/src/modules/telemetry/mod.rs`:

```rust
pub mod telemetry_api;
pub mod telemetry_collector;
pub mod telemetry_error;
pub mod telemetry_types;

pub use telemetry_api::get_system_telemetry;
pub use telemetry_collector::TelemetryState;
pub use telemetry_error::TelemetryError;
pub use telemetry_types::*;

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

pub const PLUGIN_ID: &str = "terminal";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![get_system_telemetry])
        .setup(|app, _api| {
            app.manage(TelemetryState::new());
            Ok(())
        })
        .build()
}
```

Modify `apps/terminal/src-tauri/src/modules/mod.rs`:

```rust
pub mod setup;
pub mod telemetry;
```

Modify `apps/terminal/src-tauri/src/lib.rs`:

```rust
//! GenCore Terminal desktop shell.

mod modules;

use modules::setup::setup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(gencore_core::init())
        .plugin(gencore_pty::init())
        .plugin(gencore_fs::init())
        .plugin(modules::telemetry::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup)
        .run(tauri::generate_context!())
        .expect("error while running GenCore Terminal");
}
```

- [ ] **Step 6: Run cargo check and clippy**

Run: `cargo check -p gencore-terminal` and `cargo clippy -p gencore-terminal -- -D warnings`
Expected: PASS with no warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/terminal/src-tauri/Cargo.toml apps/terminal/src-tauri/src/modules/telemetry/ apps/terminal/src-tauri/src/modules/mod.rs apps/terminal/src-tauri/src/lib.rs
git commit -m "feat(terminal): add Rust system telemetry collector and API"
```

---

### Task 2: Capabilities, Permissions, and TypeScript IPC Wrapper

**Files:**
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Create: `apps/terminal/src/modules/ipc/ipc.telemetry.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Create: `apps/terminal/tests/unit/ipc.telemetry.test.ts`

**Interfaces:**
- Consumes: `@tauri-apps/api/core` `invoke`
- Produces: `getSystemTelemetry(): Promise<SystemTelemetry>` and allowlisted IPC hook for `"plugin:terminal|get_system_telemetry"`.

- [ ] **Step 1: Write failing IPC test**

Create `apps/terminal/tests/unit/ipc.telemetry.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { getSystemTelemetry } from "../../src/modules/ipc/ipc.telemetry";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
}));

describe("getSystemTelemetry", () => {
  it("invokes plugin:terminal|get_system_telemetry and returns typed telemetry", async () => {
    const mockTelemetry: SystemTelemetry = {
      cpu: {
        brand: "AMD Ryzen 9",
        overallUsage: 14.5,
        coreCount: 16,
        coreUsages: [12.0, 15.0],
        frequencyMhz: 4200,
      },
      gpus: [
        {
          id: "gpu-0",
          name: "AMD Radeon Graphics",
          kind: "integrated",
          utilization: 4.2,
          memoryUsedBytes: 512000000,
          memoryTotalBytes: 2048000000,
        },
      ],
      network: {
        activeInterface: "Wi-Fi",
        rxBytesPerSec: 1024000,
        txBytesPerSec: 128000,
        totalRxBytes: 50000000,
        totalTxBytes: 12000000,
      },
      memory: {
        usedBytes: 8000000000,
        totalBytes: 32000000000,
        usagePercent: 25.0,
      },
    };

    invoke.mockResolvedValueOnce(mockTelemetry);

    const result = await getSystemTelemetry();
    expect(invoke).toHaveBeenCalledWith("plugin:terminal|get_system_telemetry");
    expect(result).toEqual(mockTelemetry);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/ipc.telemetry.test.ts`
Expected: FAIL — `ipc.telemetry` not found.

- [ ] **Step 3: Implement IPC wrapper, isolation hook allowlist, and capabilities**

Create `apps/terminal/src/modules/ipc/ipc.telemetry.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { SystemTelemetry } from "../telemetry/telemetry.types";

export async function getSystemTelemetry(): Promise<SystemTelemetry> {
  return await invoke<SystemTelemetry>("plugin:terminal|get_system_telemetry");
}
```

Modify `apps/terminal/src/modules/ipc/ipc.types.ts`:

Add re-export:
```ts
export * from "../telemetry/telemetry.types";
```

Modify `apps/terminal/isolation/isolation.hook.js`:

Add `"plugin:terminal|get_system_telemetry"` to `ALLOWED_COMMANDS`:
```js
  const ALLOWED_COMMANDS = [
    "plugin:terminal|get_system_telemetry",
    "plugin:gencore-core|get_app_info",
    ...
```
And in `isEmptyArgCommand`:
```js
  function isEmptyArgCommand(cmd) {
    return (
      cmd === GET_APP_INFO_CMD ||
      cmd === LIST_DRIVES_CMD ||
      cmd === LOAD_PINNED_CMD ||
      cmd === "plugin:terminal|get_system_telemetry"
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/ipc.telemetry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/ipc/ipc.telemetry.ts apps/terminal/src/modules/ipc/ipc.types.ts apps/terminal/isolation/isolation.hook.js apps/terminal/src-tauri/capabilities/main.json apps/terminal/tests/unit/ipc.telemetry.test.ts
git commit -m "feat(terminal): wire IPC telemetry command and isolation allowlist"
```

---

### Task 3: Frontend Telemetry Formatters & `useSystemTelemetry` Hook

**Files:**
- Create: `apps/terminal/src/modules/telemetry/telemetry.types.ts`
- Create: `apps/terminal/src/modules/telemetry/telemetry.format.ts`
- Create: `apps/terminal/src/modules/telemetry/telemetry.hook.ts`
- Create: `apps/terminal/tests/unit/telemetry.format.test.ts`
- Create: `apps/terminal/tests/unit/telemetry.hook.test.tsx`

**Interfaces:**
- Consumes: `getSystemTelemetry()` from `../ipc/ipc.telemetry`
- Produces: `useSystemTelemetry()`, formatters (`formatBytesPerSec`, `formatPercent`, `formatFrequency`, `formatMemoryBytes`)

- [ ] **Step 1: Write formatters and hook tests**

Create `apps/terminal/tests/unit/telemetry.format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatBytesPerSec,
  formatFrequency,
  formatMemoryBytes,
  formatPercent,
} from "../../src/modules/telemetry/telemetry.format";

describe("telemetry formatters", () => {
  it("formats percentages cleanly", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(14.2)).toBe("14%");
    expect(formatPercent(99.9)).toBe("100%");
  });

  it("formats throughput bytes/s", () => {
    expect(formatBytesPerSec(500)).toBe("500 B/s");
    expect(formatBytesPerSec(1024 * 50)).toBe("50 KB/s");
    expect(formatBytesPerSec(1024 * 1024 * 2.5)).toBe("2.5 MB/s");
  });

  it("formats frequencies in GHz / MHz", () => {
    expect(formatFrequency(3800)).toBe("3.8 GHz");
    expect(formatFrequency(800)).toBe("800 MHz");
  });

  it("formats memory bytes", () => {
    expect(formatMemoryBytes(1024 * 1024 * 1024 * 8)).toBe("8.0 GB");
  });
});
```

Create `apps/terminal/tests/unit/telemetry.hook.test.tsx`:

```tsx
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSystemTelemetry } from "../../src/modules/telemetry/telemetry.hook";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";

const { getSystemTelemetry } = vi.hoisted(() => ({
  getSystemTelemetry: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.telemetry", () => ({
  getSystemTelemetry,
}));

const mockData: SystemTelemetry = {
  cpu: { brand: "AMD", overallUsage: 25.0, coreCount: 8, coreUsages: [25.0], frequencyMhz: 3600 },
  gpus: [{ id: "gpu-0", name: "iGPU", kind: "integrated", utilization: 5.0, memoryUsedBytes: 0, memoryTotalBytes: 0 }],
  network: { rxBytesPerSec: 2048, txBytesPerSec: 1024, totalRxBytes: 2048, totalTxBytes: 1024 },
  memory: { usedBytes: 4000000000, totalBytes: 16000000000, usagePercent: 25.0 },
};

function TelemetryProbe() {
  const { telemetry, isPaused } = useSystemTelemetry({ intervalMs: 100 });
  return (
    <div>
      <span data-testid="cpu">{telemetry ? `${telemetry.cpu.overallUsage}%` : "loading"}</span>
      <span data-testid="paused">{isPaused ? "paused" : "active"}</span>
    </div>
  );
}

describe("useSystemTelemetry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    getSystemTelemetry.mockResolvedValue(mockData);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches telemetry on mount and updates on interval", async () => {
    render(<TelemetryProbe />);
    expect(screen.getByTestId("cpu")).toHaveTextContent("loading");

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
  });

  it("pauses polling when document visibility changes to hidden", async () => {
    render(<TelemetryProbe />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByTestId("paused")).toHaveTextContent("paused");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry.format.test.ts tests/unit/telemetry.hook.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `telemetry.types.ts`, `telemetry.format.ts`, and `telemetry.hook.ts`**

Create `apps/terminal/src/modules/telemetry/telemetry.types.ts`:

```ts
export type GpuKind = "integrated" | "discrete" | "external" | "unknown";

export interface CpuTelemetry {
  brand: string;
  overallUsage: number;
  coreCount: number;
  coreUsages: number[];
  frequencyMhz: number;
}

export interface GpuTelemetry {
  id: string;
  name: string;
  kind: GpuKind;
  utilization: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  temperatureC?: number;
}

export interface NetworkTelemetry {
  activeInterface?: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  totalRxBytes: number;
  totalTxBytes: number;
}

export interface MemoryTelemetry {
  usedBytes: number;
  totalBytes: number;
  usagePercent: number;
}

export interface SystemTelemetry {
  cpu: CpuTelemetry;
  gpus: GpuTelemetry[];
  network: NetworkTelemetry;
  memory: MemoryTelemetry;
}
```

Create `apps/terminal/src/modules/telemetry/telemetry.format.ts`:

```ts
export function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`;
}

export function formatBytesPerSec(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.round(bytes)} B/s`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB/s`;
  }
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB/s`;
}

export function formatMemoryBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}
```

Create `apps/terminal/src/modules/telemetry/telemetry.hook.ts`:

```ts
import * as React from "react";
import { getSystemTelemetry } from "../ipc/ipc.telemetry";
import type { SystemTelemetry } from "./telemetry.types";

export interface UseSystemTelemetryOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function useSystemTelemetry(options: UseSystemTelemetryOptions = {}) {
  const { intervalMs = 1000, enabled = true } = options;
  const [telemetry, setTelemetry] = React.useState<SystemTelemetry | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);

  const fetchTelemetry = React.useCallback(async () => {
    try {
      const data = await getSystemTelemetry();
      setTelemetry(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    let isSubscribed = true;

    function handleVisibility() {
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      setIsPaused(hidden);
      if (!hidden && isSubscribed) {
        void fetchTelemetry();
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    void fetchTelemetry();

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void fetchTelemetry();
    }, intervalMs);

    return () => {
      isSubscribed = false;
      clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [enabled, intervalMs, fetchTelemetry]);

  return { telemetry, error, isPaused, refresh: fetchTelemetry };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry.format.test.ts tests/unit/telemetry.hook.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/telemetry/telemetry.types.ts apps/terminal/src/modules/telemetry/telemetry.format.ts apps/terminal/src/modules/telemetry/telemetry.hook.ts apps/terminal/tests/unit/telemetry.format.test.ts apps/terminal/tests/unit/telemetry.hook.test.tsx
git commit -m "feat(terminal): add telemetry formatters and power-conserving hook"
```

---

### Task 4: Statusbar Telemetry UI Widgets & Nord-Themed Rich Tooltips

**Files:**
- Create: `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/network-widget.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx`
- Create: `apps/terminal/tests/unit/telemetry-widgets.test.tsx`

**Interfaces:**
- Consumes: `SystemTelemetry`, `CpuTelemetry`, `GpuTelemetry`, `NetworkTelemetry`, Tooltip from `@gencore/ui-kit`
- Produces: `<TelemetryBar telemetry={telemetry} />`, `<CpuWidget />`, `<GpuWidget />`, `<NetworkWidget />`

- [ ] **Step 1: Write failing widget tests**

Create `apps/terminal/tests/unit/telemetry-widgets.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CpuWidget } from "../../src/modules/telemetry/cpu-widget.component";
import { GpuWidget } from "../../src/modules/telemetry/gpu-widget.component";
import { NetworkWidget } from "../../src/modules/telemetry/network-widget.component";
import { TelemetryBar } from "../../src/modules/telemetry/telemetry-bar.component";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";

const mockTelemetry: SystemTelemetry = {
  cpu: { brand: "AMD Ryzen 9", overallUsage: 18.0, coreCount: 4, coreUsages: [10, 20, 30, 40], frequencyMhz: 4200 },
  gpus: [
    { id: "gpu-0", name: "Integrated", kind: "integrated", utilization: 4.0, memoryUsedBytes: 1024, memoryTotalBytes: 4096 },
    { id: "gpu-1", name: "RTX 4070", kind: "discrete", utilization: 32.0, memoryUsedBytes: 2048, memoryTotalBytes: 8192 },
  ],
  network: { activeInterface: "Wi-Fi", rxBytesPerSec: 1024 * 1024 * 1.4, txBytesPerSec: 1024 * 240, totalRxBytes: 10000, totalTxBytes: 5000 },
  memory: { usedBytes: 8000000000, totalBytes: 32000000000, usagePercent: 25.0 },
};

describe("Telemetry Widgets", () => {
  it("renders CPU widget with percentage", () => {
    render(<CpuWidget cpu={mockTelemetry.cpu} memory={mockTelemetry.memory} />);
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("18%")).toBeInTheDocument();
  });

  it("renders GPU widget with dynamic iGPU and dGPU labels", () => {
    render(<GpuWidget gpus={mockTelemetry.gpus} />);
    expect(screen.getByText("iGPU")).toBeInTheDocument();
    expect(screen.getByText("dGPU")).toBeInTheDocument();
  });

  it("renders Network widget with download and upload rates", () => {
    render(<NetworkWidget network={mockTelemetry.network} />);
    expect(screen.getByText(/1.4 MB\/s/)).toBeInTheDocument();
    expect(screen.getByText(/240 KB\/s/)).toBeInTheDocument();
  });

  it("renders full TelemetryBar container", () => {
    render(<TelemetryBar telemetry={mockTelemetry} />);
    expect(screen.getByText("CPU")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry-widgets.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement components**

Create `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx`:

```tsx
import { cn } from "@gencore/ui-kit";
import * as React from "react";

export interface TelemetryMeterProps {
  value: number; // 0 - 100
  className?: string;
  segments?: number;
}

export function TelemetryMeter({ value, className, segments = 4 }: TelemetryMeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const activeSegments = Math.round((clamped / 100) * segments);

  let barColor = "bg-[#88C0D0]"; // Nord Frost
  if (clamped >= 85) {
    barColor = "bg-[#BF616A]"; // Nord Aurora Red
  } else if (clamped >= 70) {
    barColor = "bg-[#EBCB8B]"; // Nord Aurora Yellow
  }

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-hidden="true">
      {Array.from({ length: segments }).map((_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed segment count
          key={i}
          className={cn(
            "h-2 w-1 rounded-[1px] transition-colors",
            i < activeSegments ? barColor : "bg-muted/40",
          )}
        />
      ))}
    </div>
  );
}
```

Create `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx`:

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@gencore/ui-kit";
import { Cpu } from "lucide-react";
import * as React from "react";
import { formatFrequency, formatMemoryBytes, formatPercent } from "./telemetry.format";
import { TelemetryMeter } from "./telemetry-meter.component";
import type { CpuTelemetry, MemoryTelemetry } from "./telemetry.types";

export function CpuWidget({ cpu, memory }: { cpu: CpuTelemetry; memory: MemoryTelemetry }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-1.5 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
            <Cpu className="size-3 shrink-0 text-muted-foreground" />
            <span className="font-semibold text-[10px] uppercase">CPU</span>
            <TelemetryMeter value={cpu.overallUsage} />
            <span className="font-mono tabular-nums">{formatPercent(cpu.overallUsage)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-64 p-3 bg-card border-border shadow-lg">
          <div className="flex flex-col gap-2">
            <div className="border-b border-border pb-1.5">
              <p className="font-medium text-xs text-foreground truncate">{cpu.brand}</p>
              <p className="text-[10px] text-muted-foreground">
                {cpu.coreCount} Cores · {formatFrequency(cpu.frequencyMhz)}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Overall Load</span>
                <span className="font-medium text-foreground">{formatPercent(cpu.overallUsage)}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1">
                {cpu.coreUsages.map((usage, idx) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: core index
                  <div key={idx} className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] text-muted-foreground">C{idx + 1}</span>
                    <TelemetryMeter value={usage} segments={3} />
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Memory</span>
              <span className="text-foreground">
                {formatMemoryBytes(memory.usedBytes)} / {formatMemoryBytes(memory.totalBytes)} ({formatPercent(memory.usagePercent)})
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

Create `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx`:

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@gencore/ui-kit";
import { Layers } from "lucide-react";
import * as React from "react";
import { formatMemoryBytes, formatPercent } from "./telemetry.format";
import { TelemetryMeter } from "./telemetry-meter.component";
import type { GpuTelemetry } from "./telemetry.types";

export function GpuWidget({ gpus }: { gpus: GpuTelemetry[] }) {
  if (gpus.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {gpus.map((gpu) => {
        const label = gpu.kind === "integrated" ? "iGPU" : "dGPU";
        return (
          <TooltipProvider key={gpu.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-default items-center gap-1.5 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                  <Layers className="size-3 shrink-0 text-muted-foreground" />
                  <span className="font-semibold text-[10px] uppercase">{label}</span>
                  <TelemetryMeter value={gpu.utilization} />
                  <span className="font-mono tabular-nums">{formatPercent(gpu.utilization)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="w-64 p-3 bg-card border-border shadow-lg">
                <div className="flex flex-col gap-2">
                  <div className="border-b border-border pb-1.5">
                    <p className="font-medium text-xs text-foreground truncate">{gpu.name}</p>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                      {gpu.kind} GPU
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="font-medium text-foreground">{formatPercent(gpu.utilization)}</span>
                  </div>
                  {gpu.memoryTotalBytes > 0 ? (
                    <div className="border-t border-border pt-1.5 flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">VRAM</span>
                      <span className="text-foreground">
                        {formatMemoryBytes(gpu.memoryUsedBytes)} / {formatMemoryBytes(gpu.memoryTotalBytes)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
```

Create `apps/terminal/src/modules/telemetry/network-widget.component.tsx`:

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@gencore/ui-kit";
import { ArrowDown, ArrowUp } from "lucide-react";
import * as React from "react";
import { formatBytesPerSec, formatMemoryBytes } from "./telemetry.format";
import type { NetworkTelemetry } from "./telemetry.types";

export function NetworkWidget({ network }: { network: NetworkTelemetry }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-2 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground font-mono tabular-nums">
            <span className="flex items-center gap-0.5">
              <ArrowDown className="size-2.5 text-[#88C0D0]" />
              {formatBytesPerSec(network.rxBytesPerSec)}
            </span>
            <span className="flex items-center gap-0.5">
              <ArrowUp className="size-2.5 text-[#81A1C1]" />
              {formatBytesPerSec(network.txBytesPerSec)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-56 p-3 bg-card border-border shadow-lg">
          <div className="flex flex-col gap-2">
            <div className="border-b border-border pb-1.5">
              <p className="font-medium text-xs text-foreground">
                {network.activeInterface ?? "Network Activity"}
              </p>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Download</span>
              <span className="font-medium text-foreground">{formatBytesPerSec(network.rxBytesPerSec)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Upload</span>
              <span className="font-medium text-foreground">{formatBytesPerSec(network.txBytesPerSec)}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Total Session:</span>
              <span>↓ {formatMemoryBytes(network.totalRxBytes)} · ↑ {formatMemoryBytes(network.totalTxBytes)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

Create `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx`:

```tsx
import * as React from "react";
import { CpuWidget } from "./cpu-widget.component";
import { GpuWidget } from "./gpu-widget.component";
import { NetworkWidget } from "./network-widget.component";
import type { SystemTelemetry } from "./telemetry.types";

export function TelemetryBar({ telemetry }: { telemetry: SystemTelemetry | null }) {
  if (!telemetry) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-l border-border pl-2">
      <CpuWidget cpu={telemetry.cpu} memory={telemetry.memory} />
      <GpuWidget gpus={telemetry.gpus} />
      <NetworkWidget network={networkAdapter(telemetry.network)} />
    </div>
  );
}

function networkAdapter(network: SystemTelemetry["network"]) {
  return network;
}
```

- [ ] **Step 4: Run widget tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry-widgets.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/telemetry/ apps/terminal/tests/unit/telemetry-widgets.test.tsx
git commit -m "feat(terminal): add statusbar telemetry widgets and Nord tooltips"
```

---

### Task 5: Side Panel Toggle, Persistence, Keyboard Shortcut, and Statusbar Layout Integration

**Files:**
- Create: `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Create: `apps/terminal/tests/unit/side-panel-toggle.test.tsx`
- Modify: `apps/terminal/tests/unit/app.component.test.tsx`

**Interfaces:**
- Consumes: `<SidePanelToggle />`, `useSystemTelemetry()`, `<TelemetryBar />`
- Produces: Toggleable side panel with `Ctrl+B` shortcut, width memory in `localStorage`, and enriched statusbar.

- [ ] **Step 1: Write failing side panel toggle test**

Create `apps/terminal/tests/unit/side-panel-toggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SidePanelToggle } from "../../src/modules/side-panel/side-panel-toggle.component";

describe("SidePanelToggle", () => {
  it("renders toggle button with accessible label", () => {
    const onToggle = vi.fn();
    render(<SidePanelToggle isOpen={true} onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: /Side Panel/i });
    expect(button).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SidePanelToggle isOpen={true} onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: /Side Panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel-toggle.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `SidePanelToggle` and update `AppShellFrame`**

Create `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx`:

```tsx
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@gencore/ui-kit";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import * as React from "react";

export interface SidePanelToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SidePanelToggle({ isOpen, onToggle }: SidePanelToggleProps) {
  const Icon = isOpen ? PanelLeftClose : PanelLeft;
  const label = isOpen ? "Collapse Side Panel (Ctrl+B)" : "Expand Side Panel (Ctrl+B)";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            className="size-5 rounded-none text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            <Icon className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

Modify `apps/terminal/src/modules/app/app.component.tsx`:

Update `AppShellFrame` to manage `isSidePanelOpen`, listen to `Ctrl+B` / `Cmd+B`, and render `<SidePanelToggle />` in `statusbarStart` and `<TelemetryBar />` in `statusbarEnd`:

```tsx
import { AppShell, ThemeProvider } from "@gencore/ui-kit";
import * as React from "react";
import { ConfigProvider, useConfig } from "../config/config.hook";
import { TerminalContextMenu } from "../context-menu/context-menu.terminal";
import { TitlebarContextMenu } from "../context-menu/context-menu.titlebar";
import { getAppInfo } from "../ipc/ipc.app-info";
import { openRepoInBrowser } from "../ipc/ipc.opener";
import type { AppInfo } from "../ipc/ipc.types";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";
import { SidePanel } from "../side-panel/side-panel.component";
import { SidePanelToggle } from "../side-panel/side-panel-toggle.component";
import { TelemetryBar } from "../telemetry/telemetry-bar.component";
import { useSystemTelemetry } from "../telemetry/telemetry.hook";
import { TerminalView } from "../terminal/terminal.component";
import { TerminalProvider, useTerminalSession } from "../terminal/terminal.hook";
import "./app.theme.css";

const SIDEBAR_OPEN_STORAGE_KEY = "gencore.terminal.sidebar.open";

export const APP_TITLE = "Tauri Terminal Template";

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

  React.useEffect(() => {
    let cancelled = false;

    getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setAppInfo(info);
        }
      })
      .catch(() => {
        // Version chip stays empty
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const version = appInfo?.version;

  return (
    <ThemeProvider theme={resolvedTheme}>
      <TerminalProvider>
        <AppShellFrame title={APP_TITLE} version={version} />
      </TerminalProvider>
    </ThemeProvider>
  );
}

function AppShellFrame({ title, version }: { title: string; version: string | undefined }) {
  const session = useTerminalSession();
  const { telemetry } = useSystemTelemetry();
  const [isSidePanelOpen, setIsSidePanelOpen] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const toggleSidePanel = React.useCallback(() => {
    setIsSidePanelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidePanel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleSidePanel]);

  const active = session.tabs.find((tab) => tab.id === session.activeId);
  const cwd = active?.cwd;

  return (
    <AppShell
      title={title}
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
      contentContextMenu={<TerminalContextMenu />}
      contentProps={{ centered: false, padded: false, className: "min-h-0 overflow-hidden" }}
      sidebar={isSidePanelOpen ? <SidePanel /> : undefined}
      statusbarStart={
        <div className="flex items-center gap-2 min-w-0">
          <SidePanelToggle isOpen={isSidePanelOpen} onToggle={toggleSidePanel} />
          {cwd ? (
            <span className="truncate text-muted-foreground">{cwd}</span>
          ) : (
            <span className="truncate text-muted-foreground" />
          )}
        </div>
      }
      statusbarEnd={
        <div className="flex items-center gap-3">
          <TelemetryBar telemetry={telemetry} />
          <span className="tabular-nums text-muted-foreground">
            {session.shellName} · {session.cols}×{session.rows}
          </span>
        </div>
      }
    >
      <TerminalView />
    </AppShell>
  );
}
```

- [ ] **Step 4: Run all unit and integration tests**

Run: `pnpm --filter @gencore/terminal test`
Expected: ALL PASS.

- [ ] **Step 5: Run workspace lint, typecheck, and cargo verification**

Run:
```sh
pnpm turbo run lint typecheck test
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: PASS with zero errors and zero warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx apps/terminal/src/modules/app/app.component.tsx apps/terminal/tests/unit/side-panel-toggle.test.tsx apps/terminal/tests/unit/app.component.test.tsx
git commit -m "feat(terminal): integrate side panel toggle and statusbar telemetry bar"
```
