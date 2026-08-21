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
  it("uses Polar Night nord0 background", () => {
    expect(nordXtermTheme("polar-night").background).toBe("#2E3440");
  });

  it("uses Snow Storm nord6 background", () => {
    expect(nordXtermTheme("snow-storm").background).toBe("#ECEFF4");
  });

  it("uses frost-8 for the cursor", () => {
    expect(nordXtermTheme("polar-night").cursor).toBe("#88C0D0");
    expect(nordXtermTheme("snow-storm").cursor).toBe("#88C0D0");
  });

  it("maps ANSI 0–15 to nord0–nord15 in order", () => {
    const ansi = Object.values(nord);
    const theme = nordXtermTheme("polar-night");
    expect(theme.black).toBe(ansi[0]);
    expect(theme.red).toBe(ansi[1]);
    expect(theme.green).toBe(ansi[2]);
    expect(theme.yellow).toBe(ansi[3]);
    expect(theme.blue).toBe(ansi[4]);
    expect(theme.magenta).toBe(ansi[5]);
    expect(theme.cyan).toBe(ansi[6]);
    expect(theme.white).toBe(ansi[7]);
    expect(theme.brightBlack).toBe(ansi[8]);
    expect(theme.brightRed).toBe(ansi[9]);
    expect(theme.brightGreen).toBe(ansi[10]);
    expect(theme.brightYellow).toBe(ansi[11]);
    expect(theme.brightBlue).toBe(ansi[12]);
    expect(theme.brightMagenta).toBe(ansi[13]);
    expect(theme.brightCyan).toBe(ansi[14]);
    expect(theme.brightWhite).toBe(ansi[15]);
  });

  it("uses only official Nord hex for every theme color", () => {
    for (const name of ["polar-night", "snow-storm"] as const) {
      for (const color of themeHexes(nordXtermTheme(name))) {
        expect(nordHex.has(color.toUpperCase())).toBe(true);
      }
    }
  });
});
