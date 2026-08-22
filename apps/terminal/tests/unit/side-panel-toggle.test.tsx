import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SidePanelToggle } from "../../src/modules/side-panel/side-panel-toggle.component";

describe("SidePanelToggle", () => {
  it("labels collapse vs expand", () => {
    const { rerender } = render(<SidePanelToggle isOpen={true} onToggle={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Collapse side panel \(Ctrl\+B\)/i }),
    ).toBeInTheDocument();
    rerender(<SidePanelToggle isOpen={false} onToggle={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Expand side panel \(Ctrl\+B\)/i }),
    ).toBeInTheDocument();
  });

  it("calls onToggle on click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SidePanelToggle isOpen={true} onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: /side panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
