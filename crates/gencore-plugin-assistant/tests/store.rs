use std::path::PathBuf;

use gencore_assistant::resolve_data_dir;
use gencore_assistant::sqlite_path;

#[test]
fn data_dir_prefers_gencore_data_dir_env() {
    let exe_parent = PathBuf::from(r"C:\does-not-matter");
    unsafe { std::env::set_var("GENCORE_DATA_DIR", r"C:\tmp\gencore-data") };
    let dir = resolve_data_dir(&exe_parent);
    unsafe { std::env::remove_var("GENCORE_DATA_DIR") };
    assert_eq!(dir, PathBuf::from(r"C:\tmp\gencore-data"));
}

#[test]
fn data_dir_falls_back_to_exe_parent_data() {
    unsafe { std::env::remove_var("GENCORE_DATA_DIR") };
    let exe_parent = PathBuf::from(r"C:\GenCore");
    assert_eq!(
        resolve_data_dir(&exe_parent),
        PathBuf::from(r"C:\GenCore\data")
    );
}

#[test]
fn sqlite_file_name_is_gencore_assistant() {
    let dir = PathBuf::from(r"C:\GenCore\data");
    assert_eq!(
        sqlite_path(&dir),
        PathBuf::from(r"C:\GenCore\data\gencore-assistant.sqlite")
    );
}
