use gencore_git::{git_commit, git_get_diff, git_get_status, git_init_repo, git_stage_file};
use std::fs;
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

#[test]
fn test_git_get_diff_root_and_nested() {
    let temp = TempDir::new().unwrap();
    let repo_path = temp.path().to_string_lossy().to_string();

    git_init_repo(repo_path.clone()).unwrap();

    // Create initial root file and nested file
    let root_file = temp.path().join("LICENSE");
    fs::write(&root_file, "Initial License Content\n").unwrap();

    let nested_dir = temp.path().join("src").join("nested");
    fs::create_dir_all(&nested_dir).unwrap();
    let nested_file = nested_dir.join("main.rs");
    fs::write(&nested_file, "fn main() {}\n").unwrap();

    // Stage and commit initial files
    git_stage_file(repo_path.clone(), "LICENSE".to_string()).unwrap();
    git_stage_file(repo_path.clone(), "src/nested/main.rs".to_string()).unwrap();
    git_commit(repo_path.clone(), "Initial commit".to_string(), false).unwrap();

    // Modify both files
    fs::write(&root_file, "Modified License Content\nAdded line\n").unwrap();
    fs::write(&nested_file, "fn main() {\n    println!(\"hello\");\n}\n").unwrap();

    // Test diff for root file
    let diff_root = git_get_diff(repo_path.clone(), "LICENSE".to_string()).unwrap();
    assert_eq!(diff_root.head_content, "Initial License Content\n");
    assert_eq!(
        diff_root.working_content,
        "Modified License Content\nAdded line\n"
    );

    // Test diff for nested file with POSIX path
    let diff_nested_posix =
        git_get_diff(repo_path.clone(), "src/nested/main.rs".to_string()).unwrap();
    assert_eq!(diff_nested_posix.head_content, "fn main() {}\n");
    assert_eq!(
        diff_nested_posix.working_content,
        "fn main() {\n    println!(\"hello\");\n}\n"
    );

    // Test diff for nested file with Windows-style backslashes if passed
    let diff_nested_win =
        git_get_diff(repo_path.clone(), "src\\nested\\main.rs".to_string()).unwrap();
    assert_eq!(diff_nested_win.head_content, "fn main() {}\n");
    assert_eq!(
        diff_nested_win.working_content,
        "fn main() {\n    println!(\"hello\");\n}\n"
    );
}
