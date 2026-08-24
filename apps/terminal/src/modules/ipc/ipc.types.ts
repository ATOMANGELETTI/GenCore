import type { PoshThemeId } from "../config/config.types";

/** Mirrors `gencore_core::AppInfo`; keep in sync with `crates/gencore-core`. */
export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly identifier: string;
}

/** Mirrors `gencore_fs::FsKind`. */
export type FsKind = "file" | "dir" | "symlink";

/** Mirrors `gencore_fs::DriveKind`. */
export type DriveKind = "fixed" | "removable" | "network" | "optical" | "unknown";

/** Mirrors `gencore_fs::FsEntry`; `extension` is `string | null` for Rust `Option`. */
export interface FsEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: FsKind;
  readonly extension: string | null;
  readonly hidden: boolean;
  readonly system: boolean;
}

/** Mirrors `gencore_fs::DriveEntry`; `label` is `string | null` for Rust `Option`. */
export interface DriveEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: DriveKind;
  readonly label: string | null;
}

/** Mirrors `gencore_fs::ListResult`. */
export interface ListResult {
  readonly entries: readonly FsEntry[];
}

/** Arguments for `plugin:gencore-pty|open`. */
export interface OpenPtyArgs {
  readonly cols: number;
  readonly rows: number;
  readonly cwd?: string;
  readonly theme?: "polar-night" | "snow-storm";
  readonly posh_theme?: PoshThemeId;
  readonly command?: readonly string[];
}

/** Mirrors `gencore_pty::OpenResult`. */
export interface OpenPtyResult {
  readonly session_id: string;
}

/** Mirrors `gencore_pty::PtyDataPayload`. */
export interface PtyDataPayload {
  readonly session_id: string;
  readonly data: string;
}

/** Mirrors `gencore_pty::PtyExitPayload`. */
export interface PtyExitPayload {
  readonly session_id: string;
  readonly code: number | null;
}

export type {
  CpuTelemetry,
  GpuKind,
  GpuTelemetry,
  MemoryTelemetry,
  NetworkTelemetry,
  SystemTelemetry,
} from "../telemetry/telemetry.types";

/** Mirrors `gencore_assistant::Conversation`. */
export interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly created_at: number;
  readonly updated_at: number;
}

/** Mirrors `gencore_assistant::Message`. */
export interface AssistantMessage {
  readonly id: string;
  readonly conversation_id: string;
  readonly role: "user" | "assistant" | "tool";
  readonly content: string;
  readonly created_at: number;
}

/** Mirrors `gencore_assistant::ToolCall`. */
export interface AssistantToolCall {
  readonly id: string;
  readonly conversation_id: string;
  readonly message_id: string | null;
  readonly name: string;
  readonly args_json: string;
  readonly status: string;
  readonly result_json: string | null;
  readonly created_at: number;
  readonly resolved_at: number | null;
}

/** One open tab in a `send_message` snapshot. */
export interface AssistantSnapshotTab {
  readonly id: string;
  readonly name?: string;
  readonly cwd?: string;
  readonly pinned: boolean;
}

/** Selected Files-tab entry included in a `send_message` snapshot. */
export interface AssistantFilesSelection {
  readonly path: string;
  readonly kind: string;
}

/** App-state snapshot sent with every `send_message` call. */
export interface AssistantSnapshot {
  readonly active_tab_id: string;
  readonly active_session_id?: string;
  readonly cwd?: string;
  readonly output_excerpt: string;
  readonly tabs: readonly AssistantSnapshotTab[];
  readonly files_selection?: AssistantFilesSelection;
}

/** Mirrors the assistant plugin's `AgentSettingsDto`; never carries the API key. */
export interface AgentSettings {
  readonly model: string;
  readonly context_lines: number;
  readonly has_api_key: boolean;
}

/** Optional patch accepted by `set_agent_settings`. */
export interface AgentSettingsPatch {
  readonly model?: string;
  readonly context_lines?: number;
}

/** Mirrors the assistant plugin's `send_message` result. */
export interface SendMessageResult {
  readonly accepted: boolean;
  readonly generation?: number;
}

/** Mirrors the assistant plugin's `ListMessagesResult` — `list_messages`'s
 * response shape, carrying any still-`pending` tool calls alongside the
 * message history so a reloaded conversation hydrates its Approve/Reject
 * ledger without a dedicated command. */
export interface ListMessagesResult {
  readonly messages: readonly AssistantMessage[];
  readonly pending: readonly AssistantToolCall[];
}

/** A UI-only tool result the WebView applies after `confirm_action`. */
export interface AssistantUiAction {
  readonly name: string;
  readonly args: unknown;
}

/** Mirrors `gencore_assistant::ConfirmOutcome`. */
export interface ConfirmActionResult {
  readonly name: string;
  readonly result_json: string;
  readonly ui_action: AssistantUiAction | null;
}

/** Payload for the `gencore-assistant://token` event. */
export interface AssistantTokenPayload {
  readonly conversation_id: string;
  readonly text: string;
  readonly generation?: number;
}

/** Payload for the `gencore-assistant://turn` event. */
export interface AssistantTurnPayload {
  readonly conversation_id: string;
  readonly assistant_text: string;
  readonly pending: readonly AssistantToolCall[];
  readonly generation?: number;
}

/** Payload for the `gencore-assistant://error` event. `code` is the failing
 * `AssistantError` variant name (`NoApiKey`, `Gemini`, `PtySessionGone`, …)
 * so the UI can branch without parsing `message`, which is `err.to_string()`
 * and never carries key material. */
export interface AssistantErrorPayload {
  readonly conversation_id: string;
  readonly code: string;
  readonly message: string;
  readonly generation?: number;
}

/** Payload for the `gencore-assistant://ui-action` event. */
export interface AssistantUiActionPayload {
  readonly id: string;
  readonly name: string;
  readonly args: unknown;
}

// ---------------------------------------------------------------------------
// Git & Source Control Types
// ---------------------------------------------------------------------------

/** Mirrors `gencore_git::GitFileStatus`. */
export interface GitFileStatus {
  readonly path: string;
  readonly status: string;
  readonly additions: number;
  readonly deletions: number;
}

/** Mirrors `gencore_git::GitStatusResult`. */
export interface GitStatusResult {
  readonly is_repo: boolean;
  readonly root_path: string | null;
  readonly branch: string | null;
  readonly upstream: string | null;
  readonly ahead: number;
  readonly behind: number;
  readonly staged: readonly GitFileStatus[];
  readonly unstaged: readonly GitFileStatus[];
  readonly untracked: readonly string[];
  readonly conflicted: readonly string[];
}

/** Mirrors `gencore_git::GitInitResult`. */
export interface GitInitResult {
  readonly root_path: string;
  readonly default_branch: string;
}

/** Mirrors `gencore_git::GitCommitResult`. */
export interface GitCommitResult {
  readonly id: string;
  readonly short_id: string;
  readonly summary: string;
}

/** Mirrors `gencore_git::GitBranchInfo`. */
export interface GitBranchInfo {
  readonly name: string;
  readonly is_current: boolean;
  readonly is_remote: boolean;
}

/** Mirrors `gencore_git::GitDiffResult`. */
export interface GitDiffResult {
  readonly path: string;
  readonly head_content: string;
  readonly working_content: string;
}

/** Mirrors `gencore_git::GitCommitNode`. */
export interface GitCommitNode {
  readonly id: string;
  readonly short_id: string;
  readonly summary: string;
  readonly author_name: string;
  readonly author_email: string;
  readonly timestamp: number;
  readonly parents: readonly string[];
  readonly refs: readonly string[];
}
