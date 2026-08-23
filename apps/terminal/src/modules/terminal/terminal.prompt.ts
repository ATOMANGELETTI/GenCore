import type { ThemeName } from "@gencore/ui-kit";
import type { PoshThemeId } from "../config/config.types";

const POLAR_FILE = "gencore-polar-night.omp.json";
const SNOW_FILE = "gencore-snow-storm.omp.json";

export const THEME_FILE_PATTERN =
  "(gencore-(polar-night|snow-storm)|bubbles|iterm2|wholespace|wopian|clean-detailed|kali)\\.omp\\.json";

export function poshThemeFilename(
  poshTheme: PoshThemeId = "gencore",
  theme: ThemeName = "polar-night",
): string {
  if (poshTheme === "gencore") {
    return theme === "snow-storm" ? SNOW_FILE : POLAR_FILE;
  }
  return `${poshTheme}.omp.json`;
}

/** Backward-compatible alias for poshThemeFilename. */
export function poshThemeFile(theme: ThemeName): string {
  return poshThemeFilename("gencore", theme);
}

/** PowerShell that retargets `$env:POSH_THEME` and `$env:POSH_CONFIG` by filename only — no filesystem path. */
export function poshThemeSwapCommand(
  poshThemeOrTheme: PoshThemeId | ThemeName = "gencore",
  theme: ThemeName = "polar-night",
): string {
  let poshTheme: PoshThemeId = "gencore";
  let resolvedTheme: ThemeName = theme;

  if (poshThemeOrTheme === "polar-night" || poshThemeOrTheme === "snow-storm") {
    poshTheme = "gencore";
    resolvedTheme = poshThemeOrTheme;
  } else {
    poshTheme = poshThemeOrTheme;
    resolvedTheme = theme;
  }

  const file = poshThemeFilename(poshTheme, resolvedTheme);
  return `$env:POSH_THEME = [regex]::Replace([string]$env:POSH_THEME, '${THEME_FILE_PATTERN}', '${file}'); $env:POSH_CONFIG = [regex]::Replace([string]$env:POSH_CONFIG, '${THEME_FILE_PATTERN}', '${file}')\r\n`;
}
