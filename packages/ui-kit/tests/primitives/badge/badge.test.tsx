import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../../../src/primitives/badge";

describe("Badge", () => {
  it("applies the caution variant classes", () => {
    render(<Badge variant="caution">Rare</Badge>);

    expect(screen.getByText("Rare")).toHaveClass("bg-caution", "text-caution-foreground");
  });

  it("keeps warning on warning tokens", () => {
    render(<Badge variant="warning">Warn</Badge>);

    expect(screen.getByText("Warn")).toHaveClass("bg-warning", "text-warning-foreground");
  });
});
