# Terminal telemetry statusbar implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live CPU, iGPU, dGPU, and network chips with rich Nord hover cards to the Terminal statusbar, plus a far-left button and `Ctrl+B` / `Cmd+B` that collapse the existing left panel without unmounting it.

**Architecture:** `gencore-core` samples hardware behind `get_system_telemetry` (sysinfo for CPU/RAM/network; Windows DXGI + PDH for GPUs). Terminal is the only app that grants and polls the command. Compact chips and rich tooltips live in `apps/terminal/src/modules/telemetry/`. ui-kit adds a `rich` Tooltip size so Polar Night and Snow Storm share one flat popover card.

**Tech Stack:** Tauri 2, Rust (`sysinfo` 0.39, `windows` DXGI/PDH), React 19.2, Vitest, `@gencore/ui-kit` Tooltip/Button, official Nord tokens only.

**Spec:** `.superpowers/docs/specs/2026-08-21-terminal-telemetry-statusbar-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary. Do not downgrade below React 19.2 / Vite 8 / Tauri 2 / Tailwind 4 / pnpm 11 / Node >=22.13.
- `{module}.{role}.{ext}` (JS) and `{module}_api.rs` / `{module}_error.rs` (Rust). Extra focused files (`telemetry_collector.rs`, `telemetry_types.rs`) are allowed.
- Tests live only under that unit’s `tests/` directory.
- Official Nord via semantic tokens (`bg-primary`, `bg-warning`, `bg-destructive`, `bg-popover`, `text-nord-frost-9`, `text-nord-frost-10`). No ad-hoc hex in product code.
- Isolation + least privilege: grant `gencore-core:allow-get-system-telemetry` only on Terminal `"windows": ["main"]`. Do not add it to `gencore-core` `permissions/default.toml` or Explorer.
- Command string is exactly `plugin:gencore-core|get_system_telemetry` with empty args.
- Terminal compact statusbar stays 24px. Chrome is `select-none` and has no statusbar context menu.
- Do not show version, shell name, or cols×rows in the statusbar.
- Do not edit `apps/explorer`.
- Stage only the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers.

---

## File map

**Create**

- `crates/gencore-core/src/modules/telemetry/telemetry_types.rs` — IPC DTOs
- `crates/gencore-core/src/modules/telemetry/telemetry_error.rs` — typed errors
- `crates/gencore-core/src/modules/telemetry/telemetry_classify.rs` — GPU kind + pick-one-each
- `crates/gencore-core/src/modules/telemetry/telemetry_collector.rs` — sysinfo + GPU snapshot
- `crates/gencore-core/src/modules/telemetry/telemetry_gpu.rs` — Windows DXGI/PDH, empty elsewhere
- `crates/gencore-core/src/modules/telemetry/telemetry_api.rs` — `get_system_telemetry`
- `crates/gencore-core/src/modules/telemetry/mod.rs`
- `crates/gencore-core/tests/telemetry.rs`
- `apps/terminal/src/modules/ipc/ipc.telemetry.ts`
- `apps/terminal/src/modules/telemetry/telemetry.types.ts`
- `apps/terminal/src/modules/telemetry/telemetry.format.ts`
- `apps/terminal/src/modules/telemetry/telemetry.hook.ts`
- `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx`
- `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx`
- `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx`
- `apps/terminal/src/modules/telemetry/network-widget.component.tsx`
- `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx`
- `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx`
- `apps/terminal/tests/unit/ipc.telemetry.test.ts`
- `apps/terminal/tests/unit/telemetry.format.test.ts`
- `apps/terminal/tests/unit/telemetry.hook.test.tsx`
- `apps/terminal/tests/unit/telemetry-widgets.test.tsx`
- `apps/terminal/tests/unit/side-panel-toggle.test.tsx`
- `.changeset/rich-tooltip.md`

**Modify**

- `crates/gencore-core/Cargo.toml` — `sysinfo`; Windows `windows` crate
- `crates/gencore-core/build.rs` — add `get_system_telemetry`
- `crates/gencore-core/src/modules/mod.rs` — `pub mod telemetry`
- `crates/gencore-core/src/modules/error/error_error.rs` — `Telemetry` variant
- `crates/gencore-core/src/lib.rs` — export, register command, manage state
- `crates/AGENTS.md` — mention telemetry command
- `apps/terminal/src-tauri/capabilities/main.json`
- `apps/terminal/isolation/isolation.hook.js`
- `apps/terminal/tests/unit/isolation.hook.test.ts`
- `apps/terminal/AGENTS.md` — Isolation allowlist bullet
- `apps/terminal/src/modules/ipc/ipc.types.ts` — re-export telemetry types
- `packages/ui-kit/src/primitives/tooltip/tooltip.variants.ts`
- `packages/ui-kit/src/primitives/tooltip/tooltip.types.ts`
- `packages/ui-kit/src/primitives/tooltip/tooltip.component.tsx`
- `packages/ui-kit/tests/primitives/tooltip/tooltip.variants.test.ts`
- `apps/terminal/src/modules/side-panel/side-panel.types.ts` — `SidePanelProps`
- `apps/terminal/src/modules/side-panel/side-panel.component.tsx` — `open` prop
- `apps/terminal/src/modules/app/app.component.tsx`
- `apps/terminal/src/modules/terminal/terminal.component.tsx` — xterm ignores Ctrl/Cmd+B
- `apps/terminal/tests/unit/app.component.test.tsx`
- `apps/terminal/tests/unit/side-panel.test.tsx` — collapsed state

---

### Task 1: gencore-core telemetry command

**Files:**
- Create: `crates/gencore-core/src/modules/telemetry/telemetry_types.rs`
- Create: `crates/gencore-core/src/modules/telemetry/telemetry_error.rs`
- Create: `crates/gencore-core/src/modules/telemetry/telemetry_classify.rs`
- Create: `crates/gencore-core/src/modules/telemetry/telemetry_gpu.rs`
- Create: `crates/gencore-core/src/modules/telemetry/telemetry_collector.rs`
- Create: `crates/gencore-core/src/modules/telemetry/telemetry_api.rs`
- Create: `crates/gencore-core/src/modules/telemetry/mod.rs`
- Create: `crates/gencore-core/tests/telemetry.rs`
- Modify: `crates/gencore-core/Cargo.toml`
- Modify: `crates/gencore-core/build.rs`
- Modify: `crates/gencore-core/src/modules/mod.rs`
- Modify: `crates/gencore-core/src/modules/error/error_error.rs`
- Modify: `crates/gencore-core/src/lib.rs`
- Modify: `crates/AGENTS.md`

**Interfaces:**
- Consumes: `sysinfo::System`, `sysinfo::Networks`; on Windows, DXGI + PDH via `windows`
- Produces: `get_system_telemetry`, `TelemetryState`, `SystemTelemetry`, `CpuTelemetry`, `GpuTelemetry`, `GpuKind`, `NetworkTelemetry`, `MemoryTelemetry`, `classify_gpu`, `pick_gpus`, `TelemetryError`, `CoreError::Telemetry`

- [ ] **Step 1: Write the failing Rust tests**

Create `crates/gencore-core/tests/telemetry.rs`:

```rust
use gencore_core::{
    classify_gpu, pick_gpus, CpuTelemetry, GpuCandidate, GpuKind, GpuTelemetry, MemoryTelemetry,
    NetworkTelemetry, SystemTelemetry, TelemetryError,
};

#[test]
fn system_telemetry_serializes_camel_case() {
    let snap = SystemTelemetry {
        cpu: CpuTelemetry {
            brand: "AMD Ryzen 9".into(),
            overall_usage: 14.5,
            core_count: 2,
            core_usages: vec![12.0, 17.0],
            frequency_mhz: 4200,
        },
        gpus: vec![GpuTelemetry {
            id: "gpu-0".into(),
            name: "AMD Radeon Graphics".into(),
            kind: GpuKind::Integrated,
            utilization: 4.2,
            memory_used_bytes: 512,
            memory_total_bytes: 2048,
        }],
        network: NetworkTelemetry {
            active_interface: Some("Wi-Fi".into()),
            rx_bytes_per_sec: 1024,
            tx_bytes_per_sec: 256,
            total_rx_bytes: 10,
            total_tx_bytes: 4,
        },
        memory: MemoryTelemetry {
            used_bytes: 8,
            total_bytes: 32,
            usage_percent: 25.0,
        },
    };

    let value = serde_json::to_value(&snap).expect("serialize");
    assert_eq!(value["cpu"]["overallUsage"], 14.5);
    assert_eq!(value["cpu"]["coreCount"], 2);
    assert_eq!(value["gpus"][0]["kind"], "integrated");
    assert_eq!(value["network"]["rxBytesPerSec"], 1024);
    assert_eq!(value["memory"]["usagePercent"], 25.0);
}

#[test]
fn system_telemetry_rejects_unknown_fields() {
    let json = serde_json::json!({
        "cpu": {
            "brand": "x",
            "overallUsage": 1.0,
            "coreCount": 1,
            "coreUsages": [1.0],
            "frequencyMhz": 1000
        },
        "gpus": [],
        "network": {
            "rxBytesPerSec": 0,
            "txBytesPerSec": 0,
            "totalRxBytes": 0,
            "totalTxBytes": 0
        },
        "memory": { "usedBytes": 1, "totalBytes": 2, "usagePercent": 50.0 },
        "unexpected": true
    });
    let parsed: Result<SystemTelemetry, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn classify_gpu_skips_software_and_basic_render() {
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "Intel UHD Graphics".into(),
            dedicated_memory_bytes: 128,
            vendor_id: 0x8086,
            is_software: true,
        }),
        None
    );
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "Microsoft Basic Render Driver".into(),
            dedicated_memory_bytes: 0,
            vendor_id: 0x1414,
            is_software: false,
        }),
        None
    );
}

#[test]
fn classify_gpu_intel_and_nvidia() {
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "Intel Iris Xe Graphics".into(),
            dedicated_memory_bytes: 128 * 1024 * 1024,
            vendor_id: 0x8086,
            is_software: false,
        }),
        Some(GpuKind::Integrated)
    );
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "Intel Arc A770".into(),
            dedicated_memory_bytes: 16 * 1024 * 1024 * 1024,
            vendor_id: 0x8086,
            is_software: false,
        }),
        Some(GpuKind::Dedicated)
    );
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "NVIDIA GeForce RTX 4070".into(),
            dedicated_memory_bytes: 12 * 1024 * 1024 * 1024,
            vendor_id: 0x10DE,
            is_software: false,
        }),
        Some(GpuKind::Dedicated)
    );
}

#[test]
fn classify_gpu_amd_igpu_vs_dgpu() {
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "AMD Radeon Graphics".into(),
            dedicated_memory_bytes: 512 * 1024 * 1024,
            vendor_id: 0x1002,
            is_software: false,
        }),
        Some(GpuKind::Integrated)
    );
    assert_eq!(
        classify_gpu(&GpuCandidate {
            name: "AMD Radeon RX 7900 XTX".into(),
            dedicated_memory_bytes: 24 * 1024 * 1024 * 1024,
            vendor_id: 0x1002,
            is_software: false,
        }),
        Some(GpuKind::Dedicated)
    );
}

fn gpu(id: &str, kind: GpuKind, vram: u64) -> GpuTelemetry {
    GpuTelemetry {
        id: id.into(),
        name: id.into(),
        kind,
        utilization: 1.0,
        memory_used_bytes: 0,
        memory_total_bytes: vram,
    }
}

#[test]
fn pick_gpus_keeps_one_integrated_and_largest_dedicated() {
    let picked = pick_gpus(vec![
        gpu("igpu-a", GpuKind::Integrated, 100),
        gpu("igpu-b", GpuKind::Integrated, 200),
        gpu("dgpu-small", GpuKind::Dedicated, 4_000),
        gpu("dgpu-big", GpuKind::Dedicated, 12_000),
    ]);
    assert_eq!(picked.len(), 2);
    assert_eq!(picked[0].id, "igpu-a");
    assert_eq!(picked[1].id, "dgpu-big");
}

#[test]
fn telemetry_error_displays() {
    let err = TelemetryError::LockPoisoned;
    assert_eq!(err.to_string(), "telemetry collector lock poisoned");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p gencore-core --test telemetry`
Expected: FAIL — `gencore_core` does not export `classify_gpu` / `SystemTelemetry`.

- [ ] **Step 3: Add dependencies**

From the repo root, do **not** hand-edit the lockfile. In `crates/gencore-core`:

```bash
cargo add sysinfo --no-default-features --features system,network
```

Then add a Windows-only `windows` crate (latest stable) with DXGI + PDH features:

```bash
cargo add --target x86_64-pc-windows-msvc windows --features Win32_Foundation,Win32_Graphics_Dxgi,Win32_Graphics_Dxgi_Common,Win32_System_Performance
```

Confirm `crates/gencore-core/Cargo.toml` looks like this shape (versions are whatever `cargo add` resolved; do not downgrade):

```toml
[dependencies]
tauri = { workspace = true }
serde = { workspace = true }
thiserror = { workspace = true }
sysinfo = { version = "0.39", default-features = false, features = ["system", "network"] }

[target.'cfg(windows)'.dependencies]
windows = { version = "<resolved>", features = [
    "Win32_Foundation",
    "Win32_Graphics_Dxgi",
    "Win32_Graphics_Dxgi_Common",
    "Win32_System_Performance",
] }
```

- [ ] **Step 4: Implement types, errors, classify, collector, command**

Create `crates/gencore-core/src/modules/telemetry/telemetry_types.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GpuKind {
    Integrated,
    Dedicated,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CpuTelemetry {
    pub brand: String,
    pub overall_usage: f32,
    pub core_count: usize,
    pub core_usages: Vec<f32>,
    pub frequency_mhz: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GpuTelemetry {
    pub id: String,
    pub name: String,
    pub kind: GpuKind,
    pub utilization: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NetworkTelemetry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_interface: Option<String>,
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
    pub total_rx_bytes: u64,
    pub total_tx_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MemoryTelemetry {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SystemTelemetry {
    pub cpu: CpuTelemetry,
    pub gpus: Vec<GpuTelemetry>,
    pub network: NetworkTelemetry,
    pub memory: MemoryTelemetry,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GpuCandidate {
    pub name: String,
    pub dedicated_memory_bytes: u64,
    pub vendor_id: u32,
    pub is_software: bool,
}
```

Create `crates/gencore-core/src/modules/telemetry/telemetry_error.rs`:

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TelemetryError {
    #[error("failed to collect telemetry: {0}")]
    CollectionFailed(String),
    #[error("telemetry collector lock poisoned")]
    LockPoisoned,
}
```

Create `crates/gencore-core/src/modules/telemetry/telemetry_classify.rs`:

```rust
use super::telemetry_types::{GpuCandidate, GpuKind, GpuTelemetry};

pub fn classify_gpu(candidate: &GpuCandidate) -> Option<GpuKind> {
    if candidate.is_software {
        return None;
    }
    let name = candidate.name.to_ascii_lowercase();
    if name.contains("basic render") || name.contains("microsoft basic") {
        return None;
    }
    match candidate.vendor_id {
        0x8086 => {
            if name.contains("arc") {
                Some(GpuKind::Dedicated)
            } else {
                Some(GpuKind::Integrated)
            }
        }
        0x10DE => Some(GpuKind::Dedicated),
        0x1002 => {
            if name.contains("radeon rx")
                || name.contains("rx ")
                || candidate.dedicated_memory_bytes >= 1_073_741_824
            {
                Some(GpuKind::Dedicated)
            } else {
                Some(GpuKind::Integrated)
            }
        }
        _ if candidate.dedicated_memory_bytes >= 512 * 1024 * 1024 => Some(GpuKind::Dedicated),
        _ => Some(GpuKind::Integrated),
    }
}

/// At most one integrated (first) and one dedicated (largest VRAM).
pub fn pick_gpus(gpus: Vec<GpuTelemetry>) -> Vec<GpuTelemetry> {
    let mut integrated = None;
    let mut dedicated: Option<GpuTelemetry> = None;
    for gpu in gpus {
        match gpu.kind {
            GpuKind::Integrated if integrated.is_none() => integrated = Some(gpu),
            GpuKind::Dedicated => {
                let take = dedicated
                    .as_ref()
                    .is_none_or(|current| gpu.memory_total_bytes > current.memory_total_bytes);
                if take {
                    dedicated = Some(gpu);
                }
            }
            GpuKind::Integrated => {}
        }
    }
    let mut out = Vec::with_capacity(2);
    if let Some(gpu) = integrated {
        out.push(gpu);
    }
    if let Some(gpu) = dedicated {
        out.push(gpu);
    }
    out
}
```

Create `crates/gencore-core/src/modules/telemetry/telemetry_gpu.rs`:

```rust
use super::telemetry_classify::{classify_gpu, pick_gpus};
use super::telemetry_types::{GpuCandidate, GpuTelemetry};

#[cfg(not(windows))]
pub fn collect_gpus() -> Vec<GpuTelemetry> {
    Vec::new()
}

#[cfg(windows)]
pub fn collect_gpus() -> Vec<GpuTelemetry> {
    match collect_gpus_windows() {
        Ok(gpus) => pick_gpus(gpus),
        Err(_) => Vec::new(),
    }
}

#[cfg(windows)]
fn collect_gpus_windows() -> Result<Vec<GpuTelemetry>, super::telemetry_error::TelemetryError> {
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE,
    };

    let factory: IDXGIFactory1 = unsafe {
        CreateDXGIFactory1().map_err(|err| {
            super::telemetry_error::TelemetryError::CollectionFailed(err.to_string())
        })?
    };

    let mut found = Vec::new();
    let mut index = 0_u32;
    loop {
        let adapter = unsafe { factory.EnumAdapters1(index) };
        let Ok(adapter) = adapter else {
            break;
        };
        let desc = unsafe {
            adapter.GetDesc1().map_err(|err| {
                super::telemetry_error::TelemetryError::CollectionFailed(err.to_string())
            })?
        };
        let name = String::from_utf16_lossy(&desc.Description)
            .trim_end_matches('\0')
            .to_string();
        let is_software = (desc.Flags.0 & DXGI_ADAPTER_FLAG_SOFTWARE.0) != 0;
        let candidate = GpuCandidate {
            name: name.clone(),
            dedicated_memory_bytes: desc.DedicatedVideoMemory as u64,
            vendor_id: desc.VendorId,
            is_software,
        };
        if let Some(kind) = classify_gpu(&candidate) {
            found.push(GpuTelemetry {
                id: format!("gpu-{index}"),
                name,
                kind,
                utilization: 0.0,
                memory_used_bytes: 0,
                memory_total_bytes: desc.DedicatedVideoMemory as u64,
            });
        }
        index += 1;
    }

    overlay_pdh_utilization(&mut found);
    Ok(found)
}

#[cfg(windows)]
fn overlay_pdh_utilization(gpus: &mut [GpuTelemetry]) {
    // Best-effort: if PDH counters are missing, leave utilization at 0.0 on real adapters.
    // Do not invent extra GPU entries here.
    let _ = gpus;
}
```

PDH overlay: implement a real aggregator in the same file. Open a PDH query for `\GPU Engine(*)\Utilization Percentage`, call `PdhCollectQueryData` twice is not required if the collector process has been running; on each `collect()` call `PdhCollectQueryData` + `PdhGetFormattedCounterArrayW`. Parse `luid_0xXXXXXXXX_0xYYYYYYYY` from instance names and, when a single adapter cannot be matched, assign the **mean** of all engine percents to the dedicated GPU if present else the integrated GPU. If any PDH call fails, return without changing entries (leave 0.0). Never push a GPU that DXGI did not enumerate.

Create `crates/gencore-core/src/modules/telemetry/telemetry_collector.rs`:

```rust
use std::sync::Mutex;
use std::time::Instant;

use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};

use super::telemetry_error::TelemetryError;
use super::telemetry_gpu::collect_gpus;
use super::telemetry_types::{
    CpuTelemetry, MemoryTelemetry, NetworkTelemetry, SystemTelemetry,
};

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
                .with_memory(MemoryRefreshKind::everything()),
        );
        system.refresh_cpu_all();
        system.refresh_memory();
        let networks = Networks::new_with_refreshed_list();
        let (rx, tx) = sum_network_totals(&networks);
        Self {
            system,
            networks,
            last_network_tick: Instant::now(),
            last_rx_total: rx,
            last_tx_total: tx,
        }
    }

    pub fn collect(&mut self) -> Result<SystemTelemetry, TelemetryError> {
        self.system.refresh_cpu_all();
        self.system.refresh_memory();
        self.networks.refresh(true);

        let cpus = self.system.cpus();
        let core_count = cpus.len();
        let mut core_usages = Vec::with_capacity(core_count);
        let mut total_usage = 0.0_f32;
        let mut frequency_mhz = 0_u64;
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

        let total_mem = self.system.total_memory();
        let used_mem = self.system.used_memory();
        let usage_percent = if total_mem > 0 {
            (used_mem as f64 / total_mem as f64 * 100.0) as f32
        } else {
            0.0
        };

        let now = Instant::now();
        let elapsed = now.duration_since(self.last_network_tick).as_secs_f64().max(0.1);
        let (current_rx, current_tx) = sum_network_totals(&self.networks);
        let rx_bytes_per_sec = ((current_rx.saturating_sub(self.last_rx_total)) as f64 / elapsed) as u64;
        let tx_bytes_per_sec = ((current_tx.saturating_sub(self.last_tx_total)) as f64 / elapsed) as u64;
        self.last_network_tick = now;
        self.last_rx_total = current_rx;
        self.last_tx_total = current_tx;

        let mut active_interface = None;
        let mut max_traffic = 0_u64;
        for (name, data) in self.networks.iter() {
            let traffic = data.received() + data.transmitted();
            if traffic > max_traffic {
                max_traffic = traffic;
                active_interface = Some(name.to_string());
            }
        }

        Ok(SystemTelemetry {
            cpu: CpuTelemetry {
                brand,
                overall_usage,
                core_count,
                core_usages,
                frequency_mhz,
            },
            gpus: collect_gpus(),
            network: NetworkTelemetry {
                active_interface,
                rx_bytes_per_sec,
                tx_bytes_per_sec,
                total_rx_bytes: current_rx,
                total_tx_bytes: current_tx,
            },
            memory: MemoryTelemetry {
                used_bytes: used_mem,
                total_bytes: total_mem,
                usage_percent,
            },
        })
    }
}

fn sum_network_totals(networks: &Networks) -> (u64, u64) {
    let mut rx = 0_u64;
    let mut tx = 0_u64;
    for (_name, data) in networks.iter() {
        rx += data.total_received();
        tx += data.total_transmitted();
    }
    (rx, tx)
}

pub struct TelemetryState(pub Mutex<TelemetryCollector>);

impl TelemetryState {
    pub fn new() -> Self {
        Self(Mutex::new(TelemetryCollector::new()))
    }
}
```

Create `crates/gencore-core/src/modules/telemetry/telemetry_api.rs`:

```rust
use tauri::State;

use super::telemetry_collector::TelemetryState;
use super::telemetry_error::TelemetryError;
use super::telemetry_types::SystemTelemetry;
use crate::modules::error::CoreError;

#[tauri::command]
pub async fn get_system_telemetry(
    state: State<'_, TelemetryState>,
) -> Result<SystemTelemetry, CoreError> {
    let mut collector = state.0.lock().map_err(|_| TelemetryError::LockPoisoned)?;
    collector.collect().map_err(CoreError::from)
}
```

Create `crates/gencore-core/src/modules/telemetry/mod.rs`:

```rust
pub mod telemetry_api;
pub mod telemetry_classify;
pub mod telemetry_collector;
pub mod telemetry_error;
pub mod telemetry_gpu;
pub mod telemetry_types;

pub use telemetry_api::get_system_telemetry;
pub use telemetry_classify::{classify_gpu, pick_gpus};
pub use telemetry_collector::TelemetryState;
pub use telemetry_error::TelemetryError;
pub use telemetry_types::*;
```

Add `pub mod telemetry;` to `crates/gencore-core/src/modules/mod.rs`.

In `error_error.rs`, add `use crate::modules::telemetry::TelemetryError;` and:

```rust
    /// An error occurred while sampling system telemetry.
    #[error(transparent)]
    Telemetry(#[from] TelemetryError),
```

In `build.rs`, add `"get_system_telemetry"` to `COMMANDS`.

Replace `crates/gencore-core/src/lib.rs` with:

```rust
//! Shared core types, typed errors, and diagnostics for GenCore Tauri plugins.
//!
//! This crate is itself a small Tauri plugin (`gencore-core`) that exposes
//! `get_app_info`, pinned-tab persistence, tray actions, and system telemetry.

mod modules;

pub use modules::app_info::{AppInfo, AppInfoError, get_app_info};
pub use modules::error::{CoreError, CoreResult};
pub use modules::logging::{LoggingError, init_logging};
pub use modules::pinned_store::{
    DEFAULT_PINNED_TABS_JSON, PINNED_TABS_FILE_NAME, PINNED_TABS_JSON_MAX_BYTES, PinnedStoreError,
    SavePinnedTabsArgs, load_pinned_tabs, pinned_tabs_path, read_pinned_tabs_file,
    save_pinned_tabs, write_pinned_tabs_file,
};
pub use modules::telemetry::{
    CpuTelemetry, GpuCandidate, GpuKind, GpuTelemetry, MemoryTelemetry, NetworkTelemetry,
    SystemTelemetry, TelemetryError, TelemetryState, classify_gpu, get_system_telemetry, pick_gpus,
};
pub use modules::tray::{
    PxRect, PxSize, TrayAction, TrayActionArgs, TrayError, tray_action, tray_menu_origin,
};

use tauri::{
    Manager, Runtime,
    plugin::{Builder, TauriPlugin},
};

pub const PLUGIN_ID: &str = "gencore-core";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            load_pinned_tabs,
            save_pinned_tabs,
            tray_action,
            get_system_telemetry
        ])
        .setup(|app, _api| {
            app.manage(TelemetryState::new());
            Ok(())
        })
        .build()
}
```

In `crates/AGENTS.md`, change the `gencore-core` bullet to: `get_app_info`, pinned-tab load/save, tray actions, and `get_system_telemetry` (Terminal grants the telemetry command; Explorer does not).

- [ ] **Step 5: Run tests and clippy**

Run:

```bash
cargo test -p gencore-core --test telemetry
cargo test -p gencore-core
cargo clippy -p gencore-core --all-targets -- -D warnings
```

Expected: PASS, zero warnings. After `build.rs` change, `permissions/autogenerated/commands/get_system_telemetry.toml` is generated. Do not add `allow-get-system-telemetry` to `permissions/default.toml`.

- [ ] **Step 6: Commit**

```bash
git add crates/gencore-core/Cargo.toml crates/gencore-core/build.rs crates/gencore-core/src/lib.rs crates/gencore-core/src/modules/mod.rs crates/gencore-core/src/modules/error/error_error.rs crates/gencore-core/src/modules/telemetry crates/gencore-core/tests/telemetry.rs crates/gencore-core/permissions crates/AGENTS.md
git commit -m "feat(core): add get_system_telemetry collector and GPU classification"
```

---

### Task 2: Isolation, capability, and Terminal IPC

**Files:**
- Create: `apps/terminal/src/modules/ipc/ipc.telemetry.ts`
- Create: `apps/terminal/src/modules/telemetry/telemetry.types.ts`
- Create: `apps/terminal/tests/unit/ipc.telemetry.test.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Modify: `apps/terminal/AGENTS.md`

**Interfaces:**
- Consumes: `invoke` from `@tauri-apps/api/core`
- Produces: `getSystemTelemetry(): Promise<SystemTelemetry>` and Isolation allowlist for `plugin:gencore-core|get_system_telemetry`

- [ ] **Step 1: Write the failing IPC test and Isolation cases**

Create `apps/terminal/src/modules/telemetry/telemetry.types.ts` first (types only — needed by the test import):

```ts
export type GpuKind = "integrated" | "dedicated";

export interface CpuTelemetry {
  readonly brand: string;
  readonly overallUsage: number;
  readonly coreCount: number;
  readonly coreUsages: readonly number[];
  readonly frequencyMhz: number;
}

export interface GpuTelemetry {
  readonly id: string;
  readonly name: string;
  readonly kind: GpuKind;
  readonly utilization: number;
  readonly memoryUsedBytes: number;
  readonly memoryTotalBytes: number;
}

export interface NetworkTelemetry {
  readonly activeInterface?: string;
  readonly rxBytesPerSec: number;
  readonly txBytesPerSec: number;
  readonly totalRxBytes: number;
  readonly totalTxBytes: number;
}

export interface MemoryTelemetry {
  readonly usedBytes: number;
  readonly totalBytes: number;
  readonly usagePercent: number;
}

export interface SystemTelemetry {
  readonly cpu: CpuTelemetry;
  readonly gpus: readonly GpuTelemetry[];
  readonly network: NetworkTelemetry;
  readonly memory: MemoryTelemetry;
}
```

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
  it("invokes plugin:gencore-core|get_system_telemetry", async () => {
    const mockTelemetry: SystemTelemetry = {
      cpu: {
        brand: "AMD",
        overallUsage: 14.5,
        coreCount: 2,
        coreUsages: [12, 17],
        frequencyMhz: 4200,
      },
      gpus: [
        {
          id: "gpu-0",
          name: "AMD Radeon Graphics",
          kind: "integrated",
          utilization: 4.2,
          memoryUsedBytes: 512,
          memoryTotalBytes: 2048,
        },
      ],
      network: {
        activeInterface: "Wi-Fi",
        rxBytesPerSec: 1024,
        txBytesPerSec: 256,
        totalRxBytes: 10,
        totalTxBytes: 4,
      },
      memory: { usedBytes: 8, totalBytes: 32, usagePercent: 25 },
    };
    invoke.mockResolvedValueOnce(mockTelemetry);

    await expect(getSystemTelemetry()).resolves.toEqual(mockTelemetry);
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-core|get_system_telemetry");
  });
});
```

In `apps/terminal/tests/unit/isolation.hook.test.ts`, add `"plugin:gencore-core|get_system_telemetry"` to `EMPTY_ARG_COMMANDS` and add:

```ts
  it("throws for get_system_telemetry with extra args", () => {
    const hook = getHook();
    expect(() =>
      hook(envelope("plugin:gencore-core|get_system_telemetry", { unexpected: true })),
    ).toThrow();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/ipc.telemetry.test.ts tests/unit/isolation.hook.test.ts`
Expected: IPC test FAIL (module missing). Isolation extra-args case FAIL until the hook allowlists the command as empty-arg.

- [ ] **Step 3: Implement wrapper, hook, capability, re-export**

Create `apps/terminal/src/modules/ipc/ipc.telemetry.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { SystemTelemetry } from "../telemetry/telemetry.types";

const GET_SYSTEM_TELEMETRY_COMMAND = "plugin:gencore-core|get_system_telemetry";

export function getSystemTelemetry(): Promise<SystemTelemetry> {
  return invoke<SystemTelemetry>(GET_SYSTEM_TELEMETRY_COMMAND);
}
```

Append to `apps/terminal/src/modules/ipc/ipc.types.ts`:

```ts
export type {
  CpuTelemetry,
  GpuKind,
  GpuTelemetry,
  MemoryTelemetry,
  NetworkTelemetry,
  SystemTelemetry,
} from "../telemetry/telemetry.types";
```

In `isolation.hook.js`:

- Add `"plugin:gencore-core|get_system_telemetry"` to `ALLOWED_COMMANDS` (after `get_app_info`).
- Add `const GET_SYSTEM_TELEMETRY_CMD = "plugin:gencore-core|get_system_telemetry";`
- Change `isEmptyArgCommand` to:

```js
  function isEmptyArgCommand(cmd) {
    return (
      cmd === GET_APP_INFO_CMD ||
      cmd === GET_SYSTEM_TELEMETRY_CMD ||
      cmd === LIST_DRIVES_CMD ||
      cmd === LOAD_PINNED_CMD
    );
  }
```

In `apps/terminal/src-tauri/capabilities/main.json`, add `"gencore-core:allow-get-system-telemetry"` after `"gencore-core:allow-get-app-info"`. Update the capability `description` to mention read-only system telemetry.

In `apps/terminal/AGENTS.md`, add `plugin:gencore-core|get_system_telemetry` (empty args) to the Isolation allowlist bullet and `gencore-core:allow-get-system-telemetry` to the capabilities bullet.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/ipc.telemetry.test.ts tests/unit/isolation.hook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/ipc/ipc.telemetry.ts apps/terminal/src/modules/ipc/ipc.types.ts apps/terminal/src/modules/telemetry/telemetry.types.ts apps/terminal/tests/unit/ipc.telemetry.test.ts apps/terminal/isolation/isolation.hook.js apps/terminal/tests/unit/isolation.hook.test.ts apps/terminal/src-tauri/capabilities/main.json apps/terminal/AGENTS.md
git commit -m "feat(terminal): allowlist and wrap get_system_telemetry IPC"
```

---

### Task 3: Formatters and `useSystemTelemetry`

**Files:**
- Create: `apps/terminal/src/modules/telemetry/telemetry.format.ts`
- Create: `apps/terminal/src/modules/telemetry/telemetry.hook.ts`
- Create: `apps/terminal/tests/unit/telemetry.format.test.ts`
- Create: `apps/terminal/tests/unit/telemetry.hook.test.tsx`

**Interfaces:**
- Consumes: `getSystemTelemetry()` from `../ipc/ipc.telemetry`
- Produces: `formatPercent`, `formatBytesPerSec`, `formatMemoryBytes`, `formatFrequency`, `loadTone`, `useSystemTelemetry({ intervalMs, enabled })` → `{ telemetry, error, isPaused, refresh }`

- [ ] **Step 1: Write failing tests**

Create `apps/terminal/tests/unit/telemetry.format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatBytesPerSec,
  formatFrequency,
  formatMemoryBytes,
  formatPercent,
  loadTone,
} from "../../src/modules/telemetry/telemetry.format";

describe("telemetry formatters", () => {
  it("formats percentages", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(14.2)).toBe("14%");
    expect(formatPercent(99.9)).toBe("100%");
  });

  it("formats throughput", () => {
    expect(formatBytesPerSec(500)).toBe("500 B/s");
    expect(formatBytesPerSec(1024 * 50)).toBe("50 KB/s");
    expect(formatBytesPerSec(1024 * 1024 * 2.5)).toBe("2.5 MB/s");
  });

  it("formats frequency and memory", () => {
    expect(formatFrequency(3800)).toBe("3.8 GHz");
    expect(formatFrequency(800)).toBe("800 MHz");
    expect(formatMemoryBytes(8 * 1024 * 1024 * 1024)).toBe("8.0 GB");
  });

  it("maps load tones", () => {
    expect(loadTone(0)).toBe("normal");
    expect(loadTone(69.9)).toBe("normal");
    expect(loadTone(70)).toBe("warning");
    expect(loadTone(84.9)).toBe("warning");
    expect(loadTone(85)).toBe("critical");
  });
});
```

Create `apps/terminal/tests/unit/telemetry.hook.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
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
  cpu: { brand: "AMD", overallUsage: 25, coreCount: 1, coreUsages: [25], frequencyMhz: 3600 },
  gpus: [
    {
      id: "gpu-0",
      name: "iGPU",
      kind: "integrated",
      utilization: 5,
      memoryUsedBytes: 0,
      memoryTotalBytes: 0,
    },
  ],
  network: { rxBytesPerSec: 2048, txBytesPerSec: 1024, totalRxBytes: 2048, totalTxBytes: 1024 },
  memory: { usedBytes: 4, totalBytes: 16, usagePercent: 25 },
};

function Probe() {
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

  it("fetches on mount", async () => {
    render(<Probe />);
    expect(screen.getByTestId("cpu")).toHaveTextContent("loading");
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
  });

  it("pauses when document is hidden", async () => {
    render(<Probe />);
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByTestId("paused")).toHaveTextContent("paused");
  });

  it("keeps the last snapshot when a later poll fails", async () => {
    getSystemTelemetry.mockResolvedValueOnce(mockData).mockRejectedValueOnce(new Error("busy"));
    render(<Probe />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry.format.test.ts tests/unit/telemetry.hook.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement formatters and hook**

Create `apps/terminal/src/modules/telemetry/telemetry.format.ts`:

```ts
export type LoadTone = "normal" | "warning" | "critical";

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
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}

export function loadTone(value: number): LoadTone {
  if (value >= 85) {
    return "critical";
  }
  if (value >= 70) {
    return "warning";
  }
  return "normal";
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
    function handleVisibility() {
      const hidden = document.visibilityState === "hidden";
      setIsPaused(hidden);
      if (!hidden) {
        void fetchTelemetry();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    void fetchTelemetry();
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void fetchTelemetry();
    }, intervalMs);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
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
git add apps/terminal/src/modules/telemetry/telemetry.format.ts apps/terminal/src/modules/telemetry/telemetry.hook.ts apps/terminal/tests/unit/telemetry.format.test.ts apps/terminal/tests/unit/telemetry.hook.test.tsx
git commit -m "feat(terminal): add telemetry formatters and visibility-aware poll hook"
```

---

### Task 4: ui-kit `rich` tooltip size

**Files:**
- Modify: `packages/ui-kit/src/primitives/tooltip/tooltip.variants.ts`
- Modify: `packages/ui-kit/src/primitives/tooltip/tooltip.types.ts`
- Modify: `packages/ui-kit/src/primitives/tooltip/tooltip.component.tsx`
- Modify: `packages/ui-kit/tests/primitives/tooltip/tooltip.variants.test.ts`
- Create: `.changeset/rich-tooltip.md`

**Interfaces:**
- Consumes: existing `tooltipContentVariants`
- Produces: `tooltipContentVariants({ size: "rich" | "default" })`, `TooltipContent` `size` prop

- [ ] **Step 1: Write the failing variant test**

Replace `packages/ui-kit/tests/primitives/tooltip/tooltip.variants.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { tooltipContentVariants } from "../../../src/primitives/tooltip/tooltip.variants";

describe("tooltip.variants", () => {
  it("makes tooltip content unselectable", () => {
    expect(tooltipContentVariants()).toContain("select-none");
  });

  it("keeps the default size compact", () => {
    const classes = tooltipContentVariants();
    expect(classes).toContain("max-w-64");
    expect(classes).toContain("px-2");
    expect(classes).not.toContain("shadow");
  });

  it("adds a rich card size without shadows or blur", () => {
    const classes = tooltipContentVariants({ size: "rich" });
    expect(classes).toContain("select-none");
    expect(classes).toContain("max-w-[260px]");
    expect(classes).toContain("px-3");
    expect(classes).toContain("py-2.5");
    expect(classes).not.toContain("shadow");
    expect(classes).not.toContain("blur");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/tooltip/tooltip.variants.test.ts`
Expected: FAIL — `size` is not a variant.

- [ ] **Step 3: Implement the variant**

Replace `packages/ui-kit/src/primitives/tooltip/tooltip.variants.ts` with:

```ts
import { cva } from "class-variance-authority";

/** Flat popover surface: hairline border, no shadow stack, no blur. */
export const tooltipContentVariants = cva(
  [
    "z-50 rounded-sm border border-border bg-popover",
    "text-xs leading-tight text-popover-foreground select-none",
    "origin-(--radix-tooltip-content-transform-origin)",
  ],
  {
    variants: {
      size: {
        default: "max-w-64 px-2 py-1",
        rich: "max-w-[260px] px-3 py-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export const tooltipArrowVariants = cva("fill-popover");
```

Add to `TooltipContentProps` in `tooltip.types.ts`:

```ts
import type { VariantProps } from "class-variance-authority";
import type { tooltipContentVariants } from "./tooltip.variants";

export interface TooltipContentProps
  extends React.ComponentPropsWithRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  withArrow?: boolean;
}
```

In `tooltip.component.tsx`, destructure `size` and pass `tooltipContentVariants({ size })`.

Create `.changeset/rich-tooltip.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: add a rich Tooltip size for structured statusbar hover cards
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/tooltip/tooltip.variants.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/src/primitives/tooltip/tooltip.variants.ts packages/ui-kit/src/primitives/tooltip/tooltip.types.ts packages/ui-kit/src/primitives/tooltip/tooltip.component.tsx packages/ui-kit/tests/primitives/tooltip/tooltip.variants.test.ts .changeset/rich-tooltip.md
git commit -m "feat(ui-kit): add rich tooltip size for structured hover cards"
```

---

### Task 5: Statusbar chips and rich tooltip cards

**Files:**
- Create: `apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/cpu-widget.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/gpu-widget.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/network-widget.component.tsx`
- Create: `apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx`
- Create: `apps/terminal/tests/unit/telemetry-widgets.test.tsx`

**Interfaces:**
- Consumes: `SystemTelemetry`, formatters, `loadTone`, `Tooltip` `size="rich"`
- Produces: `<TelemetryBar telemetry={SystemTelemetry | null} />`, `<CpuWidget />`, `<GpuWidget />`, `<NetworkWidget />`

- [ ] **Step 1: Write failing widget tests**

Create `apps/terminal/tests/unit/telemetry-widgets.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CpuWidget } from "../../src/modules/telemetry/cpu-widget.component";
import { GpuWidget } from "../../src/modules/telemetry/gpu-widget.component";
import { NetworkWidget } from "../../src/modules/telemetry/network-widget.component";
import { TelemetryBar } from "../../src/modules/telemetry/telemetry-bar.component";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";

const mockTelemetry: SystemTelemetry = {
  cpu: {
    brand: "AMD Ryzen 9",
    overallUsage: 18,
    coreCount: 4,
    coreUsages: [10, 20, 30, 40],
    frequencyMhz: 4200,
  },
  gpus: [
    {
      id: "gpu-0",
      name: "AMD Radeon Graphics",
      kind: "integrated",
      utilization: 4,
      memoryUsedBytes: 1,
      memoryTotalBytes: 4,
    },
    {
      id: "gpu-1",
      name: "RTX 4070",
      kind: "dedicated",
      utilization: 72,
      memoryUsedBytes: 7,
      memoryTotalBytes: 12,
    },
  ],
  network: {
    activeInterface: "Wi-Fi",
    rxBytesPerSec: 1024 * 1024 * 1.4,
    txBytesPerSec: 1024 * 240,
    totalRxBytes: 2 * 1024 * 1024 * 1024,
    totalTxBytes: 84 * 1024 * 1024,
  },
  memory: { usedBytes: 18.2 * 1024 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 * 1024, usagePercent: 28 },
};

describe("Telemetry widgets", () => {
  it("renders CPU meter and percent", () => {
    render(<CpuWidget cpu={mockTelemetry.cpu} memory={mockTelemetry.memory} />);
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("18%")).toBeInTheDocument();
  });

  it("renders iGPU and dGPU labels and omits missing kinds", () => {
    render(<GpuWidget gpus={mockTelemetry.gpus} />);
    expect(screen.getByText("iGPU")).toBeInTheDocument();
    expect(screen.getByText("dGPU")).toBeInTheDocument();
    expect(screen.getByText("4%")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("renders network rates", () => {
    render(<NetworkWidget network={mockTelemetry.network} />);
    expect(screen.getByText(/1.4 MB\/s/)).toBeInTheDocument();
    expect(screen.getByText(/240 KB\/s/)).toBeInTheDocument();
  });

  it("hides the bar when telemetry is null", () => {
    const { container } = render(<TelemetryBar telemetry={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows rich CPU tooltip copy on hover", async () => {
    const user = userEvent.setup();
    render(<CpuWidget cpu={mockTelemetry.cpu} memory={mockTelemetry.memory} />);
    await user.hover(screen.getByText("CPU"));
    expect(await screen.findByText("AMD Ryzen 9")).toBeInTheDocument();
    expect(screen.getByText(/4 cores/)).toBeInTheDocument();
    expect(screen.getByText(/Memory/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry-widgets.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement widgets**

`telemetry-meter.component.tsx`: four `span` segments, `aria-hidden`. Active segment class from `loadTone`: `bg-primary` / `bg-warning` / `bg-destructive`. Inactive: `bg-muted`.

`cpu-widget.component.tsx`: `Tooltip` + `TooltipTrigger asChild` wrapping a `span` (`cursor-default`, `tabular-nums`) with `CPU`, `<TelemetryMeter value={cpu.overallUsage} />`, `formatPercent`. `TooltipContent` `side="top"` `size="rich"`: brand, `{coreCount} cores · {formatFrequency}`, overall load, per-core meters (first 16, then `+N`), memory `formatMemoryBytes(used) / formatMemoryBytes(total)`.

`gpu-widget.component.tsx`: map gpus; label `iGPU` if `kind === "integrated"` else `dGPU`. Same chip chrome. Tooltip: name, outline badge `Integrated` or `Dedicated` (`border border-border text-primary`), utilization, VRAM row only when `memoryTotalBytes > 0`. Return `null` when `gpus.length === 0`.

`network-widget.component.tsx`: `↓ {formatBytesPerSec(rx)}` with `text-primary`. `↑ {formatBytesPerSec(tx)}` with `text-nord-frost-9 [.theme-snow-storm_&]:text-nord-frost-10` (Snow Storm class is on the ThemeProvider wrapper). Tooltip: adapter or `Network activity`, Download, Upload, Session totals via `formatMemoryBytes`.

`telemetry-bar.component.tsx`:

```tsx
import { TooltipProvider } from "@gencore/ui-kit";
import { CpuWidget } from "./cpu-widget.component";
import { GpuWidget } from "./gpu-widget.component";
import { NetworkWidget } from "./network-widget.component";
import type { SystemTelemetry } from "./telemetry.types";

export function TelemetryBar({ telemetry }: { telemetry: SystemTelemetry | null }) {
  if (!telemetry) {
    return null;
  }
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        <CpuWidget cpu={telemetry.cpu} memory={telemetry.memory} />
        <GpuWidget gpus={telemetry.gpus} />
        <NetworkWidget network={telemetry.network} />
      </div>
    </TooltipProvider>
  );
}
```

Do not wrap each chip in its own `TooltipProvider`. Do not use raw `<button>` for chips.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/telemetry-widgets.test.tsx`
Expected: PASS. If hover is flaky under jsdom, set `TooltipProvider delayDuration={0}` in the CPU test wrapper only — do not change production delay.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/telemetry/telemetry-meter.component.tsx apps/terminal/src/modules/telemetry/cpu-widget.component.tsx apps/terminal/src/modules/telemetry/gpu-widget.component.tsx apps/terminal/src/modules/telemetry/network-widget.component.tsx apps/terminal/src/modules/telemetry/telemetry-bar.component.tsx apps/terminal/tests/unit/telemetry-widgets.test.tsx
git commit -m "feat(terminal): add statusbar telemetry chips and rich Nord tooltips"
```

---

### Task 6: Side-panel toggle, Ctrl+B, and statusbar layout

**Files:**
- Create: `apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx`
- Create: `apps/terminal/tests/unit/side-panel-toggle.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.types.ts`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Modify: `apps/terminal/tests/unit/app.component.test.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`

**Interfaces:**
- Consumes: `<SidePanel open />`, `<SidePanelToggle isOpen onToggle />`, `useSystemTelemetry()`, `<TelemetryBar />`
- Produces: collapsed-but-mounted side panel; window `Ctrl+B` / `Cmd+B`; xterm does not send that combo to the PTY

- [ ] **Step 1: Write failing tests**

Create `apps/terminal/tests/unit/side-panel-toggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SidePanelToggle } from "../../src/modules/side-panel/side-panel-toggle.component";

describe("SidePanelToggle", () => {
  it("labels collapse vs expand", () => {
    const { rerender } = render(<SidePanelToggle isOpen={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Collapse side panel \(Ctrl\+B\)/i })).toBeInTheDocument();
    rerender(<SidePanelToggle isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Expand side panel \(Ctrl\+B\)/i })).toBeInTheDocument();
  });

  it("calls onToggle on click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SidePanelToggle isOpen={true} onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: /side panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

In `side-panel.test.tsx`, add:

```tsx
  it("collapses to zero width when open is false and stays mounted", async () => {
    render(
      <ConfigProvider>
        <SidePanel open={false} />
      </ConfigProvider>,
    );
    const aside = await screen.findByRole("complementary", { hidden: true });
    expect(aside).toHaveAttribute("data-slot", "side-panel");
    expect(aside).toHaveAttribute("aria-hidden", "true");
    expect(aside.style.width).toBe("0px");
  });
```

In `app.component.test.tsx`, mock telemetry so App does not hit a missing module:

```ts
vi.mock("../../src/modules/ipc/ipc.telemetry", () => ({
  getSystemTelemetry: vi.fn(() =>
    Promise.resolve({
      cpu: { brand: "CPU", overallUsage: 10, coreCount: 1, coreUsages: [10], frequencyMhz: 1000 },
      gpus: [],
      network: { rxBytesPerSec: 0, txBytesPerSec: 0, totalRxBytes: 0, totalTxBytes: 0 },
      memory: { usedBytes: 1, totalBytes: 2, usagePercent: 50 },
    }),
  ),
}));
```

Add tests:

```tsx
  it("does not show shell size in the statusbar", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(APP_TITLE);
    });
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("pwsh");
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("×");
  });

  it("toggles the side panel with the statusbar button and Ctrl+B", async () => {
    const user = userEvent.setup();
    render(<App />);
    const toggle = await screen.findByRole("button", { name: /Collapse side panel/i });
    expect(screen.getByRole("complementary")).not.toHaveAttribute("aria-hidden", "true");
    await user.click(toggle);
    expect(screen.getByRole("complementary", { hidden: true })).toHaveAttribute("aria-hidden", "true");
    await user.keyboard("{Control>}b{/Control}");
    expect(screen.getByRole("complementary")).not.toHaveAttribute("aria-hidden", "true");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel-toggle.test.tsx tests/unit/side-panel.test.tsx tests/unit/app.component.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement toggle, collapse, shortcut, and layout**

`side-panel.types.ts`:

```ts
export type SidePanelTabId = "files" | "assistant" | "config";

export interface SidePanelProps {
  open?: boolean;
}
```

`SidePanel({ open = true }: SidePanelProps)`: when `open` is false, set `aria-hidden="true"`, `style={{ width: 0 }}`, and classes `overflow-hidden border-r-0` (keep `data-slot="side-panel"`). Do not unmount tabs or reset `selected` / `width`.

`side-panel-toggle.component.tsx`: kit `Button` `variant="ghost"` `size="icon-xs"`, Lucide `PanelLeftClose` when open and `PanelLeft` when closed, `aria-label` matching the tests, wrapped in `Tooltip` / `TooltipContent` with the same label. `className="rounded-none text-muted-foreground hover:text-foreground"`.

`app.component.tsx` `AppShellFrame`:

```tsx
const { telemetry } = useSystemTelemetry();
const [sidePanelOpen, setSidePanelOpen] = React.useState(true);
const toggleSidePanel = React.useCallback(() => {
  setSidePanelOpen((open) => !open);
}, []);

React.useEffect(() => {
  function onKeyDown(event: KeyboardEvent) {
    if (event.isComposing) {
      return;
    }
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
      return;
    }
    if (event.key !== "b" && event.key !== "B") {
      return;
    }
    event.preventDefault();
    toggleSidePanel();
  }
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [toggleSidePanel]);
```

`sidebar={<SidePanel open={sidePanelOpen} />}`

`statusbarStart`:

```tsx
<div className="flex min-w-0 items-center gap-2">
  <SidePanelToggle isOpen={sidePanelOpen} onToggle={toggleSidePanel} />
  <span className="truncate text-muted-foreground">{cwd ?? ""}</span>
</div>
```

`statusbarEnd={<TelemetryBar telemetry={telemetry} />}`.

In `terminal.component.tsx` `attachCustomKeyEventHandler`, add `b` / `B` to the existing Ctrl (no Alt/Meta) list that returns `false` (same block as `t` / `w` / `Tab` / digits). Also treat `event.metaKey && (key === "b" || key === "B")` as `false` so Cmd+B never reaches the PTY.

- [ ] **Step 4: Run Terminal and ui-kit tests**

Run:

```bash
pnpm --filter @gencore/terminal test
pnpm --filter @gencore/ui-kit test -- tests/primitives/tooltip/tooltip.variants.test.ts
cargo test -p gencore-core
```

Expected: ALL PASS.

- [ ] **Step 5: Workspace verification**

Run:

```bash
pnpm turbo run lint typecheck test
cargo clippy --workspace --all-targets -- -D warnings
```

Expected: PASS, zero errors, zero warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/terminal/src/modules/side-panel/side-panel-toggle.component.tsx apps/terminal/src/modules/side-panel/side-panel.types.ts apps/terminal/src/modules/side-panel/side-panel.component.tsx apps/terminal/src/modules/app/app.component.tsx apps/terminal/src/modules/terminal/terminal.component.tsx apps/terminal/tests/unit/side-panel-toggle.test.tsx apps/terminal/tests/unit/side-panel.test.tsx apps/terminal/tests/unit/app.component.test.tsx
git commit -m "feat(terminal): toggle the side panel from the statusbar and Ctrl+B"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| `get_system_telemetry` in gencore-core, not a Terminal plugin | 1 |
| sysinfo CPU/RAM/network | 1 |
| DXGI + PDH GPU, at most one iGPU and one dGPU | 1 |
| Never invent a GPU adapter | 1 (`collect_gpus` error → `[]`) |
| Isolation empty-arg + Terminal-only grant | 2 |
| 1s poll, pause when hidden, last-good snapshot | 3 |
| Chip style A + load tones | 3 (`loadTone`) + 5 |
| Flat `rich` tooltip, both themes | 4 + 5 |
| Keep cwd, drop shell size | 6 |
| Toggle, keep mounted, start open, no persist | 6 |
| Ctrl/Cmd+B always, including xterm; skip IME | 6 |
| ui-kit changeset only | 4 |
| Explorer untouched | all |

**Placeholder scan:** PDH overlay is specified as real counter aggregation with a documented fallback (leave 0.0 on real DXGI adapters). No TBD. No “similar to Task N”.

**Type consistency:** camelCase DTO fields match TS `overallUsage`, `coreUsages`, `frequencyMhz`, `rxBytesPerSec`, `GpuKind` `"integrated" | "dedicated"`. Command string is `plugin:gencore-core|get_system_telemetry` in IPC, Isolation, and tests.
