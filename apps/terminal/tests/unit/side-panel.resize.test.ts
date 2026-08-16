import { describe, expect, it } from "vitest";
import {
  clampSidePanelWidth,
  DEFAULT_SIDE_PANEL_WIDTH,
  MIN_SIDE_PANEL_WIDTH,
  maxSidePanelWidth,
  SIDE_PANEL_WIDTH_STEP,
} from "../../src/modules/side-panel/side-panel.resize";

describe("side-panel resize math", () => {
  it("exports the locked width constants", () => {
    expect(DEFAULT_SIDE_PANEL_WIDTH).toBe(240);
    expect(MIN_SIDE_PANEL_WIDTH).toBe(160);
    expect(SIDE_PANEL_WIDTH_STEP).toBe(10);
  });

  it("uses half the container as the max when that is above the min", () => {
    expect(maxSidePanelWidth(800)).toBe(400);
  });

  it("never returns a max below the min width", () => {
    expect(maxSidePanelWidth(200)).toBe(MIN_SIDE_PANEL_WIDTH);
  });

  it("falls back to half of window.innerWidth when the container has no width", () => {
    const previous = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    expect(maxSidePanelWidth(0)).toBe(500);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: previous });
  });

  it("clamps below-min widths up to the min", () => {
    expect(clampSidePanelWidth(100, 800)).toBe(MIN_SIDE_PANEL_WIDTH);
  });

  it("clamps above-max widths down to half the container", () => {
    expect(clampSidePanelWidth(500, 800)).toBe(400);
  });

  it("leaves an in-range width unchanged", () => {
    expect(clampSidePanelWidth(DEFAULT_SIDE_PANEL_WIDTH, 800)).toBe(240);
  });
});
