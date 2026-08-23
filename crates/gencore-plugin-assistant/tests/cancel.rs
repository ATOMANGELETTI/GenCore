//! Generation-scoped cancel flags for in-flight Gemini turns.

use gencore_assistant::{begin_turn, cancel_active_turn, is_turn_cancelled, take_turn_cancelled};

fn unique_id(label: &str) -> String {
    format!(
        "{label}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0)
    )
}

#[test]
fn cancel_marks_only_the_active_generation() {
    let id = unique_id("cancel-active");
    let generation = begin_turn(&id);
    assert!(!is_turn_cancelled(&id, generation));
    cancel_active_turn(&id);
    assert!(is_turn_cancelled(&id, generation));
}

#[test]
fn a_new_turn_is_not_cancelled_by_the_previous_generation() {
    let id = unique_id("cancel-next");
    let first = begin_turn(&id);
    cancel_active_turn(&id);
    let second = begin_turn(&id);
    assert!(is_turn_cancelled(&id, first));
    assert!(!is_turn_cancelled(&id, second));
}

#[test]
fn take_clears_only_that_generation_so_a_retry_can_run() {
    let id = unique_id("cancel-take");
    let first = begin_turn(&id);
    cancel_active_turn(&id);
    assert!(take_turn_cancelled(&id, first));
    assert!(!is_turn_cancelled(&id, first));

    let second = begin_turn(&id);
    assert!(!is_turn_cancelled(&id, second));
    assert!(!take_turn_cancelled(&id, second));
}

#[test]
fn cancel_without_an_active_turn_is_a_noop() {
    let id = unique_id("cancel-idle");
    cancel_active_turn(&id);
    assert!(!is_turn_cancelled(&id, 1));
}
