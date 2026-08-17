import { cva } from "class-variance-authority";

/**
 * macOS-style window chrome. Height comes from the AppShell density variable
 * with a standalone fallback; the backdrop blur is the one permitted blur in
 * the kit, and only on chrome.
 */
export const titlebarVariants = cva([
  "relative flex h-[var(--gencore-titlebar-height,32px)] w-full shrink-0 items-center",
  "gap-2 border-b border-border bg-titlebar/95 px-2",
  "text-titlebar-foreground backdrop-blur-[10px]",
]);

export const titlebarTitleVariants = cva(
  "pointer-events-none absolute inset-x-0 text-center text-xs font-medium",
);

export const trafficLightVariants = cva(
  [
    "size-3 rounded-[6px]",
    "transition-[border-radius] duration-150 outline-none",
    "enabled:hover:rounded-[2px] enabled:focus-visible:rounded-[2px]",
    "motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-ring/60",
  ],
  {
    variants: {
      light: {
        close: "bg-traffic-close",
        minimize: "bg-traffic-minimize",
        maximize: "bg-traffic-maximize",
      },
      active: {
        true: "",
        false: "bg-traffic-inactive",
      },
    },
    defaultVariants: { active: true },
  },
);

export const titlebarVersionVariants = cva([
  "cursor-pointer overflow-hidden",
  "transition-[color,background-color,border-color,background-position] duration-200",
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
  "hover:border-nord-aurora-13 hover:text-nord-polar-0",
  "hover:bg-[linear-gradient(110deg,var(--nord-aurora-12)_0%,var(--nord-aurora-13)_35%,var(--nord-snow-6)_50%,var(--nord-aurora-13)_65%,var(--nord-aurora-12)_100%)]",
  "hover:bg-[length:220%_100%] hover:animate-gild-sheen",
  "focus-visible:border-nord-aurora-13 focus-visible:text-nord-polar-0",
  "focus-visible:bg-[linear-gradient(110deg,var(--nord-aurora-12)_0%,var(--nord-aurora-13)_35%,var(--nord-snow-6)_50%,var(--nord-aurora-13)_65%,var(--nord-aurora-12)_100%)]",
  "focus-visible:bg-[length:220%_100%] focus-visible:animate-gild-sheen",
  "motion-reduce:transition-none motion-reduce:hover:animate-none motion-reduce:focus-visible:animate-none",
]);
