import type * as React from "react";
import type { SemanticColorScale } from "../tokens/tokens.colors";

export type ThemeName = "polar-night" | "snow-storm";

/**
 * Per-app overrides. Every key is a CSS colour value written straight onto the
 * theme wrapper, so an app can retint the kit without forking the CSS.
 */
export type ThemeTokens = Record<keyof SemanticColorScale, string> & {
  radius: string;
};

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Controlled theme. Falls back to `defaultTheme` when omitted. */
  theme?: ThemeName;
  defaultTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  tokens?: Partial<ThemeTokens>;
  className?: string;
}

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  tokens: Partial<ThemeTokens>;
}
