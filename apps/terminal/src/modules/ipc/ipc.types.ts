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
}

/** Payload for the `gencore-assistant://turn` event. */
export interface AssistantTurnPayload {
  readonly conversation_id: string;
  readonly assistant_text: string;
  readonly pending: readonly AssistantToolCall[];
}

/** Payload for the `gencore-assistant://error` event. */
export interface AssistantErrorPayload {
  readonly conversation_id: string;
  readonly error: string;
}

/** Payload for the `gencore-assistant://ui-action` event. */
export interface AssistantUiActionPayload {
  readonly id: string;
  readonly name: string;
  readonly args: unknown;
}
