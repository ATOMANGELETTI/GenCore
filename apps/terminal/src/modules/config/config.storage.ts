import type {
  BackgroundEffectType,
  ConfigSubviewId,
  EffectInteractionMode,
  PoshThemeId,
  TerminalConfigV1,
  ThemePreference,
} from "./config.types";

export const CONFIG_STORAGE_KEY = "gencore.terminal.config";

export const DEFAULT_CONFIG: TerminalConfigV1 = {
  version: 1,
  theme: "system",
  poshTheme: "gencore",
  backgroundEffect: "particles",
  effectInteraction: "repel",
  effectOpacity: 0.5,
  effectSpeed: 1.0,
};

const THEME_PREFERENCES: ReadonlySet<string> = new Set(["system", "polar-night", "snow-storm"]);
const POSH_THEMES: ReadonlySet<string> = new Set([
  "gencore",
  "bubbles",
  "iterm2",
  "wholespace",
  "wopian",
  "clean-detailed",
  "kali",
]);
const BACKGROUND_EFFECTS: ReadonlySet<string> = new Set(["none", "particles", "molecules", "orbs"]);
const EFFECT_INTERACTIONS: ReadonlySet<string> = new Set(["ambient", "repel", "ripple"]);

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}

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
      const poshTheme =
        "poshTheme" in value &&
        typeof value.poshTheme === "string" &&
        POSH_THEMES.has(value.poshTheme)
          ? (value.poshTheme as PoshThemeId)
          : "gencore";

      const backgroundEffect =
        "backgroundEffect" in value &&
        typeof value.backgroundEffect === "string" &&
        BACKGROUND_EFFECTS.has(value.backgroundEffect)
          ? (value.backgroundEffect as BackgroundEffectType)
          : "particles";

      const effectInteraction =
        "effectInteraction" in value &&
        typeof value.effectInteraction === "string" &&
        EFFECT_INTERACTIONS.has(value.effectInteraction)
          ? (value.effectInteraction as EffectInteractionMode)
          : "repel";

      const effectOpacity =
        "effectOpacity" in value ? clampNumber(value.effectOpacity, 0.1, 1.0, 0.5) : 0.5;

      const effectSpeed =
        "effectSpeed" in value ? clampNumber(value.effectSpeed, 0.2, 2.0, 1.0) : 1.0;

      return {
        version: 1,
        theme: value.theme as ThemePreference,
        poshTheme,
        backgroundEffect,
        effectInteraction,
        effectOpacity,
        effectSpeed,
      };
    }
  } catch {
    // Invalid JSON is treated as default config.
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

export const ACTIVE_SUBVIEW_KEY = "gencore:config:active-subview";

const VALID_SUBVIEWS: ReadonlySet<string> = new Set([
  "appearance",
  "effects",
  "prompt",
  "assistant",
  "all",
]);

export function readActiveSubview(): ConfigSubviewId {
  try {
    const raw = localStorage.getItem(ACTIVE_SUBVIEW_KEY);
    if (raw && VALID_SUBVIEWS.has(raw)) {
      return raw as ConfigSubviewId;
    }
  } catch {
    // fallback to default
  }
  return "appearance";
}

export function writeActiveSubview(id: ConfigSubviewId): boolean {
  try {
    localStorage.setItem(ACTIVE_SUBVIEW_KEY, id);
    return true;
  } catch {
    return false;
  }
}
