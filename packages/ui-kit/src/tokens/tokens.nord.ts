/**
 * The official Nord palette, transcribed verbatim from nordtheme.com.
 * These are the only raw colour literals allowed in the kit; every other
 * layer must reference a semantic token that resolves back to one of these.
 */

/** `nord0`–`nord3`. Dark base tones, used for backgrounds and chrome. */
export const nordPolarNight = {
  "polar-0": "#2E3440",
  "polar-1": "#3B4252",
  "polar-2": "#434C5E",
  "polar-3": "#4C566A",
} as const;

/** `nord4`–`nord6`. Light base tones, used for text on dark and light backgrounds. */
export const nordSnowStorm = {
  "snow-4": "#D8DEE9",
  "snow-5": "#E5E9F0",
  "snow-6": "#ECEFF4",
} as const;

/** `nord7`–`nord10`. Bluish accents used for primary/interactive surfaces. */
export const nordFrost = {
  "frost-7": "#8FBCBB",
  "frost-8": "#88C0D0",
  "frost-9": "#81A1C1",
  "frost-10": "#5E81AC",
} as const;

/** `nord11`–`nord15`. Vivid accents reserved for state (error/caution/warning/success/info). */
export const nordAurora = {
  "aurora-11": "#BF616A",
  "aurora-12": "#D08770",
  "aurora-13": "#EBCB8B",
  "aurora-14": "#A3BE8C",
  "aurora-15": "#B48EAD",
} as const;

/** The complete 16-colour Nord palette, flattened. */
export const nord = {
  ...nordPolarNight,
  ...nordSnowStorm,
  ...nordFrost,
  ...nordAurora,
} as const;

export type NordColorName = keyof typeof nord;

/** CSS custom property name for a palette entry, e.g. `--nord-frost-8`. */
export function nordVarName(name: NordColorName): `--nord-${NordColorName}` {
  return `--nord-${name}`;
}

/** `var(--nord-*)` reference for a palette entry. */
export function nordVar(name: NordColorName): string {
  return `var(${nordVarName(name)})`;
}
