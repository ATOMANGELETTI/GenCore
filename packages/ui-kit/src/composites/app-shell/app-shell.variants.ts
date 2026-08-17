import { cva } from "class-variance-authority";

/**
 * Density drives the chrome heights that Titlebar and Statusbar read, so the
 * whole window scales from one prop instead of per-component sizing props.
 */
export const appShellVariants = cva(
  "flex h-full min-h-0 w-full flex-col overflow-hidden bg-background font-sans text-foreground select-none",
  {
    variants: {
      density: {
        compact: "text-xs [--gencore-statusbar-height:24px] [--gencore-titlebar-height:28px]",
        comfortable: "text-sm [--gencore-statusbar-height:28px] [--gencore-titlebar-height:32px]",
      },
    },
    defaultVariants: {
      density: "comfortable",
    },
  },
);
