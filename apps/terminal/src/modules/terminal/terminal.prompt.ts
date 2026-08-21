import type { ThemeName } from "@gencore/ui-kit";

const POLAR_FILE = "gencore-polar-night.omp.json";
const SNOW_FILE = "gencore-snow-storm.omp.json";
const THEME_FILE_PATTERN = "gencore-(polar-night|snow-storm)\\.omp.json";

export function poshThemeFile(theme: ThemeName): string {
  return theme === "snow-storm" ? SNOW_FILE : POLAR_FILE;
}

/** PowerShell that retargets `$env:POSH_THEME` by filename only — no filesystem path. */
export function poshThemeSwapCommand(theme: ThemeName): string {
  const file = poshThemeFile(theme);
  return `$env:POSH_THEME = [regex]::Replace([string]$env:POSH_THEME, '${THEME_FILE_PATTERN}', '${file}')\r\n`;
}
