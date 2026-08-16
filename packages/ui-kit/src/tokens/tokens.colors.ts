import { type NordColorName, nord } from "./tokens.nord";

/**
 * Semantic colour roles. Every role maps to exactly one Nord palette entry so
 * a theme can never drift away from the official palette.
 */
export interface SemanticColorScale {
  background: NordColorName;
  foreground: NordColorName;
  card: NordColorName;
  cardForeground: NordColorName;
  popover: NordColorName;
  popoverForeground: NordColorName;
  primary: NordColorName;
  primaryForeground: NordColorName;
  secondary: NordColorName;
  secondaryForeground: NordColorName;
  muted: NordColorName;
  mutedForeground: NordColorName;
  accent: NordColorName;
  accentForeground: NordColorName;
  destructive: NordColorName;
  destructiveForeground: NordColorName;
  warning: NordColorName;
  warningForeground: NordColorName;
  success: NordColorName;
  successForeground: NordColorName;
  info: NordColorName;
  infoForeground: NordColorName;
  border: NordColorName;
  input: NordColorName;
  ring: NordColorName;
  titlebar: NordColorName;
  titlebarForeground: NordColorName;
  statusbar: NordColorName;
  statusbarForeground: NordColorName;
}

/** Default theme: Polar Night dark. */
export const polarNightColors: SemanticColorScale = {
  background: "polar-0",
  foreground: "snow-4",
  card: "polar-1",
  cardForeground: "snow-4",
  popover: "polar-1",
  popoverForeground: "snow-4",
  primary: "frost-8",
  primaryForeground: "polar-0",
  secondary: "polar-2",
  secondaryForeground: "snow-4",
  muted: "polar-1",
  mutedForeground: "polar-3",
  accent: "polar-2",
  accentForeground: "snow-6",
  destructive: "aurora-11",
  destructiveForeground: "snow-6",
  warning: "aurora-12",
  warningForeground: "polar-0",
  success: "aurora-14",
  successForeground: "polar-0",
  info: "aurora-15",
  infoForeground: "polar-0",
  border: "polar-2",
  input: "polar-3",
  ring: "frost-8",
  titlebar: "polar-1",
  titlebarForeground: "snow-4",
  statusbar: "polar-1",
  statusbarForeground: "snow-4",
};

/** Light theme: Snow Storm. Frost and Aurora keep the same semantic roles. */
export const snowStormColors: SemanticColorScale = {
  background: "snow-6",
  foreground: "polar-0",
  card: "snow-5",
  cardForeground: "polar-0",
  popover: "snow-5",
  popoverForeground: "polar-0",
  primary: "frost-8",
  primaryForeground: "polar-0",
  secondary: "snow-4",
  secondaryForeground: "polar-0",
  muted: "snow-5",
  mutedForeground: "polar-3",
  accent: "snow-4",
  accentForeground: "polar-0",
  destructive: "aurora-11",
  destructiveForeground: "snow-6",
  warning: "aurora-12",
  warningForeground: "polar-0",
  success: "aurora-14",
  successForeground: "polar-0",
  info: "aurora-15",
  infoForeground: "polar-0",
  border: "snow-4",
  input: "snow-4",
  ring: "frost-8",
  titlebar: "snow-5",
  titlebarForeground: "polar-0",
  statusbar: "snow-5",
  statusbarForeground: "polar-3",
};

/** Resolves a semantic scale to literal Nord hex values. */
export function resolveColors(scale: SemanticColorScale): Record<keyof SemanticColorScale, string> {
  const entries = Object.entries(scale) as [keyof SemanticColorScale, NordColorName][];
  return Object.fromEntries(entries.map(([role, color]) => [role, nord[color]])) as Record<
    keyof SemanticColorScale,
    string
  >;
}
