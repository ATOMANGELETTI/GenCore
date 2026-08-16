import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { ContentAreaProps } from "../content-area/content-area.types";
import type { WindowControlHandlers } from "../titlebar/titlebar.types";
import type { appShellVariants } from "./app-shell.variants";

export interface AppShellProps
  extends Omit<React.ComponentPropsWithRef<"div">, "title">,
    VariantProps<typeof appShellVariants>,
    WindowControlHandlers {
  title?: React.ReactNode;
  version?: React.ReactNode;
  titlebarStart?: React.ReactNode;
  titlebarEnd?: React.ReactNode;
  statusbarStart?: React.ReactNode;
  statusbarEnd?: React.ReactNode;
  sidebar?: React.ReactNode;
  titlebarContextMenu?: React.ReactNode;
  contentContextMenu?: React.ReactNode;
  showTrafficLights?: boolean;
  /** Forwarded to the inner `ContentArea` (centering, padding, className). */
  contentProps?: Omit<ContentAreaProps, "children">;
}
