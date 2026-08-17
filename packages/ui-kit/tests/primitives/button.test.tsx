import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/primitives/button";

describe("Button", () => {
  it("defaults to a non-submitting button with the primary variant", () => {
    render(<Button>Run</Button>);
    const button = screen.getByRole("button", { name: "Run" });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("bg-primary", "text-primary-foreground", "h-8");
  });

  it("applies variant and size classes", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );

    expect(screen.getByRole("button")).toHaveClass("bg-destructive", "h-7");
  });

  it("merges conflicting caller classes last", () => {
    render(<Button className="bg-success">Save</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-success");
    expect(button).not.toHaveClass("bg-primary");
  });

  it("applies the icon-sm size classes", () => {
    render(<Button size="icon-sm">Go</Button>);

    expect(screen.getByRole("button")).toHaveClass("size-7");
  });

  it("renders the child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/docs">Docs</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveClass("bg-primary");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
