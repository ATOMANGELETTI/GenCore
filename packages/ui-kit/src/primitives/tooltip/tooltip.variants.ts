import { cva } from "class-variance-authority";

/** Flat popover surface: hairline border, no shadow stack, no blur. */
export const tooltipContentVariants = cva([
  "z-50 max-w-64 rounded-sm border border-border bg-popover px-2 py-1",
  "text-xs leading-tight text-popover-foreground",
  "origin-(--radix-tooltip-content-transform-origin)",
]);

export const tooltipArrowVariants = cva("fill-popover");
