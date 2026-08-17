import { cva } from "class-variance-authority";

export const treeVariants = cva(
  "min-h-0 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
);

export const treeRowVariants = cva(
  ["flex h-[22px] items-center gap-1 pr-1 text-xs text-foreground", "select-none"],
  {
    variants: {
      selected: {
        true: "bg-accent",
        false: "",
      },
      muted: {
        true: "opacity-45",
        false: "",
      },
      overflow: {
        hidden: "overflow-hidden",
        visible: "z-20 overflow-visible",
      },
    },
    defaultVariants: {
      selected: false,
      muted: false,
      overflow: "hidden",
    },
  },
);

export const treeChevronVariants = cva(
  [
    "inline-flex size-2 shrink-0 items-center justify-center p-0",
    "text-foreground/80",
    "transition-transform duration-150 motion-reduce:transition-none",
  ],
  {
    variants: {
      expanded: {
        true: "rotate-90",
        false: "rotate-0",
      },
    },
    defaultVariants: {
      expanded: false,
    },
  },
);
