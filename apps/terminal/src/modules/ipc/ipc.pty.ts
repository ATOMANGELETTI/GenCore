import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { OpenPtyArgs, OpenPtyResult, PtyDataPayload, PtyExitPayload } from "./ipc.types";

const OPEN_COMMAND = "plugin:gencore-pty|open";
const WRITE_COMMAND = "plugin:gencore-pty|write";
const RESIZE_COMMAND = "plugin:gencore-pty|resize";
const CLOSE_COMMAND = "plugin:gencore-pty|close";
const PTY_DATA_EVENT = "gencore-pty://data";
const PTY_EXIT_EVENT = "gencore-pty://exit";

/**
 * PTY IPC for the Terminal emulator. Every command goes through this module so
 * the Isolation allowlist and capabilities stay auditable in one place.
 */
export function openPty(args: OpenPtyArgs): Promise<OpenPtyResult> {
  return invoke<OpenPtyResult>(OPEN_COMMAND, args);
}

export function writePty(sessionId: string, data: string): Promise<void> {
  return invoke<void>(WRITE_COMMAND, { session_id: sessionId, data });
}

export function resizePty(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke<void>(RESIZE_COMMAND, { session_id: sessionId, cols, rows });
}

export function closePty(sessionId: string): Promise<void> {
  return invoke<void>(CLOSE_COMMAND, { session_id: sessionId });
}

export function subscribePtyData(handler: (payload: PtyDataPayload) => void): Promise<() => void> {
  return listen<PtyDataPayload>(PTY_DATA_EVENT, (event) => {
    handler(event.payload);
  });
}

export function subscribePtyExit(handler: (payload: PtyExitPayload) => void): Promise<() => void> {
  return listen<PtyExitPayload>(PTY_EXIT_EVENT, (event) => {
    handler(event.payload);
  });
}
