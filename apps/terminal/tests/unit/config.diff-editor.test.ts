import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONFIG,
  loadConfig,
  parseConfig,
  saveConfig,
} from "../../src/modules/config/config.storage";
import type { TerminalConfigV1 } from "../../src/modules/config/config.types";

restoreJsdomLocalStorage();

describe("diffEditor config preferences", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults diffEditor to 'monaco' in DEFAULT_CONFIG", () => {
    expect(DEFAULT_CONFIG.diffEditor).toBe("monaco");
  });

  it("parses valid diffEditor preference ('monaco' | 'micro')", () => {
    const parsedMonaco = parseConfig(
      JSON.stringify({
        version: 1,
        theme: "polar-night",
        poshTheme: "gencore",
        diffEditor: "monaco",
      }),
    );
    expect(parsedMonaco.diffEditor).toBe("monaco");

    const parsedMicro = parseConfig(
      JSON.stringify({
        version: 1,
        theme: "polar-night",
        poshTheme: "gencore",
        diffEditor: "micro",
      }),
    );
    expect(parsedMicro.diffEditor).toBe("micro");
  });

  it("falls back to 'monaco' if diffEditor is invalid or missing in legacy blob", () => {
    const legacy = parseConfig(
      JSON.stringify({
        version: 1,
        theme: "polar-night",
        poshTheme: "gencore",
      }),
    );
    expect(legacy.diffEditor).toBe("monaco");

    const invalid = parseConfig(
      JSON.stringify({
        version: 1,
        theme: "polar-night",
        poshTheme: "gencore",
        diffEditor: "unsupported-editor",
      }),
    );
    expect(invalid.diffEditor).toBe("monaco");
  });

  it("saves and loads diffEditor setting correctly", () => {
    const config: TerminalConfigV1 = {
      version: 1,
      theme: "polar-night",
      poshTheme: "bubbles",
      backgroundEffect: "orbs",
      effectInteraction: "ripple",
      effectOpacity: 0.8,
      effectSpeed: 1.2,
      diffEditor: "micro",
    };
    expect(saveConfig(config)).toBe(true);
    expect(loadConfig().diffEditor).toBe("micro");
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
