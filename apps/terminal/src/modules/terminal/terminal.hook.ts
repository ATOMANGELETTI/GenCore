import { type ThemeName, useTheme } from "@gencore/ui-kit";
import * as React from "react";
import { loadPinnedTabs, savePinnedTabs } from "../ipc/ipc.pinned";
import {
  closePty,
  openPty,
  resizePty,
  subscribePtyData,
  subscribePtyExit,
  writePty,
} from "../ipc/ipc.pty";
import type { OpenPtyArgs } from "../ipc/ipc.types";
import { scanOsc7 } from "./terminal.osc7";
import { poshThemeSwapCommand } from "./terminal.prompt";
import type {
  PinnedTabRecord,
  PinnedTabSource,
  PinnedTabsFile,
  ShellName,
  TerminalClipboardApi,
  TerminalSessionApi,
  TerminalTab,
} from "./terminal.types";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_SHELL: ShellName = "pwsh";
export const MAX_PINNED_TABS = 16;
export const MAX_SCROLLBACK_BYTES = 256 * 1024;
export const SAVE_DEBOUNCE_MS = 2000;
const SEAM_MAX_COLS = 80;
/** Mirrors the Isolation hook's `WRITE_DATA_MAX_LENGTH` cap on `write` payloads. */
export const MAX_PTY_WRITE_CHARS = 65536;
/**
 * Bytes buffered per tab so a replacement writer (e.g. a React StrictMode
 * dev-mode remount disposing the first xterm instance before it finishes
 * parsing) can replay the ConPTY handshake preamble (`ESC [6n` DSR) instead
 * of losing it with the disposed terminal. Capped well below real scrollback
 * so this never becomes a second, unbounded output buffer.
 */
export const MAX_STARTUP_REPLAY_BYTES = 4096;

export function clampPtyDim(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(999, Math.max(1, Math.floor(value)));
}

function decodePtyBase64(data: string): { bytes: Uint8Array; text: string } {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  const text = new TextDecoder("utf-8").decode(bytes);
  return { bytes, text };
}

const NOOP_CLIPBOARD: TerminalClipboardApi = {
  hasSelection: () => false,
  copy: async () => undefined,
  paste: async () => undefined,
  selectAll: () => undefined,
};

const TerminalSessionContext = React.createContext<TerminalSessionApi | null>(null);

export function sortTabs<T extends { pinned: boolean }>(tabs: readonly T[]): T[] {
  const pinned: T[] = [];
  const unpinned: T[] = [];
  for (const tab of tabs) {
    if (tab.pinned) {
      pinned.push(tab);
    } else {
      unpinned.push(tab);
    }
  }
  return [...pinned, ...unpinned];
}

export function autoTitle(name: string | null, cwd: string | null): string {
  if (name) {
    return name;
  }
  if (!cwd) {
    return "PowerShell";
  }
  if (/^[A-Za-z]:\\$/.test(cwd)) {
    return cwd;
  }
  const trimmed = cwd.endsWith("\\") ? cwd.slice(0, -1) : cwd;
  const segment = trimmed.split("\\").pop();
  return segment || cwd;
}

export function nextActiveId(
  tabs: readonly { id: string }[],
  closingId: string,
  activeId: string | null,
): string | null {
  if (activeId !== closingId) {
    return activeId;
  }
  const index = tabs.findIndex((tab) => tab.id === closingId);
  const remaining = tabs.filter((tab) => tab.id !== closingId);
  if (remaining.length === 0) {
    return null;
  }
  return remaining[Math.min(index, remaining.length - 1)]?.id ?? remaining[0]?.id ?? null;
}

export function capScrollback(scrollback: string, maxBytes = MAX_SCROLLBACK_BYTES): string {
  const encoded = new TextEncoder().encode(scrollback);
  if (encoded.byteLength <= maxBytes) {
    return scrollback;
  }
  let start = encoded.byteLength - maxBytes;
  while (start < encoded.byteLength) {
    const byte = encoded[start];
    if (byte === undefined || (byte & 0b1100_0000) !== 0b1000_0000) {
      break;
    }
    start += 1;
  }
  return new TextDecoder("utf-8").decode(encoded.subarray(start));
}

export function seamLine(cols: number): string {
  if (!Number.isFinite(cols)) {
    return "";
  }
  const width = Math.max(0, Math.min(SEAM_MAX_COLS, Math.floor(cols)));
  return "─".repeat(width);
}

export function toPinnedFile(
  tabs: readonly PinnedTabSource[],
  activeId: string | null,
): PinnedTabsFile {
  const pinned = tabs.filter((tab) => tab.pinned).slice(0, MAX_PINNED_TABS);
  const pinnedIds = new Set(pinned.map((tab) => tab.id));
  return {
    version: 1,
    activeId: activeId !== null && pinnedIds.has(activeId) ? activeId : null,
    tabs: pinned.map((tab) => ({
      id: tab.id,
      name: tab.name,
      cwd: tab.cwd,
      scrollback: capScrollback(tab.scrollback),
      cols: tab.cols,
      rows: tab.rows,
    })),
  };
}

function parsePinnedRecord(value: unknown): PinnedTabRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) {
    return null;
  }
  if (rec.name !== null && rec.name !== undefined && typeof rec.name !== "string") {
    return null;
  }
  if (rec.cwd !== null && rec.cwd !== undefined && typeof rec.cwd !== "string") {
    return null;
  }
  if (typeof rec.scrollback !== "string") {
    return null;
  }
  const cols = typeof rec.cols === "number" ? rec.cols : Number(rec.cols);
  const rows = typeof rec.rows === "number" ? rec.rows : Number(rec.rows);
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) {
    return null;
  }
  return {
    id: rec.id,
    name: typeof rec.name === "string" ? rec.name : null,
    cwd: typeof rec.cwd === "string" ? rec.cwd : null,
    scrollback: rec.scrollback,
    cols: clampPtyDim(cols),
    rows: clampPtyDim(rows),
  };
}

export function canFlushPinnedSave(gate: { hydrated: boolean; persistAllowed: boolean }): boolean {
  return gate.hydrated && gate.persistAllowed;
}

export function fromPinnedFile(value: unknown): PinnedTabsFile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const rec = value as Record<string, unknown>;
  if (rec.version !== 1) {
    return null;
  }
  if (!Array.isArray(rec.tabs)) {
    return null;
  }
  const tabs: PinnedTabRecord[] = [];
  for (const item of rec.tabs) {
    const parsed = parsePinnedRecord(item);
    if (parsed) {
      tabs.push(parsed);
    }
    if (tabs.length >= MAX_PINNED_TABS) {
      break;
    }
  }
  return {
    version: 1,
    activeId: typeof rec.activeId === "string" ? rec.activeId : null,
    tabs,
  };
}

function errorText(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error) ?? "";
  } catch {
    return "";
  }
}

function isInvalidCwd(error: unknown): boolean {
  const text = errorText(error);
  return text.includes("invalid working directory") || text.includes("InvalidCwd");
}

/**
 * Only a reaped/unknown session means the shell is gone. Isolation rejections,
 * oversized payloads, and transient IPC faults must not mark the tab exited.
 */
export function isSessionNotFound(error: unknown): boolean {
  const text = errorText(error);
  return text.includes("pty session not found") || text.includes("SessionNotFound");
}

/** Split a write into Isolation-sized chunks without breaking a surrogate pair. */
export function chunkPtyWrite(data: string, maxChars = MAX_PTY_WRITE_CHARS): string[] {
  if (data.length === 0) {
    return [];
  }
  if (data.length <= maxChars) {
    return [data];
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < data.length) {
    let end = Math.min(start + maxChars, data.length);
    const lastCode = data.charCodeAt(end - 1);
    if (end < data.length && end - 1 > start && lastCode >= 0xd800 && lastCode <= 0xdbff) {
      end -= 1;
    }
    chunks.push(data.slice(start, end));
    start = end;
  }
  return chunks;
}

function recordToTab(record: PinnedTabRecord): TerminalTab {
  return {
    id: record.id,
    name: record.name,
    pinned: true,
    cwd: record.cwd,
    sessionId: null,
    status: "live",
    error: null,
    restore: {
      scrollback: record.scrollback,
      cols: record.cols,
      rows: record.rows,
    },
  };
}

function createEmptyTab(): TerminalTab {
  return {
    id: crypto.randomUUID(),
    name: null,
    pinned: false,
    cwd: null,
    sessionId: null,
    status: "live",
    error: null,
  };
}

function failListenTab(error: unknown): TerminalTab {
  return {
    ...createEmptyTab(),
    status: "exited",
    error: errorText(error) || "PTY events failed to subscribe",
  };
}

function buildOpenArgs(
  cols: number,
  rows: number,
  theme: ThemeName,
  cwd?: string | null,
): OpenPtyArgs {
  if (cwd) {
    return { cols, rows, cwd, theme };
  }
  return { cols, rows, theme };
}

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [tabs, setTabs] = React.useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = React.useState("");
  const [cols, setCols] = React.useState(DEFAULT_COLS);
  const [rows, setRows] = React.useState(DEFAULT_ROWS);

  const tabsRef = React.useRef(tabs);
  const activeIdRef = React.useRef(activeId);
  const themeRef = React.useRef(theme);
  const sizeRef = React.useRef({ cols, rows });
  const writersRef = React.useRef(new Map<string, (data: Uint8Array) => void>());
  const queuesRef = React.useRef(new Map<string, Uint8Array[]>());
  const orphansRef = React.useRef(new Map<string, Uint8Array[]>());
  const startupBytesRef = React.useRef(new Map<string, { chunks: Uint8Array[]; total: number }>());
  const pendingInputRef = React.useRef(new Map<string, string[]>());
  const clipboardRef = React.useRef<TerminalClipboardApi>(NOOP_CLIPBOARD);
  const spawnGenRef = React.useRef(new Map<string, number>());
  const serializersRef = React.useRef(new Map<string, () => string>());
  const scrollbackCacheRef = React.useRef(new Map<string, string>());
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = React.useRef(false);
  const persistAllowedRef = React.useRef(false);

  tabsRef.current = tabs;
  activeIdRef.current = activeId;
  themeRef.current = theme;
  sizeRef.current = { cols, rows };

  const updateTab = React.useCallback((id: string, patch: Partial<TerminalTab>) => {
    setTabs((current) => {
      const next = current.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab));
      tabsRef.current = next;
      return next;
    });
  }, []);

  const markExited = React.useCallback(
    (tabId: string, error: unknown) => {
      if (isSessionNotFound(error)) {
        updateTab(tabId, { status: "exited", sessionId: null, error: null });
      }
    },
    [updateTab],
  );

  const writeSession = React.useCallback(
    async (tabId: string, sessionId: string, data: string) => {
      try {
        for (const chunk of chunkPtyWrite(data)) {
          await writePty(sessionId, chunk);
        }
      } catch (error) {
        markExited(tabId, error);
      }
    },
    [markExited],
  );

  /**
   * Remembers bytes handed straight to a live writer (not queued) so a
   * replacement writer can replay them if the original terminal instance
   * disposes before it finishes parsing them. Bounded by
   * `MAX_STARTUP_REPLAY_BYTES`; only the earliest bytes of a session matter
   * for the ConPTY handshake, so recording stops once the cap is hit.
   */
  const recordStartupBytes = React.useCallback((tabId: string, bytes: Uint8Array) => {
    const entry = startupBytesRef.current.get(tabId) ?? { chunks: [], total: 0 };
    if (entry.total >= MAX_STARTUP_REPLAY_BYTES) {
      return;
    }
    entry.chunks.push(bytes);
    entry.total += bytes.byteLength;
    startupBytesRef.current.set(tabId, entry);
  }, []);

  const deliverBytes = React.useCallback(
    (tabId: string, bytes: Uint8Array) => {
      const write = writersRef.current.get(tabId);
      if (write) {
        recordStartupBytes(tabId, bytes);
        write(bytes);
        return;
      }
      const queue = queuesRef.current.get(tabId) ?? [];
      queue.push(bytes);
      queuesRef.current.set(tabId, queue);
    },
    [recordStartupBytes],
  );

  const flushOrphans = React.useCallback(
    (sessionId: string, tabId: string) => {
      const parked = orphansRef.current.get(sessionId);
      if (!parked) {
        return;
      }
      orphansRef.current.delete(sessionId);
      for (const chunk of parked) {
        deliverBytes(tabId, chunk);
      }
    },
    [deliverBytes],
  );

  const flushPendingInput = React.useCallback(
    (tabId: string, sessionId: string) => {
      const pending = pendingInputRef.current.get(tabId);
      if (!pending) {
        return;
      }
      pendingInputRef.current.delete(tabId);
      for (const data of pending) {
        void writeSession(tabId, sessionId, data);
      }
    },
    [writeSession],
  );

  const themeReadyRef = React.useRef(false);
  React.useEffect(() => {
    if (!themeReadyRef.current) {
      themeReadyRef.current = true;
      return;
    }
    const command = poshThemeSwapCommand(theme);
    for (const tab of tabsRef.current) {
      if (tab.sessionId && tab.status === "live") {
        void writeSession(tab.id, tab.sessionId, command);
      }
    }
  }, [theme, writeSession]);

  const bumpSpawn = React.useCallback((id: string): number => {
    const next = (spawnGenRef.current.get(id) ?? 0) + 1;
    spawnGenRef.current.set(id, next);
    return next;
  }, []);

  const scrollbackForTab = React.useCallback((tab: TerminalTab): string => {
    try {
      const serialized = serializersRef.current.get(tab.id)?.();
      if (typeof serialized === "string") {
        return serialized;
      }
    } catch {
      // Terminal may already be disposed.
    }
    return scrollbackCacheRef.current.get(tab.id) ?? tab.restore?.scrollback ?? "";
  }, []);

  /** Public `readScrollback`: only the live serializer, "" if none is registered (e.g. Assistant snapshots). */
  const readScrollback = React.useCallback((tabId: string): string => {
    try {
      return serializersRef.current.get(tabId)?.() ?? "";
    } catch {
      return "";
    }
  }, []);

  const allowPersist = React.useCallback(() => {
    persistAllowedRef.current = true;
  }, []);

  const flushSave = React.useCallback(async () => {
    if (
      !canFlushPinnedSave({
        hydrated: hydratedRef.current,
        persistAllowed: persistAllowedRef.current,
      })
    ) {
      return;
    }
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const { cols: nextCols, rows: nextRows } = sizeRef.current;
    const sources: PinnedTabSource[] = tabsRef.current.map((tab) => ({
      id: tab.id,
      name: tab.name,
      pinned: tab.pinned,
      cwd: tab.cwd,
      scrollback: scrollbackForTab(tab),
      cols: nextCols,
      rows: nextRows,
    }));
    const file = toPinnedFile(sources, activeIdRef.current || null);
    for (const record of file.tabs) {
      scrollbackCacheRef.current.set(record.id, record.scrollback);
    }
    try {
      await savePinnedTabs(JSON.stringify(file));
    } catch {
      // Best-effort persist; Isolation/IPC may be unavailable in tests.
    }
  }, [scrollbackForTab]);

  const scheduleSave = React.useCallback(() => {
    if (!hydratedRef.current) {
      return;
    }
    allowPersist();
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [allowPersist, flushSave]);

  const dropTabRuntime = React.useCallback((id: string) => {
    const tab = tabsRef.current.find((item) => item.id === id);
    if (tab?.sessionId) {
      orphansRef.current.delete(tab.sessionId);
    }
    pendingInputRef.current.delete(id);
    writersRef.current.delete(id);
    queuesRef.current.delete(id);
    startupBytesRef.current.delete(id);
    serializersRef.current.delete(id);
    scrollbackCacheRef.current.delete(id);
  }, []);

  const spawnSession = React.useCallback(
    async (tabId: string, cwd?: string | null, size?: { cols: number; rows: number }) => {
      const generation = bumpSpawn(tabId);
      const { cols: nextCols, rows: nextRows } = size ?? sizeRef.current;
      try {
        let sessionId: string;
        try {
          const opened = await openPty(buildOpenArgs(nextCols, nextRows, themeRef.current, cwd));
          sessionId = opened.session_id;
        } catch (error) {
          if (cwd && isInvalidCwd(error)) {
            const opened = await openPty(buildOpenArgs(nextCols, nextRows, themeRef.current, null));
            sessionId = opened.session_id;
          } else {
            throw error;
          }
        }
        if (spawnGenRef.current.get(tabId) !== generation) {
          orphansRef.current.delete(sessionId);
          try {
            await closePty(sessionId);
          } catch {
            // Replaced or closed while opening.
          }
          return;
        }
        updateTab(tabId, { sessionId, status: "live", error: null });
        flushOrphans(sessionId, tabId);
        flushPendingInput(tabId, sessionId);
      } catch (error) {
        if (spawnGenRef.current.get(tabId) !== generation) {
          return;
        }
        pendingInputRef.current.delete(tabId);
        updateTab(tabId, {
          sessionId: null,
          status: "exited",
          error: errorText(error) || "PTY failed to start",
        });
      }
    },
    [bumpSpawn, flushOrphans, flushPendingInput, updateTab],
  );

  const killSession = React.useCallback(async (sessionId: string | null) => {
    if (!sessionId) {
      return;
    }
    try {
      await closePty(sessionId);
    } catch {
      // Already gone.
    }
  }, []);

  const newTab = React.useCallback(() => {
    const tab = createEmptyTab();
    const next = [...tabsRef.current, tab];
    tabsRef.current = next;
    setTabs(next);
    setActiveId(tab.id);
    void spawnSession(tab.id);
  }, [spawnSession]);

  const closeTab = React.useCallback(
    (id: string) => {
      const current = tabsRef.current;
      const closing = current.find((tab) => tab.id === id);
      bumpSpawn(id);
      dropTabRuntime(id);
      void killSession(closing?.sessionId ?? null);

      const ordered = sortTabs(current);
      const nextId = nextActiveId(ordered, id, activeIdRef.current);
      const remaining = current.filter((tab) => tab.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyTab();
        const spawnGuard = spawnGenRef.current.get(fresh.id) ?? 0;
        tabsRef.current = [fresh];
        setTabs([fresh]);
        setActiveId(fresh.id);
        queueMicrotask(() => {
          if ((spawnGenRef.current.get(fresh.id) ?? 0) !== spawnGuard) {
            return;
          }
          void spawnSession(fresh.id);
        });
        allowPersist();
        void flushSave();
        return;
      }
      tabsRef.current = remaining;
      setTabs(remaining);
      setActiveId(nextId ?? remaining[0]?.id ?? "");
      allowPersist();
      void flushSave();
    },
    [allowPersist, bumpSpawn, dropTabRuntime, flushSave, killSession, spawnSession],
  );

  const setActive = React.useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const renameTab = React.useCallback(
    (id: string, name: string | null) => {
      const trimmed = name?.trim() ? name.trim() : null;
      updateTab(id, { name: trimmed });
      scheduleSave();
    },
    [scheduleSave, updateTab],
  );

  const togglePin = React.useCallback(
    (id: string) => {
      const current = tabsRef.current;
      const tab = current.find((item) => item.id === id);
      if (!tab) {
        return;
      }
      if (!tab.pinned && current.filter((item) => item.pinned).length >= MAX_PINNED_TABS) {
        return;
      }
      const next = current.map((item) =>
        item.id === id ? { ...item, pinned: !item.pinned } : item,
      );
      tabsRef.current = next;
      setTabs(next);
      allowPersist();
      void flushSave();
    },
    [allowPersist, flushSave],
  );

  const closeOthers = React.useCallback(
    (id: string) => {
      const current = tabsRef.current;
      for (const tab of current) {
        if (tab.id === id) {
          continue;
        }
        bumpSpawn(tab.id);
        dropTabRuntime(tab.id);
        void killSession(tab.sessionId);
      }
      const keep = current.find((tab) => tab.id === id);
      if (!keep) {
        return;
      }
      tabsRef.current = [keep];
      setTabs([keep]);
      setActiveId(keep.id);
      allowPersist();
      void flushSave();
    },
    [allowPersist, bumpSpawn, dropTabRuntime, flushSave, killSession],
  );

  const closeUnpinned = React.useCallback(() => {
    const current = tabsRef.current;
    const dropping = current.filter((tab) => !tab.pinned);
    for (const tab of dropping) {
      bumpSpawn(tab.id);
      dropTabRuntime(tab.id);
      void killSession(tab.sessionId);
    }
    const remaining = current.filter((tab) => tab.pinned);
    if (remaining.length === 0) {
      const fresh = createEmptyTab();
      const spawnGuard = spawnGenRef.current.get(fresh.id) ?? 0;
      tabsRef.current = [fresh];
      setTabs([fresh]);
      setActiveId(fresh.id);
      queueMicrotask(() => {
        if ((spawnGenRef.current.get(fresh.id) ?? 0) !== spawnGuard) {
          return;
        }
        void spawnSession(fresh.id);
      });
      allowPersist();
      void flushSave();
      return;
    }
    tabsRef.current = remaining;
    setTabs(remaining);
    if (!remaining.some((tab) => tab.id === activeIdRef.current)) {
      setActiveId(remaining[0]?.id ?? "");
    }
    allowPersist();
    void flushSave();
  }, [allowPersist, bumpSpawn, dropTabRuntime, flushSave, killSession, spawnSession]);

  const restartTab = React.useCallback(
    (id: string) => {
      const tab = tabsRef.current.find((item) => item.id === id);
      if (!tab) {
        return;
      }
      bumpSpawn(id);
      startupBytesRef.current.delete(id);
      void killSession(tab.sessionId);
      updateTab(id, { sessionId: null, status: "live", error: null });
      void spawnSession(id, tab.cwd);
    },
    [bumpSpawn, killSession, spawnSession, updateTab],
  );

  const setViewport = React.useCallback(
    (nextCols: number, nextRows: number) => {
      const colsClamped = clampPtyDim(nextCols);
      const rowsClamped = clampPtyDim(nextRows);
      setCols(colsClamped);
      setRows(rowsClamped);
      sizeRef.current = { cols: colsClamped, rows: rowsClamped };
      for (const tab of tabsRef.current) {
        if (tab.sessionId && tab.status === "live") {
          void resizePty(tab.sessionId, colsClamped, rowsClamped).catch((error: unknown) => {
            markExited(tab.id, error);
          });
        }
      }
    },
    [markExited],
  );

  const registerWriter = React.useCallback(
    (tabId: string, write: (data: Uint8Array) => void) => {
      writersRef.current.set(tabId, write);
      const queued = queuesRef.current.get(tabId);
      if (queued) {
        for (const chunk of queued) {
          write(chunk);
        }
        queuesRef.current.delete(tabId);
      }
      const tab = tabsRef.current.find((item) => item.id === tabId);
      if (tab?.sessionId) {
        // No-op when empty; catches bytes orphaned by the narrow window
        // between updateTab assigning sessionId and tabsRef reflecting it.
        flushOrphans(tab.sessionId, tabId);
      }
      // Replays the ConPTY handshake preamble to a replacement writer. If a
      // prior writer for this tab (e.g. a disposed StrictMode dev remount)
      // was handed these bytes directly but never finished parsing them
      // before disposal, xterm's own DSR handling never ran and the shell
      // stays blocked waiting for the CPR reply. Replaying is safe: this
      // only re-runs when a *new* writer attaches for a tab that already
      // had one, which does not happen during normal single-mount use.
      const startup = startupBytesRef.current.get(tabId);
      if (startup) {
        for (const chunk of startup.chunks) {
          write(chunk);
        }
      }
      if (tab?.restore && !tab.sessionId && tab.status === "live") {
        void spawnSession(tabId, tab.cwd, {
          cols: tab.restore.cols,
          rows: tab.restore.rows,
        });
      }
      return () => {
        writersRef.current.delete(tabId);
      };
    },
    [flushOrphans, spawnSession],
  );

  const registerSerializer = React.useCallback((tabId: string, serialize: () => string) => {
    serializersRef.current.set(tabId, serialize);
    return () => {
      if (serializersRef.current.get(tabId) === serialize) {
        serializersRef.current.delete(tabId);
      }
    };
  }, []);

  const registerClipboard = React.useCallback((api: TerminalClipboardApi) => {
    clipboardRef.current = api;
    return () => {
      if (clipboardRef.current === api) {
        clipboardRef.current = NOOP_CLIPBOARD;
      }
    };
  }, []);

  const onTerminalInput = React.useCallback(
    (tabId: string, data: string) => {
      const tab = tabsRef.current.find((item) => item.id === tabId);
      if (!tab) {
        return;
      }
      if (tab.status === "exited") {
        if (data === "\r" || data === "\n" || data === "\r\n") {
          restartTab(tabId);
        }
        return;
      }
      if (!tab.sessionId) {
        const pending = pendingInputRef.current.get(tabId) ?? [];
        pending.push(data);
        pendingInputRef.current.set(tabId, pending);
        return;
      }
      void writeSession(tabId, tab.sessionId, data);
    },
    [restartTab, writeSession],
  );

  React.useEffect(() => {
    let cancelled = false;
    let unlistenData: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    async function restorePinned() {
      let parsed: PinnedTabsFile | null = null;
      try {
        const json = await loadPinnedTabs();
        try {
          parsed = fromPinnedFile(JSON.parse(json) as unknown);
        } catch {
          parsed = null;
        }
      } catch {
        parsed = null;
      }
      if (cancelled) {
        return;
      }
      if (parsed && parsed.tabs.length > 0) {
        const restored = parsed.tabs.map(recordToTab);
        tabsRef.current = restored;
        const focus =
          parsed.activeId && restored.some((tab) => tab.id === parsed.activeId)
            ? parsed.activeId
            : (restored[0]?.id ?? "");
        activeIdRef.current = focus;
        setTabs(restored);
        setActiveId(focus);
      } else {
        const home = createEmptyTab();
        tabsRef.current = [home];
        activeIdRef.current = home.id;
        setTabs([home]);
        setActiveId(home.id);
        void spawnSession(home.id);
      }
      hydratedRef.current = true;
      if (parsed) {
        persistAllowedRef.current = true;
      }
    }

    void (async () => {
      try {
        const stopData = await subscribePtyData((payload) => {
          let bytes: Uint8Array;
          let text: string;
          try {
            const decoded = decodePtyBase64(payload.data);
            bytes = decoded.bytes;
            text = decoded.text;
          } catch {
            return;
          }
          const tab = tabsRef.current.find((item) => item.sessionId === payload.session_id);
          if (!tab) {
            const parked = orphansRef.current.get(payload.session_id) ?? [];
            parked.push(bytes);
            orphansRef.current.set(payload.session_id, parked);
            return;
          }
          const cwd = scanOsc7(text);
          if (cwd && cwd !== tab.cwd) {
            updateTab(tab.id, { cwd });
          }
          deliverBytes(tab.id, bytes);
          if (tab.pinned) {
            scheduleSave();
          }
        });
        unlistenData = stopData;
        const stopExit = await subscribePtyExit((payload) => {
          // Rust reaps the map entry on the reader-exit path; this is the belt to
          // that brace, so a dropped exit event can never strand a ConPTY session.
          orphansRef.current.delete(payload.session_id);
          void killSession(payload.session_id);
          const tab = tabsRef.current.find((item) => item.sessionId === payload.session_id);
          if (!tab) {
            return;
          }
          updateTab(tab.id, { status: "exited", sessionId: null, error: null });
        });
        if (cancelled) {
          stopData();
          stopExit();
          return;
        }
        unlistenExit = stopExit;
        await restorePinned();
      } catch (error) {
        if (!cancelled) {
          const failed = failListenTab(error);
          tabsRef.current = [failed];
          activeIdRef.current = failed.id;
          setTabs([failed]);
          setActiveId(failed.id);
        }
      }
    })();

    function onPageHide() {
      void flushSave();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void flushSave();
      }
    }
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unlistenData?.();
      unlistenExit?.();
      void flushSave();
      for (const tab of tabsRef.current) {
        bumpSpawn(tab.id);
        void killSession(tab.sessionId);
      }
    };
  }, [bumpSpawn, deliverBytes, flushSave, killSession, scheduleSave, spawnSession, updateTab]);

  const clipboard: TerminalClipboardApi = React.useMemo(
    () => ({
      hasSelection: () => clipboardRef.current.hasSelection(),
      copy: () => clipboardRef.current.copy(),
      paste: () => clipboardRef.current.paste(),
      selectAll: () => clipboardRef.current.selectAll(),
    }),
    [],
  );

  const value = React.useMemo<TerminalSessionApi>(
    () => ({
      tabs: sortTabs(tabs),
      activeId,
      cols,
      rows,
      shellName: DEFAULT_SHELL,
      newTab,
      closeTab,
      setActive,
      renameTab,
      togglePin,
      closeOthers,
      closeUnpinned,
      restartTab,
      setViewport,
      registerWriter,
      registerSerializer,
      registerClipboard,
      readScrollback,
      onTerminalInput,
      clipboard,
      flushPinnedSave: flushSave,
    }),
    [
      activeId,
      clipboard,
      closeOthers,
      closeTab,
      closeUnpinned,
      cols,
      flushSave,
      newTab,
      onTerminalInput,
      readScrollback,
      registerClipboard,
      registerSerializer,
      registerWriter,
      renameTab,
      restartTab,
      rows,
      setActive,
      setViewport,
      tabs,
      togglePin,
    ],
  );

  return React.createElement(TerminalSessionContext.Provider, { value }, children);
}

export function useTerminalSession(): TerminalSessionApi {
  const context = React.useContext(TerminalSessionContext);
  if (!context) {
    throw new Error("useTerminalSession must be used inside a <TerminalProvider>");
  }
  return context;
}

/**
 * Non-throwing accessor for consumers (the Assistant) that may render outside
 * a `<TerminalProvider>` in isolated specs; `null` means no session is available.
 */
export function useTerminalSessionOptional(): TerminalSessionApi | null {
  return React.useContext(TerminalSessionContext);
}

/**
 * Test-only stub so specs can supply a fake `TerminalSessionApi` without
 * mounting the real `<TerminalProvider>` (which subscribes to PTY IPC events).
 */
export function TerminalSessionStubProvider({
  value,
  children,
}: {
  value: TerminalSessionApi;
  children: React.ReactNode;
}) {
  return React.createElement(TerminalSessionContext.Provider, { value }, children);
}
