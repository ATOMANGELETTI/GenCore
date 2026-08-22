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
