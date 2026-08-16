import type * as React from "react";
import { cn } from "../../lib/cn";
import { ContextMenu, ContextMenuTrigger } from "../../primitives/context-menu";
import { ContentArea } from "../content-area";
import { Statusbar } from "../statusbar";
import { Titlebar } from "../titlebar";
import type { AppShellProps } from "./app-shell.types";
import { appShellVariants } from "./app-shell.variants";

function withContextMenu(trigger: React.ReactElement, menu: React.ReactNode) {
  if (menu == null) {
    return trigger;
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
      {menu}
    </ContextMenu>
  );
}

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
  titlebarContextMenu,
  contentContextMenu,
  onContextMenu,
  onClose,
  onMinimize,
  onToggleMaximize,
  children,
  ...props
}: AppShellProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: suppress the native context menu on window chrome
    <div
      data-slot="app-shell"
      className={cn(appShellVariants({ density }), className)}
      {...props}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event);
      }}
    >
      {withContextMenu(
        <Titlebar
          title={title}
          version={version}
          titlebarStart={titlebarStart}
          titlebarEnd={titlebarEnd}
          showTrafficLights={showTrafficLights}
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleMaximize={onToggleMaximize}
        />,
        titlebarContextMenu,
      )}

      {sidebar ? (
        <div data-slot="app-shell-body" className="flex min-h-0 flex-1">
          {sidebar}
          {withContextMenu(
            <ContentArea {...contentProps}>{children}</ContentArea>,
            contentContextMenu,
          )}
        </div>
      ) : (
        withContextMenu(<ContentArea {...contentProps}>{children}</ContentArea>, contentContextMenu)
      )}

      <Statusbar statusbarStart={statusbarStart} statusbarEnd={statusbarEnd} />
    </div>
  );
}
