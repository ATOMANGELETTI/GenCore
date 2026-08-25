const COMMANDS: &[&str] = &[
    "list",
    "list_drives",
    "create_file",
    "create_dir",
    "stat",
    "rename",
    "delete",
    "copy",
    "move_paths",
    "watch",
    "unwatch",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
