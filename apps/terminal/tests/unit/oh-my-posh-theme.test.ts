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
  powerline_symbol?: string;
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

function hasPowerline(theme: OmpTheme): boolean {
  return segmentsOf(theme).some(
    (segment) => segment.style === "powerline" || typeof segment.powerline_symbol === "string",
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

  it("uses powerline chevron segments", () => {
    expect(hasPowerline(polar)).toBe(true);
    expect(hasPowerline(snow)).toBe(true);
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

describe("bundled oh-my-posh upstream themes", () => {
  const themeFiles = [
    "gencore-polar-night.omp.json",
    "gencore-snow-storm.omp.json",
    "bubbles.omp.json",
    "iterm2.omp.json",
    "wholespace.omp.json",
    "wopian.omp.json",
    "clean-detailed.omp.json",
    "kali.omp.json",
  ];

  it.each(themeFiles)("loads and parses %s as valid Oh My Posh JSON schema", (themeName) => {
    const theme = readTheme(themeName);
    expect(theme).toBeDefined();
    expect(Array.isArray(theme.blocks)).toBe(true);
    expect(theme.blocks?.length).toBeGreaterThan(0);
  });
});

describe("poshThemeSwapCommand", () => {
  it("swaps only the theme filename and does not emit a filesystem path for gencore themes", () => {
    const polar = poshThemeSwapCommand("gencore", "polar-night");
    const snow = poshThemeSwapCommand("gencore", "snow-storm");

    expect(polar).toContain("gencore-polar-night.omp.json");
    expect(snow).toContain("gencore-snow-storm.omp.json");
    expect(polar).toContain("$env:POSH_THEME");
    expect(polar).toContain("$env:POSH_CONFIG");
    expect(polar).toContain(
      "(gencore-(polar-night|snow-storm)|bubbles|iterm2|wholespace|wopian|clean-detailed|kali)",
    );
    expect(polar.endsWith("\n")).toBe(true);
    expect(snow.endsWith("\n")).toBe(true);
    expect(polar).not.toMatch(/[A-Za-z]:\\/);
    expect(snow).not.toMatch(/[A-Za-z]:\\/);
  });

  it("swaps to standalone theme filenames (bubbles, kali, iterm2, wholespace, wopian, clean-detailed)", () => {
    const themes = ["bubbles", "iterm2", "wholespace", "wopian", "clean-detailed", "kali"] as const;
    for (const themeId of themes) {
      const cmd = poshThemeSwapCommand(themeId, "polar-night");
      expect(cmd).toContain(`${themeId}.omp.json`);
      expect(cmd).toContain("$env:POSH_THEME");
      expect(cmd).toContain("$env:POSH_CONFIG");
      expect(cmd).toContain(
        "(gencore-(polar-night|snow-storm)|bubbles|iterm2|wholespace|wopian|clean-detailed|kali)",
      );
      expect(cmd.endsWith("\n")).toBe(true);
      expect(cmd).not.toMatch(/[A-Za-z]:\\/);
    }
  });

  it("supports legacy single-argument call signature (polar-night / snow-storm)", () => {
    const legacyPolar = poshThemeSwapCommand("polar-night");
    const legacySnow = poshThemeSwapCommand("snow-storm");

    expect(legacyPolar).toContain("gencore-polar-night.omp.json");
    expect(legacySnow).toContain("gencore-snow-storm.omp.json");
    expect(legacyPolar).toContain("$env:POSH_THEME");
    expect(legacyPolar).toContain("$env:POSH_CONFIG");
  });
});
