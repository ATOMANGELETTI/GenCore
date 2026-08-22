import { cva } from "class-variance-authority";

/** Flat popover surface: hairline border, no shadow stack, no blur. */
export const tooltipContentVariants = cva(
  [
    "z-50 rounded-sm border border-border bg-popover",
    "text-xs leading-tight text-popover-foreground select-none",
    "origin-(--radix-tooltip-content-transform-origin)",
  ],
  {
    variants: {
      size: {
        default: "max-w-64 px-2 py-1",
        rich: "max-w-[260px] px-3 py-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export const tooltipArrowVariants = cva("fill-popover");
