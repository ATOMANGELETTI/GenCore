import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "../../../src/primitives/input";

describe("Input", () => {
  it("renders a textbox", () => {
    render(<Input />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("data-slot", "input");
  });

  it("applies the compact Nord input classes", () => {
    render(<Input />);

    expect(screen.getByRole("textbox")).toHaveClass(
      "h-7",
      "rounded-sm",
      "border",
      "border-border",
      "bg-transparent",
      "px-2",
      "text-xs",
      "text-foreground",
    );
  });
});
