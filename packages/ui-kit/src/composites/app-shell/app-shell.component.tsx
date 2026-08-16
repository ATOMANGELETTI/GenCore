import { cn } from "../../lib/cn";
import { ContentArea } from "../content-area";
import { Statusbar } from "../statusbar";
import { Titlebar } from "../titlebar";
import type { AppShellProps } from "./app-shell.types";
import { appShellVariants } from "./app-shell.variants";

/**
 * The window frame every GenCore app renders into: titlebar, content, statusbar.
 * Window control callbacks are passed through to the titlebar so the shell
 * stays free of Tauri imports and remains testable in jsdom.
 */
export function AppShell({
  className,
  density,
  title,
  version,
  titlebarStart,
  titlebarEnd,
  statusbarStart,
  statusbarEnd,
  sidebar,
  showTrafficLights,
  contentProps,
  onClose,
  onMinimize,
  onToggleMaximize,
  children,
  ...props
}: AppShellProps) {
  return (
    <div data-slot="app-shell" className={cn(appShellVariants({ density }), className)} {...props}>
      <Titlebar
        title={title}
        version={version}
        titlebarStart={titlebarStart}
        titlebarEnd={titlebarEnd}
        showTrafficLights={showTrafficLights}
        onClose={onClose}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
      />

      {sidebar ? (
        <div data-slot="app-shell-body" className="flex min-h-0 flex-1">
          {sidebar}
          <ContentArea {...contentProps}>{children}</ContentArea>
        </div>
      ) : (
        <ContentArea {...contentProps}>{children}</ContentArea>
      )}

      <Statusbar statusbarStart={statusbarStart} statusbarEnd={statusbarEnd} />
    </div>
  );
}
