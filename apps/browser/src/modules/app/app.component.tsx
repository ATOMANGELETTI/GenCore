import { AppShell, ThemeProvider, TooltipProvider, updateDomFavicon } from "@gencore/ui-kit";
import * as React from "react";
import { useBookmarks } from "../bookmarks/bookmarks.hook";
import { BookmarksBar } from "../bookmarks/bookmarks-bar.component";
import { BrowserView } from "../browser-view/browser-view.component";
import { SEARCH_ENGINES } from "../config/config.constants";
import { ConfigProvider, useConfig } from "../config/config.hook";
import { useDownloads } from "../downloads/downloads.hook";
import { FindInPageBar } from "../find-in-page/find-in-page.component";
import { useFindInPage } from "../find-in-page/find-in-page.hook";
import { useHistory } from "../history/history.hook";
import { getAppInfo } from "../ipc/ipc.app-info";
import { openRepoInBrowser } from "../ipc/ipc.opener";
import { setThemeIcon } from "../ipc/ipc.theme-icon";
import type { AppInfo } from "../ipc/ipc.types";
import { subscribeTabNavigated } from "../ipc/ipc.webview";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";
import { NavigationBar } from "../navigation-bar/navigation-bar.component";
import { resolveOmniboxInput } from "../navigation-bar/navigation-bar.omnibox";
import { SidePanel } from "../side-panel/side-panel.component";
import { SidePanelToggle } from "../side-panel/side-panel-toggle.component";
import { TabStrip } from "../tabs/tab-strip.component";
import { useTabs } from "../tabs/tabs.hook";
import "./app.theme.css";

/** Exact template copy; the version segment comes from `get_app_info`. */
const APP_TITLE = "Tauri Browser Template";

export function App() {
  return (
    <ConfigProvider>
      <AppShellTree />
    </ConfigProvider>
  );
}

function AppShellTree() {
  const { resolvedTheme } = useConfig();
  const [appInfo, setAppInfo] = React.useState<AppInfo | null>(null);

  React.useEffect(() => {
    updateDomFavicon("browser", resolvedTheme);
    setThemeIcon(resolvedTheme).catch(() => {
      // Non-fatal in web/test environment
    });
  }, [resolvedTheme]);

  React.useEffect(() => {
    let cancelled = false;

    getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setAppInfo(info);
        }
      })
      .catch(() => {
        // Version chip stays empty; do not surface the error in the statusbar.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const version = appInfo?.version;

  return (
    <ThemeProvider theme={resolvedTheme}>
      <TooltipProvider>
        <BrowserShell title={APP_TITLE} version={version} />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function BrowserShell({ title, version }: { title: string; version: string | undefined }) {
  const { homepageUrl, searchEngineId, showBookmarksBar } = useConfig();
  const tabs = useTabs();
  const bookmarks = useBookmarks();
  const history = useHistory();
  const downloads = useDownloads();
  const find = useFindInPage(tabs.activeTab?.hasWebview ? tabs.activeTab.webviewLabel : null);
  const [sidePanelOpen, setSidePanelOpen] = React.useState(false);
  const toggleSidePanel = React.useCallback(() => setSidePanelOpen((open) => !open), []);
  const searchEngineUrl = SEARCH_ENGINES[searchEngineId].url;

  const handleNavigate = React.useCallback(
    (rawInput: string) => {
      const activeId = tabs.activeTabId;
      if (!activeId) {
        return;
      }
      const resolved = resolveOmniboxInput(rawInput, searchEngineUrl);
      if (resolved) {
        void tabs.navigate(activeId, resolved);
      }
    },
    [tabs, searchEngineUrl],
  );

  const openInActiveOrNewTab = React.useCallback(
    (url: string) => {
      const activeId = tabs.activeTabId ?? tabs.openTab();
      void tabs.navigate(activeId, url);
    },
    [tabs],
  );

  // Records every confirmed navigation (any tab, any source) into history.
  React.useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void subscribeTabNavigated(({ url }) => {
      history.recordVisit(url);
    })
      .then((stop) => {
        if (cancelled) {
          stop();
          return;
        }
        unlisten = stop;
      })
      .catch(() => {
        // Tauri event IPC unavailable (e.g. plain browser preview) — no
        // navigation events to record.
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [history.recordVisit]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) {
        return;
      }
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (ctrlOrCmd && !event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        tabs.openTab();
      } else if (ctrlOrCmd && !event.altKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (tabs.activeTabId) {
          tabs.closeTab(tabs.activeTabId);
        }
      } else if (ctrlOrCmd && !event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        find.openFind();
      } else if (ctrlOrCmd && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidePanel();
      } else if ((ctrlOrCmd && event.key.toLowerCase() === "r") || event.key === "F5") {
        event.preventDefault();
        if (tabs.activeTabId) {
          tabs.reload(tabs.activeTabId);
        }
      } else if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        if (tabs.activeTabId) {
          tabs.goBack(tabs.activeTabId);
        }
      } else if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        if (tabs.activeTabId) {
          tabs.goForward(tabs.activeTabId);
        }
      } else if (event.key === "Escape" && find.open) {
        find.closeFind();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tabs, find, toggleSidePanel]);

  return (
    <AppShell
      title={title}
      version={version}
      density="comfortable"
      onClose={closeWindow}
      onMinimize={minimizeWindow}
      onToggleMaximize={toggleMaximizeWindow}
      onVersionClick={openRepoInBrowser}
      contentProps={{ centered: false, padded: false, className: "min-h-0 overflow-hidden" }}
      sidebar={
        <SidePanel
          open={sidePanelOpen}
          bookmarks={bookmarks.bookmarks}
          historyEntries={history.entries}
          downloads={downloads.downloads}
          onOpenUrl={openInActiveOrNewTab}
          onRemoveBookmark={bookmarks.removeBookmark}
          onClearBrowsingData={() => {
            history.clearHistory();
            downloads.clearDownloads();
          }}
        />
      }
      statusbarStart={
        <div className="flex min-w-0 items-center gap-2">
          <SidePanelToggle isOpen={sidePanelOpen} onToggle={toggleSidePanel} />
          <span className="truncate text-muted-foreground">
            {tabs.activeTab?.loading ? "Loading…" : tabs.activeTab?.url || "Ready"}
          </span>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <TabStrip
          tabs={tabs.tabs}
          activeTabId={tabs.activeTabId}
          onSelect={tabs.switchTab}
          onClose={tabs.closeTab}
          onNewTab={tabs.openTab}
        />
        <NavigationBar
          tab={tabs.activeTab}
          isBookmarked={tabs.activeTab ? bookmarks.isBookmarked(tabs.activeTab.url) : false}
          homepageUrl={homepageUrl}
          onNavigate={handleNavigate}
          onBack={() => tabs.activeTabId && tabs.goBack(tabs.activeTabId)}
          onForward={() => tabs.activeTabId && tabs.goForward(tabs.activeTabId)}
          onReload={() => tabs.activeTabId && tabs.reload(tabs.activeTabId)}
          onStop={() => tabs.activeTabId && tabs.stop(tabs.activeTabId)}
          onToggleBookmark={() => {
            if (tabs.activeTab?.url) {
              bookmarks.toggleBookmark(tabs.activeTab.url, tabs.activeTab.url);
            }
          }}
        />
        {showBookmarksBar ? (
          <BookmarksBar bookmarks={bookmarks.bookmarks} onOpen={openInActiveOrNewTab} />
        ) : null}
        <div className="relative min-h-0 flex-1">
          <BrowserView tabs={tabs.tabs} activeTab={tabs.activeTab} onNavigate={handleNavigate} />
          <FindInPageBar find={find} />
        </div>
      </div>
    </AppShell>
  );
}
