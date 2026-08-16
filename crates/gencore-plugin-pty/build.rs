const COMMANDS: &[&str] = &["open", "write", "resize", "close"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
