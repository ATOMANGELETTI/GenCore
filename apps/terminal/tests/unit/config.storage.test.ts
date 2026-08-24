import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  loadConfig,
  parseConfig,
  readActiveSubview,
  saveConfig,
  writeActiveSubview,
} from "../../src/modules/config/config.storage";
import type { TerminalConfigV1 } from "../../src/modules/config/config.types";

restoreJsdomLocalStorage();

describe("parseConfig", () => {
  it("returns Match system and gencore prompt theme for missing, empty, invalid, wrong version, or unknown theme", () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("{")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(JSON.stringify({ version: 2, theme: "system" }))).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(JSON.stringify({ version: 1, theme: "nord" }))).toEqual(DEFAULT_CONFIG);
    expect(
      parseConfig(JSON.stringify({ version: 1, theme: "system", poshTheme: "invalid" })),
    ).toEqual(DEFAULT_CONFIG);
  });

  it("accepts a valid v1 blob with poshTheme and background effect settings", () => {
    expect(
      parseConfig(
        JSON.stringify({
          version: 1,
          theme: "snow-storm",
          poshTheme: "bubbles",
          backgroundEffect: "molecules",
          effectInteraction: "ripple",
          effectOpacity: 0.75,
          effectSpeed: 1.5,
        }),
      ),
    ).toEqual({
      version: 1,
      theme: "snow-storm",
      poshTheme: "bubbles",
      backgroundEffect: "molecules",
      effectInteraction: "ripple",
      effectOpacity: 0.75,
      effectSpeed: 1.5,
    });
  });

  it("migrates legacy v1 blob without background effect settings to defaults", () => {
    expect(
      parseConfig(JSON.stringify({ version: 1, theme: "snow-storm", poshTheme: "gencore" })),
    ).toEqual({
      version: 1,
      theme: "snow-storm",
      poshTheme: "gencore",
      backgroundEffect: "particles",
      effectInteraction: "repel",
      effectOpacity: 0.5,
      effectSpeed: 1.0,
    });
  });

  it("clamps invalid effectOpacity and effectSpeed to safe ranges", () => {
    const parsed = parseConfig(
      JSON.stringify({
        version: 1,
        theme: "polar-night",
        poshTheme: "gencore",
        backgroundEffect: "orbs",
        effectInteraction: "ambient",
        effectOpacity: 5.0,
        effectSpeed: -1.0,
      }),
    );
    expect(parsed.effectOpacity).toBe(1.0);
    expect(parsed.effectSpeed).toBe(0.2);
  });
});

describe("loadConfig / saveConfig", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads DEFAULT_CONFIG when the key is missing and does not write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("does not write when the stored blob is invalid", () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, "{");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("returns DEFAULT_CONFIG when getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("writes a valid blob on saveConfig and loadConfig reads it back", () => {
    const customConfig: TerminalConfigV1 = {
      version: 1,
      theme: "polar-night",
      poshTheme: "kali",
      backgroundEffect: "orbs",
      effectInteraction: "ripple",
      effectOpacity: 0.8,
      effectSpeed: 1.2,
    };
    expect(saveConfig(customConfig)).toBe(true);
    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toBe(JSON.stringify(customConfig));
    expect(loadConfig()).toEqual(customConfig);
  });

  it("returns false and skips persistence when setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveConfig(DEFAULT_CONFIG)).toBe(false);
  });
});

describe("readActiveSubview / writeActiveSubview", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to 'appearance' when nothing stored", () => {
    expect(readActiveSubview()).toBe("appearance");
  });

  it("writes and reads back a valid subview", () => {
    writeActiveSubview("effects");
    expect(readActiveSubview()).toBe("effects");
  });

  it("falls back to 'appearance' on invalid stored value", () => {
    localStorage.setItem("gencore:config:active-subview", "invalid-view");
    expect(readActiveSubview()).toBe("appearance");
  });

  it("handles storage exceptions gracefully", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readActiveSubview()).toBe("appearance");
  });
});

function restoreJsdomLocalStorage(): void {
  const jsdomStorage = (window as unknown as { _localStorage?: Storage })._localStorage;
  if (!jsdomStorage) {
    return;
  }

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    get: () => jsdomStorage,
  });
}
