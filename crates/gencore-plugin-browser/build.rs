const COMMANDS: &[&str] = &[
    "create_tab_webview",
    "close_tab_webview",
    "navigate_tab_webview",
    "eval_tab_webview",
    "load_bookmarks",
    "save_bookmarks",
    "load_history",
    "save_history",
    "load_downloads",
    "save_downloads",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
