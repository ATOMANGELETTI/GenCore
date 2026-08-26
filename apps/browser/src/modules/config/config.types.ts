import type { ThemeName } from "@gencore/ui-kit";

export type ThemePreference = "system" | "polar-night" | "snow-storm";

export type SearchEngineId = "duckduckgo" | "google" | "bing";

export type ConfigSubviewId = "general" | "appearance" | "all";

export interface BrowserConfigV1 {
  readonly version: 1;
  readonly themePreference: ThemePreference;
  readonly homepageUrl: string;
  readonly searchEngineId: SearchEngineId;
  readonly showBookmarksBar: boolean;
}

export interface ConfigContextValue extends BrowserConfigV1 {
  setThemePreference: (value: ThemePreference) => void;
  setHomepageUrl: (value: string) => void;
  setSearchEngineId: (value: SearchEngineId) => void;
  setShowBookmarksBar: (value: boolean) => void;
  resolvedTheme: ThemeName;
}
