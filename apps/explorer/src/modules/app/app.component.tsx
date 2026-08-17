import { AppShell, ThemeProvider } from "@gencore/ui-kit";
import * as React from "react";
import { getAppInfo } from "../ipc/ipc.app-info";
import { openRepoInBrowser } from "../ipc/ipc.opener";
import type { AppInfo } from "../ipc/ipc.types";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";

/** Exact template copy; the version segment comes from `get_app_info`. */
export const APP_TITLE = "Tauri Explorer Template";

export function App() {
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
    <ThemeProvider defaultTheme="polar-night">
      <AppShell
        title={APP_TITLE}
        version={version}
        density="comfortable"
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onToggleMaximize={toggleMaximizeWindow}
        onVersionClick={openRepoInBrowser}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
          {version && <p className="text-sm text-muted-foreground tabular-nums">v{version}</p>}
          {!version && error && <p className="text-sm text-destructive">{error}</p>}
          {!version && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
