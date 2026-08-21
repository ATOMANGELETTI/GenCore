import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { nord } from "../../src/tokens/tokens.nord";

function readStylesheet(name: string): string {
  return readFileSync(resolve(process.cwd(), "src/styles", name), "utf8");
}

const polarNightCss = readStylesheet("theme.polar-night.css");
const snowStormCss = readStylesheet("theme.snow-storm.css");

describe("theme.polar-night.css", () => {
  it("declares every official Nord colour with the exact hex", () => {
    for (const [name, hex] of Object.entries(nord)) {
      expect(polarNightCss).toContain(`--nord-${name}: ${hex.toLowerCase()};`);
    }
  });

  it("maps the dark semantic roles onto the palette", () => {
    expect(polarNightCss).toContain("--background: var(--nord-polar-0);");
    expect(polarNightCss).toContain("--foreground: var(--nord-snow-4);");
    expect(polarNightCss).toContain("--card: var(--nord-polar-1);");
    expect(polarNightCss).toContain("--muted-foreground: var(--nord-polar-3);");
    expect(polarNightCss).toContain("--primary: var(--nord-frost-8);");
    expect(polarNightCss).toContain("--primary-foreground: var(--nord-polar-0);");
    expect(polarNightCss).toContain("--accent: var(--nord-polar-2);");
    expect(polarNightCss).toContain("--accent-foreground: var(--nord-frost-8);");
    expect(polarNightCss).toContain("--border: var(--nord-polar-2);");
    expect(polarNightCss).toContain("--input: var(--nord-polar-3);");
    expect(polarNightCss).toContain("--ring: var(--nord-frost-8);");
    expect(polarNightCss).toContain("--destructive: var(--nord-aurora-11);");
    expect(polarNightCss).toContain("--caution: var(--nord-aurora-12);");
    expect(polarNightCss).toContain("--caution-foreground: var(--nord-polar-0);");
    expect(polarNightCss).toContain("--warning: var(--nord-aurora-13);");
    expect(polarNightCss).toContain("--success: var(--nord-aurora-14);");
    expect(polarNightCss).toContain("--info: var(--nord-aurora-15);");
    expect(polarNightCss).toContain("--titlebar: var(--nord-polar-1);");
    expect(polarNightCss).toContain("--statusbar: var(--nord-polar-1);");
  });

  it("applies at :root so Polar Night is the default theme", () => {
    expect(polarNightCss).toMatch(/^:root,/m);
  });

  it("uses no colour literal outside the Nord palette", () => {
    const palette = new Set(Object.values(nord).map((hex) => hex.toLowerCase()));
    for (const literal of polarNightCss.match(/#[0-9a-f]{3,8}/gi) ?? []) {
      expect(palette).toContain(literal.toLowerCase());
    }
  });
});

describe("theme.snow-storm.css", () => {
  it("declares the same palette and is scoped away from :root", () => {
    for (const [name, hex] of Object.entries(nord)) {
      expect(snowStormCss).toContain(`--nord-${name}: ${hex.toLowerCase()};`);
    }
    expect(snowStormCss).not.toMatch(/^:root/m);
    expect(snowStormCss).toMatch(/^\.theme-snow-storm,/m);
  });

  it("maps the light semantic roles onto Snow Storm backgrounds", () => {
    expect(snowStormCss).toContain("--background: var(--nord-snow-6);");
    expect(snowStormCss).toContain("--card: var(--nord-snow-5);");
    expect(snowStormCss).toContain("--foreground: var(--nord-polar-0);");
    expect(snowStormCss).toContain("--muted-foreground: var(--nord-polar-3);");
    expect(snowStormCss).toContain("--accent: var(--nord-snow-4);");
    expect(snowStormCss).toContain("--accent-foreground: var(--nord-frost-10);");
    expect(snowStormCss).toContain("--primary: var(--nord-frost-8);");
    expect(snowStormCss).toContain("--ring: var(--nord-frost-8);");
    expect(snowStormCss).toContain("--caution: var(--nord-aurora-12);");
    expect(snowStormCss).toContain("--caution-foreground: var(--nord-polar-0);");
    expect(snowStormCss).toContain("--warning: var(--nord-aurora-13);");
  });
});
