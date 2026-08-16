import { cva } from "class-variance-authority";

/**
 * Flat, macOS-inspired button. No gradients, no shadow stacks — depth comes
 * from a single hairline border and a background tone shift on hover.
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-sm font-medium select-none",
    "transition-colors duration-100 outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring/60",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85 active:bg-destructive/75",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-sm",
        icon: "size-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
