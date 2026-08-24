import explorerFaviconPolarNight from "./explorer/favicon_polar-night.png";
import explorerFaviconSnowStorm from "./explorer/favicon_snow-storm.png";
import explorerFaviconAltPolarNight from "./explorer/favicon-alt_polar-night.png";
import explorerFaviconAltSnowStorm from "./explorer/favicon-alt_snow-storm.png";
import terminalFaviconPolarNight from "./terminal/favicon_polar-night.png";
import terminalFaviconSnowStorm from "./terminal/favicon_snow-storm.png";
import terminalFaviconAltPolarNight from "./terminal/favicon-alt_polar-night.png";
import terminalFaviconAltSnowStorm from "./terminal/favicon-alt_snow-storm.png";

export type AppIconTarget = "terminal" | "explorer";
export type ThemeIconVariant = "polar-night" | "snow-storm";

export interface FaviconAssetPair {
  taskbar: string;
  tray: string;
}

export const FAVICON_ASSETS: Record<AppIconTarget, Record<ThemeIconVariant, FaviconAssetPair>> = {
  terminal: {
    "polar-night": {
      taskbar: terminalFaviconPolarNight,
      tray: terminalFaviconAltPolarNight,
    },
    "snow-storm": {
      taskbar: terminalFaviconSnowStorm,
      tray: terminalFaviconAltSnowStorm,
    },
  },
  explorer: {
    "polar-night": {
      taskbar: explorerFaviconPolarNight,
      tray: explorerFaviconAltPolarNight,
    },
    "snow-storm": {
      taskbar: explorerFaviconSnowStorm,
      tray: explorerFaviconAltSnowStorm,
    },
  },
};
