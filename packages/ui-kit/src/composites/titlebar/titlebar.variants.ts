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
    "flex size-3 items-center justify-center rounded-full",
    "text-[8px] leading-none font-bold text-traffic-glyph",
    "transition-colors duration-100 outline-none",
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
