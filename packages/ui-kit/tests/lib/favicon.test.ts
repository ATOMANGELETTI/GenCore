import { beforeEach, describe, expect, it } from "vitest";
import { FAVICON_ASSETS } from "../../src/assets/icons/favicon/index";
import { getContrastingFaviconUrl, updateDomFavicon } from "../../src/lib/favicon";

describe("favicon utils", () => {
  describe("getContrastingFaviconUrl", () => {
    it("returns snow-storm favicon when active theme is polar-night (high contrast)", () => {
      expect(getContrastingFaviconUrl("terminal", "polar-night")).toBe(
        FAVICON_ASSETS.terminal["snow-storm"].taskbar,
      );
      expect(getContrastingFaviconUrl("explorer", "polar-night")).toBe(
        FAVICON_ASSETS.explorer["snow-storm"].taskbar,
      );
    });

    it("returns polar-night favicon when active theme is snow-storm (high contrast)", () => {
      expect(getContrastingFaviconUrl("terminal", "snow-storm")).toBe(
        FAVICON_ASSETS.terminal["polar-night"].taskbar,
      );
      expect(getContrastingFaviconUrl("explorer", "snow-storm")).toBe(
        FAVICON_ASSETS.explorer["polar-night"].taskbar,
      );
    });
  });

  describe("updateDomFavicon", () => {
    beforeEach(() => {
      document.head.innerHTML = "";
    });

    it("creates a link element if none exists and sets contrasting href", () => {
      updateDomFavicon("terminal", "polar-night", document);

      const link = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']");
      expect(link).not.toBeNull();
      expect(link?.rel).toBe("icon");
      expect(link?.type).toBe("image/png");
      expect(link?.href).toContain(FAVICON_ASSETS.terminal["snow-storm"].taskbar);
    });

    it("updates existing link element when theme switches", () => {
      const existing = document.createElement("link");
      existing.rel = "icon";
      existing.href = "old-favicon.png";
      document.head.appendChild(existing);

      updateDomFavicon("explorer", "snow-storm", document);

      const links = document.head.querySelectorAll<HTMLLinkElement>("link[rel~='icon']");
      expect(links.length).toBe(1);
      expect(links[0]?.href).toContain(FAVICON_ASSETS.explorer["polar-night"].taskbar);
      expect(links[0]?.type).toBe("image/png");

      updateDomFavicon("explorer", "polar-night", document);
      expect(links[0]?.href).toContain(FAVICON_ASSETS.explorer["snow-storm"].taskbar);
    });

    it("handles null or missing document safely", () => {
      expect(() => {
        updateDomFavicon("terminal", "polar-night", null as unknown as Document);
      }).not.toThrow();
    });
  });
});
