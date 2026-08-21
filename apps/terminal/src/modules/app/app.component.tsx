import { AppShell, ThemeProvider } from "@gencore/ui-kit";
import * as React from "react";
import { ConfigProvider, useConfig } from "../config/config.hook";
import { ContentContextMenu } from "../context-menu/context-menu.content";
import { TitlebarContextMenu } from "../context-menu/context-menu.titlebar";
import { getAppInfo } from "../ipc/ipc.app-info";
import { openRepoInBrowser } from "../ipc/ipc.opener";
import type { AppInfo } from "../ipc/ipc.types";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";
import { SidePanel } from "../side-panel/side-panel.component";
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
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setAppInfo(info);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const version = appInfo?.version;

  return (
    <ThemeProvider theme={resolvedTheme}>
      <AppShell
        title={APP_TITLE}
        version={version}
        density="compact"
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onToggleMaximize={toggleMaximizeWindow}
        onVersionClick={openRepoInBrowser}
        titlebarContextMenu={
          <TitlebarContextMenu
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onToggleMaximize={toggleMaximizeWindow}
          />
        }
        contentContextMenu={<ContentContextMenu />}
        contentProps={{ centered: true }}
        sidebar={<SidePanel />}
      >
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-semibold text-lg">{APP_TITLE}</h1>
          {version ? (
            <p className="text-muted-foreground text-sm tabular-nums">v{version}</p>
          ) : null}
          {!version && error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!version && !error ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
