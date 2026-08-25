import type { ExplorerConfigV1 } from "./config.types";

export const CONFIG_STORAGE_KEY = "gencore.explorer.config";

export const DEFAULT_CONFIG: ExplorerConfigV1 = {
  version: 1,
  showHiddenFiles: false,
  showFileExtensions: true,
  confirmBeforeDelete: true,
};

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
      return {
        version: 1,
        showHiddenFiles: bool(
          (value as Partial<ExplorerConfigV1>).showHiddenFiles,
          DEFAULT_CONFIG.showHiddenFiles,
        ),
        showFileExtensions: bool(
          (value as Partial<ExplorerConfigV1>).showFileExtensions,
          DEFAULT_CONFIG.showFileExtensions,
        ),
        confirmBeforeDelete: bool(
          (value as Partial<ExplorerConfigV1>).confirmBeforeDelete,
          DEFAULT_CONFIG.confirmBeforeDelete,
        ),
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
