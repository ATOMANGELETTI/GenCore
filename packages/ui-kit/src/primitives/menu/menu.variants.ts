import { cva } from "class-variance-authority";

export const menuContentVariants = cva([
  "z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1",
  "text-sm text-popover-foreground select-none",
]);

export const menuItemVariants = cva(
  [
    "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 select-none",
    "outline-none transition-colors duration-75",
    "focus:bg-accent focus:text-accent-foreground",
    "data-disabled:pointer-events-none data-disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "",
        destructive: "text-destructive focus:bg-destructive focus:text-destructive-foreground",
      },
      inset: {
        true: "pl-8",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      inset: false,
    },
  },
);

export const menuIndicatorItemVariants = cva([
  "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 select-none",
  "outline-none transition-colors duration-75",
  "focus:bg-accent focus:text-accent-foreground",
  "data-disabled:pointer-events-none data-disabled:opacity-40",
]);

export const menuLabelVariants = cva(
  "px-2 py-1.5 text-xs font-medium text-foreground/70 select-none",
  {
    variants: {
      inset: {
        true: "pl-8",
        false: "",
      },
    },
    defaultVariants: { inset: false },
  },
);

export const menuSeparatorVariants = cva("-mx-1 my-1 h-px bg-border");

export const menuShortcutVariants = cva(
  "ml-auto text-xs tracking-widest tabular-nums text-foreground/70",
);
