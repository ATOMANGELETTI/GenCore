import { describe, expect, it } from "vitest";
import { tooltipContentVariants } from "../../../src/primitives/tooltip/tooltip.variants";

describe("tooltip.variants", () => {
  it("makes tooltip content unselectable", () => {
    expect(tooltipContentVariants()).toContain("select-none");
  });

  it("keeps the default size compact", () => {
    const classes = tooltipContentVariants();
    expect(classes).toContain("max-w-64");
    expect(classes).toContain("px-2");
    expect(classes).not.toContain("shadow");
  });

  it("adds a rich card size without shadows or blur", () => {
    const classes = tooltipContentVariants({ size: "rich" });
    expect(classes).toContain("select-none");
    expect(classes).toContain("max-w-[260px]");
    expect(classes).toContain("px-3");
    expect(classes).toContain("py-2.5");
    expect(classes).not.toContain("shadow");
    expect(classes).not.toContain("blur");
  });
});
