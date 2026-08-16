import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Statusbar } from "../../src/composites/statusbar";

describe("Statusbar", () => {
  it("prevents the native context menu", () => {
    render(<Statusbar />);
    const bar = screen.getByRole("contentinfo");
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    bar.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
