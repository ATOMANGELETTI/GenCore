import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  loadConfig,
  parseConfig,
  saveConfig,
} from "../../src/modules/config/config.storage";

restoreJsdomLocalStorage();

describe("parseConfig", () => {
  it("returns Match system for missing, empty, invalid, wrong version, or unknown theme", () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("{")).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(JSON.stringify({ version: 2, theme: "system" }))).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(JSON.stringify({ version: 1, theme: "nord" }))).toEqual(DEFAULT_CONFIG);
  });

  it("accepts a valid v1 blob", () => {
    expect(parseConfig(JSON.stringify({ version: 1, theme: "snow-storm" }))).toEqual({
      version: 1,
      theme: "snow-storm",
    });
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
    expect(saveConfig({ version: 1, theme: "polar-night" })).toBe(true);
    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toBe(
      JSON.stringify({ version: 1, theme: "polar-night" }),
    );
    expect(loadConfig()).toEqual({ version: 1, theme: "polar-night" });
  });

  it("returns false and skips persistence when setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveConfig({ version: 1, theme: "system" })).toBe(false);
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
