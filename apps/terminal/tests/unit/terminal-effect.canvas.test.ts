import { describe, expect, it } from "vitest";
import {
  createSimulation,
  resizeSimulation,
  stepSimulation,
  triggerClickRipple,
} from "../../src/modules/terminal-effect/terminal-effect.canvas";

describe("terminal-effect.canvas physics & algorithms", () => {
  it("initializes particles within canvas boundaries for 'particles' mode", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    expect(state.type).toBe("particles");
    expect(state.particles.length).toBeGreaterThanOrEqual(40);
    for (const p of state.particles) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
      expect(p.radius).toBeGreaterThan(0);
    }
  });

  it("initializes molecules within canvas boundaries for 'molecules' mode", () => {
    const state = createSimulation(800, 600, "molecules", "polar-night");
    expect(state.type).toBe("molecules");
    expect(state.molecules.length).toBeGreaterThanOrEqual(25);
    for (const m of state.molecules) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThanOrEqual(800);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeLessThanOrEqual(600);
    }
  });

  it("initializes orbs within canvas boundaries for 'orbs' mode", () => {
    const state = createSimulation(800, 600, "orbs", "polar-night");
    expect(state.type).toBe("orbs");
    expect(state.orbs.length).toBeGreaterThanOrEqual(5);
    for (const o of state.orbs) {
      expect(o.baseRadius).toBeGreaterThan(30);
    }
  });

  it("produces empty entity lists for 'none' mode", () => {
    const state = createSimulation(800, 600, "none", "polar-night");
    expect(state.type).toBe("none");
    expect(state.particles.length).toBe(0);
    expect(state.molecules.length).toBe(0);
    expect(state.orbs.length).toBe(0);
  });

  it("updates particle positions with upward drift and speed multiplier over time", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    const first = state.particles[0];
    expect(first).toBeDefined();
    if (!first) {
      return;
    }
    const initialY = first.y;
    const initialX = first.x;

    stepSimulation(state, 0.05, { x: -1000, y: -1000, active: false }, "ambient", 1.5);
    expect(first.x !== initialX || first.y !== initialY).toBe(true);
  });

  it("applies cursor repulsion when pointer is active in 'repel' mode", () => {
    const state = createSimulation(800, 600, "molecules", "polar-night");
    const target = state.molecules[0];
    expect(target).toBeDefined();
    if (!target) {
      return;
    }
    target.x = 400;
    target.y = 300;
    target.vx = 0;
    target.vy = 0;

    // Cursor placed at (420, 300) to the right of target (400, 300)
    stepSimulation(state, 0.05, { x: 420, y: 300, active: true }, "repel", 1.0);

    // Target should be pushed away to the left (vx < 0)
    expect(target.vx).toBeLessThan(0);
  });

  it("does not apply cursor repulsion in 'ambient' mode even if pointer is active", () => {
    const state = createSimulation(800, 600, "molecules", "polar-night");
    const target = state.molecules[0];
    expect(target).toBeDefined();
    if (!target) {
      return;
    }
    target.x = 400;
    target.y = 300;
    target.vx = 0;
    target.vy = 0;

    stepSimulation(state, 0.05, { x: 420, y: 300, active: true }, "ambient", 1.0);
    // target.vx will only change if internal random drift is applied, but no directed repulsion
    expect(target.vx).toBe(0);
  });

  it("spawns, expands, and clears click ripples in 'ripple' mode", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    triggerClickRipple(state, 200, 200);
    expect(state.ripples.length).toBe(1);
    expect(state.ripples[0]?.radius).toBe(0);

    // Step ripple forward
    stepSimulation(state, 0.05, { x: 200, y: 200, active: true }, "ripple", 1.0);
    expect(state.ripples[0]?.radius).toBeGreaterThan(0);

    // Step ripple beyond max radius over successive frames
    for (let i = 0; i < 20; i++) {
      stepSimulation(state, 0.05, { x: 200, y: 200, active: true }, "ripple", 1.0);
    }
    expect(state.ripples.length).toBe(0);
  });

  it("resizes simulation dimensions gracefully", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    resizeSimulation(state, 1200, 900);
    expect(state.width).toBe(1200);
    expect(state.height).toBe(900);
  });
});
