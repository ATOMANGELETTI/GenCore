import type {
  AssistantFilesSelection,
  AssistantSnapshot,
  AssistantSnapshotTab,
} from "../ipc/ipc.types";
import type { TerminalTab } from "../terminal/terminal.types";

/** Mirrors the Isolation hook's cap on `send_message`'s `output_excerpt` field. */
export const MAX_OUTPUT_EXCERPT_CHARS = 65536;

export interface BuildSnapshotParams {
  readonly tabs: readonly TerminalTab[];
  readonly activeId: string;
  readonly readScrollback: () => string;
  readonly contextLines: number;
  readonly filesSelection: AssistantFilesSelection | null;
}

/** Keeps only the last `n` `\n`-separated lines of `text`. */
export function lastLines(text: string, n: number): string {
  if (n <= 0) {
    return "";
  }
  const lines = text.split("\n");
  if (lines.length <= n) {
    return text;
  }
  return lines.slice(lines.length - n).join("\n");
}

function capExcerpt(text: string, maxChars = MAX_OUTPUT_EXCERPT_CHARS): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(text.length - maxChars);
}

function toSnapshotTab(tab: TerminalTab): AssistantSnapshotTab {
  return {
    id: tab.id,
    ...(tab.name ? { name: tab.name } : {}),
    ...(tab.cwd ? { cwd: tab.cwd } : {}),
    pinned: tab.pinned,
  };
}

/**
 * Builds the `send_message` snapshot from the current terminal session and
 * Files-tab selection. `active.sessionId` may be null (tab still spawning, or
 * restored-but-not-yet-live); the snapshot is still sent and Rust reports
 * `PtySessionGone` on confirm.
 */
export function buildSnapshot(params: BuildSnapshotParams): AssistantSnapshot {
  const { tabs, activeId, readScrollback, contextLines, filesSelection } = params;
  const active = tabs.find((tab) => tab.id === activeId);
  const outputExcerpt = capExcerpt(lastLines(readScrollback(), contextLines));

  return {
    active_tab_id: activeId,
    output_excerpt: outputExcerpt,
    tabs: tabs.map(toSnapshotTab),
    ...(active?.sessionId ? { active_session_id: active.sessionId } : {}),
    ...(active?.cwd ? { cwd: active.cwd } : {}),
    ...(filesSelection ? { files_selection: filesSelection } : {}),
  };
}
