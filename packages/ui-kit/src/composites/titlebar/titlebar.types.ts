import type * as React from "react";

/** Window controls the host app wires to Tauri; the kit never imports Tauri. */
export interface WindowControlHandlers {
  onClose?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onVersionClick?: () => void;
}

export interface TitlebarProps
  extends Omit<React.ComponentPropsWithRef<"header">, "title">,
    WindowControlHandlers {
  title?: React.ReactNode;
  version?: React.ReactNode;
  /** Rendered after the traffic lights. */
  titlebarStart?: React.ReactNode;
  /** Rendered before the version badge. */
  titlebarEnd?: React.ReactNode;
  showTrafficLights?: boolean;
}

export type TrafficLightKind = "close" | "minimize" | "maximize";

export interface TrafficLightsProps
  extends React.ComponentPropsWithRef<"div">,
    WindowControlHandlers {}
