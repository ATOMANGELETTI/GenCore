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

export type BackgroundEffectType = "none" | "particles" | "molecules" | "orbs";
export type EffectInteractionMode = "ambient" | "repel" | "ripple";

export type DiffEditorPreference = "monaco" | "micro";

export type ConfigSubviewId = "appearance" | "effects" | "prompt" | "assistant" | "all";

export interface TerminalConfigV1 {
  version: 1;
  theme: ThemePreference;
  poshTheme: PoshThemeId;
  backgroundEffect: BackgroundEffectType;
  effectInteraction: EffectInteractionMode;
  effectOpacity: number;
  effectSpeed: number;
  diffEditor: DiffEditorPreference;
}

export interface ConfigContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolvedTheme: ThemeName;
  poshTheme: PoshThemeId;
  setPoshTheme: (next: PoshThemeId) => void;
  backgroundEffect: BackgroundEffectType;
  setBackgroundEffect: (next: BackgroundEffectType) => void;
  effectInteraction: EffectInteractionMode;
  setEffectInteraction: (next: EffectInteractionMode) => void;
  effectOpacity: number;
  setEffectOpacity: (next: number) => void;
  effectSpeed: number;
  setEffectSpeed: (next: number) => void;
  diffEditor: DiffEditorPreference;
  setDiffEditor: (next: DiffEditorPreference) => void;
}
