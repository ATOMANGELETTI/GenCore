//! Generation-scoped cancel flags for in-flight Gemini turns.
//!
//! A conversation-only set would cancel the *next* send if the user cancelled
//! and immediately retried. Each `begin_turn` issues a new generation; cancel
//! marks only that generation.

use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

struct TurnCancelState {
    next_generation: u64,
    active: HashMap<String, u64>,
    cancelled: HashMap<String, u64>,
}

static TURN_CANCEL: LazyLock<Mutex<TurnCancelState>> = LazyLock::new(|| {
    Mutex::new(TurnCancelState {
        next_generation: 0,
        active: HashMap::new(),
        cancelled: HashMap::new(),
    })
});

/// Starts a new in-flight generation for `conversation_id` and returns its id.
pub fn begin_turn(conversation_id: &str) -> u64 {
    let Ok(mut state) = TURN_CANCEL.lock() else {
        return 0;
    };
    state.next_generation = state.next_generation.saturating_add(1);
    let generation = state.next_generation;
    state.active.insert(conversation_id.to_string(), generation);
    generation
}

/// Marks the conversation's *current* generation cancelled. No-op if idle.
pub fn cancel_active_turn(conversation_id: &str) {
    let Ok(mut state) = TURN_CANCEL.lock() else {
        return;
    };
    if let Some(&generation) = state.active.get(conversation_id) {
        state
            .cancelled
            .insert(conversation_id.to_string(), generation);
    }
}

/// Non-consuming check used while an SSE body is being read.
pub fn is_turn_cancelled(conversation_id: &str, generation: u64) -> bool {
    TURN_CANCEL
        .lock()
        .map(|state| state.cancelled.get(conversation_id) == Some(&generation))
        .unwrap_or(false)
}

/// Consumes the cancel flag for this generation so a later turn can run.
pub fn take_turn_cancelled(conversation_id: &str, generation: u64) -> bool {
    let Ok(mut state) = TURN_CANCEL.lock() else {
        return false;
    };
    let cancelled = state.cancelled.get(conversation_id) == Some(&generation);
    if state.active.get(conversation_id) == Some(&generation) {
        state.active.remove(conversation_id);
    }
    if cancelled {
        state.cancelled.remove(conversation_id);
    }
    cancelled
}
