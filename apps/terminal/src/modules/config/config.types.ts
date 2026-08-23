import type { ThemeName } from "@gencore/ui-kit";

export type ThemePreference = "system" | "polar-night" | "snow-storm";

export type PoshThemeId =
  | "gencore"
  | "bubbles"
  | "iterm2"
  | "wholespace"
  | "wopian"
  | "clean-detailed"
  | "kali";

export interface TerminalConfigV1 {
  version: 1;
  theme: ThemePreference;
  poshTheme: PoshThemeId;
}

export interface ConfigContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolvedTheme: ThemeName;
  poshTheme: PoshThemeId;
  setPoshTheme: (next: PoshThemeId) => void;
}
