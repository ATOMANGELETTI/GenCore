import { AppShell, ThemeProvider, TooltipProvider, updateDomFavicon } from "@gencore/ui-kit";
import * as React from "react";
import { ConfigProvider, useConfig } from "../config/config.hook";
import { FileList } from "../file-list/file-list.component";
import { getAppInfo } from "../ipc/ipc.app-info";
import { listDrives } from "../ipc/ipc.fs";
import { openRepoInBrowser } from "../ipc/ipc.opener";
import { setThemeIcon } from "../ipc/ipc.theme-icon";
import type { AppInfo } from "../ipc/ipc.types";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../ipc/ipc.window";
import { SidePanel } from "../side-panel/side-panel.component";
import { SidePanelToggle } from "../side-panel/side-panel-toggle.component";
import { useWorkspace } from "./app.workspace.hook";
import "./app.theme.css";

/** Exact template copy; the version segment comes from `get_app_info`. */
const APP_TITLE = "Tauri Explorer Template";

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
    updateDomFavicon("explorer", resolvedTheme);
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
        <ExplorerShell title={APP_TITLE} version={version} />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function ExplorerShell({ title, version }: { title: string; version: string | undefined }) {
  const workspace = useWorkspace();
  const [sidePanelOpen, setSidePanelOpen] = React.useState(true);
  const toggleSidePanel = React.useCallback(() => {
    setSidePanelOpen((open) => !open);
  }, []);

  const { navigation } = workspace;
  const hasInitialPath = navigation.path !== "";
  const { navigateTo } = navigation;

  React.useEffect(() => {
    if (hasInitialPath) {
      return;
    }
    let cancelled = false;
    void listDrives()
      .then((drives) => {
        if (cancelled) {
          return;
        }
        const fixed = drives.find((drive) => drive.kind === "fixed") ?? drives[0];
        if (fixed) {
          navigateTo(fixed.path);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Deliberately runs once to pick an initial location; the `navigateTo`
    // closure is stable across renders (owned by useNavigation's history
    // state) and `hasInitialPath` only matters at mount time.
  }, [hasInitialPath, navigateTo]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) {
        return;
      }
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (ctrlOrCmd && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidePanel();
        return;
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        navigation.back();
      } else if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        navigation.forward();
      } else if (event.altKey && event.key === "ArrowUp") {
        event.preventDefault();
        navigation.up();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigation, toggleSidePanel]);

  const selectedCount = workspace.fileList.selectedPaths.size;
  const itemCount = workspace.fileList.entries.length;
  const selectionSummary =
    selectedCount > 0 ? `${selectedCount} of ${itemCount} selected` : `${itemCount} items`;

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
          currentPath={navigation.path}
          selectedPaths={workspace.fileList.selectedPaths}
          onNavigate={navigation.navigateTo}
        />
      }
      statusbarStart={
        <div className="flex min-w-0 items-center gap-2">
          <SidePanelToggle isOpen={sidePanelOpen} onToggle={toggleSidePanel} />
          <span className="truncate text-muted-foreground">
            {workspace.fileOps.error ?? selectionSummary}
          </span>
        </div>
      }
    >
      <FileList
        navigation={workspace.navigation}
        fileList={workspace.fileList}
        fileOps={workspace.fileOps}
      />
    </AppShell>
  );
}
