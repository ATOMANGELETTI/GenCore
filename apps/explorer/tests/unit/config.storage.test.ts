import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, parseConfig } from "../../src/modules/config/config.storage";

describe("config.storage", () => {
  it("returns defaults for null or empty input", () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig("")).toEqual(DEFAULT_CONFIG);
  });

  it("returns defaults for invalid JSON", () => {
    expect(parseConfig("{not json")).toEqual(DEFAULT_CONFIG);
  });

  it("returns defaults when the version does not match", () => {
    expect(parseConfig(JSON.stringify({ version: 2, showHiddenFiles: true }))).toEqual(
      DEFAULT_CONFIG,
    );
  });

  it("round-trips valid config", () => {
    const config = {
      version: 1,
      showHiddenFiles: true,
      showFileExtensions: false,
      confirmBeforeDelete: false,
    };
    expect(parseConfig(JSON.stringify(config))).toEqual(config);
  });

  it("falls back to defaults for missing or malformed fields", () => {
    expect(parseConfig(JSON.stringify({ version: 1, showHiddenFiles: "yes" }))).toEqual(
      DEFAULT_CONFIG,
    );
  });
});
