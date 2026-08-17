import { describe, expect, it } from "vitest";
import { tooltipContentVariants } from "../../../src/primitives/tooltip/tooltip.variants";

describe("tooltip.variants", () => {
  it("makes tooltip content unselectable", () => {
    expect(tooltipContentVariants()).toContain("select-none");
  });
});
