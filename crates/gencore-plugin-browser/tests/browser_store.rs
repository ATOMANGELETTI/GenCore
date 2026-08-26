use std::fs;
use std::path::PathBuf;

use gencore_browser::{
    BOOKMARKS_FILE_NAME, BROWSER_STORE_JSON_MAX_BYTES, BrowserStoreError, DEFAULT_BOOKMARKS_JSON,
    DEFAULT_DOWNLOADS_JSON, DEFAULT_HISTORY_JSON, read_store_file, store_path, write_store_file,
};

fn temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "gencore-browser-store-{}-{}",
        std::process::id(),
        uuid_like()
    ));
    fs::create_dir_all(&dir).expect("temp dir");
    dir
}

fn uuid_like() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .subsec_nanos() as u64
}

#[test]
fn missing_bookmarks_file_returns_default_json() {
    let path = store_path(&temp_dir().join("missing"), BOOKMARKS_FILE_NAME);
    let json = read_store_file(&path, DEFAULT_BOOKMARKS_JSON).expect("default");
    assert_eq!(json, DEFAULT_BOOKMARKS_JSON);
}

#[test]
fn write_then_read_round_trips() {
    let dir = temp_dir();
    let path = store_path(&dir, BOOKMARKS_FILE_NAME);
    write_store_file(
        &path,
        "{\"version\":1,\"bookmarks\":[{\"url\":\"https://example.com\"}]}",
    )
    .unwrap();
    let json = read_store_file(&path, DEFAULT_BOOKMARKS_JSON).unwrap();
    assert!(json.contains("example.com"));
}

#[test]
fn write_rejects_oversized_payload() {
    let dir = temp_dir();
    let path = store_path(&dir, BOOKMARKS_FILE_NAME);
    let too_big = "x".repeat(BROWSER_STORE_JSON_MAX_BYTES + 1);
    let err = write_store_file(&path, &too_big).unwrap_err();
    assert!(matches!(err, BrowserStoreError::TooLarge));
}

#[test]
fn defaults_are_valid_json_shapes() {
    assert!(DEFAULT_BOOKMARKS_JSON.contains("\"bookmarks\":[]"));
    assert!(DEFAULT_HISTORY_JSON.contains("\"entries\":[]"));
    assert!(DEFAULT_DOWNLOADS_JSON.contains("\"downloads\":[]"));
}
