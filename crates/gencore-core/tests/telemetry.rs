use gencore_core::{
    CpuTelemetry, GpuCandidate, GpuKind, GpuTelemetry, MemoryTelemetry, NetworkTelemetry,
    PdhEngineSample, SystemTelemetry, TelemetryError, apply_pdh_utilization, classify_gpu,
    pick_gpus,
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
fn unmatched_pdh_fallback_targets_kept_dedicated_gpu() {
    let mut gpus = vec![
        gpu("dgpu-small", GpuKind::Dedicated, 4_000),
        gpu("dgpu-big", GpuKind::Dedicated, 12_000),
    ];
    gpus[0].utilization = 0.0;
    gpus[1].utilization = 0.0;

    apply_pdh_utilization(
        &mut gpus,
        &[(1, 1), (2, 2)],
        &[
            PdhEngineSample {
                luid: None,
                value: 40.0,
            },
            PdhEngineSample {
                luid: None,
                value: 60.0,
            },
        ],
    );

    let picked = pick_gpus(gpus);
    assert_eq!(picked.len(), 1);
    assert_eq!(picked[0].id, "dgpu-big");
    assert_eq!(picked[0].utilization, 50.0);
}

#[test]
fn telemetry_error_displays() {
    let err = TelemetryError::LockPoisoned;
    assert_eq!(err.to_string(), "telemetry collector lock poisoned");
}
