import {
  type AppIconTarget,
  FAVICON_ASSETS,
  type ThemeIconVariant,
} from "../assets/icons/favicon/index";

/**
 * Returns the high-contrast favicon asset URL based on the active theme:
 * - Active theme polar-night (dark) -> returns snow-storm (light) favicon URL for contrast.
 * - Active theme snow-storm (light) -> returns polar-night (dark) favicon URL for contrast.
 */
export function getContrastingFaviconUrl(
  app: AppIconTarget,
  activeTheme: ThemeIconVariant,
): string {
  const contrastingTheme: ThemeIconVariant =
    activeTheme === "polar-night" ? "snow-storm" : "polar-night";
  return FAVICON_ASSETS[app][contrastingTheme].taskbar;
}

/**
 * Updates or creates the DOM `<link rel="icon">` in the document `<head>`
 * to match the high-contrast icon corresponding to the active theme.
 */
export function updateDomFavicon(
  app: AppIconTarget,
  activeTheme: ThemeIconVariant,
  targetDocument: Document = document,
): void {
  if (!targetDocument?.head) {
    return;
  }
  const href = getContrastingFaviconUrl(app, activeTheme);
  let link: HTMLLinkElement | null = targetDocument.querySelector("link[rel~='icon']");
  if (!link) {
    link = targetDocument.createElement("link");
    link.rel = "icon";
    targetDocument.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = href;
}
