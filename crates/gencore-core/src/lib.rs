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
    PdhEngineSample, SystemTelemetry, TelemetryError, TelemetryState, apply_pdh_utilization,
    classify_gpu, get_system_telemetry, pick_gpus,
};
pub use modules::theme_icon::{
    MAIN_TRAY_ID, SetThemeIconArgs, ThemeIconError, ThemeName, app_theme_icons, set_theme_icon,
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
            get_system_telemetry,
            set_theme_icon
        ])
        .setup(|app, _api| {
            app.manage(TelemetryState::new());
            Ok(())
        })
        .build()
}
