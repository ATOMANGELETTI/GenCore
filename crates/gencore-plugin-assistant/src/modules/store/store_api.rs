use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, Row, params};
use uuid::Uuid;

use super::store_error::StoreError;
use super::store_schema::apply_schema;

const DEFAULT_CONVERSATION_TITLE: &str = "New chat";

const SEED_FACTS: &[(&str, &str)] = &[
    ("product.identifier", "com.gencore.terminal"),
    ("product.name", "GenCore Terminal"),
    ("ui.panels", "files,assistant,config"),
    ("pty.backend", "portable-pty"),
    ("pty.confirm", "propose-and-confirm"),
    (
        "shell.note",
        r"Do not pass Windows \\?\\ verbatim paths into PowerShell.",
    ),
    (
        "pty.prompt",
        "Oh My Posh 2-line Powerline; frost ❯ fallback if the exe is missing or zero-byte.",
    ),
    (
        "ui.theme",
        "Nord Polar Night / Snow Storm; Polar Night if theme IPC fails.",
    ),
];

/// Portable SQLite store for assistant conversations, facts, and settings.
pub struct AssistantStore {
    conn: Connection,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ToolCall {
    pub id: String,
    pub conversation_id: String,
    pub message_id: Option<String>,
    pub name: String,
    pub args_json: String,
    pub status: String,
    pub result_json: Option<String>,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Snapshot {
    pub id: String,
    pub conversation_id: String,
    pub message_id: Option<String>,
    pub cwd: Option<String>,
    pub active_session_id: Option<String>,
    pub active_tab_id: Option<String>,
    pub tabs_json: String,
    pub files_selection_json: Option<String>,
    pub output_excerpt: String,
    pub created_at: i64,
}

impl Conversation {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            title: row.get("title")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

impl Message {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            conversation_id: row.get("conversation_id")?,
            role: row.get("role")?,
            content: row.get("content")?,
            created_at: row.get("created_at")?,
        })
    }
}

impl ToolCall {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            conversation_id: row.get("conversation_id")?,
            message_id: row.get("message_id")?,
            name: row.get("name")?,
            args_json: row.get("args_json")?,
            status: row.get("status")?,
            result_json: row.get("result_json")?,
            created_at: row.get("created_at")?,
            resolved_at: row.get("resolved_at")?,
        })
    }
}

impl Snapshot {
    /// Builds a snapshot row for `conversation_id`. `id` and `created_at` are filled on insert.
    pub fn for_conversation(conversation_id: impl Into<String>) -> Self {
        Self {
            id: String::new(),
            conversation_id: conversation_id.into(),
            message_id: None,
            cwd: None,
            active_session_id: None,
            active_tab_id: None,
            tabs_json: "[]".to_string(),
            files_selection_json: None,
            output_excerpt: String::new(),
            created_at: 0,
        }
    }

    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            conversation_id: row.get("conversation_id")?,
            message_id: row.get("message_id")?,
            cwd: row.get("cwd")?,
            active_session_id: row.get("active_session_id")?,
            active_tab_id: row.get("active_tab_id")?,
            tabs_json: row.get("tabs_json")?,
            files_selection_json: row.get("files_selection_json")?,
            output_excerpt: row.get("output_excerpt")?,
            created_at: row.get("created_at")?,
        })
    }
}

impl AssistantStore {
    /// Opens `path`, creating the parent directory and v1 schema when needed.
    pub fn open(path: &Path) -> Result<Self, StoreError> {
        if let Some(parent) = path.parent()
            && !parent.as_os_str().is_empty()
        {
            std::fs::create_dir_all(parent).map_err(|_| StoreError::DataDir)?;
        }
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "foreign_keys", true)?;
        apply_schema(&conn)?;
        Ok(Self { conn })
    }

    pub fn create_conversation(&self) -> Result<Conversation, StoreError> {
        let id = Uuid::new_v4().to_string();
        let now = unix_now();
        self.conn.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, DEFAULT_CONVERSATION_TITLE, now, now],
        )?;
        Ok(Conversation {
            id,
            title: DEFAULT_CONVERSATION_TITLE.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub fn list_conversations(&self) -> Result<Vec<Conversation>, StoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, created_at, updated_at
             FROM conversations
             ORDER BY updated_at DESC, created_at DESC",
        )?;
        let rows = stmt.query_map([], Conversation::from_row)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_conversation(&self, id: &str) -> Result<Option<Conversation>, StoreError> {
        self.conn
            .query_row(
                "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?1",
                [id],
                Conversation::from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn set_conversation_title(&self, id: &str, title: &str) -> Result<(), StoreError> {
        self.require_conversation(id)?;
        let now = unix_now();
        self.conn.execute(
            "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id],
        )?;
        Ok(())
    }

    pub fn delete_conversation(&self, id: &str) -> Result<(), StoreError> {
        self.require_conversation(id)?;
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("DELETE FROM snapshots WHERE conversation_id = ?1", [id])?;
        tx.execute("DELETE FROM tool_calls WHERE conversation_id = ?1", [id])?;
        tx.execute("DELETE FROM messages WHERE conversation_id = ?1", [id])?;
        tx.execute("DELETE FROM conversations WHERE id = ?1", [id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn insert_message(
        &self,
        conversation_id: &str,
        role: &str,
        content: &str,
    ) -> Result<Message, StoreError> {
        self.require_conversation(conversation_id)?;
        let id = Uuid::new_v4().to_string();
        let now = unix_now();
        let tx = self.conn.unchecked_transaction()?;
        tx.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, conversation_id, role, content, now],
        )?;
        tx.execute(
            "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
            params![now, conversation_id],
        )?;
        tx.commit()?;
        Ok(Message {
            id,
            conversation_id: conversation_id.to_string(),
            role: role.to_string(),
            content: content.to_string(),
            created_at: now,
        })
    }

    pub fn list_messages(&self, conversation_id: &str) -> Result<Vec<Message>, StoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, conversation_id, role, content, created_at
             FROM messages
             WHERE conversation_id = ?1
             ORDER BY created_at ASC, id ASC",
        )?;
        let rows = stmt.query_map([conversation_id], Message::from_row)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn insert_tool_call(
        &self,
        conversation_id: &str,
        message_id: Option<&str>,
        name: &str,
        args_json: &str,
    ) -> Result<String, StoreError> {
        self.require_conversation(conversation_id)?;
        let id = Uuid::new_v4().to_string();
        let now = unix_now();
        self.conn.execute(
            "INSERT INTO tool_calls (
                id, conversation_id, message_id, name, args_json, status, result_json, created_at, resolved_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', NULL, ?6, NULL)",
            params![id, conversation_id, message_id, name, args_json, now],
        )?;
        Ok(id)
    }

    pub fn get_tool_call(&self, id: &str) -> Result<Option<ToolCall>, StoreError> {
        self.conn
            .query_row(
                "SELECT id, conversation_id, message_id, name, args_json, status, result_json, created_at, resolved_at
                 FROM tool_calls
                 WHERE id = ?1",
                [id],
                ToolCall::from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn set_tool_status(
        &self,
        id: &str,
        status: &str,
        result_json: Option<&str>,
    ) -> Result<(), StoreError> {
        let resolved_at = if status == "pending" {
            None
        } else {
            Some(unix_now())
        };
        let updated = self.conn.execute(
            "UPDATE tool_calls SET status = ?1, result_json = ?2, resolved_at = ?3 WHERE id = ?4",
            params![status, result_json, resolved_at, id],
        )?;
        if updated == 0 {
            return Err(StoreError::Sqlite("unknown tool call".into()));
        }
        Ok(())
    }

    pub fn insert_snapshot(&self, snapshot: &Snapshot) -> Result<Snapshot, StoreError> {
        self.require_conversation(&snapshot.conversation_id)?;
        let id = Uuid::new_v4().to_string();
        let now = unix_now();
        self.conn.execute(
            "INSERT INTO snapshots (
                id, conversation_id, message_id, cwd, active_session_id, active_tab_id,
                tabs_json, files_selection_json, output_excerpt, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                id,
                snapshot.conversation_id,
                snapshot.message_id,
                snapshot.cwd,
                snapshot.active_session_id,
                snapshot.active_tab_id,
                snapshot.tabs_json,
                snapshot.files_selection_json,
                snapshot.output_excerpt,
                now
            ],
        )?;
        Ok(Snapshot {
            id,
            conversation_id: snapshot.conversation_id.clone(),
            message_id: snapshot.message_id.clone(),
            cwd: snapshot.cwd.clone(),
            active_session_id: snapshot.active_session_id.clone(),
            active_tab_id: snapshot.active_tab_id.clone(),
            tabs_json: snapshot.tabs_json.clone(),
            files_selection_json: snapshot.files_selection_json.clone(),
            output_excerpt: snapshot.output_excerpt.clone(),
            created_at: now,
        })
    }

    pub fn latest_snapshot(&self, conversation_id: &str) -> Result<Option<Snapshot>, StoreError> {
        self.conn
            .query_row(
                "SELECT id, conversation_id, message_id, cwd, active_session_id, active_tab_id,
                        tabs_json, files_selection_json, output_excerpt, created_at
                 FROM snapshots
                 WHERE conversation_id = ?1
                 ORDER BY created_at DESC, id DESC
                 LIMIT 1",
                [conversation_id],
                Snapshot::from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn get_fact(&self, key: &str) -> Result<Option<String>, StoreError> {
        self.get_kv("app_facts", key)
    }

    /// All seeded/learned facts, ordered by key, for the turn loop's system prompt.
    pub fn list_facts(&self) -> Result<Vec<(String, String)>, StoreError> {
        let mut stmt = self
            .conn
            .prepare("SELECT key, value FROM app_facts ORDER BY key ASC")?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn set_fact(&self, key: &str, value: &str) -> Result<(), StoreError> {
        let now = unix_now();
        self.conn.execute(
            "INSERT INTO app_facts (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value, now],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, StoreError> {
        self.get_kv("settings", key)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), StoreError> {
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn put_secret(&self, key: &str, blob: &[u8]) -> Result<(), StoreError> {
        let now = unix_now();
        self.conn.execute(
            "INSERT INTO secrets (key, dpapi_blob, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET
                dpapi_blob = excluded.dpapi_blob,
                updated_at = excluded.updated_at",
            params![key, blob, now],
        )?;
        Ok(())
    }

    pub fn get_secret(&self, key: &str) -> Result<Option<Vec<u8>>, StoreError> {
        self.conn
            .query_row(
                "SELECT dpapi_blob FROM secrets WHERE key = ?1",
                [key],
                |row| row.get(0),
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn has_secret(&self, key: &str) -> Result<bool, StoreError> {
        Ok(self.get_secret(key)?.is_some())
    }

    pub fn clear_secret(&self, key: &str) -> Result<(), StoreError> {
        self.conn
            .execute("DELETE FROM secrets WHERE key = ?1", [key])?;
        Ok(())
    }

    fn get_kv(&self, table: &str, key: &str) -> Result<Option<String>, StoreError> {
        let sql = match table {
            "app_facts" => "SELECT value FROM app_facts WHERE key = ?1",
            "settings" => "SELECT value FROM settings WHERE key = ?1",
            _ => return Err(StoreError::Sqlite("unknown key-value table".into())),
        };
        self.conn
            .query_row(sql, [key], |row| row.get(0))
            .optional()
            .map_err(Into::into)
    }

    fn require_conversation(&self, id: &str) -> Result<(), StoreError> {
        let exists: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM conversations WHERE id = ?1",
            [id],
            |row| row.get(0),
        )?;
        if exists == 0 {
            Err(StoreError::UnknownConversation)
        } else {
            Ok(())
        }
    }
}

/// Writes the v1 GenCore Terminal product notes into `app_facts`.
pub fn seed_app_facts(store: &AssistantStore) -> Result<(), StoreError> {
    for (key, value) in SEED_FACTS {
        store.set_fact(key, value)?;
    }
    Ok(())
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}
