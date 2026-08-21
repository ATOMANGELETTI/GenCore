import { type ThemeName, useTheme } from "@gencore/ui-kit";
import * as React from "react";
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
import type {
  ShellName,
  TerminalClipboardApi,
  TerminalSessionApi,
  TerminalTab,
} from "./terminal.types";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_SHELL: ShellName = "pwsh";

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

/** Persistence is Task 6. */
export async function savePinned(): Promise<void> {}

function createEmptyTab(): TerminalTab {
  return {
    id: crypto.randomUUID(),
    name: null,
    pinned: false,
    cwd: null,
    sessionId: null,
    status: "live",
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
  const [tabs, setTabs] = React.useState<TerminalTab[]>(() => [createEmptyTab()]);
  const [activeId, setActiveId] = React.useState(() => tabs[0]?.id ?? "");
  const [cols, setCols] = React.useState(DEFAULT_COLS);
  const [rows, setRows] = React.useState(DEFAULT_ROWS);

  const tabsRef = React.useRef(tabs);
  const activeIdRef = React.useRef(activeId);
  const themeRef = React.useRef(theme);
  const sizeRef = React.useRef({ cols, rows });
  const writersRef = React.useRef(new Map<string, (data: Uint8Array) => void>());
  const queuesRef = React.useRef(new Map<string, Uint8Array[]>());
  const clipboardRef = React.useRef<TerminalClipboardApi>(NOOP_CLIPBOARD);
  const spawnGenRef = React.useRef(new Map<string, number>());

  tabsRef.current = tabs;
  activeIdRef.current = activeId;
  themeRef.current = theme;
  sizeRef.current = { cols, rows };

  const updateTab = React.useCallback((id: string, patch: Partial<TerminalTab>) => {
    setTabs((current) => current.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
  }, []);

  const bumpSpawn = React.useCallback((id: string): number => {
    const next = (spawnGenRef.current.get(id) ?? 0) + 1;
    spawnGenRef.current.set(id, next);
    return next;
  }, []);

  const spawnSession = React.useCallback(
    async (tabId: string, cwd?: string | null) => {
      const generation = bumpSpawn(tabId);
      const { cols: nextCols, rows: nextRows } = sizeRef.current;
      try {
        const { session_id } = await openPty(
          buildOpenArgs(nextCols, nextRows, themeRef.current, cwd),
        );
        if (spawnGenRef.current.get(tabId) !== generation) {
          try {
            await closePty(session_id);
          } catch {
            // Replaced or closed while opening.
          }
          return;
        }
        updateTab(tabId, { sessionId: session_id, status: "live" });
      } catch {
        if (spawnGenRef.current.get(tabId) !== generation) {
          return;
        }
        updateTab(tabId, { sessionId: null, status: "exited" });
      }
    },
    [bumpSpawn, updateTab],
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
    setTabs((current) => [...current, tab]);
    setActiveId(tab.id);
    void spawnSession(tab.id);
  }, [spawnSession]);

  const closeTab = React.useCallback(
    (id: string) => {
      const current = tabsRef.current;
      const closing = current.find((tab) => tab.id === id);
      bumpSpawn(id);
      writersRef.current.delete(id);
      queuesRef.current.delete(id);
      void killSession(closing?.sessionId ?? null);

      const ordered = sortTabs(current);
      const nextId = nextActiveId(ordered, id, activeIdRef.current);
      const remaining = current.filter((tab) => tab.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyTab();
        setTabs([fresh]);
        setActiveId(fresh.id);
        void spawnSession(fresh.id);
        void savePinned();
        return;
      }
      setTabs(remaining);
      setActiveId(nextId ?? remaining[0]?.id ?? "");
      void savePinned();
    },
    [bumpSpawn, killSession, spawnSession],
  );

  const setActive = React.useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const renameTab = React.useCallback(
    (id: string, name: string | null) => {
      const trimmed = name?.trim() ? name.trim() : null;
      updateTab(id, { name: trimmed });
      void savePinned();
    },
    [updateTab],
  );

  const togglePin = React.useCallback((id: string) => {
    setTabs((current) =>
      current.map((tab) => (tab.id === id ? { ...tab, pinned: !tab.pinned } : tab)),
    );
    void savePinned();
  }, []);

  const closeOthers = React.useCallback(
    (id: string) => {
      const current = tabsRef.current;
      for (const tab of current) {
        if (tab.id === id) {
          continue;
        }
        bumpSpawn(tab.id);
        writersRef.current.delete(tab.id);
        queuesRef.current.delete(tab.id);
        void killSession(tab.sessionId);
      }
      const keep = current.find((tab) => tab.id === id);
      if (!keep) {
        return;
      }
      setTabs([keep]);
      setActiveId(keep.id);
      void savePinned();
    },
    [bumpSpawn, killSession],
  );

  const closeUnpinned = React.useCallback(() => {
    const current = tabsRef.current;
    const dropping = current.filter((tab) => !tab.pinned);
    for (const tab of dropping) {
      bumpSpawn(tab.id);
      writersRef.current.delete(tab.id);
      queuesRef.current.delete(tab.id);
      void killSession(tab.sessionId);
    }
    const remaining = current.filter((tab) => tab.pinned);
    if (remaining.length === 0) {
      const fresh = createEmptyTab();
      setTabs([fresh]);
      setActiveId(fresh.id);
      void spawnSession(fresh.id);
      void savePinned();
      return;
    }
    setTabs(remaining);
    if (!remaining.some((tab) => tab.id === activeIdRef.current)) {
      setActiveId(remaining[0]?.id ?? "");
    }
    void savePinned();
  }, [bumpSpawn, killSession, spawnSession]);

  const restartTab = React.useCallback(
    (id: string) => {
      const tab = tabsRef.current.find((item) => item.id === id);
      if (!tab) {
        return;
      }
      bumpSpawn(id);
      void killSession(tab.sessionId);
      updateTab(id, { sessionId: null, status: "live" });
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
          void resizePty(tab.sessionId, colsClamped, rowsClamped).catch(() => {
            updateTab(tab.id, { status: "exited", sessionId: null });
          });
        }
      }
    },
    [updateTab],
  );

  const registerWriter = React.useCallback((tabId: string, write: (data: Uint8Array) => void) => {
    writersRef.current.set(tabId, write);
    const queued = queuesRef.current.get(tabId);
    if (queued) {
      for (const chunk of queued) {
        write(chunk);
      }
      queuesRef.current.delete(tabId);
    }
    return () => {
      writersRef.current.delete(tabId);
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
        return;
      }
      void writePty(tab.sessionId, data).catch(() => {
        updateTab(tabId, { status: "exited", sessionId: null });
      });
    },
    [restartTab, updateTab],
  );

  React.useEffect(() => {
    const initialId = tabsRef.current[0]?.id;
    if (initialId) {
      void spawnSession(initialId);
    }

    let cancelled = false;
    let unlistenData: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    void subscribePtyData((payload) => {
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
        return;
      }
      const cwd = scanOsc7(text);
      if (cwd && cwd !== tab.cwd) {
        updateTab(tab.id, { cwd });
      }
      const write = writersRef.current.get(tab.id);
      if (write) {
        write(bytes);
        return;
      }
      const queue = queuesRef.current.get(tab.id) ?? [];
      queue.push(bytes);
      queuesRef.current.set(tab.id, queue);
    }).then((stop) => {
      if (cancelled) {
        stop();
        return;
      }
      unlistenData = stop;
    });

    void subscribePtyExit((payload) => {
      const tab = tabsRef.current.find((item) => item.sessionId === payload.session_id);
      if (!tab) {
        return;
      }
      updateTab(tab.id, { status: "exited", sessionId: null });
    }).then((stop) => {
      if (cancelled) {
        stop();
        return;
      }
      unlistenExit = stop;
    });

    return () => {
      cancelled = true;
      unlistenData?.();
      unlistenExit?.();
      for (const tab of tabsRef.current) {
        bumpSpawn(tab.id);
        void killSession(tab.sessionId);
      }
    };
  }, [bumpSpawn, killSession, spawnSession, updateTab]);

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
      registerClipboard,
      onTerminalInput,
      clipboard,
    }),
    [
      activeId,
      clipboard,
      closeOthers,
      closeTab,
      closeUnpinned,
      cols,
      newTab,
      onTerminalInput,
      registerClipboard,
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
