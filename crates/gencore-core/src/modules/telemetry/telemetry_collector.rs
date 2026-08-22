use std::sync::Mutex;
use std::time::Instant;

use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};

use super::telemetry_error::TelemetryError;
use super::telemetry_gpu::collect_gpus;
use super::telemetry_types::{CpuTelemetry, MemoryTelemetry, NetworkTelemetry, SystemTelemetry};

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
        let elapsed = now
            .duration_since(self.last_network_tick)
            .as_secs_f64()
            .max(0.1);
        let (current_rx, current_tx) = sum_network_totals(&self.networks);
        let rx_bytes_per_sec =
            ((current_rx.saturating_sub(self.last_rx_total)) as f64 / elapsed) as u64;
        let tx_bytes_per_sec =
            ((current_tx.saturating_sub(self.last_tx_total)) as f64 / elapsed) as u64;
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
    for data in networks.values() {
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

impl Default for TelemetryState {
    fn default() -> Self {
        Self::new()
    }
}
