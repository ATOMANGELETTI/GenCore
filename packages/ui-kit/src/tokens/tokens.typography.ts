/**
 * System font stacks only — the kit never loads a remote font, so Tauri
 * windows paint their first frame without a webfont round trip.
 */
export const fontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const fontSize = {
  xs: "11px",
  sm: "12px",
  base: "13px",
  md: "14px",
  lg: "16px",
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
} as const;

/** Version strings and other digit runs must not jitter between renders. */
export const numericVariant = "tabular-nums";

export type FontFamilyToken = keyof typeof fontFamily;
export type FontSizeToken = keyof typeof fontSize;
