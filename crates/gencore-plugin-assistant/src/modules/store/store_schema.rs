use rusqlite::Connection;

use super::store_error::StoreError;

/// v1 assistant schema. `PRAGMA user_version` is set to 1 after the tables exist.
pub(crate) const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    message_id TEXT,
    name TEXT NOT NULL,
    args_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'ran', 'failed')),
    result_json TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    message_id TEXT,
    cwd TEXT,
    active_session_id TEXT,
    active_tab_id TEXT,
    tabs_json TEXT NOT NULL,
    files_selection_json TEXT,
    output_excerpt TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_facts (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS secrets (
    key TEXT PRIMARY KEY NOT NULL,
    dpapi_blob BLOB NOT NULL,
    updated_at INTEGER NOT NULL
);

PRAGMA user_version = 1;
"#;

pub(crate) fn apply_schema(conn: &Connection) -> Result<(), StoreError> {
    conn.execute_batch(SCHEMA_SQL)?;
    Ok(())
}
