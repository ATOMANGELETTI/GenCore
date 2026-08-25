import type {
  ConfigSubviewId,
  ExplorerConfigV1,
  FileSizeFormat,
  ThemePreference,
} from "./config.types";

export const CONFIG_STORAGE_KEY = "gencore.explorer.config";

export const DEFAULT_CONFIG: ExplorerConfigV1 = {
  version: 1,
  showHiddenFiles: false,
  showFileExtensions: true,
  confirmBeforeDelete: true,
  themePreference: "system",
  fileSizeFormat: "binary",
};

const THEME_PREFERENCES: ReadonlySet<string> = new Set(["system", "polar-night", "snow-storm"]);
const FILE_SIZE_FORMATS: ReadonlySet<string> = new Set(["binary", "decimal"]);

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseConfig(raw: string | null): ExplorerConfigV1 {
  if (raw == null || raw === "") {
    return DEFAULT_CONFIG;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && "version" in value && value.version === 1) {
      const partial = value as Partial<ExplorerConfigV1>;

      const themePreference =
        typeof partial.themePreference === "string" &&
        THEME_PREFERENCES.has(partial.themePreference)
          ? (partial.themePreference as ThemePreference)
          : DEFAULT_CONFIG.themePreference;

      const fileSizeFormat =
        typeof partial.fileSizeFormat === "string" && FILE_SIZE_FORMATS.has(partial.fileSizeFormat)
          ? (partial.fileSizeFormat as FileSizeFormat)
          : DEFAULT_CONFIG.fileSizeFormat;

      return {
        version: 1,
        showHiddenFiles: bool(partial.showHiddenFiles, DEFAULT_CONFIG.showHiddenFiles),
        showFileExtensions: bool(partial.showFileExtensions, DEFAULT_CONFIG.showFileExtensions),
        confirmBeforeDelete: bool(partial.confirmBeforeDelete, DEFAULT_CONFIG.confirmBeforeDelete),
        themePreference,
        fileSizeFormat,
      };
    }
  } catch {
    // Invalid JSON is treated as default config.
  }

  return DEFAULT_CONFIG;
}

export function loadConfig(): ExplorerConfigV1 {
  try {
    return parseConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: ExplorerConfigV1): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export const ACTIVE_SUBVIEW_KEY = "gencore.explorer.config.active-subview";

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
