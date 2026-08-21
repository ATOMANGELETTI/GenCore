import { AppShell, ThemeProvider } from "@gencore/ui-kit";
import * as React from "react";
import { ConfigProvider, useConfig } from "../config/config.hook";
import { TerminalContextMenu } from "../context-menu/context-menu.terminal";
import { TitlebarContextMenu } from "../context-menu/context-menu.titlebar";
import { getAppInfo } from "../ipc/ipc.app-info";
import { openRepoInBrowser } from "../ipc/ipc.opener";
import type { AppInfo } from "../ipc/ipc.types";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";
import { SidePanel } from "../side-panel/side-panel.component";
import { TerminalView } from "../terminal/terminal.component";
import { TerminalProvider, useTerminalSession } from "../terminal/terminal.hook";
import "./app.theme.css";

/** Exact product copy for this template app; also fed into the titlebar via `version`. */
export const APP_TITLE = "Tauri Terminal Template";

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
      <TerminalProvider>
        <AppShellFrame title={APP_TITLE} version={version} />
      </TerminalProvider>
    </ThemeProvider>
  );
}

function AppShellFrame({ title, version }: { title: string; version: string | undefined }) {
  const session = useTerminalSession();
  const active = session.tabs.find((tab) => tab.id === session.activeId);
  const cwd = active?.cwd;
  const { flushPinnedSave } = session;

  // The window tears the WebView down as soon as it closes, so the pinned-tab
  // write has to complete before `close()` is issued.
  const closeAfterSave = React.useCallback(() => {
    void (async () => {
      await flushPinnedSave();
      await closeWindow();
    })().catch(() => {
      // Window already gone; nothing left to persist to.
    });
  }, [flushPinnedSave]);

  return (
    <AppShell
      title={title}
      version={version}
      density="compact"
      onClose={closeAfterSave}
      onMinimize={minimizeWindow}
      onToggleMaximize={toggleMaximizeWindow}
      onVersionClick={openRepoInBrowser}
      titlebarContextMenu={
        <TitlebarContextMenu
          onClose={closeAfterSave}
          onMinimize={minimizeWindow}
          onToggleMaximize={toggleMaximizeWindow}
        />
      }
      contentContextMenu={<TerminalContextMenu />}
      contentProps={{ centered: false, padded: false, className: "min-h-0 overflow-hidden" }}
      sidebar={<SidePanel />}
      statusbarStart={
        cwd ? (
          <span className="truncate text-muted-foreground">{cwd}</span>
        ) : (
          <span className="truncate text-muted-foreground" />
        )
      }
      statusbarEnd={
        <span className="tabular-nums">
          {session.shellName} · {session.cols}×{session.rows}
        </span>
      }
    >
      <TerminalView />
    </AppShell>
  );
}
