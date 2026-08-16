const COMMANDS: &[&str] = &["get_app_info"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
