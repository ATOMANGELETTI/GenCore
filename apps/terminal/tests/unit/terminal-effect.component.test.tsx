import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfigProvider } from "../../src/modules/config/config.hook";
import { TerminalBackgroundEffect } from "../../src/modules/terminal-effect/terminal-effect.component";

describe("<TerminalBackgroundEffect />", () => {
  it("renders a canvas with accessibility attributes and absolute inset layout", () => {
    const { container } = render(
      <ConfigProvider>
        <TerminalBackgroundEffect />
      </ConfigProvider>,
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeDefined();
    expect(canvas).toHaveAttribute("data-slot", "terminal-background-effect");
    expect(canvas?.className).toContain("pointer-events-none");
    expect(canvas?.className).toContain("absolute");
  });

  it("mounts and unmounts cleanly without throwing", () => {
    const { unmount } = render(
      <ConfigProvider>
        <TerminalBackgroundEffect />
      </ConfigProvider>,
    );
    expect(() => unmount()).not.toThrow();
  });
});
