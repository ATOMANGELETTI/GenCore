#[cfg(windows)]
use super::telemetry_classify::{classify_gpu, pick_gpus};
#[cfg(not(windows))]
use super::telemetry_types::GpuTelemetry;
#[cfg(windows)]
use super::telemetry_types::{GpuCandidate, GpuKind, GpuTelemetry};

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
        CreateDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, IDXGIFactory1,
    };

    let factory: IDXGIFactory1 = unsafe {
        CreateDXGIFactory1().map_err(|err| {
            super::telemetry_error::TelemetryError::CollectionFailed(err.to_string())
        })?
    };

    let mut found = Vec::new();
    let mut luids = Vec::new();
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
        let is_software = (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32) != 0;
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
            luids.push((desc.AdapterLuid.HighPart, desc.AdapterLuid.LowPart));
        }
        index += 1;
    }

    overlay_pdh_utilization(&mut found, &luids);
    Ok(found)
}

#[cfg(windows)]
fn overlay_pdh_utilization(gpus: &mut [GpuTelemetry], luids: &[(i32, u32)]) {
    // Best-effort: if PDH counters are missing, leave utilization at 0.0 on real adapters.
    // Do not invent extra GPU entries here.
    if gpus.is_empty() {
        return;
    }

    let Some(samples) = collect_pdh_engine_samples() else {
        return;
    };
    if samples.is_empty() {
        return;
    }

    let mut matched_any = false;
    for (gpu, &(high, low)) in gpus.iter_mut().zip(luids.iter()) {
        let mut sum = 0.0_f32;
        let mut count = 0_u32;
        for sample in &samples {
            if sample.luid == Some((high, low)) {
                sum += sample.value;
                count += 1;
            }
        }
        if count > 0 {
            gpu.utilization = (sum / count as f32).clamp(0.0, 100.0);
            matched_any = true;
        }
    }

    if !matched_any {
        let mean = samples.iter().map(|sample| sample.value).sum::<f32>() / samples.len() as f32;
        let target_idx = gpus
            .iter()
            .position(|gpu| gpu.kind == GpuKind::Dedicated)
            .or_else(|| gpus.iter().position(|gpu| gpu.kind == GpuKind::Integrated));
        if let Some(idx) = target_idx {
            gpus[idx].utilization = mean.clamp(0.0, 100.0);
        }
    }
}

#[cfg(windows)]
struct PdhEngineSample {
    luid: Option<(i32, u32)>,
    value: f32,
}

#[cfg(windows)]
struct PdhSession {
    query: windows::Win32::System::Performance::PDH_HQUERY,
    counter: windows::Win32::System::Performance::PDH_HCOUNTER,
}

#[cfg(windows)]
impl Drop for PdhSession {
    fn drop(&mut self) {
        unsafe {
            let _ = windows::Win32::System::Performance::PdhCloseQuery(self.query);
        }
    }
}

// PDH query handles are used only under the session mutex.
#[cfg(windows)]
unsafe impl Send for PdhSession {}

#[cfg(windows)]
fn collect_pdh_engine_samples() -> Option<Vec<PdhEngineSample>> {
    use std::sync::Mutex;

    use windows::Win32::System::Performance::{
        PDH_CSTATUS_VALID_DATA, PDH_FMT_COUNTERVALUE_ITEM_W, PDH_FMT_DOUBLE, PDH_MORE_DATA,
        PdhCollectQueryData, PdhGetFormattedCounterArrayW,
    };

    static SESSION: Mutex<Option<PdhSession>> = Mutex::new(None);

    let mut session = SESSION.lock().ok()?;
    if session.is_none() {
        *session = open_pdh_session();
    }
    let session = session.as_ref()?;

    // SAFETY: `session` is the process-lifetime query created by `open_pdh_session`.
    let status = unsafe { PdhCollectQueryData(session.query) };
    if status != 0 {
        return None;
    }

    let mut buffer_size = 0_u32;
    let mut item_count = 0_u32;
    // SAFETY: first call asks PDH for the required byte size; `None` is the empty buffer.
    let status = unsafe {
        PdhGetFormattedCounterArrayW(
            session.counter,
            PDH_FMT_DOUBLE,
            &mut buffer_size,
            &mut item_count,
            None,
        )
    };
    if status != PDH_MORE_DATA && status != 0 {
        return None;
    }
    if buffer_size == 0 {
        return Some(Vec::new());
    }

    let mut buffer = vec![0_u8; buffer_size as usize];
    // SAFETY: `buffer` is `buffer_size` bytes, matching the size PDH just reported.
    let status = unsafe {
        PdhGetFormattedCounterArrayW(
            session.counter,
            PDH_FMT_DOUBLE,
            &mut buffer_size,
            &mut item_count,
            Some(buffer.as_mut_ptr().cast()),
        )
    };
    if status != 0 {
        return None;
    }

    // SAFETY: PDH filled `item_count` `PDH_FMT_COUNTERVALUE_ITEM_W` values at the start of `buffer`.
    // Instance-name pointers stay inside this same allocation for the rest of the function.
    let items = unsafe {
        std::slice::from_raw_parts(
            buffer.as_ptr().cast::<PDH_FMT_COUNTERVALUE_ITEM_W>(),
            item_count as usize,
        )
    };

    let mut samples = Vec::with_capacity(item_count as usize);
    for item in items {
        if item.FmtValue.CStatus != PDH_CSTATUS_VALID_DATA {
            continue;
        }
        // SAFETY: `szName` is a PDH-owned NUL-terminated wide string inside `buffer`.
        let name = unsafe { item.szName.to_string().unwrap_or_default() };
        // SAFETY: `PDH_FMT_DOUBLE` stores the formatted value in `doubleValue`.
        let value = unsafe { item.FmtValue.Anonymous.doubleValue as f32 };
        if value.is_finite() {
            samples.push(PdhEngineSample {
                luid: parse_adapter_luid(&name),
                value,
            });
        }
    }
    Some(samples)
}

#[cfg(windows)]
fn open_pdh_session() -> Option<PdhSession> {
    use windows::Win32::System::Performance::{
        PDH_HCOUNTER, PDH_HQUERY, PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData,
        PdhOpenQueryW,
    };
    use windows::core::{PCWSTR, w};

    unsafe {
        let mut query = PDH_HQUERY::default();
        if PdhOpenQueryW(PCWSTR::null(), 0, &mut query) != 0 {
            return None;
        }
        let mut counter = PDH_HCOUNTER::default();
        let path = w!("\\GPU Engine(*)\\Utilization Percentage");
        if PdhAddEnglishCounterW(query, path, 0, &mut counter) != 0 {
            let _ = PdhCloseQuery(query);
            return None;
        }
        // Prime the rate counter so later collect() calls can format a delta.
        let _ = PdhCollectQueryData(query);
        Some(PdhSession { query, counter })
    }
}

#[cfg(windows)]
fn parse_adapter_luid(instance: &str) -> Option<(i32, u32)> {
    let rest = instance.split("luid_0x").nth(1)?;
    let mut parts = rest.splitn(3, '_');
    let high = u32::from_str_radix(parts.next()?, 16).ok()? as i32;
    let low_token = parts.next()?;
    let low_hex = low_token.strip_prefix("0x")?;
    let low = u32::from_str_radix(low_hex, 16).ok()?;
    Some((high, low))
}
