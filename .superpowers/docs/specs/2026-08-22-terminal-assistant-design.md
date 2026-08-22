# Terminal Assistant (Gemini agent)

Date: 2026-08-22
Status: draft (awaiting user review)
Packages: `@gencore/terminal`, `gencore-assistant` (new plugin crate)

## Problem

The Terminal side-panel Assistant tab is a placeholder (`Tab 2`). Users need a professional, Nord-consistent Gemini chat that can propose actions against the live terminal and a small set of app chrome, persist threads in a portable SQLite database that travels with the ZIP, and keep the WebView off the public internet.

## Goals

- Replace the Assistant placeholder with a **ledger** chat: `ASSISTANT` header (same chrome as `FILES` / `CONFIG`), History + New in the header, message thread, pending Approve / Reject, compact composer.
- Empty / no-key copy: **Set a Gemini API key in Config to start chatting.** Composer disabled until a key is saved.
- Gemini Developer API only. Models in Config: `gemini-3.7-flash` (default), `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview`.
- Propose-and-confirm: Gemini may draft tools; **Rust is the only executor**. The WebView cannot skip the pending row.
- v1 tools: read context (cwd, last N terminal lines, tab list, Files selection); propose `pty_write` (active session), `switch_tab`, `reveal_in_files`.
- Portable SQLite + DPAPI key next to the app (`{exe_dir}/data/`). Chats, tool audit, snapshots, app facts, settings.
- Tokio / Tauri async so streaming never freezes the UI. Gemini HTTP stays in Rust. Production CSP `connect-src` stays `ipc:` + `http://ipc.localhost`.
- Config gains **Assistant** (key status, model radios) and **Context** (terminal lines, default 80).
- Explorer is unchanged. File create/read agent tools wait for Explorer.

## Non-goals

Explorer registration or grants. File content read/write/stat for the agent. Embeddings / RAG. Session-autonomous auto-run. Frontend `fetch` to Google. MCP. `window.__TAURI__`. Extra `gencore-fs` / `gencore-pty` grants. Theme or density changes from the agent. New ui-kit primitives (`Textarea`, `Switch`, `RadioGroup`). `tauri-plugin-sql` or any `tauri-plugin-*` name. Storing the API key in `localStorage`, `.env` in the ZIP, or Credential Manager.

## Approach

New crate `crates/gencore-plugin-assistant`, Cargo package **and** plugin id `gencore-assistant` (same pattern as `gencore-pty` / `gencore-fs`). Empty default ACL. Terminal registers it and grants only the commands `ipc.assistant.ts` invokes.

Rust owns: SQLite (`rusqlite` + `tauri::async_runtime::spawn_blocking`), Windows DPAPI for the key, Gemini HTTP (`reqwest` on the Tauri async runtime), the turn loop, and the confirm gate. After confirm, `pty_write` calls the existing `gencore-pty` `SessionMap` / `write_session`. `switch_tab` and `reveal_in_files` emit `gencore-assistant://ui-action` for the UI to apply.

The WebView sends `send_message` with a **context snapshot**. It never sees the raw API key after save. It streams tokens over Isolation-allowlisted events.

Theme stays `localStorage` `gencore.terminal.config` v1. Agent settings live in SQLite (`settings` + `secrets`), not in that JSON (v1 parse would strip unknown keys).

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Autonomy | Propose and confirm |
| Key storage | Portable + Windows DPAPI beside the SQLite file |
| v1 tools | Terminal + app chrome (no file create/read) |
| SQLite | Chats + integration tables (no embeddings) |
| Default model | `gemini-3.7-flash` |
| Crate | `gencore-assistant` plugin |
| Layout | Thread stack; History / New in the header |
| Empty state | No-key CTA pointing at Config |
| Chat look | Ledger (You / Assistant kickers, hairline rules, Config-style pending group) |
| Config | Key status + four model radios + Terminal lines (default 80) |

## Units

### Portable store (`gencore-assistant` / `store`)

- **Does:** Resolves the data directory, migrates schema, CRUD for conversations / messages / tool_calls / snapshots / app_facts / settings / secrets.
- **Use:** All assistant commands.
- **Depends on:** `rusqlite`, `spawn_blocking`.

Path:

1. `GENCORE_DATA_DIR` if set (dev + tests; `scripts/tauri-dev-terminal.mjs` sets it to repo `.data/terminal/`, gitignored).
2. Otherwise `{current_exe parent}/data/`.
3. Create `data/` on first open.

Database file: `gencore-assistant.sqlite`.

Schema (v1):

- `conversations` — `id`, `title`, `created_at`, `updated_at`
- `messages` — `id`, `conversation_id`, `role` (`user` \| `assistant` \| `tool`), `content`, `created_at`
- `tool_calls` — `id`, `conversation_id`, `message_id`, `name`, `args_json`, `status` (`pending` \| `approved` \| `rejected` \| `ran` \| `failed`), `result_json`, `created_at`, `resolved_at`
- `snapshots` — `id`, `conversation_id`, `message_id`, `cwd`, `active_session_id`, `active_tab_id`, `tabs_json`, `files_selection_json`, `output_excerpt`, `created_at`
- `app_facts` — `key`, `value`, `updated_at`
- `settings` — `key`, `value` (`model`, `context_lines`)
- `secrets` — `key`, `dpapi_blob`, `updated_at` (`gemini_api_key` only)

Pending actions are `tool_calls` with `status = pending`. No second pending table.

Seed `app_facts` on first open with GenCore Terminal product notes (identifier `com.gencore.terminal`, Files / Assistant / Config, ConPTY + portable-pty, Oh My Posh / frost `❯` fallback, no `\\?\` paths into PowerShell, propose-and-confirm, Nord Polar Night / Snow Storm). The system prompt reads this table each turn.

### Secrets (`secrets`)

- **Does:** `CryptProtectData` / `CryptUnprotectData` for this Windows user. `set_api_key` stores ciphertext only. `has_api_key` / `clear_api_key`. Never returns the plaintext key over IPC or events. Never logs it.
- **Use:** Config Save / Replace / Clear; Gemini client at request time.
- **Depends on:** store `secrets` row; Windows DPAPI.

Other Windows user or machine → unwrap fails → treat as no key (typed `Secrets` error, Config shows unsaved).

### Gemini client (`gemini`)

- **Does:** Allowlisted model IDs only. `streamGenerateContent` against the Gemini Developer API. Parses streamed text and function calls. Official function declarations for the three v1 tools.
- **Use:** Agent turn loop only.
- **Depends on:** `reqwest`; unwrapped key in memory for the request only.

Reject any model string that is not one of the four Config IDs (`InvalidModel`).

### Agent turn (`agent`)

- **Does:** One Tokio/Tauri task per send. Loads conversation + facts + last snapshot settings. Streams tokens as events. Persists the user message and snapshot first. On function call: insert `tool_calls` `pending`, emit so the UI shows the ledger group, **stop and wait**. Does not execute.
- **Use:** `send_message`, `confirm_action`, `reject_action`, `cancel_turn`.
- **Depends on:** store, gemini, tools.

`confirm_action(id)`:

1. Re-read the row. If missing or not `pending` → `ActionNotPending`.
2. Mark `approved`.
3. Execute (see tools).
4. Mark `ran` or `failed` with `result_json`.
5. Append a `tool` message.
6. Resume Gemini with the tool result (same conversation). New function calls become new pending rows.

`reject_action(id)`: mark `rejected`, append a tool result that the user declined, resume Gemini. Never writes the PTY.

`cancel_turn`: abort the in-flight HTTP/stream. Leave pending rows pending.

`pty_write` **session_id is stamped by Rust from the snapshot**, not from Gemini. The model only supplies `data` (and optional tab label for display). This prevents writing a session the user did not send context for.

### Tools (`tools`)

| Name | After confirm | Who runs it |
| --- | --- | --- |
| `pty_write` | UTF-8 write to the snapshot’s `active_session_id` via `gencore_pty::write_session` | Rust |
| `switch_tab` | `{ tab_id }` | UI via `gencore-assistant://ui-action` |
| `reveal_in_files` | `{ path }` | UI via `gencore-assistant://ui-action` |

If the PTY session is gone → `PtySessionGone`, tool `failed`, model is told. UI tools: UI applies and does not need a second IPC ack for v1 (failure is user-visible in the tree/tabs).

No `create_file`, `create_dir`, `read`, `stat`, rename/pin, or Config writes from the agent.

### IPC API (`assistant_api` / `assistant_error`)

Commands the Assistant / Config UI actually calls (snake_case args, `deny_unknown_fields`):

- `list_conversations`
- `create_conversation`
- `delete_conversation`
- `list_messages` (`conversation_id`)
- `send_message` (`conversation_id`, `text`, `snapshot`)
- `cancel_turn` (`conversation_id`)
- `confirm_action` (`id`)
- `reject_action` (`id`)
- `get_agent_settings` — `{ model, context_lines, has_api_key }` (never the key)
- `set_agent_settings` — `{ model? , context_lines? }`
- `set_api_key` — `{ key }` (plaintext only on this call; then DPAPI)
- `clear_api_key`

Typed errors: `NoApiKey`, `InvalidModel`, `GeminiHttp`, `GeminiStream`, `Store`, `Secrets`, `UnknownConversation`, `UnknownAction`, `ActionNotPending`, `PtySessionGone`, `Cancelled`, `InvalidArgs`.

Events (Isolation listen reconstruct, `Any`):

- `gencore-assistant://token` — `{ conversation_id, text }`
- `gencore-assistant://turn` — `{ conversation_id, kind: "pending" \| "done" \| "cancelled" }`
- `gencore-assistant://error` — `{ conversation_id, code, message }` (no secrets)
- `gencore-assistant://ui-action` — `{ name, args }` after confirm only

### Isolation and capabilities

`apps/terminal/isolation/isolation.hook.js`: allowlist `plugin:gencore-assistant|{cmd}` for each command above; reconstruct args; reject extras. Extend `plugin:event|listen` / `unlisten` for the four assistant event names.

`capabilities/main.json`: grant matching `gencore-assistant:allow-*` **only when** `ipc.assistant.ts` invokes them. Main window only. Do not grant on Explorer or `tray-menu`. Do not add Gemini origins to CSP.

### Terminal UI (`modules/assistant`, `ipc.assistant.ts`)

- **Does:** Ledger thread, header History (existing `DropdownMenu`) + New (`Button` `icon-xs`, same as Files), pending group (Approve / Reject), composer (`Input`, Enter sends), no-key empty state.
- **Use:** Side panel when `assistant` is selected. Replaces `placeholder: "Tab 2"`.
- **Depends on:** `@gencore/ui-kit` Button, Input, Separator, DropdownMenu, Tooltip; `useTerminalSession` / Files selection for the snapshot; `ipc.assistant.ts` only (no raw `invoke`).

Header: `h-7`, `border-b`, label `ASSISTANT` with the same classes as `FILES` / `CONFIG`. Shell chrome stays unselectable; message bodies stay copyable.

Ledger:

- `You` kicker: `text-[10px]` uppercase, `text-muted-foreground`
- `Assistant` kicker: same size, Frost (`text-primary` / accent)
- Hairline `Separator` between turns
- Pending: inset group `rounded-sm border bg-background` — title + subtitle, monospace command row, Approve (`text-success` / Aurora 14) and Reject (`text-destructive` / Aurora 11)

Streaming appends to the current assistant turn. History dropdown lists titles (first user line, truncated); selecting loads `list_messages`.

`send_message` snapshot from the UI:

```json
{
  "active_tab_id": "<js tab uuid>",
  "active_session_id": "<rust session_id or null>",
  "cwd": "<osc7 or null>",
  "output_excerpt": "<last context_lines of decoded active buffer>",
  "tabs": [{ "id", "name", "cwd", "pinned" }],
  "files_selection": { "path", "kind" } | null
}
```

### Config Assistant section

Under Appearance, two new sections in `config.component.tsx` (same 10px labels + inset groups):

**Assistant**

- Gemini API key row: while unsaved, compact `Input` (password) + Save. After save: title Frost, subtitle `Key saved · Windows DPAPI`, action Replace (clears to the input) / Clear. Never echo the key.
- Four model radios (same radio pattern as theme). Default `gemini-3.7-flash`. Checked row gets accent fill + check.

**Context**

- Terminal lines: title `Terminal lines`, trailing compact `Input` (`type="number"`, `h-5`, 20–200) bound to `context_lines`. Subtitle `Last N lines with each send` tracks the value. Default 80. Invalid/empty input does not write. Keep the row `py-1.5`.

`useConfig` stays theme-only. A sibling hook (`useAgentSettings`) reads/writes via `ipc.assistant.ts` so Assistant and Config share `has_api_key` / `model` / `context_lines`.

### System prompt (normative)

Each turn the model receives:

1. Seeded `app_facts` (product + Windows terminal notes).
2. Current snapshot (cwd, tabs, Files selection, output excerpt).
3. Conversation messages + resolved tool results.
4. Instructions: you are the GenCore Terminal assistant; use Gemini tools only from the declared set; never claim a command ran unless a tool result says so; prefer PowerShell that matches this app (no `\\?\` paths, do not fight Oh My Posh); propose one PTY write at a time when possible; do not ask the user to paste the API key.

## Data flow

```text
Composer → ipc.assistant.send_message(snapshot)
        → SQLite persist user + snapshot
        → Tokio Gemini stream → token events → ledger
        → function call → tool_calls pending → ledger group
User Approve → confirm_action
        → Rust re-reads pending
        → pty_write (SessionMap) or ui-action event
        → tool message → Gemini resume
```

## Error handling

No key → empty state + `NoApiKey` if send is attempted. Gemini 4xx/5xx → `GeminiHttp` in the thread, no panic. DPAPI failure → treat as no key. Confirm of a non-pending id → `ActionNotPending`. Dead PTY → `PtySessionGone` and a failed tool result. `spawn_blocking` / join errors map to `Store` or `Cancelled`. Commands never `.unwrap()`.

## Testing

- Store: migrate; conversation CRUD; pending confirm gate.
- Agent: execute without a pending row is impossible; reject never calls `write_session`; session_id comes from the snapshot.
- Gemini: mocked HTTP stream + function-call parse; unknown model rejected.
- Secrets: DPAPI roundtrip in a Windows test, or a trait mock on other targets.
- Isolation + `tauri.conf` + `main.json`: new commands and events only; production `connect-src` unchanged.
- JS: no-key empty state; ledger pending Approve/Reject; Config Assistant / Context rows; side panel no longer shows `Tab 2`.

No WebView2 visual gate for this feature (chat is not the PTY pane). jsdom + Rust tests are sufficient for v1.

## Implementation routing

Follow Superpowers SDD after this spec is approved and a plan exists.

- **Grok 4.6 extra high (Fast Mode)** (`cursor-grok-4.6-xhigh-fast`): planning, crate/UI scaffolding, Config rows, IPC wrappers, mechanical tests, Isolation allowlist edits.
- **Sonnet 5** (`claude-sonnet-5-thinking-high`): Gemini stream + function-calling loop, confirm gate, DPAPI, Isolation reconstruct for streaming events, PTY `SessionMap` write after confirm.
- **Opus 5** (`claude-opus-5-thinking-high`): only if Sonnet 5 is stuck on the turn loop or Isolation/event reconstruct. Do not start on Opus.

Always pass `model` explicitly on Task dispatches. Never `inherit`.

## Docs to update when implementing

Root `AGENTS.md` (Assistant is no longer “planned”). `apps/terminal/AGENTS.md` (new IPC + Isolation + Config Assistant). `crates/AGENTS.md` + `architecture.mdc` (new crate). `pnpm sync:agents` after `.cursor/` edits.

## Out of this spec

A second-phase workspace agent (file read/create, Explorer). RAG. Auto-run toggle.
