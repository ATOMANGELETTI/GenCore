import type { TerminalConfigV1, ThemePreference } from "./config.types";

export const CONFIG_STORAGE_KEY = "gencore.terminal.config";

export const DEFAULT_CONFIG: TerminalConfigV1 = { version: 1, theme: "system" };

const THEME_PREFERENCES: ReadonlySet<string> = new Set(["system", "polar-night", "snow-storm"]);

export function parseConfig(raw: string | null): TerminalConfigV1 {
  if (raw == null || raw === "") {
    return DEFAULT_CONFIG;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "version" in value &&
      value.version === 1 &&
      "theme" in value &&
      typeof value.theme === "string" &&
      THEME_PREFERENCES.has(value.theme)
    ) {
      return { version: 1, theme: value.theme as ThemePreference };
    }
  } catch {
    // Invalid JSON is treated as Match system.
  }

  return DEFAULT_CONFIG;
}

export function loadConfig(): TerminalConfigV1 {
  try {
    return parseConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: TerminalConfigV1): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}
