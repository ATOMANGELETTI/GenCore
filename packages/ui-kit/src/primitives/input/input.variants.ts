import { cva } from "class-variance-authority";

export const inputVariants = cva(
  "h-7 rounded-sm border border-border bg-transparent px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
);
