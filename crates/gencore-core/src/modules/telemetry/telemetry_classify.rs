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
