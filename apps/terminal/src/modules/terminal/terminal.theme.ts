import {
  nord,
  polarNightColors,
  resolveColors,
  snowStormColors,
  type ThemeName,
} from "@gencore/ui-kit";
import type { ITheme } from "@xterm/xterm";

const ansi = Object.values(nord);

const ansiTheme = {
  black: ansi[0],
  red: ansi[1],
  green: ansi[2],
  yellow: ansi[3],
  blue: ansi[4],
  magenta: ansi[5],
  cyan: ansi[6],
  white: ansi[7],
  brightBlack: ansi[8],
  brightRed: ansi[9],
  brightGreen: ansi[10],
  brightYellow: ansi[11],
  brightBlue: ansi[12],
  brightMagenta: ansi[13],
  brightCyan: ansi[14],
  brightWhite: ansi[15],
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
