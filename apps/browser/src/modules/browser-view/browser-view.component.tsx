import * as React from "react";
import { hideTabWebview, setTabWebviewBounds, showTabWebview } from "../ipc/ipc.webview";
import { NewTabPage } from "../new-tab-page/new-tab-page.component";
import type { BrowserTab } from "../tabs/tabs.types";

interface BrowserViewProps {
  readonly tabs: readonly BrowserTab[];
  readonly activeTab: BrowserTab | null;
  onNavigate: (url: string) => void;
}

export function BrowserView({ tabs, activeTab, onNavigate }: BrowserViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousVisibleLabel = React.useRef<string | null>(null);

  const syncBounds = React.useCallback(() => {
    const container = containerRef.current;
    const tab = activeTab;
    if (!container || !tab?.hasWebview) {
      return;
    }
    const rect = container.getBoundingClientRect();
    setTabWebviewBounds(tab.webviewLabel, {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    }).catch(() => {
      // Tab webview or IPC unavailable — nothing to resize.
    });
  }, [activeTab]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => syncBounds());
    observer.observe(container);
    window.addEventListener("resize", syncBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncBounds);
    };
  }, [syncBounds]);

  React.useEffect(() => {
    const visibleLabels = new Set(tabs.filter((t) => t.hasWebview).map((t) => t.webviewLabel));
    const activeLabel = activeTab?.hasWebview ? activeTab.webviewLabel : null;

    if (previousVisibleLabel.current && previousVisibleLabel.current !== activeLabel) {
      hideTabWebview(previousVisibleLabel.current).catch(() => undefined);
    }
    if (activeLabel) {
      syncBounds();
      showTabWebview(activeLabel).catch(() => undefined);
    }
    previousVisibleLabel.current = activeLabel;

    return () => {
      // Hide every webview that no longer belongs to an open tab (closed tabs
      // are torn down by `useTabs`; this only guards against a stale show).
      for (const label of visibleLabels) {
        if (label !== activeLabel) {
          hideTabWebview(label).catch(() => undefined);
        }
      }
    };
  }, [activeTab?.hasWebview, activeTab?.webviewLabel, syncBounds, tabs]);

  return (
    <div
      data-slot="browser-view"
      ref={containerRef}
      className="relative min-h-0 min-w-0 flex-1 bg-background"
    >
      {!activeTab?.hasWebview ? <NewTabPage onNavigate={onNavigate} /> : null}
    </div>
  );
}
