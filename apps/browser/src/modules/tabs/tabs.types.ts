export interface BrowserTab {
  readonly id: string;
  readonly webviewLabel: string;
  /** Empty string until the tab's first navigation. */
  readonly url: string;
  readonly loading: boolean;
  readonly hasWebview: boolean;
  readonly history: readonly string[];
  /** -1 when `history` is empty. */
  readonly historyIndex: number;
}

export interface TabsApi {
  readonly tabs: readonly BrowserTab[];
  readonly activeTabId: string | null;
  readonly activeTab: BrowserTab | null;
  openTab: () => string;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  navigate: (id: string, url: string) => Promise<void>;
  goBack: (id: string) => void;
  goForward: (id: string) => void;
  reload: (id: string) => void;
  stop: (id: string) => void;
}
