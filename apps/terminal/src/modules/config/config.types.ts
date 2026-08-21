import type { ThemeName } from "@gencore/ui-kit";

export type ThemePreference = "system" | "polar-night" | "snow-storm";

export interface TerminalConfigV1 {
  version: 1;
  theme: ThemePreference;
}

export interface ConfigContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolvedTheme: ThemeName;
}
