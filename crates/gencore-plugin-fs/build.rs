const COMMANDS: &[&str] = &[
    "list",
    "list_drives",
    "create_file",
    "create_dir",
    "stat",
    "watch",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
