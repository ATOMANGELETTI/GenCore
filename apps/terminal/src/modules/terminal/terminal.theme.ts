import {
  nord,
  polarNightColors,
  resolveColors,
  snowStormColors,
  type ThemeName,
} from "@gencore/ui-kit";
import type { ITheme } from "@xterm/xterm";

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

export function nordXtermTheme(theme: ThemeName): ITheme {
  const semantic = resolveColors(theme === "snow-storm" ? snowStormColors : polarNightColors);
  const background = theme === "snow-storm" ? nord["snow-6"] : nord["polar-0"];
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
