import * as React from "react";
import {
  closeTabWebview,
  createTabWebview,
  evalTabWebview,
  navigateTabWebview,
  subscribeTabLoadFinished,
  subscribeTabLoadStarted,
  subscribeTabNavigated,
} from "../ipc/ipc.webview";
import type { BrowserTab, TabsApi } from "./tabs.types";

function createTabId(): string {
  return crypto.randomUUID();
}

function safeEval(label: string, script: string): void {
  evalTabWebview(label, script).catch(() => {
    // Tab webview or IPC unavailable — nothing to navigate.
  });
}

function newTab(id: string): BrowserTab {
  return {
    id,
    webviewLabel: `tab-${id}`,
    url: "",
    loading: false,
    hasWebview: false,
    history: [],
    historyIndex: -1,
  };
}

function pushHistory(tab: BrowserTab, url: string): BrowserTab {
  if (tab.historyIndex >= 0 && tab.history[tab.historyIndex] === url) {
    return tab;
  }
  const backIndex = tab.historyIndex - 1;
  if (backIndex >= 0 && tab.history[backIndex] === url) {
    return { ...tab, url, historyIndex: backIndex };
  }
  const forwardIndex = tab.historyIndex + 1;
  if (forwardIndex < tab.history.length && tab.history[forwardIndex] === url) {
    return { ...tab, url, historyIndex: forwardIndex };
  }
  const truncated = tab.history.slice(0, tab.historyIndex + 1);
  return { ...tab, url, history: [...truncated, url], historyIndex: truncated.length };
}

export function useTabs(): TabsApi {
  const [tabs, setTabs] = React.useState<BrowserTab[]>(() => [newTab(createTabId())]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(() => tabs[0]?.id ?? null);

  React.useEffect(() => {
    let cancelled = false;
    const unlistenFns: Array<() => void> = [];

    void (async () => {
      try {
        const navigated = await subscribeTabNavigated(({ label, url }) => {
          setTabs((prev) =>
            prev.map((tab) => (tab.webviewLabel === label ? pushHistory(tab, url) : tab)),
          );
        });
        const started = await subscribeTabLoadStarted(({ label }) => {
          setTabs((prev) =>
            prev.map((tab) => (tab.webviewLabel === label ? { ...tab, loading: true } : tab)),
          );
        });
        const finished = await subscribeTabLoadFinished(({ label }) => {
          setTabs((prev) =>
            prev.map((tab) => (tab.webviewLabel === label ? { ...tab, loading: false } : tab)),
          );
        });
        if (cancelled) {
          navigated();
          started();
          finished();
          return;
        }
        unlistenFns.push(navigated, started, finished);
      } catch {
        // Tauri event IPC unavailable (e.g. plain browser preview) — tab
        // state stays purely optimistic, no live updates.
      }
    })();

    return () => {
      cancelled = true;
      for (const unlisten of unlistenFns) {
        unlisten();
      }
    };
  }, []);

  const openTab = React.useCallback(() => {
    const id = createTabId();
    setTabs((prev) => [...prev, newTab(id)]);
    setActiveTabId(id);
    return id;
  }, []);

  const closeTab = React.useCallback(
    (id: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((tab) => tab.id === id);
        if (index === -1) {
          return prev;
        }
        const closing = prev[index];
        if (!closing) {
          return prev;
        }
        if (closing.hasWebview) {
          void closeTabWebview(closing.webviewLabel);
        }
        const next = prev.filter((tab) => tab.id !== id);
        if (activeTabId === id) {
          const fallback = next[index] ?? next[index - 1];
          if (fallback) {
            setActiveTabId(fallback.id);
          } else {
            const replacement = newTab(createTabId());
            setActiveTabId(replacement.id);
            return [replacement];
          }
        }
        return next;
      });
    },
    [activeTabId],
  );

  const switchTab = React.useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const navigate = React.useCallback(async (id: string, rawUrl: string) => {
    let target: BrowserTab | undefined;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== id) {
          return tab;
        }
        target = tab;
        return { ...tab, url: rawUrl, hasWebview: true, loading: true };
      }),
    );
    if (!target) {
      return;
    }
    try {
      if (target.hasWebview) {
        await navigateTabWebview(target.webviewLabel, rawUrl);
      } else {
        await createTabWebview(target.webviewLabel, rawUrl);
      }
    } catch {
      setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, loading: false } : tab)));
    }
  }, []);

  const goBack = React.useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab?.hasWebview) {
        safeEval(tab.webviewLabel, "history.back()");
      }
    },
    [tabs],
  );

  const goForward = React.useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab?.hasWebview) {
        safeEval(tab.webviewLabel, "history.forward()");
      }
    },
    [tabs],
  );

  const reload = React.useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab?.hasWebview) {
        safeEval(tab.webviewLabel, "location.reload()");
      }
    },
    [tabs],
  );

  const stop = React.useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab?.hasWebview) {
        safeEval(tab.webviewLabel, "window.stop()");
      }
    },
    [tabs],
  );

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    switchTab,
    navigate,
    goBack,
    goForward,
    reload,
    stop,
  };
}
