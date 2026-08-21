import { cva } from "class-variance-authority";

/**
 * Compact status chip. `numeric` opts into tabular figures so version strings
 * keep a stable width as they change.
 */
export const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 whitespace-nowrap",
    "rounded-sm border px-1.5 py-0.5 text-xs leading-none font-medium select-none",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
  ],
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        caution: "border-transparent bg-caution text-caution-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        success: "border-transparent bg-success text-success-foreground",
        info: "border-transparent bg-info text-info-foreground",
      },
      numeric: {
        true: "font-mono tabular-nums",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      numeric: false,
    },
  },
);
