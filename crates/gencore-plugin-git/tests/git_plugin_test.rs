use gencore_git::{git_get_status, git_init_repo};
use tempfile::TempDir;

#[test]
fn test_git_init_and_status() {
    let temp = TempDir::new().unwrap();
    let temp_path = temp.path().to_string_lossy().to_string();

    // Initially not a repo
    let status_before = git_get_status(temp_path.clone()).unwrap();
    assert!(!status_before.is_repo);

    // Init repo
    git_init_repo(temp_path.clone()).unwrap();

    // Now it is a repo
    let status_after = git_get_status(temp_path).unwrap();
    assert!(status_after.is_repo);
    assert_eq!(status_after.staged.len(), 0);
    assert_eq!(status_after.unstaged.len(), 0);
}
