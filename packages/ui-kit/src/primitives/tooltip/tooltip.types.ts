import type { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";

export type TooltipProviderProps = React.ComponentPropsWithRef<typeof TooltipPrimitive.Provider>;
export type TooltipProps = React.ComponentPropsWithRef<typeof TooltipPrimitive.Root>;
export type TooltipTriggerProps = React.ComponentPropsWithRef<typeof TooltipPrimitive.Trigger>;

export interface TooltipContentProps
  extends React.ComponentPropsWithRef<typeof TooltipPrimitive.Content> {
  /** Render the small pointer under the tooltip. */
  withArrow?: boolean;
}
