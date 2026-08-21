use std::fs;
use std::path::PathBuf;

use gencore_core::{
    DEFAULT_PINNED_TABS_JSON, PINNED_TABS_JSON_MAX_BYTES, PinnedStoreError, SavePinnedTabsArgs,
    pinned_tabs_path, read_pinned_tabs_file, write_pinned_tabs_file,
};

fn temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join(format!("gencore-pinned-{}", std::process::id()));
    fs::create_dir_all(&dir).expect("temp dir");
    dir
}

#[test]
fn missing_file_returns_default_json() {
    let path = pinned_tabs_path(&temp_dir().join("empty-subdir-does-not-exist-yet"));
    let json = read_pinned_tabs_file(&path).expect("default");
    assert_eq!(json, DEFAULT_PINNED_TABS_JSON);
}

#[test]
fn write_then_read_round_trips() {
    let dir = temp_dir();
    let path = pinned_tabs_path(&dir);
    write_pinned_tabs_file(&path, "{\"version\":1,\"activeId\":\"a\",\"tabs\":[]}").unwrap();
    let json = read_pinned_tabs_file(&path).unwrap();
    assert!(json.contains("\"activeId\":\"a\""));
}

#[test]
fn write_rejects_oversized_payload() {
    let dir = temp_dir();
    let path = pinned_tabs_path(&dir);
    let too_big = "x".repeat(PINNED_TABS_JSON_MAX_BYTES + 1);
    let err = write_pinned_tabs_file(&path, &too_big).unwrap_err();
    assert!(matches!(err, PinnedStoreError::TooLarge));
}

#[test]
fn save_args_reject_unknown_fields() {
    let parsed: Result<SavePinnedTabsArgs, _> =
        serde_json::from_value(serde_json::json!({ "json": "{}", "extra": true }));
    assert!(parsed.is_err());
}
