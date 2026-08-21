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
  "hover:border-transparent hover:text-transparent hover:[-webkit-text-fill-color:transparent]",
  "hover:[background-image:linear-gradient(110deg,var(--nord-aurora-12)_0%,var(--nord-aurora-13)_35%,var(--nord-snow-6)_50%,var(--nord-aurora-13)_65%,var(--nord-aurora-12)_100%),linear-gradient(var(--titlebar),var(--titlebar)),linear-gradient(110deg,var(--nord-aurora-12)_0%,var(--nord-aurora-13)_35%,var(--nord-snow-6)_50%,var(--nord-aurora-13)_65%,var(--nord-aurora-12)_100%)]",
  "hover:[background-clip:text,padding-box,border-box] hover:[-webkit-background-clip:text,padding-box,border-box]",
  "hover:[background-origin:border-box]",
  "hover:bg-[length:220%_100%,100%_100%,220%_100%] hover:animate-gild-sheen",
  "focus-visible:border-transparent focus-visible:text-transparent focus-visible:[-webkit-text-fill-color:transparent]",
  "focus-visible:[background-image:linear-gradient(110deg,var(--nord-aurora-12)_0%,var(--nord-aurora-13)_35%,var(--nord-snow-6)_50%,var(--nord-aurora-13)_65%,var(--nord-aurora-12)_100%),linear-gradient(var(--titlebar),var(--titlebar)),linear-gradient(110deg,var(--nord-aurora-12)_0%,var(--nord-aurora-13)_35%,var(--nord-snow-6)_50%,var(--nord-aurora-13)_65%,var(--nord-aurora-12)_100%)]",
  "focus-visible:[background-clip:text,padding-box,border-box] focus-visible:[-webkit-background-clip:text,padding-box,border-box]",
  "focus-visible:[background-origin:border-box]",
  "focus-visible:bg-[length:220%_100%,100%_100%,220%_100%] focus-visible:animate-gild-sheen",
  "motion-reduce:transition-none motion-reduce:hover:animate-none motion-reduce:focus-visible:animate-none",
  "motion-reduce:hover:text-nord-aurora-13 motion-reduce:hover:border-nord-aurora-13",
  "motion-reduce:hover:[-webkit-text-fill-color:var(--nord-aurora-13)] motion-reduce:hover:bg-none",
  "motion-reduce:focus-visible:text-nord-aurora-13 motion-reduce:focus-visible:border-nord-aurora-13",
  "motion-reduce:focus-visible:[-webkit-text-fill-color:var(--nord-aurora-13)] motion-reduce:focus-visible:bg-none",
]);
