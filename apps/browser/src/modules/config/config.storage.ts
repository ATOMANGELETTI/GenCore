import { DEFAULT_HOMEPAGE_URL } from "./config.constants";
import type {
  BrowserConfigV1,
  ConfigSubviewId,
  SearchEngineId,
  ThemePreference,
} from "./config.types";

export const CONFIG_STORAGE_KEY = "gencore.browser.config";

export const DEFAULT_CONFIG: BrowserConfigV1 = {
  version: 1,
  themePreference: "system",
  homepageUrl: DEFAULT_HOMEPAGE_URL,
  searchEngineId: "duckduckgo",
  showBookmarksBar: true,
};

const THEME_PREFERENCES: ReadonlySet<string> = new Set(["system", "polar-night", "snow-storm"]);
const SEARCH_ENGINE_IDS: ReadonlySet<string> = new Set(["duckduckgo", "google", "bing"]);

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseConfig(raw: string | null): BrowserConfigV1 {
  if (raw == null || raw === "") {
    return DEFAULT_CONFIG;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && "version" in value && value.version === 1) {
      const partial = value as Partial<BrowserConfigV1>;

      const themePreference =
        typeof partial.themePreference === "string" &&
        THEME_PREFERENCES.has(partial.themePreference)
          ? (partial.themePreference as ThemePreference)
          : DEFAULT_CONFIG.themePreference;

      const searchEngineId =
        typeof partial.searchEngineId === "string" && SEARCH_ENGINE_IDS.has(partial.searchEngineId)
          ? (partial.searchEngineId as SearchEngineId)
          : DEFAULT_CONFIG.searchEngineId;

      const homepageUrl =
        typeof partial.homepageUrl === "string" && partial.homepageUrl.length > 0
          ? partial.homepageUrl
          : DEFAULT_CONFIG.homepageUrl;

      return {
        version: 1,
        themePreference,
        homepageUrl,
        searchEngineId,
        showBookmarksBar: bool(partial.showBookmarksBar, DEFAULT_CONFIG.showBookmarksBar),
      };
    }
  } catch {
    // Invalid JSON is treated as default config.
  }

  return DEFAULT_CONFIG;
}

export function loadConfig(): BrowserConfigV1 {
  try {
    return parseConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: BrowserConfigV1): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export const ACTIVE_SUBVIEW_KEY = "gencore.browser.config.active-subview";

const VALID_SUBVIEWS: ReadonlySet<string> = new Set(["general", "appearance", "all"]);

export function readActiveSubview(): ConfigSubviewId {
  try {
    const raw = localStorage.getItem(ACTIVE_SUBVIEW_KEY);
    if (raw && VALID_SUBVIEWS.has(raw)) {
      return raw as ConfigSubviewId;
    }
  } catch {
    // fallback to default
  }
  return "general";
}

export function writeActiveSubview(id: ConfigSubviewId): boolean {
  try {
    localStorage.setItem(ACTIVE_SUBVIEW_KEY, id);
    return true;
  } catch {
    return false;
  }
}
