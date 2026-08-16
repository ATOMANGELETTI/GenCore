import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readStylesheet(name: string): string {
  return readFileSync(resolve(process.cwd(), "src/styles", name), "utf8");
}

describe("traffic light tokens", () => {
  it("does not keep a glyph color after icons were removed", () => {
    for (const name of ["globals.css", "theme.polar-night.css", "theme.snow-storm.css"] as const) {
      const css = readStylesheet(name);
      expect(css, name).not.toMatch(/traffic-glyph/);
    }
  });
});
