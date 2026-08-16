const COMMANDS: &[&str] = &["list", "stat", "watch"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
