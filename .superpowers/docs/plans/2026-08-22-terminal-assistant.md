# Terminal Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Terminal Assistant tab as a propose-and-confirm Gemini chat that persists threads in a portable SQLite database, keeps the API key in Windows DPAPI, and can write the active PTY only after the user approves.

**Architecture:** New plugin crate `gencore-assistant` owns SQLite (`rusqlite` + `spawn_blocking`), DPAPI, Gemini HTTP (`reqwest` on the Tauri async runtime), and the confirm gate. The WebView talks only through `ipc.assistant.ts`. After confirm, Rust writes the PTY via `gencore_pty::write_session`; `switch_tab` / `reveal_in_files` emit `gencore-assistant://ui-action`. Production CSP `connect-src` stays IPC-only.

**Tech Stack:** Tauri 2, React 19.2, Vitest, `rusqlite` (bundled), `reqwest` (rustls), `uuid`, `gencore-pty`, `@gencore/ui-kit` (Button, Input, Separator, DropdownMenu, Tooltip). Gemini Developer API models: `gemini-3.7-flash` (default), `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview`.

**Spec:** `.superpowers/docs/specs/2026-08-22-terminal-assistant-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Plugin folder `crates/gencore-plugin-assistant`; package **and** plugin id `gencore-assistant`. Never `tauri-plugin-*`.
- `{module}.{role}.{ext}` (JS) and `{module}_api.rs` / `{module}_error.rs` (Rust). Tests only under `crates/gencore-plugin-assistant/tests/` and `apps/terminal/tests/`.
- Official Nord tokens only. No ad-hoc hex. Compact Files/Config chrome. Ledger chat look.
- UI talks to Rust only through `src/modules/ipc/`. Isolation reconstructs every payload. Grant `gencore-assistant:allow-*` only after `ipc.assistant.ts` invokes the command.
- Production `connect-src` remains `["ipc:", "http://ipc.localhost"]`. No Gemini origin in CSP.
- Explorer is unchanged. No file create/read agent tools. No RAG. No auto-run.
- `pty_write` `session_id` is stamped from the snapshot, never from Gemini.
- Never return or log the API key. Never commit secrets.
- Terminal is private; **no changeset** unless `@gencore/ui-kit` grows a primitive (it must not).
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers.
- Work in place on the current branch. Do not create a worktree unless asked.
- Superpowers files stay under `.superpowers/docs/`.
- Do not bump major versions.

## SDD model routing

Always pass `model` on Task dispatches. Never `inherit`.

- **Grok** (`cursor-grok-4.6-xhigh-fast`): Tasks 1–3, 8–11 (scaffold, store, UI, Config, docs).
- **Sonnet 5** (`claude-sonnet-5-thinking-high`): Tasks 4–7 (Gemini stream, confirm gate, turn loop, Isolation reconstruct).
- **Opus 5** (`claude-opus-5-thinking-high`): only if Sonnet 5 is stuck on Task 6 or 7. Do not start on Opus.

---

## File map

**Create — crate**

- `crates/gencore-plugin-assistant/Cargo.toml`
- `crates/gencore-plugin-assistant/build.rs`
- `crates/gencore-plugin-assistant/permissions/default.toml`
- `crates/gencore-plugin-assistant/src/lib.rs`
- `crates/gencore-plugin-assistant/src/modules/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/error/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/error/error_error.rs` — `AssistantError`
- `crates/gencore-plugin-assistant/src/modules/store/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/store/store_path.rs` — data dir
- `crates/gencore-plugin-assistant/src/modules/store/store_schema.rs` — migrate + seed
- `crates/gencore-plugin-assistant/src/modules/store/store_api.rs` — CRUD
- `crates/gencore-plugin-assistant/src/modules/store/store_error.rs`
- `crates/gencore-plugin-assistant/src/modules/secrets/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/secrets/secrets_api.rs`
- `crates/gencore-plugin-assistant/src/modules/secrets/secrets_error.rs`
- `crates/gencore-plugin-assistant/src/modules/secrets/secrets_protector.rs` — trait + DPAPI + identity mock
- `crates/gencore-plugin-assistant/src/modules/gemini/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/gemini/gemini_api.rs`
- `crates/gencore-plugin-assistant/src/modules/gemini/gemini_error.rs`
- `crates/gencore-plugin-assistant/src/modules/gemini/gemini_models.rs`
- `crates/gencore-plugin-assistant/src/modules/gemini/gemini_parse.rs`
- `crates/gencore-plugin-assistant/src/modules/agent/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/agent/agent_api.rs` — turn + confirm/reject
- `crates/gencore-plugin-assistant/src/modules/agent/agent_error.rs`
- `crates/gencore-plugin-assistant/src/modules/tools/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/tools/tools_api.rs`
- `crates/gencore-plugin-assistant/src/modules/tools/tools_error.rs`
- `crates/gencore-plugin-assistant/src/modules/assistant/mod.rs`
- `crates/gencore-plugin-assistant/src/modules/assistant/assistant_api.rs` — IPC commands
- `crates/gencore-plugin-assistant/src/modules/assistant/assistant_error.rs`
- `crates/gencore-plugin-assistant/tests/store.rs`
- `crates/gencore-plugin-assistant/tests/secrets.rs`
- `crates/gencore-plugin-assistant/tests/gemini.rs`
- `crates/gencore-plugin-assistant/tests/agent.rs`
- `crates/gencore-plugin-assistant/tests/tools.rs`

**Create — Terminal UI**

- `apps/terminal/src/modules/ipc/ipc.assistant.ts`
- `apps/terminal/src/modules/assistant/assistant.types.ts`
- `apps/terminal/src/modules/assistant/assistant.hook.ts`
- `apps/terminal/src/modules/assistant/assistant.component.tsx`
- `apps/terminal/src/modules/assistant/assistant.snapshot.ts`
- `apps/terminal/src/modules/config/config.agent.ts` — `useAgentSettings`
- `apps/terminal/tests/unit/ipc.assistant.test.ts`
- `apps/terminal/tests/unit/assistant.component.test.tsx`
- `apps/terminal/tests/unit/assistant.hook.test.tsx`
- `apps/terminal/tests/unit/assistant.snapshot.test.ts`
- `apps/terminal/tests/unit/config.agent.test.tsx`

**Modify**

- `Cargo.toml` — workspace member
- `.gitignore` — `.data/`
- `.cursor/rules/architecture.mdc`
- `AGENTS.md`
- `apps/terminal/AGENTS.md`
- `crates/AGENTS.md`
- `.cursor/skills/add-crate-module/SKILL.md` (crate list) then `pnpm sync:agents`
- `apps/terminal/src-tauri/Cargo.toml`
- `apps/terminal/src-tauri/src/lib.rs`
- `apps/terminal/src-tauri/capabilities/main.json`
- `apps/terminal/isolation/isolation.hook.js`
- `apps/terminal/tests/unit/isolation.hook.test.ts`
- `apps/terminal/tests/unit/tauri.conf.test.ts` (assert still no Gemini origin)
- `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- `apps/terminal/tests/unit/side-panel.test.tsx`
- `apps/terminal/src/modules/config/config.component.tsx`
- `apps/terminal/tests/unit/config.component.test.tsx`
- `apps/terminal/src/modules/app/app.component.tsx` — `AgentSettingsProvider`
- `apps/terminal/src/modules/file-tree/file-tree.hook.ts` — expose selection
- `apps/terminal/src/modules/file-tree/file-tree.types.ts`
- `apps/terminal/src/modules/terminal/terminal.types.ts` — `readScrollback`
- `apps/terminal/src/modules/terminal/terminal.hook.ts`
- `scripts/tauri-dev-terminal.mjs` — `GENCORE_DATA_DIR`
- `.superpowers/docs/specs/2026-08-22-terminal-assistant-design.md` (status already `approved`)

**Do not modify** Explorer, `tauri.conf.json` CSP origins, `gencore-fs` grants, or `@gencore/ui-kit` primitives.

---

### Task 1: Plugin crate and data directory

**Files:**
- Create: `crates/gencore-plugin-assistant/Cargo.toml`
- Create: `crates/gencore-plugin-assistant/build.rs`
- Create: `crates/gencore-plugin-assistant/permissions/default.toml`
- Create: `crates/gencore-plugin-assistant/src/lib.rs`
- Create: `crates/gencore-plugin-assistant/src/modules/mod.rs`
- Create: `crates/gencore-plugin-assistant/src/modules/store/mod.rs`
- Create: `crates/gencore-plugin-assistant/src/modules/store/store_path.rs`
- Create: `crates/gencore-plugin-assistant/src/modules/store/store_error.rs`
- Create: `crates/gencore-plugin-assistant/tests/store.rs` (path tests only in this task)
- Modify: `Cargo.toml`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `std::env`, `std::path::PathBuf`
- Produces: `PLUGIN_ID = "gencore-assistant"`; `resolve_data_dir(exe_parent: &Path) -> PathBuf`; `sqlite_path(data_dir: &Path) -> PathBuf`; `StoreError`

- [ ] **Step 1: Write the failing path tests**

Create `crates/gencore-plugin-assistant/tests/store.rs`:

```rust
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
    assert_eq!(resolve_data_dir(&exe_parent), PathBuf::from(r"C:\GenCore\data"));
}

#[test]
fn sqlite_file_name_is_gencore_assistant() {
    let dir = PathBuf::from(r"C:\GenCore\data");
    assert_eq!(
        sqlite_path(&dir),
        PathBuf::from(r"C:\GenCore\data\gencore-assistant.sqlite")
    );
}
```

- [ ] **Step 2: Run the path tests and confirm they fail**

Run: `cargo test -p gencore-assistant --test store`

Expected: FAIL (package `gencore-assistant` not found)

- [ ] **Step 3: Scaffold the crate and implement path helpers**

Add workspace member `"crates/gencore-plugin-assistant"` to root `Cargo.toml`.

Create `crates/gencore-plugin-assistant/Cargo.toml`:

```toml
[package]
name = "gencore-assistant"
version = "0.1.0"
edition.workspace = true
license.workspace = true
authors.workspace = true
repository.workspace = true
description = "Gemini Assistant plugin for GenCore Terminal."
links = "gencore-assistant"

[dependencies]
tauri = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
thiserror = { workspace = true }
rusqlite = { version = "0.39", features = ["bundled"] }
uuid = { version = "1", features = ["v4"] }
reqwest = { version = "0.13", default-features = false, features = ["rustls-tls", "json", "stream"] }
gencore-pty = { path = "../gencore-plugin-pty" }

[target.'cfg(windows)'.dependencies]
windows = { version = "0.62", features = ["Win32_Security_Cryptography", "Win32_Foundation"] }

[dev-dependencies]
tempfile = "3"
serde_json = { workspace = true }

[build-dependencies]
tauri-plugin = { workspace = true, features = ["build"] }
```

Use `cargo add` if 0.39 / 0.13 / 0.62 are not the current stables — do not downgrade, do not use beta tags.

`build.rs` (commands listed now; grants come in Task 7):

```rust
const COMMANDS: &[&str] = &[
    "list_conversations",
    "create_conversation",
    "delete_conversation",
    "list_messages",
    "send_message",
    "cancel_turn",
    "confirm_action",
    "reject_action",
    "get_agent_settings",
    "set_agent_settings",
    "set_api_key",
    "clear_api_key",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
```

`permissions/default.toml`:

```toml
"$schema" = "schemas/schema.json"

[default]
description = "No commands are enabled by default for the gencore-assistant plugin."
permissions = []
```

`store_error.rs`:

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("assistant data directory is unavailable")]
    DataDir,
    #[error("{0}")]
    Sqlite(String),
}

impl serde::Serialize for StoreError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
```

`store_path.rs`:

```rust
use std::path::{Path, PathBuf};

pub fn resolve_data_dir(exe_parent: &Path) -> PathBuf {
    if let Ok(dir) = std::env::var("GENCORE_DATA_DIR") {
        let trimmed = dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    exe_parent.join("data")
}

pub fn sqlite_path(data_dir: &Path) -> PathBuf {
    data_dir.join("gencore-assistant.sqlite")
}
```

Export `resolve_data_dir` and `sqlite_path` from `lib.rs`. `init()` may register an empty handler list until Task 7, but `PLUGIN_ID` must be `"gencore-assistant"`.

Append to `.gitignore`:

```
.data/
```

- [ ] **Step 4: Run the path tests and confirm they pass**

Run: `cargo test -p gencore-assistant --test store`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add Cargo.toml .gitignore crates/gencore-plugin-assistant
git commit -m "feat(assistant): scaffold gencore-assistant plugin and data dir"
```

---

### Task 2: SQLite schema, conversations, and app facts

**Files:**
- Create: `crates/gencore-plugin-assistant/src/modules/store/store_schema.rs`
- Create: `crates/gencore-plugin-assistant/src/modules/store/store_api.rs`
- Modify: `crates/gencore-plugin-assistant/src/modules/store/mod.rs`
- Modify: `crates/gencore-plugin-assistant/tests/store.rs`

**Interfaces:**
- Consumes: `resolve_data_dir`, `sqlite_path`, `rusqlite`
- Produces: `AssistantStore::open(path) -> Result<Self, StoreError>`; `create_conversation() -> Conversation`; `list_conversations() -> Vec<Conversation>`; `delete_conversation(id)`; `insert_message(...)`; `list_messages(id)`; `insert_tool_call(...)`; `get_tool_call(id)`; `set_tool_status(...)`; `insert_snapshot(...)`; `latest_snapshot(conversation_id)`; `get_fact(key)`; `set_setting` / `get_setting`; `seed_app_facts()`

```rust
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String, // user | assistant | tool
    pub content: String,
    pub created_at: i64,
}

pub struct ToolCall {
    pub id: String,
    pub conversation_id: String,
    pub message_id: Option<String>,
    pub name: String,
    pub args_json: String,
    pub status: String, // pending | approved | rejected | ran | failed
    pub result_json: Option<String>,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
}
```

- [ ] **Step 1: Write the failing store tests**

Append to `crates/gencore-plugin-assistant/tests/store.rs`:

```rust
use gencore_assistant::{AssistantStore, seed_app_facts};

#[test]
fn open_migrates_and_round_trips_a_conversation() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    let created = store.create_conversation().unwrap();
    assert!(!created.id.is_empty());
    store
        .insert_message(&created.id, "user", "list files")
        .unwrap();
    let listed = store.list_conversations().unwrap();
    assert_eq!(listed.len(), 1);
    let messages = store.list_messages(&created.id).unwrap();
    assert_eq!(messages[0].content, "list files");
}

#[test]
fn seed_facts_include_product_identifier() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    let value = store.get_fact("product.identifier").unwrap().unwrap();
    assert_eq!(value, "com.gencore.terminal");
}

#[test]
fn unknown_conversation_delete_is_unknown() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    let err = store.delete_conversation("missing").unwrap_err();
    assert!(err.to_string().contains("unknown conversation"));
}
```

- [ ] **Step 2: Run the new store tests and confirm they fail**

Run: `cargo test -p gencore-assistant --test store`

Expected: FAIL (`AssistantStore` not found)

- [ ] **Step 3: Implement migrate + CRUD + seed**

`store_schema.rs` `SCHEMA_SQL` must create exactly:

`conversations`, `messages`, `tool_calls`, `snapshots`, `app_facts`, `settings`, `secrets` as specified in the spec. Use `PRAGMA user_version = 1`.

`seed_app_facts` writes at least:

| key | value |
| --- | --- |
| `product.identifier` | `com.gencore.terminal` |
| `product.name` | `GenCore Terminal` |
| `ui.panels` | `files,assistant,config` |
| `pty.backend` | `portable-pty` |
| `pty.confirm` | `propose-and-confirm` |
| `shell.note` | `Do not pass Windows \\?\\ verbatim paths into PowerShell.` |

`AssistantStore` methods run on the calling thread. Commands in Task 7 wrap them in `spawn_blocking`.

- [ ] **Step 4: Run store tests and confirm they pass**

Run: `cargo test -p gencore-assistant --test store`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-assistant
git commit -m "feat(assistant): add portable SQLite store and app facts"
```

---

### Task 3: Settings and DPAPI secrets

**Files:**
- Create: `crates/gencore-plugin-assistant/src/modules/secrets/**`
- Modify: `crates/gencore-plugin-assistant/src/modules/store/store_api.rs` (`put_secret`, `get_secret`, `clear_secret`, `has_secret`)
- Create: `crates/gencore-plugin-assistant/tests/secrets.rs`

**Interfaces:**
- Consumes: `AssistantStore`
- Produces: `trait SecretProtector { fn protect(&self, plain: &[u8]) -> Result<Vec<u8>, SecretsError>; fn unprotect(&self, cipher: &[u8]) -> Result<Vec<u8>, SecretsError>; }`; `IdentityProtector` (tests); `DpapiProtector` (Windows); `DEFAULT_MODEL = "gemini-3.7-flash"`; `DEFAULT_CONTEXT_LINES: u32 = 80`; `ALLOWED_MODELS`; `parse_model(&str) -> Result<&str, AssistantError>`; `clamp_context_lines(n: i64) -> Option<u32>` (Some only for 20..=200)

- [ ] **Step 1: Write the failing secrets/settings tests**

```rust
use gencore_assistant::{
    AssistantStore, IdentityProtector, SecretProtector, clamp_context_lines, parse_model,
    DEFAULT_CONTEXT_LINES, DEFAULT_MODEL,
};

#[test]
fn default_model_is_gemini_37_flash() {
    assert_eq!(DEFAULT_MODEL, "gemini-3.7-flash");
}

#[test]
fn parse_model_rejects_unknown() {
    assert!(parse_model("gpt-4").is_err());
    assert_eq!(parse_model("gemini-3.5-flash-lite").unwrap(), "gemini-3.5-flash-lite");
}

#[test]
fn context_lines_only_accept_20_to_200() {
    assert_eq!(clamp_context_lines(80), Some(DEFAULT_CONTEXT_LINES));
    assert_eq!(clamp_context_lines(19), None);
    assert_eq!(clamp_context_lines(201), None);
}

#[test]
fn identity_protector_round_trips_and_store_never_keeps_plain_key_in_settings() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let protector = IdentityProtector;
    let blob = protector.protect(b"sk-test").unwrap();
    store.put_secret("gemini_api_key", &blob).unwrap();
    assert!(store.has_secret("gemini_api_key").unwrap());
    let restored = protector.unprotect(&store.get_secret("gemini_api_key").unwrap().unwrap()).unwrap();
    assert_eq!(restored, b"sk-test");
    assert!(store.get_setting("gemini_api_key").unwrap().is_none());
}
```

- [ ] **Step 2: Run secrets tests and confirm they fail**

Run: `cargo test -p gencore-assistant --test secrets`

Expected: FAIL

- [ ] **Step 3: Implement protector + settings helpers**

`ALLOWED_MODELS` is exactly the four spec IDs. `DpapiProtector` uses `CryptProtectData` / `CryptUnprotectData` with `CRYPTPROTECT_UI_FORBIDDEN`. Unwrap failure maps to `SecretsError::Unprotect`.

Do not add IPC commands in this task.

- [ ] **Step 4: Run secrets tests and confirm they pass**

Run: `cargo test -p gencore-assistant --test secrets`

Expected: PASS

On Windows, add `#[cfg(windows)]` test `dpapi_protector_round_trips` that uses `DpapiProtector` directly.

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-assistant
git commit -m "feat(assistant): store Gemini key via DPAPI protector"
```

---

### Task 4: Gemini model allowlist and SSE parse (Sonnet 5)

**Files:**
- Create: `crates/gencore-plugin-assistant/src/modules/gemini/**`
- Create: `crates/gencore-plugin-assistant/tests/gemini.rs`

**Interfaces:**
- Consumes: `parse_model`
- Produces: `GeminiEvent::Text(String)` \| `GeminiEvent::FunctionCall { name, args_json }` \| `GeminiEvent::Done`; `parse_sse_data(data: &str) -> Result<Vec<GeminiEvent>, GeminiError>`; `function_declarations() -> serde_json::Value` with tools `pty_write` (args: `data` string only), `switch_tab` (`tab_id`), `reveal_in_files` (`path`); `GeminiRequest { model, system, contents, tools }`

- [ ] **Step 1: Write the failing parse tests**

```rust
use gencore_assistant::{function_declarations, parse_sse_data, GeminiEvent};

#[test]
fn parse_text_delta() {
    let data = r#"{"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}"#;
    let events = parse_sse_data(data).unwrap();
    assert!(matches!(&events[0], GeminiEvent::Text(t) if t == "Hello"));
}

#[test]
fn parse_function_call_pty_write_has_data_only() {
    let data = r#"{"candidates":[{"content":{"parts":[{"functionCall":{"name":"pty_write","args":{"data":"Get-ChildItem"}}}]}}]}"#;
    let events = parse_sse_data(data).unwrap();
    match &events[0] {
        GeminiEvent::FunctionCall { name, args_json } => {
            assert_eq!(name, "pty_write");
            assert!(args_json.contains("Get-ChildItem"));
            assert!(!args_json.contains("session_id"));
        }
        other => panic!("{other:?}"),
    }
}

#[test]
fn declarations_do_not_let_model_set_session_id() {
    let decls = function_declarations().to_string();
    assert!(decls.contains("pty_write"));
    assert!(decls.contains("switch_tab"));
    assert!(decls.contains("reveal_in_files"));
    assert!(!decls.contains("session_id"));
}
```

- [ ] **Step 2: Run gemini tests and confirm they fail**

Run: `cargo test -p gencore-assistant --test gemini`

Expected: FAIL

- [ ] **Step 3: Implement parse + declarations**

`pty_write` function declaration parameters: `{ "data": { "type": "string" } }` required `["data"]` only.

HTTP client can stay a stub (`todo`-free no-op) until Task 6. Do not call the network in tests.

- [ ] **Step 4: Run gemini tests and confirm they pass**

Run: `cargo test -p gencore-assistant --test gemini`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-assistant
git commit -m "feat(assistant): parse Gemini SSE and lock tool schemas"
```

---

### Task 5: Confirm gate and tools (Sonnet 5)

**Files:**
- Create: `crates/gencore-plugin-assistant/src/modules/tools/**`
- Create: `crates/gencore-plugin-assistant/src/modules/agent/agent_error.rs`
- Modify: `crates/gencore-plugin-assistant/src/modules/agent/**` (confirm/reject only)
- Create: `crates/gencore-plugin-assistant/tests/tools.rs`
- Modify: `crates/gencore-plugin-assistant/tests/agent.rs` (gate tests)

**Interfaces:**
- Consumes: `AssistantStore`, `gencore_pty::write_session`, `SessionMap`
- Produces: `confirm_tool(store, id, pty: Option<&Arc<Mutex<SessionMap>>>) -> Result<ConfirmOutcome, AssistantError>`; `reject_tool(store, id) -> Result<(), AssistantError>`; `ConfirmOutcome { name, result_json, ui_action: Option<UiAction> }`; `UiAction { name: String, args: serde_json::Value }`

`confirm_tool` algorithm (normative):

1. Load `tool_calls` by `id`. Missing or `status != "pending"` → `ActionNotPending`.
2. Set status `approved`.
3. If `name == "pty_write"`: load `latest_snapshot(conversation_id)`. If `active_session_id` is null/empty → `PtySessionGone`. Parse `args_json` for `data` only (ignore any `session_id` key). Call `write_session(map, snapshot.active_session_id, data)`. On `SessionNotFound` → `PtySessionGone` and status `failed`. On success status `ran`.
4. If `name == "switch_tab"` or `reveal_in_files"`: status `ran`, return `ui_action`.
5. Unknown name → `InvalidArgs`, status `failed`.

`reject_tool`: if not pending → `ActionNotPending`. Else status `rejected`. Must not call `write_session`.

- [ ] **Step 1: Write the failing gate tests**

```rust
use std::sync::{Arc, Mutex};

use gencore_assistant::{
    confirm_tool, reject_tool, AssistantStore, AssistantError,
};
use gencore_pty::SessionMap;

#[test]
fn confirm_without_pending_row_fails() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let err = confirm_tool(&store, "missing", None).unwrap_err();
    assert!(matches!(err, AssistantError::ActionNotPending));
}

#[test]
fn reject_never_writes_pty() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store.insert_snapshot(&conv.id, None, None, None, "[]", None, "").unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();
    reject_tool(&store, &id).unwrap();
    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "rejected");
}

#[test]
fn confirm_pty_write_uses_snapshot_session_not_args() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&conv.id, None, Some("real-session"), None, "[]", None, "")
        .unwrap();
    let id = store
        .insert_tool_call(
            &conv.id,
            None,
            "pty_write",
            r#"{"data":"Get-ChildItem","session_id":"forged"}"#,
        )
        .unwrap();
    let map: Arc<Mutex<SessionMap>> = Arc::new(Mutex::new(SessionMap::new()));
    let err = confirm_tool(&store, &id, Some(&map)).unwrap_err();
    assert!(matches!(err, AssistantError::PtySessionGone));
    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "failed");
}
```

`insert_snapshot` signature must match the store from Task 2. If Task 2 used different parameter order, keep Task 2's order and adapt this test — do not invent a second snapshot API.

- [ ] **Step 2: Run tools/agent tests and confirm they fail**

Run: `cargo test -p gencore-assistant --test tools --test agent`

Expected: FAIL

- [ ] **Step 3: Implement confirm/reject**

Empty `SessionMap` is enough to prove forged ids are ignored: `write_session` returns `SessionNotFound` mapped to `PtySessionGone`. Do not add a live ConPTY in this task.

- [ ] **Step 4: Run tools/agent tests and confirm they pass**

Run: `cargo test -p gencore-assistant --test tools --test agent`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-assistant
git commit -m "feat(assistant): confirm gate stamps PTY session from snapshot"
```

---

### Task 6: Agent turn loop (Sonnet 5)

**Files:**
- Modify: `crates/gencore-plugin-assistant/src/modules/agent/agent_api.rs`
- Modify: `crates/gencore-plugin-assistant/src/modules/gemini/gemini_api.rs`
- Modify: `crates/gencore-plugin-assistant/tests/agent.rs`

**Interfaces:**
- Consumes: store, parse, confirm/reject, `SecretProtector`
- Produces: `trait GeminiTransport { fn generate(&self, req: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError>; }`; `struct ScriptedTransport { events: Vec<GeminiEvent> }`; `send_turn(store, transport, protector, conversation_id, user_text, snapshot) -> Result<TurnResult, AssistantError>`; `TurnResult { assistant_text: String, pending: Vec<ToolCall> }`; `resume_turn(...)` after confirm/reject

`send_turn` (normative):

1. If `!store.has_secret("gemini_api_key")` → `NoApiKey`.
2. Persist user message + snapshot.
3. If conversation title is `"New chat"` or empty, set title to the first 48 chars of `user_text`.
4. Build system string from all `app_facts` plus the spec instructions (propose-and-confirm; no `\\?\`; never claim a command ran without a tool result; do not ask for the API key).
5. Call `transport.generate`. On `FunctionCall`, insert `pending` tool_call and **return** (do not execute). Concatenate `Text` into the assistant message and persist it.
6. Never call `write_session` here.

`resume_turn` loads the latest tool result, calls `transport.generate` again, same pending rule.

- [ ] **Step 1: Write the failing turn tests**

```rust
#[test]
fn send_without_key_is_no_api_key() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    let err = send_turn(
        &store,
        &ScriptedTransport { events: vec![] },
        &IdentityProtector,
        &conv.id,
        "hi",
        empty_snapshot(),
    )
    .unwrap_err();
    assert!(matches!(err, AssistantError::NoApiKey));
}

#[test]
fn function_call_becomes_pending_and_does_not_write() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    store
        .put_secret("gemini_api_key", &IdentityProtector.protect(b"k").unwrap())
        .unwrap();
    let conv = store.create_conversation().unwrap();
    let result = send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::FunctionCall {
                name: "pty_write".into(),
                args_json: r#"{"data":"Get-ChildItem"}"#.into(),
            }],
        },
        &IdentityProtector,
        &conv.id,
        "list files",
        empty_snapshot(),
    )
    .unwrap();
    assert_eq!(result.pending.len(), 1);
    assert_eq!(result.pending[0].status, "pending");
}
```

Define `empty_snapshot()` in the test file as the snapshot struct used by `insert_snapshot` / `send_turn` (same type, one definition in `store` or `agent`).

- [ ] **Step 2: Run agent tests and confirm the new ones fail**

Run: `cargo test -p gencore-assistant --test agent`

Expected: FAIL on `send_turn`

- [ ] **Step 3: Implement `send_turn` / `resume_turn` + `ScriptedTransport`**

Real `ReqwestTransport` (Task 7) POSTs to

`https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`

Header `x-goog-api-key` from the unwrapped secret. Parse each `data: ` line with `parse_sse_data`. Do not put the key in events or `result_json`.

- [ ] **Step 4: Run agent tests and confirm they pass**

Run: `cargo test -p gencore-assistant --test agent`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-assistant
git commit -m "feat(assistant): run Gemini turns until a pending tool"
```

---

### Task 7: IPC, Isolation, capabilities, JS wrappers (Sonnet 5)

**Files:**
- Create: `crates/gencore-plugin-assistant/src/modules/assistant/assistant_api.rs`
- Create: `apps/terminal/src/modules/ipc/ipc.assistant.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts` (assistant DTOs)
- Modify: `apps/terminal/src-tauri/Cargo.toml`
- Modify: `apps/terminal/src-tauri/src/lib.rs`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Create: `apps/terminal/tests/unit/ipc.assistant.test.ts`
- Modify: `scripts/tauri-dev-terminal.mjs`

**Interfaces:**
- Consumes: store, secrets, send_turn, confirm_tool
- Produces: commands listed in the spec; events `gencore-assistant://token`, `://turn`, `://error`, `://ui-action`; JS wrappers in `ipc.assistant.ts`

IPC args (snake_case, `deny_unknown_fields`):

```rust
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ConversationIdArgs { pub conversation_id: String }

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SendMessageArgs {
    pub conversation_id: String,
    pub text: String,
    pub snapshot: SnapshotArgs,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SnapshotArgs {
    pub active_tab_id: String,
    pub active_session_id: Option<String>,
    pub cwd: Option<String>,
    pub output_excerpt: String,
    pub tabs: Vec<SnapshotTabArgs>,
    pub files_selection: Option<FilesSelectionArgs>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SnapshotTabArgs {
    pub id: String,
    pub name: Option<String>,
    pub cwd: Option<String>,
    pub pinned: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FilesSelectionArgs {
    pub path: String,
    pub kind: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActionIdArgs { pub id: String }

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetAgentSettingsArgs {
    pub model: Option<String>,
    pub context_lines: Option<u32>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetApiKeyArgs { pub key: String }
```

`get_agent_settings` returns `{ model, context_lines, has_api_key }` only.

`set_api_key`: reject empty / > 4096 chars (`InvalidArgs`). Protect then `put_secret`.

`send_message`: spawn a Tauri async task; emit token/turn/error events; return immediately after persisting the user message (`{ accepted: true }`) so the UI does not block.

Isolation:

- Add the 12 `plugin:gencore-assistant|*` strings to `ALLOWED_COMMANDS`.
- Empty-arg: `list_conversations`, `create_conversation`, `get_agent_settings`, `clear_api_key`.
- Reconstruct only known keys (same as other commands). `send_message` reconstructs `conversation_id`, `text`, and a snapshot with only the fields above. `output_excerpt` max 65536. `key` max 4096. `conversation_id` / `id` length 1–64.
- Add the four assistant events to `isAnyListenEvent` and `reconstructListen` (Any target). Do **not** fall unknown events through to `entry-changed`.

Capabilities `main.json` — append only:

```
gencore-assistant:allow-list-conversations
gencore-assistant:allow-create-conversation
gencore-assistant:allow-delete-conversation
gencore-assistant:allow-list-messages
gencore-assistant:allow-send-message
gencore-assistant:allow-cancel-turn
gencore-assistant:allow-confirm-action
gencore-assistant:allow-reject-action
gencore-assistant:allow-get-agent-settings
gencore-assistant:allow-set-agent-settings
gencore-assistant:allow-set-api-key
gencore-assistant:allow-clear-api-key
```

`lib.rs` of Terminal: `.plugin(gencore_assistant::init())`.

`tauri-dev-terminal.mjs`: set `env.GENCORE_DATA_DIR` to `path.resolve(repoRoot, ".data/terminal")`.

- [ ] **Step 1: Write Isolation tests first**

In `isolation.hook.test.ts` add:

- each new command is allowlisted
- `plugin:gencore-assistant|stat` (or any unknown) throws
- `send_message` extra field is stripped / rejected
- listen reconstruct for `gencore-assistant://token` with `{ kind: "Any" }`
- listen for a random event name still throws
- `capabilitySource` contains each `gencore-assistant:allow-*` and does not contain `gencore-assistant:default`
- `csp["connect-src"]` still equals `["ipc:", "http://ipc.localhost"]` (existing test; do not weaken)

- [ ] **Step 2: Run Isolation tests and confirm they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/isolation.hook.test.ts`

Expected: FAIL on new assertions

- [ ] **Step 3: Wire hook, capabilities, commands, `ipc.assistant.ts`**

`ipc.assistant.ts` must use exact strings `plugin:gencore-assistant|list_conversations` etc. and snake_case payloads (`conversation_id`, not `conversationId`).

- [ ] **Step 4: Run Isolation + crate tests**

Run:

```
pnpm --filter @gencore/terminal exec vitest run tests/unit/isolation.hook.test.ts tests/unit/tauri.conf.test.ts
cargo test -p gencore-assistant
cargo clippy -p gencore-assistant --all-targets -- -D warnings
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-assistant apps/terminal scripts/tauri-dev-terminal.mjs
git commit -m "feat(assistant): grant Isolation IPC for Gemini assistant commands"
```

---

### Task 8: Assistant ledger UI (Grok)

**Files:**
- Create: `apps/terminal/src/modules/assistant/assistant.types.ts`
- Create: `apps/terminal/src/modules/assistant/assistant.component.tsx`
- Create: `apps/terminal/src/modules/assistant/assistant.hook.ts`
- Create: `apps/terminal/tests/unit/assistant.component.test.tsx`
- Create: `apps/terminal/tests/unit/assistant.hook.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`

**Interfaces:**
- Consumes: `ipc.assistant.ts`, `useAgentSettings` (can stub `hasApiKey` in this task)
- Produces: `<Assistant />` ledger; no-key copy exactly `Set a Gemini API key in Config to start chatting.`

Chrome:

- Header `h-7 border-b px-2`, label `ASSISTANT` with the same classes as `FILES`.
- History: ui-kit `DropdownMenu` (`icon-xs` ghost). New: `Plus` `icon-xs` ghost (Files pattern).
- Ledger: `You` kicker `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`; `Assistant` kicker same + `text-primary`. `Separator` between turns. Message bodies `select-text`; header `select-none`.
- Pending group: `rounded-sm border border-border bg-background`. Title `PTY write`, subtitle `Tab · pending`, mono command, Approve (`text-success`) / Reject (`text-destructive`) ghost buttons.
- Composer: ui-kit `Input`, Enter sends, disabled when `!hasApiKey` or a turn is streaming.
- Empty no-key: centered `text-sm text-muted-foreground` with the exact sentence above.

- [ ] **Step 1: Write the failing UI tests**

`side-panel.test.tsx`: clicking Assistant must **not** show `Tab 2`; it must show `ASSISTANT`.

`assistant.component.test.tsx`:

- no key → exact empty copy; composer disabled
- with messages → `You` / `Assistant` kickers
- pending tool → Approve and Reject buttons
- History trigger and New button have accessible names `History` and `New chat`

Mock `ipc.assistant` and `useAgentSettings`.

- [ ] **Step 2: Run UI tests and confirm they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/side-panel.test.tsx tests/unit/assistant.component.test.tsx`

Expected: FAIL (`Tab 2` still present)

- [ ] **Step 3: Implement `<Assistant />` and mount it from `SidePanel`**

Remove `placeholder: "Tab 2"` from the assistant tab. Render `<Assistant />` when `tab.id === "assistant"`.

- [ ] **Step 4: Run UI tests and confirm they pass**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/side-panel.test.tsx tests/unit/assistant.component.test.tsx tests/unit/assistant.hook.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/assistant apps/terminal/src/modules/side-panel apps/terminal/tests/unit
git commit -m "feat(terminal): replace Assistant placeholder with ledger chat"
```

---

### Task 9: Config Assistant and Context sections (Grok)

**Files:**
- Create: `apps/terminal/src/modules/config/config.agent.ts`
- Create: `apps/terminal/tests/unit/config.agent.test.tsx`
- Modify: `apps/terminal/src/modules/config/config.component.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Modify: `apps/terminal/tests/unit/config.component.test.tsx`

**Interfaces:**
- Consumes: `getAgentSettings`, `setAgentSettings`, `setApiKey`, `clearApiKey`
- Produces: `AgentSettingsProvider` / `useAgentSettings()` → `{ model, contextLines, hasApiKey, setModel, setContextLines, saveKey, clearKey, replaceKey }`

Do **not** put the key into `gencore.terminal.config`. Theme parse stays v1-only.

Config UI (after Appearance):

**Assistant** section label `Assistant` (10px uppercase muted). Inset group:

1. Key row: unsaved → password `Input` `h-5` + Save. Saved → title `Gemini API key` with `text-primary`, subtitle `Key saved · Windows DPAPI`, actions Replace and Clear. Never echo the key.
2. Four model radios (same Button radio pattern as theme), default `gemini-3.7-flash` checked.

**Context** section:

- Title `Terminal lines`, trailing number `Input` `h-5`, min 20 max 200. Subtitle `Last ${n} lines with each send`. Invalid/empty does not write.

- [ ] **Step 1: Write the failing Config tests**

- radiogroup `Model` exists with four radios
- default checked accessible name includes `gemini-3.7-flash`
- saved key shows `Key saved · Windows DPAPI` and does not show the plaintext
- `Terminal lines` spinbutton / input is present

- [ ] **Step 2: Run Config tests and confirm they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/config.component.test.tsx tests/unit/config.agent.test.tsx`

Expected: FAIL

- [ ] **Step 3: Implement the sections + provider**

Wrap `AppShellTree` with `AgentSettingsProvider` inside `ConfigProvider`.

- [ ] **Step 4: Run Config tests and confirm they pass**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/config.component.test.tsx tests/unit/config.agent.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/config apps/terminal/src/modules/app apps/terminal/tests/unit
git commit -m "feat(terminal): add Assistant and Context rows to Config"
```

---

### Task 10: Snapshots, Files selection, UI actions

**Files:**
- Create: `apps/terminal/src/modules/assistant/assistant.snapshot.ts`
- Create: `apps/terminal/tests/unit/assistant.snapshot.test.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.types.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Modify: `apps/terminal/src/modules/file-tree/file-tree.hook.ts`
- Modify: `apps/terminal/src/modules/file-tree/file-tree.types.ts`
- Modify: `apps/terminal/src/modules/assistant/assistant.hook.ts`
- Modify: `apps/terminal/src/modules/app/app.component.tsx` if a FileTree provider is required

**Interfaces:**
- Consumes: `TerminalSessionApi`, file-tree selection
- Produces: `buildSnapshot({ tabs, activeId, readScrollback, contextLines, filesSelection }) -> SnapshotArgs`; `readScrollback(tabId: string): string` on `TerminalSessionApi`; `filesSelection: { path, kind } | null` from file-tree; subscribe `gencore-assistant://ui-action` → `setActive(tab_id)` or expand/select path in the tree

`output_excerpt`: take `readScrollback(activeId)`, split on `\n`, keep the last `contextLines` lines (default 80). Cap the joined string at 65536 characters.

If `active.sessionId` is null, still send the snapshot; Rust will `PtySessionGone` on confirm.

- [ ] **Step 1: Write the failing snapshot tests**

```ts
import { buildSnapshot, lastLines } from "../../src/modules/assistant/assistant.snapshot";

it("keeps the last N lines and caps length", () => {
  expect(lastLines("a\nb\nc\nd", 2)).toBe("c\nd");
});

it("copies active session id and files selection", () => {
  const snap = buildSnapshot({
    tabs: [
      { id: "t1", name: "Tab", pinned: false, cwd: "C:\\src", sessionId: "sess-1", status: "live", error: null },
    ],
    activeId: "t1",
    readScrollback: () => "line1\nline2",
    contextLines: 80,
    filesSelection: { path: "C:\\src\\app.rs", kind: "file" },
  });
  expect(snap.active_session_id).toBe("sess-1");
  expect(snap.files_selection).toEqual({ path: "C:\\src\\app.rs", kind: "file" });
  expect(snap.output_excerpt).toBe("line1\nline2");
});
```

- [ ] **Step 2: Run snapshot tests and confirm they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/assistant.snapshot.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement snapshot + `readScrollback` + selection context + ui-action handler**

Expose file-tree selection without a new Isolation grant: a React context written by `useFileTree` / `FileTree` (`selectedId` + `nodes[id].kind`). Assistant reads it.

`reveal_in_files`: if the node exists, `select` it; if it is a folder, expand it. If it does not exist, no-op (user-visible in the tree).

- [ ] **Step 4: Run Terminal unit tests for the touched modules**

Run:

```
pnpm --filter @gencore/terminal exec vitest run tests/unit/assistant.snapshot.test.ts tests/unit/assistant.hook.test.tsx tests/unit/file-tree.hook.test.ts tests/unit/terminal.hook.test.ts
```

Expected: PASS (add hook coverage if those test files already exist; do not delete existing assertions)

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/assistant apps/terminal/src/modules/terminal apps/terminal/src/modules/file-tree apps/terminal/tests/unit
git commit -m "feat(terminal): snapshot cwd, output, and Files selection for Assistant"
```

---

### Task 11: Docs and agent sync

**Files:**
- Modify: `AGENTS.md`
- Modify: `apps/terminal/AGENTS.md`
- Modify: `crates/AGENTS.md`
- Modify: `.cursor/rules/architecture.mdc`
- Modify: `.cursor/skills/add-crate-module/SKILL.md`
- Run: `pnpm sync:agents` (commit generated `.agents/` with `.cursor/`)

**Interfaces:**
- Consumes: shipped behavior from Tasks 1–10
- Produces: docs that match the plugin id, Isolation list, Config Assistant rows, and portable DB path

- [ ] **Step 1: Update the docs listed above**

Root `AGENTS.md`: Assistant is a real Gemini ledger chat (not “planned”). Mention portable SQLite + DPAPI, propose-and-confirm, and that file tools wait for Explorer.

`apps/terminal/AGENTS.md`: document `ipc.assistant.ts`, the 12 Isolation commands, the four events, Config Assistant/Context, `GENCORE_DATA_DIR`.

`crates/AGENTS.md` + `architecture.mdc`: add `gencore-plugin-assistant` / `gencore-assistant`.

`add-crate-module` skill crate list: include `gencore-assistant`.

- [ ] **Step 2: Sync agents and run the verification set**

```
pnpm sync:agents
pnpm --filter @gencore/terminal exec vitest run tests/unit/isolation.hook.test.ts tests/unit/tauri.conf.test.ts tests/unit/assistant.component.test.tsx tests/unit/config.component.test.tsx tests/unit/side-panel.test.tsx
cargo test -p gencore-assistant
cargo clippy -p gencore-assistant --all-targets -- -D warnings
```

Expected: PASS; `.agents/` updated when `.cursor/` changed.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md apps/terminal/AGENTS.md crates/AGENTS.md .cursor .agents
git commit -m "docs: document the Terminal Gemini Assistant"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Ledger UI + empty copy | 8 |
| Gemini models + default 3.7 flash | 3, 9 |
| Propose-and-confirm / Rust executor | 5, 6 |
| Tools pty_write / switch_tab / reveal_in_files | 5, 10 |
| Portable SQLite + facts + settings | 1, 2 |
| DPAPI key | 3, 7, 9 |
| Tokio/async, no CSP Gemini | 6, 7 |
| Isolation + ipc.assistant.ts | 7 |
| Config Assistant + Context 80 | 9 |
| Snapshot cwd/tabs/files/output | 10 |
| session_id from snapshot | 5 |
| Explorer unchanged | global |
| Docs / AGENTS | 11 |
| SDD model routing | header |

**Placeholder scan:** no TBD/TODO. Isolation reconstruct, tool schemas, and snapshot fields are specified.

**Type consistency:** `AssistantStore`, `ToolCall.status`, `SnapshotArgs`, `SecretProtector`, `GeminiEvent`, `confirm_tool`, `send_turn`, and `ipc.assistant.ts` command names are defined once in Tasks 2–7 and reused later.
