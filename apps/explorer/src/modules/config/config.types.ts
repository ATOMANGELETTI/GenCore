import type { ThemeName } from "@gencore/ui-kit";

export type ThemePreference = "system" | "polar-night" | "snow-storm";

export type FileSizeFormat = "binary" | "decimal";

export type ConfigSubviewId = "general" | "appearance" | "all";

export interface ExplorerConfigV1 {
  readonly version: 1;
  readonly showHiddenFiles: boolean;
  readonly showFileExtensions: boolean;
  readonly confirmBeforeDelete: boolean;
  readonly themePreference: ThemePreference;
  readonly fileSizeFormat: FileSizeFormat;
}

export interface ConfigContextValue extends ExplorerConfigV1 {
  setShowHiddenFiles: (value: boolean) => void;
  setShowFileExtensions: (value: boolean) => void;
  setConfirmBeforeDelete: (value: boolean) => void;
  setThemePreference: (value: ThemePreference) => void;
  setFileSizeFormat: (value: FileSizeFormat) => void;
  resolvedTheme: ThemeName;
}
