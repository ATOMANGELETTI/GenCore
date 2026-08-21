import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAddon = vi.fn();
const open = vi.fn();
const dispose = vi.fn();

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    loadAddon = loadAddon;
    open = open;
    dispose = dispose;
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {},
}));

vi.mock("@xterm/addon-serialize", () => ({
  SerializeAddon: class {},
}));

const WebglAddon = vi.fn(class WebglAddon {});
vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon,
}));

describe("createXterm renderer", () => {
  beforeEach(() => {
    loadAddon.mockClear();
    open.mockClear();
    dispose.mockClear();
    WebglAddon.mockClear();
  });

  it("does not import @xterm/addon-webgl", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/terminal/terminal.xterm.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/@xterm\/addon-webgl/);
  });

  it("does not construct WebglAddon", async () => {
    const { createXterm } = await import("../../src/modules/terminal/terminal.xterm");
    const host = createXterm(document.createElement("div"), "polar-night");
    expect(WebglAddon).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
    host.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
