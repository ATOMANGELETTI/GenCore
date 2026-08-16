import { cva } from "class-variance-authority";

export const statusbarVariants = cva([
  "flex h-[var(--gencore-statusbar-height,28px)] w-full shrink-0 items-center",
  "gap-2 border-t border-border bg-statusbar/95 px-2",
  "text-xs text-statusbar-foreground/80 backdrop-blur-[10px]",
]);
