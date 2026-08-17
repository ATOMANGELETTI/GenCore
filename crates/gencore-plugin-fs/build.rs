const COMMANDS: &[&str] = &["list", "list_drives", "stat", "watch"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
