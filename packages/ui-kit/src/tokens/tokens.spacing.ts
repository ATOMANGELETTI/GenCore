/** The only spacing steps the kit uses. Everything else is a layout smell. */
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
} as const;

/** Flat UI: modest corner radii only, never pill-shaped panels. */
export const radius = {
  sm: "6px",
  md: "8px",
} as const;

/** macOS-inspired chrome heights, per AppShell density. */
export const chromeHeight = {
  compact: { titlebar: "28px", statusbar: "24px" },
  comfortable: { titlebar: "32px", statusbar: "28px" },
} as const;

/** Hairline separators — 1px, never thicker. */
export const hairline = "1px";

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type DensityToken = keyof typeof chromeHeight;
