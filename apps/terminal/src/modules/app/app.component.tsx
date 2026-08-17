import { AppShell, ThemeProvider } from "@gencore/ui-kit";
import * as React from "react";
import { ContentContextMenu } from "../context-menu/context-menu.content";
import { TitlebarContextMenu } from "../context-menu/context-menu.titlebar";
import { getAppInfo } from "../ipc/ipc.app-info";
import type { AppInfo } from "../ipc/ipc.types";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";
import { SidePanel } from "../side-panel/side-panel.component";
import "./app.theme.css";

/** Exact product copy for this template app; also fed into the titlebar via `version`. */
export const APP_TITLE = "Tauri Terminal Template";

export function App() {
  const [appInfo, setAppInfo] = React.useState<AppInfo | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setAppInfo(info);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load app info", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="polar-night">
      <AppShell
        title={APP_TITLE}
        version={appInfo?.version}
        density="compact"
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onToggleMaximize={toggleMaximizeWindow}
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
          {appInfo ? (
            <p className="text-muted-foreground text-sm tabular-nums">v{appInfo.version}</p>
          ) : null}
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
