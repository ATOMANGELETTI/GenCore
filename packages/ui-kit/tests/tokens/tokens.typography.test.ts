import { describe, expect, it } from "vitest";
import { fontFamily } from "../../src/tokens/tokens.typography";

describe("tokens.typography fontFamily", () => {
  it("mirrors the Terminess Nerd Font stacks from globals.css", () => {
    expect(fontFamily.sans).toBe(
      '"Terminess Nerd Font", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    );
    expect(fontFamily.mono).toBe(
      '"Terminess Nerd Font", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    );
  });
});
