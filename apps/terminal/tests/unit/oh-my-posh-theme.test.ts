import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { nord } from "@gencore/ui-kit";
import { describe, expect, it } from "vitest";
import { poshThemeSwapCommand } from "../../src/modules/terminal/terminal.prompt";

const nordHex = new Set(Object.values(nord).map((hex) => hex.toUpperCase()));
const resourceDir = resolve(process.cwd(), "src-tauri/resources/oh-my-posh");

type OmpSegment = {
  type?: string;
  style?: string;
  leading_diamond?: string;
  trailing_diamond?: string;
  background?: string;
  background_templates?: string[];
  template?: string;
};

type OmpBlock = {
  segments?: OmpSegment[];
};

type OmpTheme = {
  transient_prompt?: unknown;
  blocks?: OmpBlock[];
};

function readTheme(name: string): OmpTheme {
  const raw = readFileSync(resolve(resourceDir, name), "utf8");
  return JSON.parse(raw) as OmpTheme;
}

function collectHex(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    const matches = value.match(/#[0-9A-Fa-f]{6}/g);
    if (matches) {
      out.push(...matches);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectHex(item, out);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectHex(nested, out);
    }
  }
}

function segmentsOf(theme: OmpTheme): OmpSegment[] {
  return theme.blocks?.flatMap((block) => block.segments ?? []) ?? [];
}

function hasDiamond(theme: OmpTheme): boolean {
  return segmentsOf(theme).some(
    (segment) => segment.style === "diamond" || typeof segment.leading_diamond === "string",
  );
}

function sessionBackground(theme: OmpTheme): string | undefined {
  return segmentsOf(theme).find((segment) => segment.type === "session")?.background;
}

function gitSegment(theme: OmpTheme): OmpSegment | undefined {
  return segmentsOf(theme).find((segment) => segment.type === "git");
}

describe("oh-my-posh Nord themes", () => {
  const polar = readTheme("gencore-polar-night.omp.json");
  const snow = readTheme("gencore-snow-storm.omp.json");

  it("defines transient_prompt", () => {
    expect(polar.transient_prompt).toBeDefined();
    expect(snow.transient_prompt).toBeDefined();
  });

  it("uses diamond capsule segments", () => {
    expect(hasDiamond(polar)).toBe(true);
    expect(hasDiamond(snow)).toBe(true);
  });

  it("uses Polar Night user fill #88C0D0 and Snow Storm user fill #5E81AC", () => {
    expect(sessionBackground(polar)?.toUpperCase()).toBe("#88C0D0");
    expect(sessionBackground(snow)?.toUpperCase()).toBe("#5E81AC");
  });

  it("uses aurora git success, dirty, and conflict colors", () => {
    for (const theme of [polar, snow]) {
      const git = gitSegment(theme);
      expect(git?.background?.toUpperCase()).toBe("#A3BE8C");
      const templates = (git?.background_templates ?? []).join(" ").toUpperCase();
      expect(templates).toContain("#EBCB8B");
      expect(templates).toContain("#BF616A");
    }
  });

  it("uses only official Nord hex", () => {
    for (const parsed of [polar, snow]) {
      const hexes: string[] = [];
      collectHex(parsed, hexes);
      for (const hex of hexes) {
        expect(nordHex.has(hex.toUpperCase())).toBe(true);
      }
    }
  });
});

describe("poshThemeSwapCommand", () => {
  it("swaps only the theme filename and does not emit a filesystem path", () => {
    const polar = poshThemeSwapCommand("polar-night");
    const snow = poshThemeSwapCommand("snow-storm");

    expect(polar).toContain("gencore-polar-night.omp.json");
    expect(snow).toContain("gencore-snow-storm.omp.json");
    expect(polar).toMatch(/gencore-\(polar-night\|snow-storm\)/);
    expect(snow).toMatch(/gencore-\(polar-night\|snow-storm\)/);
    expect(polar.endsWith("\n")).toBe(true);
    expect(snow.endsWith("\n")).toBe(true);
    expect(polar).not.toMatch(/[A-Za-z]:\\/);
    expect(snow).not.toMatch(/[A-Za-z]:\\/);
    expect(polar).not.toContain("POSH_THEME = 'C:");
    expect(snow).not.toContain("POSH_THEME = 'C:");
  });
});
