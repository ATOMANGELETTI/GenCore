use std::fs;
use std::path::PathBuf;

use gencore_browser::unique_destination;

fn temp_dir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "gencore-browser-downloads-{}-{}",
        std::process::id(),
        tag
    ));
    fs::create_dir_all(&dir).expect("temp dir");
    dir
}

#[test]
fn returns_preferred_name_when_free() {
    let dir = temp_dir("free");
    let path = unique_destination(&dir, "report.pdf");
    assert_eq!(path, dir.join("report.pdf"));
}

#[test]
fn suffixes_on_collision() {
    let dir = temp_dir("collision");
    fs::write(dir.join("report.pdf"), b"existing").unwrap();
    let path = unique_destination(&dir, "report.pdf");
    assert_eq!(path, dir.join("report (2).pdf"));
}

#[test]
fn suffixes_increment_past_multiple_collisions() {
    let dir = temp_dir("multi-collision");
    fs::write(dir.join("report.pdf"), b"1").unwrap();
    fs::write(dir.join("report (2).pdf"), b"2").unwrap();
    let path = unique_destination(&dir, "report.pdf");
    assert_eq!(path, dir.join("report (3).pdf"));
}

#[test]
fn handles_names_without_extension() {
    let dir = temp_dir("no-ext");
    fs::write(dir.join("README"), b"1").unwrap();
    let path = unique_destination(&dir, "README");
    assert_eq!(path, dir.join("README (2)"));
}
