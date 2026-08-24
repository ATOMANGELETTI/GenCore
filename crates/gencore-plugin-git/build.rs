const COMMANDS: &[&str] = &[
    "git_get_status",
    "git_stage_file",
    "git_unstage_file",
    "git_stage_all",
    "git_unstage_all",
    "git_discard_changes",
    "git_commit",
    "git_init_repo",
    "git_get_diff",
    "git_get_log",
    "git_list_branches",
    "git_checkout_branch",
    "git_create_branch",
    "git_stash_save",
    "git_stash_pop",
    "git_pick_folder",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
