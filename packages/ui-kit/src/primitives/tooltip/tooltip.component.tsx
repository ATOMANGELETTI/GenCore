import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "../../lib/cn";
import type {
  TooltipContentProps,
  TooltipProps,
  TooltipProviderProps,
  TooltipTriggerProps,
} from "./tooltip.types";
import { tooltipArrowVariants, tooltipContentVariants } from "./tooltip.variants";

export function TooltipProvider({ delayDuration = 300, ...props }: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

export function Tooltip(props: TooltipProps) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
  className,
  sideOffset = 6,
  withArrow = false,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(tooltipContentVariants(), className)}
        {...props}
      >
        {children}
        {withArrow ? <TooltipPrimitive.Arrow className={tooltipArrowVariants()} /> : null}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
