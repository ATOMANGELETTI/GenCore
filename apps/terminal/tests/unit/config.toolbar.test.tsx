import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfigToolbar } from "../../src/modules/config/config.toolbar";

describe("ConfigToolbar", () => {
  it("renders 4 category tabs and overflow button", () => {
    const onSelect = vi.fn();
    render(<ConfigToolbar activeSubview="appearance" onSelectSubview={onSelect} />);

    expect(screen.getByRole("tab", { name: /Appearance/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Background Effects/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: /Shell Prompt/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: /AI Assistant/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("button", { name: /More categories/i })).toBeInTheDocument();
  });

  it("calls onSelectSubview when a category tab is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ConfigToolbar activeSubview="appearance" onSelectSubview={onSelect} />);

    await user.click(screen.getByRole("tab", { name: /Background Effects/i }));
    expect(onSelect).toHaveBeenCalledWith("effects");
  });

  it("supports keyboard navigation across tabs", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ConfigToolbar activeSubview="appearance" onSelectSubview={onSelect} />);

    const appearanceTab = screen.getByRole("tab", { name: /Appearance/i });
    appearanceTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(onSelect).toHaveBeenCalledWith("effects");
  });

  it("opens dropdown and allows selecting All Settings", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ConfigToolbar activeSubview="appearance" onSelectSubview={onSelect} />);

    await user.click(screen.getByRole("button", { name: /More categories/i }));
    const allItem = await screen.findByRole("menuitem", { name: /All Settings/i });
    await user.click(allItem);

    expect(onSelect).toHaveBeenCalledWith("all");
  });
});
