import {
  nord,
  polarNightColors,
  resolveColors,
  snowStormColors,
  type ThemeName,
} from "@gencore/ui-kit";
import type { ITheme } from "@xterm/xterm";
import type { BackgroundEffectType } from "../config/config.types";

const ansiTheme = {
  black: nord["polar-1"],
  red: nord["aurora-11"],
  green: nord["aurora-14"],
  yellow: nord["aurora-13"],
  blue: nord["frost-9"],
  magenta: nord["aurora-15"],
  cyan: nord["frost-8"],
  white: nord["snow-5"],
  brightBlack: nord["polar-3"],
  brightRed: nord["aurora-11"],
  brightGreen: nord["aurora-14"],
  brightYellow: nord["aurora-13"],
  brightBlue: nord["frost-9"],
  brightMagenta: nord["aurora-15"],
  brightCyan: nord["frost-7"],
  brightWhite: nord["snow-6"],
} as const satisfies ITheme;

export function nordXtermTheme(theme: ThemeName, effect: BackgroundEffectType = "none"): ITheme {
  const semantic = resolveColors(theme === "snow-storm" ? snowStormColors : polarNightColors);

  let background: string;
  if (effect === "none") {
    background = theme === "snow-storm" ? nord["snow-6"] : nord["polar-0"];
  } else {
    background = theme === "snow-storm" ? "rgba(236, 239, 244, 0.78)" : "rgba(46, 52, 64, 0.74)";
  }

  const foreground = theme === "snow-storm" ? nord["polar-0"] : nord["snow-4"];

  return {
    background,
    foreground,
    cursor: nord["frost-8"],
    cursorAccent: background,
    selectionBackground: semantic.accent,
    selectionForeground: semantic.accentForeground,
    selectionInactiveBackground: semantic.accent,
    ...ansiTheme,
  };
}
