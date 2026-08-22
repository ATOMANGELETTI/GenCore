const COMMANDS: &[&str] = &[
    "get_app_info",
    "load_pinned_tabs",
    "save_pinned_tabs",
    "tray_action",
    "get_system_telemetry",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
