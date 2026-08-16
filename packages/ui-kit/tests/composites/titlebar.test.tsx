import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Titlebar } from "../../src/composites/titlebar";

describe("Titlebar", () => {
  it("renders the title and the version badge", () => {
    render(<Titlebar title="GenCore" version="0.1.0" />);

    expect(screen.getByText("GenCore")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toHaveClass("tabular-nums");
  });

  it("marks the bar as a Tauri drag region without importing Tauri", () => {
    render(<Titlebar title="GenCore" />);

    expect(screen.getByRole("banner")).toHaveAttribute("data-tauri-drag-region");
  });

  it("calls each window control callback", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onMinimize = vi.fn();
    const onToggleMaximize = vi.fn();

    render(
      <Titlebar
        title="GenCore"
        onClose={onClose}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close window" }));
    await user.click(screen.getByRole("button", { name: "Minimize window" }));
    await user.click(screen.getByRole("button", { name: "Toggle maximize window" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
  });

  it("paints the traffic lights with the Aurora accents", () => {
    render(<Titlebar onClose={vi.fn()} onMinimize={vi.fn()} onToggleMaximize={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close window" })).toHaveClass("bg-traffic-close");
    expect(screen.getByRole("button", { name: "Minimize window" })).toHaveClass(
      "bg-traffic-minimize",
    );
    expect(screen.getByRole("button", { name: "Toggle maximize window" })).toHaveClass(
      "bg-traffic-maximize",
    );
  });

  it("greys out and disables lights with no handler", () => {
    render(<Titlebar onClose={vi.fn()} />);

    const minimize = screen.getByRole("button", { name: "Minimize window" });
    expect(minimize).toBeDisabled();
    expect(minimize).toHaveClass("bg-traffic-inactive");
  });

  it("hides the traffic lights when asked", () => {
    render(<Titlebar title="GenCore" showTrafficLights={false} />);

    expect(screen.queryByRole("button", { name: "Close window" })).not.toBeInTheDocument();
  });
});
