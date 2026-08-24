import * as React from "react";
import { useTerminalBackgroundEffect } from "./terminal-effect.hook";

export interface TerminalBackgroundEffectProps {
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function TerminalBackgroundEffect({ containerRef }: TerminalBackgroundEffectProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  useTerminalBackgroundEffect(canvasRef, containerRef);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={-1}
      data-slot="terminal-background-effect"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none"
    />
  );
}
