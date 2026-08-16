import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readStylesheet(name: string): string {
  return readFileSync(resolve(process.cwd(), "src/styles", name), "utf8");
}

const terminessFaces = [
  "../assets/fonts/nerdfonts/terminus/TerminessNerdFont-Regular.ttf",
  "../assets/fonts/nerdfonts/terminus/TerminessNerdFont-Bold.ttf",
  "../assets/fonts/nerdfonts/terminus/TerminessNerdFont-Italic.ttf",
  "../assets/fonts/nerdfonts/terminus/TerminessNerdFont-BoldItalic.ttf",
] as const;

describe("fonts.css", () => {
  it("registers all four Terminess Nerd Font TTF files", () => {
    const fontsCss = readStylesheet("fonts.css");

    for (const url of terminessFaces) {
      expect(fontsCss).toContain(url);
    }
  });
});

describe("globals.css font wiring", () => {
  it("imports fonts.css and points both stacks at Terminess Nerd Font", () => {
    const globalsCss = readStylesheet("globals.css");

    expect(globalsCss).toContain('@import "./fonts.css";');
    expect(globalsCss).toMatch(/--font-sans:\s*"Terminess Nerd Font"/);
    expect(globalsCss).toMatch(/--font-mono:\s*"Terminess Nerd Font"/);
  });
});
