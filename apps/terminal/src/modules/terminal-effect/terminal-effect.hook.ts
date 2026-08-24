import * as React from "react";
import { useConfig } from "../config/config.hook";
import {
  createSimulation,
  renderSimulation,
  resizeSimulation,
  stepSimulation,
  triggerClickRipple,
} from "./terminal-effect.canvas";
import type { PointerState, SimulationState } from "./terminal-effect.types";

export function useTerminalBackgroundEffect(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef?: React.RefObject<HTMLElement | null>,
) {
  const { backgroundEffect, effectInteraction, effectOpacity, effectSpeed, resolvedTheme } =
    useConfig();

  const simRef = React.useRef<SimulationState | null>(null);
  const pointerRef = React.useRef<PointerState>({ x: -1000, y: -1000, active: false });
  const animFrameRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number>(0);
  const isReducedMotionRef = React.useRef(false);

  // Check prefers-reduced-motion
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    isReducedMotionRef.current = media.matches;

    const onChange = (event: MediaQueryListEvent) => {
      isReducedMotionRef.current = event.matches;
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Resize and initialize canvas buffer
  const updateSize = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (
      !simRef.current ||
      simRef.current.type !== backgroundEffect ||
      simRef.current.theme !== resolvedTheme
    ) {
      simRef.current = createSimulation(width, height, backgroundEffect, resolvedTheme);
    } else {
      resizeSimulation(simRef.current, width, height);
    }
  }, [backgroundEffect, resolvedTheme, canvasRef]);

  // Handle ResizeObserver
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") {
      return;
    }

    const target = containerRef?.current ?? canvas.parentElement ?? canvas;
    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(target);
    updateSize();

    return () => observer.disconnect();
  }, [updateSize, canvasRef, containerRef]);

  // Pointer event listeners for mouse interaction and click ripples
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const target = containerRef?.current ?? canvas?.parentElement ?? canvas;
    if (!target) {
      return;
    }

    function onPointerMove(event: PointerEvent | MouseEvent) {
      const rect = target?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    }

    function onPointerLeave() {
      pointerRef.current.active = false;
    }

    function onPointerDown(event: PointerEvent | MouseEvent) {
      if (effectInteraction !== "ripple" || !simRef.current) {
        return;
      }
      const rect = target?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      triggerClickRipple(simRef.current, x, y);
    }

    target.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
    target.addEventListener("pointerleave", onPointerLeave, { passive: true });
    target.addEventListener("pointerdown", onPointerDown as EventListener, { passive: true });

    return () => {
      target.removeEventListener("pointermove", onPointerMove as EventListener);
      target.removeEventListener("pointerleave", onPointerLeave);
      target.removeEventListener("pointerdown", onPointerDown as EventListener);
    };
  }, [effectInteraction, canvasRef, containerRef]);

  // Animation render loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || backgroundEffect === "none") {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    let running = true;
    lastTimeRef.current = performance.now();

    function loop(now: number) {
      if (!running || !canvas) {
        return;
      }

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const sim = simRef.current;
      const ctx = canvas.getContext("2d");

      if (sim && ctx) {
        const speedMultiplier = isReducedMotionRef.current ? 0 : effectSpeed;
        stepSimulation(sim, dt, pointerRef.current, effectInteraction, speedMultiplier);
        renderSimulation(ctx, sim, effectOpacity);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    // Visibility change listener to suspend loop when document is hidden
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      } else {
        lastTimeRef.current = performance.now();
        if (running && animFrameRef.current === null) {
          animFrameRef.current = requestAnimationFrame(loop);
        }
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [backgroundEffect, effectInteraction, effectOpacity, effectSpeed, canvasRef]);
}
