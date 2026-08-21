export type TerminalTabStatus = "live" | "exited";

export type ShellName = "pwsh" | "powershell";

export interface PinnedTabRecord {
  id: string;
  name: string | null;
  cwd: string | null;
  scrollback: string;
  cols: number;
  rows: number;
}

export interface PinnedTabsFile {
  version: 1;
  activeId: string | null;
  tabs: PinnedTabRecord[];
}

export interface PinnedTabSource extends PinnedTabRecord {
  pinned: boolean;
}

export interface TerminalTab {
  id: string;
  name: string | null;
  pinned: boolean;
  cwd: string | null;
  sessionId: string | null;
  status: TerminalTabStatus;
  restore?: {
    scrollback: string;
    cols: number;
    rows: number;
  };
}

export interface TerminalClipboardApi {
  hasSelection: () => boolean;
  copy: () => Promise<void>;
  paste: () => Promise<void>;
  selectAll: () => void;
}

export interface TerminalSessionApi {
  tabs: readonly TerminalTab[];
  activeId: string;
  cols: number;
  rows: number;
  shellName: ShellName;
  newTab: () => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  renameTab: (id: string, name: string | null) => void;
  togglePin: (id: string) => void;
  closeOthers: (id: string) => void;
  closeUnpinned: () => void;
  restartTab: (id: string) => void;
  setViewport: (cols: number, rows: number) => void;
  registerWriter: (tabId: string, write: (data: Uint8Array) => void) => () => void;
  registerSerializer: (tabId: string, serialize: () => string) => () => void;
  registerClipboard: (api: TerminalClipboardApi) => () => void;
  onTerminalInput: (tabId: string, data: string) => void;
  clipboard: TerminalClipboardApi;
}
