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
