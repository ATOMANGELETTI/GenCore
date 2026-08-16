import { describe, expect, it } from "vitest";
import { cn } from "../../src/lib/cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("drops falsy and conditional entries", () => {
    expect(cn("flex", false && "hidden", undefined, null, "gap-2")).toBe("flex gap-2");
  });

  it("lets the last conflicting Tailwind utility win", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("bg-primary", "bg-destructive")).toBe("bg-destructive");
  });

  it("keeps utilities from different groups", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
