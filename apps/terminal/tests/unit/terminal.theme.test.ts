import { nord } from "@gencore/ui-kit";
import { describe, expect, it } from "vitest";
import { nordXtermTheme } from "../../src/modules/terminal/terminal.theme";

const nordHex = new Set(Object.values(nord).map((hex) => hex.toUpperCase()));

function themeHexes(theme: object): string[] {
  const values: string[] = [];
  for (const value of Object.values(theme)) {
    if (typeof value === "string" && value.startsWith("#")) {
      values.push(value);
    }
  }
  return values;
}

describe("nordXtermTheme", () => {
  it("uses Polar Night nord0 background when effect is none", () => {
    expect(nordXtermTheme("polar-night", "none").background?.toUpperCase()).toBe("#2E3440");
  });

  it("uses Snow Storm nord6 background when effect is none", () => {
    expect(nordXtermTheme("snow-storm", "none").background?.toUpperCase()).toBe("#ECEFF4");
  });

  it("uses translucent Nord veil when background effect is active", () => {
    expect(nordXtermTheme("polar-night", "particles").background).toBe("rgba(46, 52, 64, 0.74)");
    expect(nordXtermTheme("snow-storm", "molecules").background).toBe("rgba(236, 239, 244, 0.78)");
    expect(nordXtermTheme("polar-night", "orbs").background).toBe("rgba(46, 52, 64, 0.74)");
  });

  it("uses frost-8 for the cursor", () => {
    expect(nordXtermTheme("polar-night").cursor?.toUpperCase()).toBe("#88C0D0");
    expect(nordXtermTheme("snow-storm").cursor?.toUpperCase()).toBe("#88C0D0");
  });

  it("maps ANSI colors to official Nord terminal ports", () => {
    for (const name of ["polar-night", "snow-storm"] as const) {
      const theme = nordXtermTheme(name);
      expect(theme.black).toBe(nord["polar-1"]);
      expect(theme.red?.toUpperCase()).toBe("#BF616A");
      expect(theme.green).toBe(nord["aurora-14"]);
      expect(theme.yellow).toBe(nord["aurora-13"]);
      expect(theme.blue).toBe(nord["frost-9"]);
      expect(theme.magenta).toBe(nord["aurora-15"]);
      expect(theme.cyan).toBe(nord["frost-8"]);
      expect(theme.white).toBe(nord["snow-5"]);
      expect(theme.brightBlack).toBe(nord["polar-3"]);
      expect(theme.brightRed?.toUpperCase()).toBe("#BF616A");
      expect(theme.brightGreen).toBe(nord["aurora-14"]);
      expect(theme.brightYellow).toBe(nord["aurora-13"]);
      expect(theme.brightBlue).toBe(nord["frost-9"]);
      expect(theme.brightMagenta).toBe(nord["aurora-15"]);
      expect(theme.brightCyan).toBe(nord["frost-7"]);
      expect(theme.brightWhite).toBe(nord["snow-6"]);
      expect(theme.red).not.toBe(theme.background);
      expect(theme.brightRed).not.toBe(theme.background);
    }
  });

  it("uses only official Nord hex for every theme color", () => {
    for (const name of ["polar-night", "snow-storm"] as const) {
      for (const color of themeHexes(nordXtermTheme(name))) {
        expect(nordHex.has(color.toUpperCase())).toBe(true);
      }
    }
  });
});
